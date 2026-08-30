import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { AptitudeTest } from "@/components/AptitudeTest";

export default async function AptitudePage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const { subjectSlug } = await params;

  const db = await getDb();
  const subject = await db.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {subject.name} — Aptitude Test
      </h1>
      <AptitudeTest subjectSlug={subjectSlug} />
    </main>
  );
}
