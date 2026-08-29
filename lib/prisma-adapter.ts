import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Local dev/CI defaults to a local SQLite file. Setting TURSO_DATABASE_URL
// (e.g. to point at the shared production database for an admin task like
// seeding) switches every caller — app runtime, seed script, import script
// — to the remote Turso/libSQL database instead.
export function createPrismaAdapter() {
  if (process.env.TURSO_DATABASE_URL) {
    return new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
}
