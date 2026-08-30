-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "subtopicId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MCQ',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "questionText" TEXT NOT NULL,
    "explanation" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceYear" INTEGER,
    "sourcePaper" TEXT,
    "syllabusOutcome" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isTestFixture" BOOLEAN NOT NULL DEFAULT false,
    "isScaffold" BOOLEAN NOT NULL DEFAULT false,
    "scaffoldOrder" INTEGER NOT NULL DEFAULT 0,
    "answerVerified" BOOLEAN NOT NULL DEFAULT true,
    "imageData" TEXT,
    "flaggedWrong" BOOLEAN NOT NULL DEFAULT false,
    "flagNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("answerVerified", "createdAt", "difficulty", "explanation", "flagNote", "flaggedWrong", "id", "imageData", "isAiGenerated", "isTestFixture", "questionText", "source", "sourcePaper", "sourceUrl", "sourceYear", "subjectId", "subtopicId", "syllabusOutcome", "topicId", "type") SELECT "answerVerified", "createdAt", "difficulty", "explanation", "flagNote", "flaggedWrong", "id", "imageData", "isAiGenerated", "isTestFixture", "questionText", "source", "sourcePaper", "sourceUrl", "sourceYear", "subjectId", "subtopicId", "syllabusOutcome", "topicId", "type" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
