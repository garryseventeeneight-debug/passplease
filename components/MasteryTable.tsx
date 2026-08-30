import Link from "next/link";
import { masteryLevelFor } from "@/lib/mastery";

export interface TopicRow {
  topicId: string;
  topicName: string;
  mcqScore: number | null;
  masteryScore: number | null;
  subtopics: { id: string; name: string }[];
}

export function MasteryTable({ subjectSlug, rows }: { subjectSlug: string; rows: TopicRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <tr>
            <th className="px-4 py-2">Topic</th>
            <th className="px-4 py-2">MCQ</th>
            <th className="px-4 py-2">Short Answer</th>
            <th className="px-4 py-2">Extended Response</th>
            <th className="px-4 py-2">Mastery</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hasData = row.masteryScore !== null;
            const level = hasData ? masteryLevelFor(row.masteryScore!) : null;
            return (
              <tr key={row.topicId} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200">
                  <Link href={`/practice/${subjectSlug}?topic=${row.topicId}`} className="hover:underline">
                    {row.topicName}
                  </Link>
                  {row.subtopics.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-neutral-500 hover:underline dark:text-neutral-400">
                        Subtopics
                      </summary>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {row.subtopics.map((s) => (
                          <li key={s.id}>
                            <Link
                              href={`/practice/${subjectSlug}?topic=${row.topicId}&subtopic=${s.id}`}
                              className="text-xs text-neutral-500 hover:underline dark:text-neutral-400"
                            >
                              {s.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                  {row.mcqScore !== null ? `${row.mcqScore.toFixed(0)}%` : "—"}
                </td>
                <td className="px-4 py-2 text-neutral-400">—</td>
                <td className="px-4 py-2 text-neutral-400">—</td>
                <td className="px-4 py-2">
                  {level ? (
                    <span>
                      {level.emoji} {level.label} ({row.masteryScore!.toFixed(0)}%)
                    </span>
                  ) : (
                    <span className="text-neutral-400">Not started</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
