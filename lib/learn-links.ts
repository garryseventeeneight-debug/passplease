import { getDb } from "@/lib/db";
import { extractWikilinkSlugsFromAll } from "@/lib/wikilinks";

export interface WikiLinkTarget {
  subjectSlug: string;
  heading: string;
  preview: string;
}

const PREVIEW_LENGTH = 160;

/** Resolve every [[slug]] referenced across a set of chunk bodies to its {subjectSlug, heading, preview}. */
export async function resolveLinkTargets(
  chunks: { body: string }[]
): Promise<Record<string, WikiLinkTarget>> {
  const slugs = extractWikilinkSlugsFromAll(chunks.map((c) => c.body));
  if (slugs.length === 0) return {};

  const db = await getDb();
  const targets = await db.learnChunk.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      heading: true,
      body: true,
      topic: { select: { subject: { select: { slug: true } } } },
    },
  });

  const result: Record<string, WikiLinkTarget> = {};
  for (const t of targets) {
    result[t.slug] = {
      subjectSlug: t.topic.subject.slug,
      heading: t.heading,
      preview: t.body.length > PREVIEW_LENGTH ? t.body.slice(0, PREVIEW_LENGTH - 1) + "…" : t.body,
    };
  }
  return result;
}
