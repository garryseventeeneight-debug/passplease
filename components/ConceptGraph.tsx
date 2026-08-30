"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface GraphNode {
  slug: string;
  heading: string;
  topicName: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface LaidOutNode extends GraphNode {
  x: number;
  y: number;
}

const WIDTH = 800;
const HEIGHT = 560;
const MARGIN = 36;
const ITERATIONS = 300;
const REPULSION = 6000;
const SPRING = 0.02;
const IDEAL_LENGTH = 140;
const CENTER_PULL = 0.01;
const DAMPING = 0.85;

// A small, hand-rolled force-directed layout (repulsion between every pair
// of nodes, a spring pulling linked nodes toward an ideal distance, and a
// gentle pull toward the centre so nothing drifts off-canvas) — settled
// once on load rather than animated continuously, so the map is easy to
// read and doesn't keep moving under you.
function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]): LaidOutNode[] {
  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, nodes.length);
    positions.set(n.slug, {
      x: WIDTH / 2 + Math.cos(angle) * 180,
      y: HEIGHT / 2 + Math.sin(angle) * 180,
      vx: 0,
      vy: 0,
    });
  });

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = positions.get(nodes[i].slug)!;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = positions.get(nodes[j].slug)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = Math.max(1, dx * dx + dy * dy);
        const dist = Math.sqrt(distSq);
        const force = REPULSION / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    for (const e of edges) {
      const a = positions.get(e.source);
      const b = positions.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - IDEAL_LENGTH) * SPRING;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const n of nodes) {
      const p = positions.get(n.slug)!;
      p.vx += (WIDTH / 2 - p.x) * CENTER_PULL;
      p.vy += (HEIGHT / 2 - p.y) * CENTER_PULL;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x = Math.max(MARGIN, Math.min(WIDTH - MARGIN, p.x + p.vx));
      p.y = Math.max(MARGIN, Math.min(HEIGHT - MARGIN, p.y + p.vy));
    }
  }

  return nodes.map((n) => {
    const p = positions.get(n.slug)!;
    return { ...n, x: p.x, y: p.y };
  });
}

const TOPIC_COLORS = [
  "fill-blue-500 dark:fill-blue-400",
  "fill-purple-500 dark:fill-purple-400",
  "fill-green-500 dark:fill-green-400",
  "fill-amber-500 dark:fill-amber-400",
  "fill-red-500 dark:fill-red-400",
  "fill-teal-500 dark:fill-teal-400",
];

function truncate(label: string, max = 24) {
  return label.length > max ? label.slice(0, max - 1) + "…" : label;
}

export function ConceptGraph({ subjectSlug }: { subjectSlug: string }) {
  const router = useRouter();
  const [data, setData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/learn/graph/${subjectSlug}`)
      .then((res) => res.json())
      .then((json: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
        if (!cancelled) setData(json);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectSlug]);

  const topicColor = useMemo(() => {
    const colors = new Map<string, string>();
    for (const n of data?.nodes ?? []) {
      if (!colors.has(n.topicName)) {
        colors.set(n.topicName, TOPIC_COLORS[colors.size % TOPIC_COLORS.length]);
      }
    }
    return colors;
  }, [data]);

  const laidOut = useMemo(() => {
    if (!data) return [];
    return layoutGraph(data.nodes, data.edges);
  }, [data]);

  if (data === null) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }
  if (data.nodes.length === 0) {
    return <p className="text-sm text-neutral-500">No concepts to map yet for this subject.</p>;
  }

  const positionBySlug = new Map(laidOut.map((n) => [n.slug, n]));
  const topics = [...topicColor.entries()];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
        {topics.map(([name, colorClass]) => (
          <span key={name} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass}`} />
            {name}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} className="max-w-full">
          {data.edges.map((e, i) => {
            const a = positionBySlug.get(e.source);
            const b = positionBySlug.get(e.target);
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="stroke-neutral-200 dark:stroke-neutral-700"
                strokeWidth={1}
              />
            );
          })}
          {laidOut.map((n) => (
            <g
              key={n.slug}
              onClick={() => router.push(`/learn/${subjectSlug}/concept/${n.slug}`)}
              className="cursor-pointer"
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={7}
                className={topicColor.get(n.topicName) ?? "fill-neutral-400"}
              />
              <text
                x={n.x}
                y={n.y - 12}
                textAnchor="middle"
                fontSize={11}
                className="fill-neutral-600 dark:fill-neutral-400"
              >
                <title>{n.heading}</title>
                {truncate(n.heading)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
