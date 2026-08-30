import Link from "next/link";
import { getDb } from "@/lib/db";
import { QuestionFilters } from "@/components/QuestionFilters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    subject?: string;
    topic?: string;
    subtopic?: string;
    q?: string;
    flagged?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const subjectSlug = sp.subject ?? "";
  const topicId = sp.topic ?? "";
  const subtopicId = sp.subtopic ?? "";
  const search = sp.q ?? "";
  const flaggedOnly = sp.flagged === "1";
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await getDb();
  const subjects = await db.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      topics: {
        orderBy: { order: "asc" },
        include: { subtopics: { orderBy: { order: "asc" } } },
      },
    },
  });

  let subjectId: string | undefined;
  if (subjectSlug) {
    subjectId = subjects.find((s) => s.slug === subjectSlug)?.id;
  }

  const where = {
    isTestFixture: false,
    ...(subjectId ? { subjectId } : {}),
    ...(topicId ? { topicId } : {}),
    ...(subtopicId ? { subtopicId } : {}),
    ...(flaggedOnly ? { flaggedWrong: true } : {}),
    ...(search ? { questionText: { contains: search } } : {}),
  };

  const [total, questions] = await Promise.all([
    db.question.count({ where }),
    db.question.findMany({
      where,
      select: {
        id: true,
        questionText: true,
        source: true,
        answerVerified: true,
        isAiGenerated: true,
        flaggedWrong: true,
        subject: { select: { name: true } },
        topic: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      subject: subjectSlug,
      topic: topicId,
      subtopic: subtopicId,
      q: search,
      flagged: flaggedOnly ? "1" : "",
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/questions?${qs}` : "/questions";
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Question Browser
      </h1>

      <QuestionFilters
        subjects={subjects}
        subjectSlug={subjectSlug}
        topicId={topicId}
        subtopicId={subtopicId}
        search={search}
        flaggedOnly={flaggedOnly}
      />

      <p className="mb-3 text-sm text-neutral-500">{total} question{total === 1 ? "" : "s"}</p>

      <div className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {questions.map((q) => (
          <Link
            key={q.id}
            href={`/questions/${q.id}`}
            className="flex flex-col gap-1 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>{q.subject.name} · {q.topic.name}</span>
              {q.flaggedWrong && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  Flagged
                </span>
              )}
              {!q.answerVerified && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  AI-solved
                </span>
              )}
              {q.isAiGenerated && (
                <span className="rounded bg-purple-100 px-1.5 py-0.5 font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  AI-generated
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-sm text-neutral-800 dark:text-neutral-200">{q.questionText}</p>
            <p className="text-xs text-neutral-400">{q.source}</p>
          </Link>
        ))}
        {questions.length === 0 && (
          <p className="p-6 text-center text-sm text-neutral-500">No questions match these filters.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Link
            href={pageHref({ page: String(Math.max(1, page - 1)) })}
            className={page <= 1 ? "pointer-events-none text-neutral-300 dark:text-neutral-700" : "underline"}
          >
            ← Prev
          </Link>
          <span className="text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <Link
            href={pageHref({ page: String(Math.min(totalPages, page + 1)) })}
            className={page >= totalPages ? "pointer-events-none text-neutral-300 dark:text-neutral-700" : "underline"}
          >
            Next →
          </Link>
        </div>
      )}
    </main>
  );
}
