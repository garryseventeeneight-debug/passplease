"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { renderMathNodes } from "./MathText";

export interface WikiLinkTarget {
  subjectSlug: string;
  heading: string;
}

// Wikipedia-style [[slug]] / [[slug|display text]] links inside Learn
// content, in the same dependency-free regex-scan style as MathText — a
// known slug becomes a real link to its concept page; an unknown one (a
// forward reference to a concept not written yet) renders as plain text
// rather than a broken link.
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
        nodes.push(
          <Link
            key={`l${key++}`}
            href={`/learn/${target.subjectSlug}/concept/${slug}`}
            className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            {label}
          </Link>
        );
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
