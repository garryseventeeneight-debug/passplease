"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WikiText, type WikiLinkTarget } from "./WikiText";
import { LearnCheck } from "./LearnCheck";

interface ConceptData {
  id: string;
  heading: string;
  body: string;
  checkText: string | null;
  options: { id: string; text: string }[];
  completed: boolean;
  topicId: string;
  topicName: string;
  subtopicName: string | null;
  subjectSlug: string;
  subjectName: string;
  linkTargets: Record<string, WikiLinkTarget>;
}

export function ConceptView({ slug }: { slug: string }) {
  const [concept, setConcept] = useState<ConceptData | null | undefined>(undefined);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/learn/concept/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ConceptData | null) => {
        if (!cancelled) setConcept(data);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (concept === undefined) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }
  if (concept === null) {
    return <p className="text-sm text-neutral-500">This concept doesn&apos;t exist yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        <Link href={`/learn/${concept.subjectSlug}/${concept.topicId}`} className="hover:underline">
          {concept.subjectName} · {concept.topicName}
        </Link>
        {concept.subtopicName ? ` · ${concept.subtopicName}` : ""}
      </p>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-lg font-medium text-neutral-900 dark:text-neutral-100">
          {concept.heading}
        </h2>
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <WikiText text={concept.body} linkTargets={concept.linkTargets} />
        </p>

        {concept.checkText && (
          <div className="mt-5 border-t border-neutral-200 pt-5 dark:border-neutral-800">
            {!showCheck ? (
              <button
                type="button"
                onClick={() => setShowCheck(true)}
                className="text-sm font-medium text-neutral-600 hover:underline dark:text-neutral-400"
              >
                Quick check {concept.completed ? "(already answered)" : ""} ↓
              </button>
            ) : (
              <LearnCheck
                chunkId={concept.id}
                checkText={concept.checkText}
                options={concept.options}
                linkTargets={concept.linkTargets}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
