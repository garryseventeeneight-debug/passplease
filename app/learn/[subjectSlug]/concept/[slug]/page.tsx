import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { ConceptView } from "@/components/ConceptView";

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ subjectSlug: string; slug: string }>;
}) {
  const { subjectSlug, slug } = await params;

  const db = await getDb();
  const chunk = await db.learnChunk.findUnique({
    where: { slug },
    select: { heading: true, topic: { select: { subject: { select: { slug: true } } } } },
  });
  if (!chunk || chunk.topic.subject.slug !== subjectSlug) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {chunk.heading}
      </h1>
      <ConceptView slug={slug} />
    </main>
  );
}
