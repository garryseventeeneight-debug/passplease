import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  const params = request.nextUrl.searchParams;
  const subjectSlug = params.get("subject") ?? undefined;
  const topicId = params.get("topic") ?? undefined;
  const subtopicId = params.get("subtopic") ?? undefined;
  const search = params.get("q")?.trim() ?? undefined;
  const flaggedOnly = params.get("flagged") === "1";
  const page = Math.max(1, Number(params.get("page")) || 1);

  let subjectId: string | undefined;
  if (subjectSlug) {
    const subject = await db.subject.findUnique({ where: { slug: subjectSlug } });
    if (!subject) return NextResponse.json({ error: "unknown subject" }, { status: 404 });
    subjectId = subject.id;
  }

  const where = {
    isTestFixture: false,
    ...(subjectId ? { subjectId } : {}),
    ...(topicId ? { topicId } : {}),
    ...(subtopicId ? { subtopicId } : {}),
    ...(flaggedOnly ? { flaggedWrong: true } : {}),
    ...(search ? { questionText: { contains: search } } : {}),
  };

  const [total, questions] = await Promise.all([
    db.question.count({ where }),
    db.question.findMany({
      where,
      select: {
        id: true,
        questionText: true,
        source: true,
        sourceYear: true,
        answerVerified: true,
        isAiGenerated: true,
        flaggedWrong: true,
        subject: { select: { name: true, slug: true } },
        topic: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    questions: questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      source: q.source,
      sourceYear: q.sourceYear,
      answerVerified: q.answerVerified,
      isAiGenerated: q.isAiGenerated,
      flaggedWrong: q.flaggedWrong,
      subjectName: q.subject.name,
      subjectSlug: q.subject.slug,
      topicName: q.topic.name,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
