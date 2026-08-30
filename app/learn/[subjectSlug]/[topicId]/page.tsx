import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { LearnSession } from "@/components/LearnSession";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ subjectSlug: string; topicId: string }>;
}) {
  const { subjectSlug, topicId } = await params;

  const db = await getDb();
  const topic = await db.topic.findUnique({
    where: { id: topicId },
    select: { name: true, subjectId: true, subject: { select: { slug: true } } },
  });
  if (!topic || topic.subject.slug !== subjectSlug) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Learn — {topic.name}
      </h1>
      <LearnSession topicId={topicId} />
    </main>
  );
}
