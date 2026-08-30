-- CreateTable
CREATE TABLE "LearnChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "subtopicId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "checkText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearnChunk_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearnChunk_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearnCheckOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chunkId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LearnCheckOption_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "LearnChunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearnProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearnProgress_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "LearnChunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LearnChunk_topicId_order_key" ON "LearnChunk"("topicId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LearnProgress_userId_chunkId_key" ON "LearnProgress"("userId", "chunkId");
