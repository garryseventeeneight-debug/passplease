-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LearnCheckOption";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LearnChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "subtopicId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "slug" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "checkQuestionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearnChunk_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearnChunk_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LearnChunk_checkQuestionId_fkey" FOREIGN KEY ("checkQuestionId") REFERENCES "Question" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LearnChunk" ("body", "checkQuestionId", "createdAt", "heading", "id", "order", "slug", "subtopicId", "topicId") SELECT "body", "checkQuestionId", "createdAt", "heading", "id", "order", "slug", "subtopicId", "topicId" FROM "LearnChunk";
DROP TABLE "LearnChunk";
ALTER TABLE "new_LearnChunk" RENAME TO "LearnChunk";
CREATE UNIQUE INDEX "LearnChunk_slug_key" ON "LearnChunk"("slug");
CREATE UNIQUE INDEX "LearnChunk_checkQuestionId_key" ON "LearnChunk"("checkQuestionId");
CREATE UNIQUE INDEX "LearnChunk_topicId_order_key" ON "LearnChunk"("topicId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

