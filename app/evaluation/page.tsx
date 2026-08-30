import Link from "next/link";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { masteryLevelFor } from "@/lib/mastery";
import { RadarChart } from "@/components/RadarChart";

export const dynamic = "force-dynamic";

export default async function EvaluationPage() {
  const session = await auth();
  const userId = session!.user.id;

  const db = await getDb();
  const subjects = await db.subject.findMany({
    orderBy: { name: "asc" },
    include: { topics: { orderBy: { order: "asc" } } },
  });
  const masteries = await db.mastery.findMany({ where: { userId } });
  const masteryByTopic = new Map(masteries.map((m) => [m.topicId, m]));

  const weakestOverall = subjects
    .flatMap((subject) =>
      subject.topics.map((topic) => ({
        subjectName: subject.name,
        topicName: topic.name,
        mastery: masteryByTopic.get(topic.id)?.masteryScore,
      }))
    )
    .filter((t): t is { subjectName: string; topicName: string; mastery: number } => t.mastery !== undefined)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 10);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Evaluation
      </h1>

      {weakestOverall.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-medium text-neutral-900 dark:text-neutral-100">
            Study These Next
          </h2>
          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-2">Topic</th>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Mastery</th>
                </tr>
              </thead>
              <tbody>
                {weakestOverall.map((t, i) => {
                  const level = masteryLevelFor(t.mastery);
                  return (
                    <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200">{t.topicName}</td>
                      <td className="px-4 py-2 text-neutral-500 dark:text-neutral-400">{t.subjectName}</td>
                      <td className="px-4 py-2">
                        {level.emoji} {level.label} ({t.mastery.toFixed(0)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-12">
        {subjects
          .filter((s) => s.topics.length >= 3)
          .map((subject) => {
            const data = subject.topics.map((topic) => ({
              label: topic.name,
              value: masteryByTopic.get(topic.id)?.masteryScore ?? 0,
            }));
            const hasAnyData = subject.topics.some((t) => masteryByTopic.has(t.id));
            return (
              <section key={subject.id}>
                <h2 className="mb-3 text-lg font-medium text-neutral-900 dark:text-neutral-100">
                  {subject.name}
                </h2>
                {hasAnyData ? (
                  <div className="flex justify-center">
                    <RadarChart data={data} />
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">
                    No attempts yet — practice a few questions to see this chart fill in.
                  </p>
                )}
              </section>
            );
          })}
      </div>
    </main>
  );
}
