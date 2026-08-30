import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { ASSORTED_SLUG } from "@/lib/constants";
import { PracticeSession } from "@/components/PracticeSession";

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectSlug: string }>;
  searchParams: Promise<{ topic?: string; subtopic?: string }>;
}) {
  const { subjectSlug } = await params;
  const sp = await searchParams;
  const topicId = sp.topic ?? "";
  const subtopicId = sp.subtopic ?? "";

  let title: string;
  let topics: { id: string; name: string; subtopics: { id: string; name: string }[] }[] = [];
  if (subjectSlug === ASSORTED_SLUG) {
    title = "Assorted";
  } else {
    const db = await getDb();
    const subject = await db.subject.findUnique({
      where: { slug: subjectSlug },
      include: {
        topics: {
          orderBy: { order: "asc" },
          include: { subtopics: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!subject) notFound();
    title = subject.name;
    topics = subject.topics;
  }

  const selectedTopic = topics.find((t) => t.id === topicId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {title} — Practice
      </h1>

      {topics.length > 0 && (
        <form
          method="get"
          action={`/practice/${subjectSlug}`}
          className="mb-6 flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Topic</label>
            <select
              name="topic"
              defaultValue={topicId}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {selectedTopic && selectedTopic.subtopics.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Subtopic</label>
              <select
                name="subtopic"
                defaultValue={subtopicId}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">All subtopics</option>
                {selectedTopic.subtopics.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Practice this
          </button>
          {(topicId || subtopicId) && (
            <Link
              href={`/practice/${subjectSlug}`}
              className="pb-1.5 text-sm text-neutral-500 hover:underline"
            >
              Clear filter
            </Link>
          )}
        </form>
      )}

      <PracticeSession
        key={`${subjectSlug}:${topicId}:${subtopicId}`}
        subjectSlug={subjectSlug}
        subjectName={title}
        topicId={topicId || undefined}
        subtopicId={subtopicId || undefined}
      />
    </main>
  );
}
