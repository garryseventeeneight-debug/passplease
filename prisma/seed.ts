import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const db = new PrismaClient({ adapter });

// Topic/subtopic titles are the publicly-published NESA HSC syllabus
// structure (headings only) — not past-paper content, so no external
// sourcing is needed for this taxonomy. Real question content is added
// separately once the user supplies source material.
const SUBJECTS: {
  name: string;
  slug: string;
  topics: { name: string; syllabusReference: string; subtopics: string[] }[];
}[] = [
  {
    name: "Economics",
    slug: "economics",
    topics: [
      {
        name: "Introduction to Economics",
        syllabusReference: "Year 11, Topic 1",
        subtopics: [
          "The economic problem",
          "Production possibility frontiers",
          "Economic systems",
          "Participants in the economy",
        ],
      },
      {
        name: "Consumers and Business",
        syllabusReference: "Year 11, Topic 2",
        subtopics: ["Consumer choice", "Business behaviour", "Market structures"],
      },
      {
        name: "Markets",
        syllabusReference: "Year 11, Topic 3",
        subtopics: ["Demand", "Supply", "Market equilibrium", "Government intervention in markets"],
      },
      {
        name: "Labour Markets",
        syllabusReference: "Year 11, Topic 4",
        subtopics: ["Demand for and supply of labour", "Wage determination", "Labour market trends"],
      },
      {
        name: "Financial Markets",
        syllabusReference: "Year 12, Topic 1",
        subtopics: ["Types of financial markets", "Regulation of financial markets"],
      },
      {
        name: "Government in the Economy",
        syllabusReference: "Year 12, Topic 2",
        subtopics: ["Fiscal policy", "Budget outcomes", "Microeconomic policy"],
      },
      {
        name: "The International Economy",
        syllabusReference: "Year 12, Topic 3",
        subtopics: ["Globalisation", "Trade and finance", "Balance of payments", "Exchange rates"],
      },
      {
        name: "Economic Issues",
        syllabusReference: "Year 12, Topic 4",
        subtopics: [
          "Economic growth",
          "Unemployment",
          "Inflation",
          "External stability",
          "Distribution of income and wealth",
          "Environmental sustainability",
        ],
      },
    ],
  },
  {
    name: "Chemistry",
    slug: "chemistry",
    topics: [
      {
        name: "Properties and Structure of Matter",
        syllabusReference: "Year 11, Module 1",
        subtopics: ["Properties of matter", "Atomic structure and periodicity", "Bonding"],
      },
      {
        name: "Introduction to Quantitative Chemistry",
        syllabusReference: "Year 11, Module 2",
        subtopics: ["Chemical reactions and stoichiometry", "The mole concept", "Concentration and molarity"],
      },
      {
        name: "Reactive Chemistry",
        syllabusReference: "Year 11, Module 3",
        subtopics: ["Reactivity of metals", "Rates of reaction", "Enthalpy and Hess's Law"],
      },
      {
        name: "Drivers of Reactions",
        syllabusReference: "Year 11, Module 4",
        subtopics: ["Energy changes in reactions", "Entropy and Gibbs free energy"],
      },
      {
        name: "Equilibrium and Acid Reactions",
        syllabusReference: "Year 12, Module 5",
        subtopics: ["Dynamic equilibrium", "Acids and bases", "Quantitative analysis"],
      },
      {
        name: "Acid/Base Reactions",
        syllabusReference: "Year 12, Module 6",
        subtopics: ["Properties of acids and bases", "Using Bronsted-Lowry theory", "Quantitative analysis"],
      },
      {
        name: "Organic Chemistry",
        syllabusReference: "Year 12, Module 7",
        subtopics: ["Nomenclature", "Hydrocarbons", "Products of reactions of organic compounds", "Polymers"],
      },
      {
        name: "Applying Chemical Ideas",
        syllabusReference: "Year 12, Module 8",
        subtopics: ["Analysis of inorganic substances", "Analysis of organic substances", "Chemical synthesis"],
      },
    ],
  },
];

