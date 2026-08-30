import Link from "next/link";
import { ConceptGraph } from "@/components/ConceptGraph";

export default function AllConceptsMapPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Concept Map — Everything
      </h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Every concept across every subject, in one map. Click one to open it.
      </p>
      <ConceptGraph />
    </main>
  );
}
