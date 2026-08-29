// Local dev/CI defaults to a local SQLite file. Setting TURSO_DATABASE_URL
// (e.g. to point at the shared production database for an admin task like
// seeding) switches every caller — app runtime, seed script, import script
// — to the remote Turso/libSQL database instead.
//
// Both adapter packages are imported dynamically so that deploy targets
// which only ever use one of them (e.g. Vercel, which always has
// TURSO_DATABASE_URL set) never load — or need to have successfully
// installed — the other. better-sqlite3 in particular needs a native
// binary compiled at install time, which is dev/CI-only weight that
// production has no reason to depend on.
export async function createPrismaAdapter() {
  if (process.env.TURSO_DATABASE_URL) {
    // The "/web" entrypoint uses libSQL's pure-HTTP client (no native
    // binding), which is what a stateless serverless function needs —
    // the default entrypoint requires a platform-specific native module
    // that isn't guaranteed to match the function's runtime architecture.
    const { PrismaLibSql } = await import("@prisma/adapter-libsql/web");
    return new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  return new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
}
