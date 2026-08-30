import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../lib/prisma-adapter";

let db: PrismaClient;

// One-off, production-only: reads the legacy checkText/LearnCheckOption
// columns via raw SQL (the generated client no longer has typed fields for
// them, since the local schema has already dropped them) and converts each
// into a real Question + AnswerOption, same as the local migration this
// mirrors. Run this BEFORE applying the
// 20260830115530_drop_learn_chunk_check_text migration to production.
async function main() {
  const chunks = await db.$queryRawUnsafe<
    { id: string; topicId: string; subtopicId: string | null; checkText: string | null }[]
  >(`SELECT id, topicId, subtopicId, checkText FROM LearnChunk WHERE checkQuestionId IS NULL AND checkText IS NOT NULL`);

  let migrated = 0;
  for (const chunk of chunks) {
    const options = await db.$queryRawUnsafe<{ text: string; isCorrect: number; order: number }[]>(
      `SELECT text, isCorrect, "order" FROM LearnCheckOption WHERE chunkId = ? ORDER BY "order" ASC`,
      chunk.id
    );
    if (!chunk.checkText || options.length === 0) continue;

    const topic = await db.topic.findUniqueOrThrow({ where: { id: chunk.topicId }, select: { subjectId: true } });

    const question = await db.question.create({
      data: {
        subjectId: topic.subjectId,
        topicId: chunk.topicId,
        subtopicId: chunk.subtopicId,
        type: "MCQ",
        difficulty: 1,
        questionText: chunk.checkText,
        source: "Concept check",
        isAiGenerated: true,
        answerVerified: true,
        options: {
          create: options.map((o) => ({ text: o.text, isCorrect: Boolean(o.isCorrect), order: o.order })),
        },
      },
    });
    await db.learnChunk.update({ where: { id: chunk.id }, data: { checkQuestionId: question.id } });
    migrated += 1;
  }

  console.log(`Migrated ${migrated} chunk(s) onto a real Question.`);
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
