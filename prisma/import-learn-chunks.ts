import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../lib/prisma-adapter";

let db: PrismaClient;

interface ChunkOption {
  text: string;
  isCorrect: boolean;
}

interface Chunk {
  subtopicName: string | null;
  order: number;
  heading: string;
  body: string;
  checkText: string;
  checkOptions: ChunkOption[];
}

interface LearnFile {
  topicName: string;
  chunks: Chunk[];
}

// `npm run db:import-learn -- chemistry prisma/import-data/chemistry-learn-reactive-chemistry.json`
const [subjectSlug, file] = process.argv.slice(2);

if (!subjectSlug || !file) {
  console.error("Usage: tsx prisma/import-learn-chunks.ts <subjectSlug> <jsonFile>");
  process.exit(1);
}

async function main() {
  const subject = await db.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) {
    console.error(`Unknown subject slug "${subjectSlug}". Seed the taxonomy first.`);
    process.exit(1);
  }

  const data: LearnFile = JSON.parse(readFileSync(file, "utf-8"));

  const topic = await db.topic.findUnique({
    where: { subjectId_name: { subjectId: subject.id, name: data.topicName } },
    include: { subtopics: true },
  });
  if (!topic) {
    console.error(`Unknown topic "${data.topicName}" for subject "${subjectSlug}".`);
    process.exit(1);
  }

  let imported = 0;
  let skippedExisting = 0;

  for (const chunk of data.chunks) {
    const subtopic = chunk.subtopicName
      ? topic.subtopics.find((s) => s.name.toLowerCase() === chunk.subtopicName!.toLowerCase())
      : undefined;

    const existing = await db.learnChunk.findUnique({
      where: { topicId_order: { topicId: topic.id, order: chunk.order } },
    });
    if (existing) {
      skippedExisting += 1;
      continue;
    }

    await db.learnChunk.create({
      data: {
        topicId: topic.id,
        subtopicId: subtopic?.id,
        order: chunk.order,
        heading: chunk.heading,
        body: chunk.body,
        checkText: chunk.checkText,
        checkOptions: {
          create: chunk.checkOptions.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i })),
        },
      },
    });
    imported += 1;
  }

  console.log(`\nLearn chunk import complete for "${data.topicName}":`);
  console.log(`  imported:            ${imported}`);
  console.log(`  skipped (existing):  ${skippedExisting}`);
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
