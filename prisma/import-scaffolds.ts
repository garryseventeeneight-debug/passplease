import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../lib/prisma-adapter";

let db: PrismaClient;

interface ScaffoldOption {
  text: string;
  isCorrect: boolean;
}

interface ScaffoldQuestion {
  topicName: string;
  subtopicName: string | null;
  scaffoldOrder: number;
  questionText: string;
  options: ScaffoldOption[];
  explanation: string;
}

// `npm run db:import-scaffolds -- chemistry prisma/import-data/chemistry-scaffolds.json`
const [subjectSlug, file] = process.argv.slice(2);

if (!subjectSlug || !file) {
  console.error("Usage: tsx prisma/import-scaffolds.ts <subjectSlug> <jsonFile>");
  process.exit(1);
}

async function main() {
  const subject = await db.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) {
    console.error(`Unknown subject slug "${subjectSlug}". Seed the taxonomy first.`);
    process.exit(1);
  }

  const topics = await db.topic.findMany({
    where: { subjectId: subject.id },
    include: { subtopics: true },
  });
  const topicByName = new Map(topics.map((t) => [t.name, t]));

  const scaffolds: ScaffoldQuestion[] = JSON.parse(readFileSync(file, "utf-8"));

  let imported = 0;
  let skippedDuplicate = 0;
  let skippedUnmatchedTopic = 0;

  for (const q of scaffolds) {
    const topic = topicByName.get(q.topicName);
    if (!topic) {
      skippedUnmatchedTopic += 1;
      console.warn(`  unmatched topic "${q.topicName}" — skipped`);
      continue;
    }
    const subtopic = q.subtopicName
      ? topic.subtopics.find((s) => s.name.toLowerCase() === q.subtopicName!.toLowerCase())
      : undefined;

    const existing = await db.question.findFirst({
      where: { questionText: q.questionText, isScaffold: true },
    });
    if (existing) {
      skippedDuplicate += 1;
      continue;
    }

    await db.question.create({
      data: {
        subjectId: subject.id,
        topicId: topic.id,
        subtopicId: subtopic?.id,
        type: "MCQ",
        difficulty: 1,
        questionText: q.questionText,
        explanation: q.explanation,
        source: "AI-generated concept check",
        isAiGenerated: true,
        isScaffold: true,
        scaffoldOrder: q.scaffoldOrder,
        answerVerified: true,
        options: {
          create: q.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i })),
        },
      },
    });
    imported += 1;
  }

  console.log(`\nScaffold import complete for "${subjectSlug}":`);
  console.log(`  imported:              ${imported}`);
  console.log(`  skipped (duplicate):   ${skippedDuplicate}`);
  console.log(`  skipped (unmatched topic): ${skippedUnmatchedTopic}`);
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
