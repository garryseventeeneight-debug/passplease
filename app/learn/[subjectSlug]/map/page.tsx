import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { ConceptGraph } from "@/components/ConceptGraph";

export default async function ConceptMapPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const { subjectSlug } = await params;

  const db = await getDb();
  const subject = await db.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {subject.name} — Concept Map
      </h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Every concept you can read, and how they link to each other. Click one to open it.
      </p>
      <ConceptGraph subjectSlug={subjectSlug} />
    </main>
  );
}
