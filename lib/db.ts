import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "./prisma-adapter";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter: createPrismaAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
