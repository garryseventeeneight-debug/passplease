import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../lib/prisma-adapter";

// tsx transpiles this file to CommonJS, which doesn't support top-level
// await, so the client is created lazily just before main() runs instead.
let db: PrismaClient;

interface ExtractedOption {
  text: string;
  isCorrect: boolean;
}

type AnswerSource = "official_key" | "ai_solved" | "unknown";

interface ExtractedQuestion {
  questionText: string;
  options: ExtractedOption[];
  // "official_key": isCorrect came from an answer key/marking guide in the
  // source document. "ai_solved": no key existed, so the correct option was
  // determined by AI subject-matter reasoning instead — imported with
  // answerVerified=false so the UI can flag it as unverified. "unknown":
  // neither a key nor a confident AI answer exists — never imported.
  answerSource: AnswerSource;
  explanation: string | null;
  topicName: string;
  subtopicName: string | null;
  difficulty: number;
}

interface ExtractedPaper {
  source: string;
  sourceYear: number;
  sourcePaper: string;
  sourceFile: string;
  questions: ExtractedQuestion[];
  skippedDiagramQuestions: number;
  notes: string;
}

// `npm run db:import -- economics prisma/import-data/economics` or
// `npm run db:import -- chemistry /path/to/extracted/json/dir`
const [subjectSlug, dir] = process.argv.slice(2);

if (!subjectSlug || !dir) {
  console.error("Usage: tsx prisma/import-questions.ts <subjectSlug> <jsonDir>");
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

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`No .json files found in ${dir}`);
    process.exit(1);
  }

  let imported = 0;
  let importedAiSolved = 0;
  let skippedUnknownAnswer = 0;
  let skippedInvalid = 0;
  let skippedUnmatchedTopic = 0;
  let skippedDuplicate = 0;
  let skippedDiagramTotal = 0;

  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf-8");
    const paper: ExtractedPaper = JSON.parse(raw);
    skippedDiagramTotal += paper.skippedDiagramQuestions ?? 0;

    for (const q of paper.questions) {
      if (q.answerSource !== "official_key" && q.answerSource !== "ai_solved") {
        skippedUnknownAnswer += 1;
        continue;
      }
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (q.options.length !== 4 || correctCount !== 1 || !q.questionText.trim()) {
        skippedInvalid += 1;
        continue;
      }
      const topic = topicByName.get(q.topicName);
      if (!topic) {
        skippedUnmatchedTopic += 1;
        console.warn(`  [${file}] unmatched topic "${q.topicName}" — skipped`);
        continue;
      }
      const subtopic = q.subtopicName
        ? topic.subtopics.find(
            (s) => s.name.toLowerCase() === q.subtopicName!.toLowerCase()
          )
        : undefined;

      const existing = await db.question.findFirst({
        where: { questionText: q.questionText, source: paper.source },
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
          difficulty: Math.min(5, Math.max(1, Math.round(q.difficulty) || 2)),
          questionText: q.questionText,
          explanation: q.explanation,
          source: paper.source,
          sourceYear: paper.sourceYear,
          sourcePaper: paper.sourcePaper,
          isAiGenerated: false,
          isTestFixture: false,
          answerVerified: q.answerSource === "official_key",
          options: {
            create: q.options.map((o, i) => ({
              text: o.text,
              isCorrect: o.isCorrect,
              order: i,
            })),
          },
        },
      });
      imported += 1;
      if (q.answerSource === "ai_solved") importedAiSolved += 1;
    }
  }

  console.log(`\nImport complete for "${subjectSlug}" from ${files.length} file(s):`);
  console.log(`  imported:                 ${imported} (of which AI-solved: ${importedAiSolved})`);
  console.log(`  skipped (unknown answer): ${skippedUnknownAnswer}`);
  console.log(`  skipped (invalid shape):  ${skippedInvalid}`);
  console.log(`  skipped (unmatched topic):${skippedUnmatchedTopic}`);
  console.log(`  skipped (duplicate):      ${skippedDuplicate}`);
  console.log(`  skipped (diagram-based, never extracted): ${skippedDiagramTotal}`);
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
