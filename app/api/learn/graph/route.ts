import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { extractWikilinkSlugsFromAll } from "@/lib/wikilinks";

// Every Learn concept across every subject, as one graph — the per-subject
// route at [subjectSlug]/route.ts covers the scoped view.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  const chunks = await db.learnChunk.findMany({
    select: {
      slug: true,
      heading: true,
      body: true,
      topic: { select: { name: true, subject: { select: { name: true, slug: true } } } },
    },
  });

  const slugSet = new Set(chunks.map((c) => c.slug));
  const edgeKeys = new Set<string>();
  const edges: { source: string; target: string }[] = [];

  for (const chunk of chunks) {
    const refs = extractWikilinkSlugsFromAll([chunk.body]);
    for (const ref of refs) {
      if (ref === chunk.slug || !slugSet.has(ref)) continue;
      const key = [chunk.slug, ref].sort().join("|");
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ source: chunk.slug, target: ref });
    }
  }

  return NextResponse.json({
    nodes: chunks.map((c) => ({
      slug: c.slug,
      heading: c.heading,
      topicName: c.topic.name,
      subjectName: c.topic.subject.name,
      subjectSlug: c.topic.subject.slug,
    })),
    edges,
  });
}
