import { masteryLevelFor } from "@/lib/mastery";

export interface TopicRow {
  topicId: string;
  topicName: string;
  mcqScore: number | null;
  masteryScore: number | null;
}

export function MasteryTable({ rows }: { rows: TopicRow[] }) {
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
                <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200">{row.topicName}</td>
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
