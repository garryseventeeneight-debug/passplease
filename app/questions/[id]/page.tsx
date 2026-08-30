import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { QuestionDetail } from "@/components/QuestionDetail";

export const dynamic = "force-dynamic";

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const question = await db.question.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true } },
      topic: { select: { name: true } },
      subtopic: { select: { name: true } },
      options: { select: { id: true, text: true, isCorrect: true, order: true }, orderBy: { order: "asc" } },
    },
  });
  if (!question) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/questions" className="text-sm text-neutral-500 hover:underline">
        ← Question Browser
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Question Detail
      </h1>
      <QuestionDetail
        question={{
          id: question.id,
          questionText: question.questionText,
          explanation: question.explanation,
          source: question.source,
          sourceUrl: question.sourceUrl,
          sourceYear: question.sourceYear,
          sourcePaper: question.sourcePaper,
          difficulty: question.difficulty,
          subjectName: question.subject.name,
          topicName: question.topic.name,
          subtopicName: question.subtopic?.name ?? null,
          isAiGenerated: question.isAiGenerated,
          answerVerified: question.answerVerified,
          imageData: question.imageData,
          flaggedWrong: question.flaggedWrong,
          flagNote: question.flagNote,
          options: question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        }}
      />
    </main>
  );
}
