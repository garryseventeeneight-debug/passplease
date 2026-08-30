import "dotenv/config";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../lib/prisma-adapter";

let db: PrismaClient;

// Regenerates prisma/import-data/learn/registry.json — the "known concepts
// you may link to" list handed to future Learn-content extraction agents,
// so they only write [[wikilinks]] to slugs that actually exist yet.
async function main() {
  const chunks = await db.learnChunk.findMany({
    select: {
      slug: true,
      heading: true,
      topic: { select: { name: true, subject: { select: { slug: true } } } },
    },
    orderBy: { slug: "asc" },
  });

  const registry = chunks.map((c) => ({
    slug: c.slug,
    heading: c.heading,
    subjectSlug: c.topic.subject.slug,
    topicName: c.topic.name,
  }));

  const outPath = join(__dirname, "import-data", "learn", "registry.json");
  writeFileSync(outPath, JSON.stringify(registry, null, 2) + "\n");
  console.log(`Wrote ${registry.length} concept(s) to ${outPath}`);
}

createPrismaAdapter()
  .then((adapter) => {
    db = new PrismaClient({ adapter });
    return main();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
