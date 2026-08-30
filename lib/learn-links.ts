import { getDb } from "@/lib/db";
import { extractWikilinkSlugsFromAll } from "@/lib/wikilinks";

export interface WikiLinkTarget {
  subjectSlug: string;
  heading: string;
}

/** Resolve every [[slug]] referenced across a set of chunk bodies to its {subjectSlug, heading}. */
export async function resolveLinkTargets(
  chunks: { body: string }[]
): Promise<Record<string, WikiLinkTarget>> {
  const slugs = extractWikilinkSlugsFromAll(chunks.map((c) => c.body));
  if (slugs.length === 0) return {};

  const db = await getDb();
  const targets = await db.learnChunk.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, heading: true, topic: { select: { subject: { select: { slug: true } } } } },
  });

  const result: Record<string, WikiLinkTarget> = {};
  for (const t of targets) {
    result[t.slug] = { subjectSlug: t.topic.subject.slug, heading: t.heading };
  }
  return result;
}
