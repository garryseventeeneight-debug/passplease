const WIKILINK_RE = /\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g;

/** Every distinct slug referenced via [[slug]] or [[slug|display text]] in a string. */
export function extractWikilinkSlugs(text: string): string[] {
  const slugs = new Set<string>();
  for (const match of text.matchAll(WIKILINK_RE)) {
    slugs.add(match[1]);
  }
  return [...slugs];
}

/** Every distinct slug referenced across a set of texts (e.g. a chunk's body + checkText). */
export function extractWikilinkSlugsFromAll(texts: (string | null | undefined)[]): string[] {
  const slugs = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const slug of extractWikilinkSlugs(text)) slugs.add(slug);
  }
  return [...slugs];
}
