-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReviewCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "due" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stability" REAL NOT NULL DEFAULT 0,
    "difficulty" REAL NOT NULL DEFAULT 0,
    "elapsedDays" REAL NOT NULL DEFAULT 0,
    "scheduledDays" REAL NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL DEFAULT 0,
    "learningSteps" INTEGER NOT NULL DEFAULT 0,
    "lastReview" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewCard_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReviewCard" ("difficulty", "due", "elapsedDays", "id", "lapses", "lastReview", "questionId", "reps", "scheduledDays", "stability", "state", "updatedAt", "userId") SELECT "difficulty", "due", "elapsedDays", "id", "lapses", "lastReview", "questionId", "reps", "scheduledDays", "stability", "state", "updatedAt", "userId" FROM "ReviewCard";
DROP TABLE "ReviewCard";
ALTER TABLE "new_ReviewCard" RENAME TO "ReviewCard";
CREATE INDEX "ReviewCard_userId_due_idx" ON "ReviewCard"("userId", "due");
CREATE UNIQUE INDEX "ReviewCard_userId_questionId_key" ON "ReviewCard"("userId", "questionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
