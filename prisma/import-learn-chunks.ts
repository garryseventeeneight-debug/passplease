import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../lib/prisma-adapter";

let db: PrismaClient;

const SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

interface ChunkOption {
  text: string;
  isCorrect: boolean;
}

interface Chunk {
  slug: string;
  subtopicName: string | null;
  heading: string;
  body: string;
  checkText?: string;
  checkOptions?: ChunkOption[];
}

interface LearnFile {
  topicName: string;
  chunks: Chunk[];
}

// `npm run db:import-learn -- chemistry prisma/import-data/learn/chemistry`
const [subjectSlug, dir] = process.argv.slice(2);

if (!subjectSlug || !dir) {
  console.error("Usage: tsx prisma/import-learn-chunks.ts <subjectSlug> <jsonDir>");
  process.exit(1);
}

function normalizeOptions(options: ChunkOption[] | undefined) {
  return (options ?? []).map((o) => ({ text: o.text, isCorrect: o.isCorrect }));
}

async function main() {
  const subject = await db.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) {
    console.error(`Unknown subject slug "${subjectSlug}". Seed the taxonomy first.`);
    process.exit(1);
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`No .json files found in ${dir}`);
    process.exit(1);
  }

  let imported = 0;
  let updated = 0;
  let skippedUnchanged = 0;
  let skippedInvalid = 0;
  let skippedUnmatchedTopic = 0;
  const nextOrderByTopic = new Map<string, number>();
  const knownSlugs = new Set<string>();

  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf-8");
    const data: LearnFile = JSON.parse(raw);

    const topic = await db.topic.findUnique({
      where: { subjectId_name: { subjectId: subject.id, name: data.topicName } },
      include: { subtopics: true },
    });
    if (!topic) {
      console.warn(`  [${file}] unmatched topic "${data.topicName}" — skipped ${data.chunks.length} chunk(s)`);
      skippedUnmatchedTopic += data.chunks.length;
      continue;
    }

    const fileSlugs = new Set(data.chunks.map((c) => c.slug));

    if (!nextOrderByTopic.has(topic.id)) {
      const maxOrder = await db.learnChunk.aggregate({
        where: { topicId: topic.id },
        _max: { order: true },
      });
      nextOrderByTopic.set(topic.id, (maxOrder._max.order ?? -1) + 1);
    }

    for (const chunk of data.chunks) {
      if (!SLUG_RE.test(chunk.slug)) {
        console.warn(`  [${file}] invalid slug "${chunk.slug}" — skipped`);
        skippedInvalid += 1;
        continue;
      }
      if (chunk.checkText && (chunk.checkOptions ?? []).length < 2) {
        console.warn(`  [${file}] "${chunk.slug}" has checkText but fewer than 2 checkOptions — skipped`);
        skippedInvalid += 1;
        continue;
      }
      if (chunk.checkOptions && chunk.checkOptions.filter((o) => o.isCorrect).length !== 1) {
        console.warn(`  [${file}] "${chunk.slug}" must have exactly 1 correct checkOption — skipped`);
        skippedInvalid += 1;
        continue;
      }

      const subtopic = chunk.subtopicName
        ? topic.subtopics.find((s) => s.name.toLowerCase() === chunk.subtopicName!.toLowerCase())
        : undefined;

      // Forward references (a concept not written yet, elsewhere in this
      // batch or a future one) are expected and safe — WikiText just
      // renders an unresolved slug as plain text — so this warns on a
      // likely typo rather than blocking the import.
      const linkRefs = [...`${chunk.body} ${chunk.checkText ?? ""}`.matchAll(/\[\[([a-z0-9-]+)/g)].map(
        (m) => m[1]
      );
      for (const ref of linkRefs) {
        if (ref === chunk.slug || fileSlugs.has(ref) || knownSlugs.has(ref)) continue;
        const found = await db.learnChunk.findUnique({ where: { slug: ref }, select: { id: true } });
        if (!found) {
          console.warn(`  [${file}] "${chunk.slug}" links to unknown slug "${ref}" — check for a typo`);
        }
      }

      const existing = await db.learnChunk.findUnique({
        where: { slug: chunk.slug },
        include: { checkQuestion: { include: { options: { orderBy: { order: "asc" } } } } },
      });

      if (existing) {
        const unchanged =
          existing.heading === chunk.heading &&
          existing.body === chunk.body &&
          (existing.subtopicId ?? null) === (subtopic?.id ?? null) &&
          (existing.checkQuestion?.questionText ?? null) === (chunk.checkText ?? null) &&
          JSON.stringify(
            existing.checkQuestion?.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) ?? []
          ) === JSON.stringify(normalizeOptions(chunk.checkOptions));

        knownSlugs.add(chunk.slug);
        if (unchanged) {
          skippedUnchanged += 1;
          continue;
        }

        let checkQuestionId = existing.checkQuestionId;
        if (chunk.checkText && chunk.checkOptions) {
          if (existing.checkQuestion) {
            await db.answerOption.deleteMany({ where: { questionId: existing.checkQuestion.id } });
            await db.question.update({
              where: { id: existing.checkQuestion.id },
              data: {
                topicId: topic.id,
                subtopicId: subtopic?.id,
                questionText: chunk.checkText,
                options: { create: chunk.checkOptions.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i })) },
              },
            });
          } else {
            const created = await db.question.create({
              data: {
                subjectId: subject.id,
                topicId: topic.id,
                subtopicId: subtopic?.id,
                type: "MCQ",
                difficulty: 1,
                questionText: chunk.checkText,
                source: "Concept check",
                isAiGenerated: true,
                answerVerified: true,
                options: { create: chunk.checkOptions.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i })) },
              },
            });
            checkQuestionId = created.id;
          }
        } else if (existing.checkQuestion) {
          // Chunk was edited to drop its check entirely.
          await db.question.delete({ where: { id: existing.checkQuestion.id } });
          checkQuestionId = null;
        }

        await db.learnChunk.update({
          where: { id: existing.id },
          data: { subtopicId: subtopic?.id, heading: chunk.heading, body: chunk.body, checkQuestionId },
        });
        updated += 1;
        continue;
      }

      const order = nextOrderByTopic.get(topic.id)!;
      nextOrderByTopic.set(topic.id, order + 1);

      let checkQuestionId: string | undefined;
      if (chunk.checkText && chunk.checkOptions) {
        const question = await db.question.create({
          data: {
            subjectId: subject.id,
            topicId: topic.id,
            subtopicId: subtopic?.id,
            type: "MCQ",
            difficulty: 1,
            questionText: chunk.checkText,
            source: "Concept check",
            isAiGenerated: true,
            answerVerified: true,
            options: { create: chunk.checkOptions.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i })) },
          },
        });
        checkQuestionId = question.id;
      }

      await db.learnChunk.create({
        data: {
          topicId: topic.id,
          subtopicId: subtopic?.id,
          order,
          slug: chunk.slug,
          heading: chunk.heading,
          body: chunk.body,
          checkQuestionId,
        },
      });
      imported += 1;
      knownSlugs.add(chunk.slug);
    }
  }

  console.log(`\nLearn chunk import complete for "${subjectSlug}" from ${files.length} file(s):`);
  console.log(`  imported:                 ${imported}`);
  console.log(`  updated:                  ${updated}`);
  console.log(`  skipped (unchanged):      ${skippedUnchanged}`);
  console.log(`  skipped (invalid):        ${skippedInvalid}`);
  console.log(`  skipped (unmatched topic):${skippedUnmatchedTopic}`);
}

createPrismaAdapter()
  .then((adapter) => {
    db = new PrismaClient({ adapter });
    return main();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
