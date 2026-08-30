"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { renderMathNodes } from "./MathText";

export interface WikiLinkTarget {
  subjectSlug: string;
  heading: string;
  preview: string;
}

// A known link shows a small preview card on hover (heading + a short
// excerpt of the target's body) so a reader can check what a term means
// without leaving the page — pure CSS (group-hover), no JS positioning
// library, matching the rest of this app's dependency-free components.
function WikiLink({
  slug,
  label,
  target,
}: {
  slug: string;
  label: string;
  target: WikiLinkTarget;
}) {
  return (
    <span className="group relative inline-block">
      <Link
        href={`/learn/${target.subjectSlug}/concept/${slug}`}
        className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
      >
        {label}
      </Link>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 rounded-md border border-neutral-200 bg-white p-3 text-left text-sm normal-case leading-snug shadow-lg group-hover:block dark:border-neutral-700 dark:bg-neutral-900">
        <span className="block font-medium text-neutral-900 dark:text-neutral-100">
          {target.heading}
        </span>
        <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
          {target.preview}
        </span>
      </span>
    </span>
  );
}

// Wikipedia-style [[slug]] / [[slug|display text]] links inside Learn
// content, in the same dependency-free regex-scan style as MathText — a
// known slug becomes a real link (with a hover preview) to its concept
// page; an unknown one (a forward reference to a concept not written yet)
// renders as plain text rather than a broken link.
function renderWikiNodes(text: string, linkTargets: Record<string, WikiLinkTarget>): ReactNode[] {
  const nodes: ReactNode[] = [];
  let plain = "";
  let i = 0;
  let key = 0;

  function flushPlain() {
    if (plain) {
      nodes.push(...renderMathNodes(plain, `w${key++}-`));
      plain = "";
    }
  }

  while (i < text.length) {
    const rest = text.slice(i);
    const linkMatch = rest.match(/^\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/);
    if (linkMatch) {
      flushPlain();
      const [full, slug, display] = linkMatch;
      const target = linkTargets[slug];
      const label = display ?? target?.heading ?? slug;
      if (target) {
        nodes.push(<WikiLink key={`l${key++}`} slug={slug} label={label} target={target} />);
      } else {
        nodes.push(<span key={`l${key++}`}>{label}</span>);
      }
      i += full.length;
      continue;
    }

    plain += text[i];
    i += 1;
  }
  flushPlain();
  return nodes;
}

export function WikiText({
  text,
  linkTargets,
}: {
  text: string;
  linkTargets: Record<string, WikiLinkTarget>;
}) {
  return <>{renderWikiNodes(text, linkTargets)}</>;
}
