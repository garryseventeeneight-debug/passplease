"use client";

import type { ReactNode } from "react";

// The question bank stores maths notation as plain-text approximations
// (x^2, log_2(x), sqrt(x)) rather than LaTeX, so this renders those specific
// patterns properly instead of pulling in a full typesetting engine for a
// handful of shapes.
//
// Exported (not just used internally) so WikiText.tsx can run it over each
// plain-text segment between wikilinks — keyPrefix keeps React keys unique
// when a caller makes several calls into one sibling list.
export function renderMathNodes(text: string, keyPrefix = ""): ReactNode[] {
  const nodes: ReactNode[] = [];
  let plain = "";
  let i = 0;
  let key = 0;

  function flushPlain() {
    if (plain) {
      nodes.push(<span key={`${keyPrefix}t-${key++}`}>{plain}</span>);
      plain = "";
    }
  }

  while (i < text.length) {
    const rest = text.slice(i);

    const sqrtMatch = rest.match(/^sqrt\(([^()]*)\)/i);
    if (sqrtMatch) {
      flushPlain();
      nodes.push(<span key={`${keyPrefix}q-${key++}`}>√({sqrtMatch[1]})</span>);
      i += sqrtMatch[0].length;
      continue;
    }

    const supMatch = rest.match(/^\^(\{[^{}]*\}|-?\w+)/);
    if (supMatch) {
      flushPlain();
      const content = supMatch[1].startsWith("{") ? supMatch[1].slice(1, -1) : supMatch[1];
      nodes.push(<sup key={`${keyPrefix}u-${key++}`}>{content}</sup>);
      i += supMatch[0].length;
      continue;
    }

    const subMatch = rest.match(/^_(\{[^{}]*\}|-?\w+)/);
    if (subMatch) {
      flushPlain();
      const content = subMatch[1].startsWith("{") ? subMatch[1].slice(1, -1) : subMatch[1];
      nodes.push(<sub key={`${keyPrefix}b-${key++}`}>{content}</sub>);
      i += subMatch[0].length;
      continue;
    }

    plain += text[i];
    i += 1;
  }
  flushPlain();
  return nodes;
}

export function MathText({ text }: { text: string }) {
  return <>{renderMathNodes(text)}</>;
}
