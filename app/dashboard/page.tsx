import Link from "next/link";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ASSORTED_SLUG } from "@/lib/constants";
import { computeStreak } from "@/lib/streak";
import { MasteryTable } from "@/components/MasteryTable";
import { SignOutButton } from "@/components/SignOutButton";

// Reads live attempt/mastery data on every request — must not be
// statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

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

  const masteries = await db.mastery.findMany({ where: { userId } });
  const masteryByTopic = new Map(masteries.map((m) => [m.topicId, m]));

  const learnTopics = await db.learnChunk.findMany({
    distinct: ["topicId"],
    select: { topicId: true, topic: { select: { subjectId: true } } },
  });
  const topicsWithLearnContent = new Set(learnTopics.map((t) => t.topicId));
  const subjectIdsWithLearnContent = new Set(learnTopics.map((t) => t.topic.subjectId));

  const subjectsWithContent = await db.question.findMany({
    where: { isTestFixture: false, isScaffold: false },
    distinct: ["subjectId"],
    select: { subjectId: true },
  });
  const subjectIdsWithContent = new Set(subjectsWithContent.map((q) => q.subjectId));

  const attempts = await db.attempt.findMany({
    where: { userId },
    select: { correct: true, timestamp: true },
  });

  const totalAttempts = attempts.length;
  const totalCorrect = attempts.filter((a) => a.correct).length;
  const overallAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : null;
  const streak = computeStreak(attempts.map((a) => a.timestamp));

  const subjectAverages = subjects.map((subject) => {
    const scores = subject.topics
      .map((t) => masteryByTopic.get(t.id)?.masteryScore)
      .filter((s): s is number => s !== undefined);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return { subject, avg };
  });

  const withData = subjectAverages.filter((s) => s.avg !== null) as { subject: (typeof subjects)[number]; avg: number }[];
  const weakest = withData.length > 0 ? withData.reduce((a, b) => (a.avg < b.avg ? a : b)) : null;
  const strongest = withData.length > 0 ? withData.reduce((a, b) => (a.avg > b.avg ? a : b)) : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          HSC Dashboard
        </h1>
        <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
          <span>{session!.user.email}</span>
          <SignOutButton />
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Questions completed" value={String(totalAttempts)} />
        <Stat label="Accuracy" value={overallAccuracy !== null ? `${overallAccuracy.toFixed(0)}%` : "—"} />
        <Stat label="Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
        <Stat label="Weakest subject" value={weakest ? weakest.subject.name : "—"} />
      </div>

      {strongest && (
        <p className="mb-8 text-sm text-neutral-500">
          Strongest subject: <span className="font-medium">{strongest.subject.name}</span> (
          {strongest.avg.toFixed(0)}% average mastery)
        </p>
      )}

      <div className="mb-10 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <h2 className="font-medium text-neutral-900 dark:text-neutral-100">Assorted Practice</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Mixed questions across every subject, weighted toward your weakest topics overall.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/evaluation"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Evaluation
          </Link>
          <Link
            href="/questions"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Browse Questions
          </Link>
          <Link
            href={`/practice/${ASSORTED_SLUG}`}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Practice
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {subjects.map((subject) => {
          const rows = subject.topics.map((topic) => {
            const m = masteryByTopic.get(topic.id);
            return {
              topicId: topic.id,
              topicName: topic.name,
              mcqScore: m?.mcqScore ?? null,
              masteryScore: m?.masteryScore ?? null,
              subtopics: topic.subtopics.map((s) => ({ id: s.id, name: s.name })),
              hasLearnContent: topicsWithLearnContent.has(topic.id),
            };
          });
          return (
            <section key={subject.id}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                  {subject.name}
                </h2>
                <div className="flex shrink-0 gap-2">
                  {subjectIdsWithLearnContent.has(subject.id) && (
                    <Link
                      href={`/learn/${subject.slug}/map`}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Concept Map
                    </Link>
                  )}
                  {subjectIdsWithContent.has(subject.id) && (
                    <Link
                      href={`/aptitude/${subject.slug}`}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Aptitude Test
                    </Link>
                  )}
                  <Link
                    href={`/practice/${subject.slug}`}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
                  >
                    Practice
                  </Link>
                </div>
              </div>
              <MasteryTable subjectSlug={subject.slug} rows={rows} />
            </section>
          );
        })}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  );
}
