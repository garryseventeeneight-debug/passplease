import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { extractWikilinkSlugsFromAll } from "@/lib/wikilinks";

export async function GET(request: NextRequest, { params }: { params: Promise<{ subjectSlug: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { subjectSlug } = await params;

  const db = await getDb();
  const subject = await db.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) {
    return NextResponse.json({ error: "unknown subject" }, { status: 404 });
  }

  const chunks = await db.learnChunk.findMany({
    where: { topic: { subjectId: subject.id } },
    select: {
      slug: true,
      heading: true,
      body: true,
      topic: { select: { name: true } },
    },
  });

  const slugSet = new Set(chunks.map((c) => c.slug));
  const edgeKeys = new Set<string>();
  const edges: { source: string; target: string }[] = [];

  for (const chunk of chunks) {
    const refs = extractWikilinkSlugsFromAll([chunk.body]);
    for (const ref of refs) {
      // Only draw an edge to a concept that actually exists in this
      // subject's graph — an unresolved or cross-subject reference has
      // nothing to draw to here.
      if (ref === chunk.slug || !slugSet.has(ref)) continue;
      const key = [chunk.slug, ref].sort().join("|");
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ source: chunk.slug, target: ref });
    }
  }

  return NextResponse.json({
    subjectName: subject.name,
    nodes: chunks.map((c) => ({ slug: c.slug, heading: c.heading, topicName: c.topic.name })),
    edges,
  });
}