async function main() {
  for (const subjectDef of SUBJECTS) {
    const subject = await db.subject.upsert({
      where: { slug: subjectDef.slug },
      update: {},
      create: { name: subjectDef.name, slug: subjectDef.slug },
    });

    for (const [topicIndex, topicDef] of subjectDef.topics.entries()) {
      const topic = await db.topic.upsert({
        where: { subjectId_name: { subjectId: subject.id, name: topicDef.name } },
        update: { syllabusReference: topicDef.syllabusReference, order: topicIndex },
        create: {
          subjectId: subject.id,
          name: topicDef.name,
          syllabusReference: topicDef.syllabusReference,
          order: topicIndex,
        },
      });

      for (const [subIndex, subtopicName] of topicDef.subtopics.entries()) {
        await db.subtopic.upsert({
          where: { topicId_name: { topicId: topic.id, name: subtopicName } },
          update: { order: subIndex },
          create: { topicId: topic.id, name: subtopicName, order: subIndex },
        });
      }
    }
  }
  console.log(`Seeded ${SUBJECTS.length} subjects with topic/subtopic taxonomy.`);

  await seedTestFixtures();
}

// Small set of clearly-labelled placeholder questions — NOT real HSC
// content — so the practice engine is exercisable end to end before real
// past-paper material is imported (see Phase 2). Automated tests and local
// manual testing rely on these; they are never presented as genuine HSC
// questions in the UI (source field says "Test fixture").
async function seedTestFixtures() {
  const economics = await db.subject.findUniqueOrThrow({ where: { slug: "economics" } });
  const econTopic = await db.topic.findFirstOrThrow({
    where: { subjectId: economics.id, name: "Introduction to Economics" },
  });

  const chemistry = await db.subject.findUniqueOrThrow({ where: { slug: "chemistry" } });
  const chemTopic = await db.topic.findFirstOrThrow({
    where: { subjectId: chemistry.id, name: "Properties and Structure of Matter" },
  });

  const fixtures = [
    {
      subjectId: economics.id,
      topicId: econTopic.id,
      questionText: "[TEST FIXTURE] Opportunity cost refers to:",
      explanation: "Opportunity cost is the value of the next-best alternative forgone when a choice is made.",
      options: [
        { text: "The value of the next-best alternative forgone", isCorrect: true },
        { text: "The total cost of production", isCorrect: false },
        { text: "The price paid for a good", isCorrect: false },
        { text: "The cost of government regulation", isCorrect: false },
      ],
    },
    {
      subjectId: economics.id,
      topicId: econTopic.id,
      questionText: "[TEST FIXTURE] A production possibility frontier (PPF) primarily illustrates:",
      explanation:
        "A PPF shows the maximum combinations of two goods an economy can produce with fixed resources and technology, illustrating scarcity and trade-offs.",
      options: [
        { text: "The maximum combinations of two goods producible with given resources", isCorrect: true },
        { text: "The equilibrium price of a good", isCorrect: false },
        { text: "The level of consumer demand", isCorrect: false },
        { text: "The rate of inflation over time", isCorrect: false },
      ],
    },
    {
      subjectId: chemistry.id,
      topicId: chemTopic.id,
      questionText: "[TEST FIXTURE] Which subatomic particle has a negligible mass relative to protons and neutrons?",
      explanation: "Electrons have a mass roughly 1/1836th that of a proton, effectively negligible in comparison.",
      options: [
        { text: "Electron", isCorrect: true },
        { text: "Proton", isCorrect: false },
        { text: "Neutron", isCorrect: false },
        { text: "Nucleon", isCorrect: false },
      ],
    },
  ];

  for (const fixture of fixtures) {
    const existing = await db.question.findFirst({
      where: { questionText: fixture.questionText },
    });
    if (existing) continue;

    await db.question.create({
      data: {
        subjectId: fixture.subjectId,
        topicId: fixture.topicId,
        type: "MCQ",
        difficulty: 1,
        questionText: fixture.questionText,
        explanation: fixture.explanation,
        source: "Test fixture (not real HSC content)",
        isAiGenerated: false,
        isTestFixture: true,
        options: {
          create: fixture.options.map((o, i) => ({
            text: o.text,
            isCorrect: o.isCorrect,
            order: i,
          })),
        },
      },
    });
  }
  console.log(`Seeded ${fixtures.length} test-fixture questions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
