import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "./prisma-adapter";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPromise: Promise<PrismaClient> | undefined;
};

async function createClient() {
  const adapter = await createPrismaAdapter();
  const client = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export function getDb(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return Promise.resolve(globalForPrisma.prisma);
  if (!globalForPrisma.prismaPromise) {
    globalForPrisma.prismaPromise = createClient();
  }
  return globalForPrisma.prismaPromise;
}
