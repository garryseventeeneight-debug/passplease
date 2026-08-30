import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../lib/prisma-adapter";

// Renders one PDF page to a JPEG data URI via poppler's pdftoppm, for
// questions that depend on a real diagram/graph/table a text description
// would lose information from (e.g. reading a value off a graph).
function renderPdfPageAsDataUri(pdfPath: string, page: number): string | null {
  const dir = mkdtempSync(join(tmpdir(), "pdfpage-"));
  const prefix = join(dir, "page");
  try {
    execFileSync("pdftoppm", ["-jpeg", "-f", String(page), "-l", String(page), "-r", "120", pdfPath, prefix]);
    const jpg = readdirSync(dir).find((f) => f.endsWith(".jpg"));
    if (!jpg) return null;
    const bytes = readFileSync(join(dir, jpg));
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch (e) {
    console.warn(`  Failed to render page ${page} of ${pdfPath}:`, (e as Error).message);
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

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
  // 1-indexed PDF page number containing a diagram/graph/table this
  // question depends on, if any — rendered to a real image on import
  // rather than relying on a text description.
  diagramPage?: number | null;
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

const DIAGRAM_KEYWORDS = [
  "diagram",
  "graph shown",
  "shown below",
  "shown above",
  "figure below",
  "figure above",
  "curve shown",
  "shown in the figure",
  "pictured",
  "illustrated below",
];

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
  let skippedVisualDependent = 0;

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
      // A table flattened into inline text ("A | B | C") loses its row/column
      // structure, and a prose description of a diagram/graph the question
      // actually depends on loses whatever the student needs to read off it —
      // both are worse than not having the question. Import only when there's
      // either no visual dependency, or a real rendered image (diagramPage).
      const looksLikeFlattenedTable = (q.questionText.match(/\|/g) ?? []).length >= 3;
      const referencesUnrenderedVisual =
        !q.diagramPage && DIAGRAM_KEYWORDS.some((k) => q.questionText.toLowerCase().includes(k));
      if (looksLikeFlattenedTable || referencesUnrenderedVisual) {
        skippedVisualDependent += 1;
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

      const imageData = q.diagramPage
        ? renderPdfPageAsDataUri(paper.sourceFile, q.diagramPage)
        : null;

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
          imageData,
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
  console.log(`  skipped (table/diagram text with no image): ${skippedVisualDependent}`);
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
