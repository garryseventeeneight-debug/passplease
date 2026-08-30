"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface GraphNode {
  slug: string;
  heading: string;
  topicName: string;
  subjectName: string;
  subjectSlug: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const WIDTH = 900;
const HEIGHT = 640;
const MARGIN = 30;
const REPULSION = 6000;
const SPRING = 0.02;
const IDEAL_LENGTH = 130;
const CENTER_PULL = 0.01;
const DAMPING = 0.85;
// One physics step costs O(n^2) — spending a fixed number of steps per
// animation frame would freeze large graphs, so the steps-per-frame count
// shrinks as n grows to keep each frame's *work* roughly constant instead.
// The total step count stays fixed either way: a big graph just takes more
// (still non-blocking) frames — a few seconds of visible settling — to get
// there, rather than settling less thoroughly.
const FRAME_OP_BUDGET = 2_000_000;
const TOTAL_STEPS = 220;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 6;

function initPositions(nodes: GraphNode[]): Map<string, Point> {
  const positions = new Map<string, Point>();
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, nodes.length);
    const radius = Math.min(WIDTH, HEIGHT) * 0.35;
    positions.set(n.slug, {
      x: WIDTH / 2 + Math.cos(angle) * radius,
      y: HEIGHT / 2 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    });
  });
  return positions;
}

function stepPhysics(nodes: GraphNode[], edges: GraphEdge[], positions: Map<string, Point>) {
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

const PALETTE = [
  "fill-blue-500 dark:fill-blue-400",
  "fill-purple-500 dark:fill-purple-400",
  "fill-green-500 dark:fill-green-400",
  "fill-amber-500 dark:fill-amber-400",
  "fill-red-500 dark:fill-red-400",
  "fill-teal-500 dark:fill-teal-400",
  "fill-pink-500 dark:fill-pink-400",
  "fill-indigo-500 dark:fill-indigo-400",
];

function truncate(label: string, max = 24) {
  return label.length > max ? label.slice(0, max - 1) + "…" : label;
}

export function ConceptGraph({ subjectSlug }: { subjectSlug?: string }) {
  const router = useRouter();
  const [data, setData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [positions, setPositions] = useState<Map<string, Point> | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, w: WIDTH, h: HEIGHT });
  const dragRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const url = subjectSlug ? `/api/learn/graph/${subjectSlug}` : "/api/learn/graph";
    fetch(url)
      .then((res) => res.json())
      .then((json: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
        if (!cancelled) setData(json);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectSlug]);

  // Settles the layout over many animation frames instead of one blocking
  // loop — a graph with hundreds of nodes would otherwise freeze the tab
  // for several seconds before anything appeared.
  useEffect(() => {
    if (!data || data.nodes.length === 0) return;
    let cancelled = false;
    const pos = initPositions(data.nodes);
    const stepsPerFrame = Math.max(1, Math.round(FRAME_OP_BUDGET / Math.max(1, data.nodes.length ** 2)));
    let step = 0;
    let frameId: number;

    function tick() {
      for (let i = 0; i < stepsPerFrame && step < TOTAL_STEPS; i++, step++) {
        stepPhysics(data!.nodes, data!.edges, pos);
      }
      if (cancelled) return;
      setPositions(new Map(pos));
      if (step < TOTAL_STEPS) {
        frameId = requestAnimationFrame(tick);
      }
    }
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [data]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    // Deferred to a microtask, not called directly in the effect body, so
    // this reads as an async callback rather than a synchronous setState
    // during the effect itself.
    Promise.resolve().then(() => setView({ x: 0, y: 0, w: WIDTH, h: HEIGHT }));
  }, [data]);

  function toSvgPoint(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: view.x + view.w / 2, y: view.y + view.h / 2 };
    return {
      x: view.x + ((clientX - rect.left) / rect.width) * view.w,
      y: view.y + ((clientY - rect.top) / rect.height) * view.h,
    };
  }

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const point = toSvgPoint(e.clientX, e.clientY);
    const zoomFactor = Math.exp(e.deltaY * 0.001);
    setView((v) => {
      const newW = Math.min(WIDTH / MIN_ZOOM, Math.max(WIDTH / MAX_ZOOM, v.w * zoomFactor));
      const newH = (newW / v.w) * v.h;
      const ratioX = (point.x - v.x) / v.w;
      const ratioY = (point.y - v.y) / v.h;
      return { x: point.x - ratioX * newW, y: point.y - ratioY * newH, w: newW, h: newH };
    });
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y };
    draggedRef.current = false;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dxClient = e.clientX - dragRef.current.startX;
    const dyClient = e.clientY - dragRef.current.startY;
    if (Math.abs(dxClient) + Math.abs(dyClient) > 3) draggedRef.current = true;
    const dx = (dxClient / rect.width) * view.w;
    const dy = (dyClient / rect.height) * view.h;
    setView((v) => ({ ...v, x: dragRef.current!.viewX - dx, y: dragRef.current!.viewY - dy }));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  const colorKey = useMemo(() => {
    if (!data) return new Map<string, string>();
    const useSubject = !subjectSlug;
    const colors = new Map<string, string>();
    for (const n of data.nodes) {
      const key = useSubject ? n.subjectName : n.topicName;
      if (!colors.has(key)) colors.set(key, PALETTE[colors.size % PALETTE.length]);
    }
    return colors;
  }, [data, subjectSlug]);

  if (data === null) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }
  if (data.nodes.length === 0) {
    return <p className="text-sm text-neutral-500">No concepts to map yet.</p>;
  }
  if (positions === null) {
    return <p className="text-sm text-neutral-500">Settling the layout…</p>;
  }

  const groupKeys = [...colorKey.entries()];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
        {groupKeys.map(([name, colorClass]) => (
          <span key={name} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass}`} />
            {name}
          </span>
        ))}
      </div>
      <p className="text-xs text-neutral-400 dark:text-neutral-500">Scroll to zoom, drag to pan.</p>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          width={WIDTH}
          height={HEIGHT}
          className="max-w-full cursor-grab touch-none select-none active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {data.edges.map((e, i) => {
            const a = positions.get(e.source);
            const b = positions.get(e.target);
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
          {data.nodes.map((n) => {
            const p = positions.get(n.slug);
            if (!p) return null;
            const key = subjectSlug ? n.topicName : n.subjectName;
            return (
              <g
                key={n.slug}
                onClick={() => {
                  if (draggedRef.current) return;
                  router.push(`/learn/${n.subjectSlug}/concept/${n.slug}`);
                }}
                className="cursor-pointer"
              >
                <circle cx={p.x} cy={p.y} r={5} className={colorKey.get(key) ?? "fill-neutral-400"} />
                <text
                  x={p.x}
                  y={p.y - 9}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-neutral-600 dark:fill-neutral-400"
                >
                  <title>
                    {n.heading} ({n.subjectName})
                  </title>
                  {truncate(n.heading)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
