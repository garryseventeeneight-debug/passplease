import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../lib/prisma-adapter";

// tsx transpiles this file to CommonJS, which doesn't support top-level
// await, so the client is created lazily just before main() runs instead.
let db: PrismaClient;

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
  {
    name: "Mathematics Advanced",
    slug: "mathematics-advanced",
    topics: [
      {
        name: "Working with Functions",
        syllabusReference: "Year 11, F1",
        subtopics: ["Functions and relations", "Types of functions", "Graphing techniques"],
      },
      {
        name: "Trigonometry and Measure of Angles",
        syllabusReference: "Year 11, T1",
        subtopics: ["Trigonometric ratios", "Radians", "Arc length and sector area"],
      },
      {
        name: "Trigonometric Functions and Identities",
        syllabusReference: "Year 11, T2",
        subtopics: ["Trigonometric identities", "Graphs of trigonometric functions"],
      },
      {
        name: "Introduction to Differentiation",
        syllabusReference: "Year 11, C1",
        subtopics: ["Gradient of a curve", "Differentiation from first principles", "Rules of differentiation"],
      },
      {
        name: "Logarithms and Exponentials",
        syllabusReference: "Year 11, E1",
        subtopics: ["Indices and logarithms", "Exponential functions", "Laws of logarithms"],
      },
      {
        name: "Probability and Discrete Probability Distributions",
        syllabusReference: "Year 11, S1",
        subtopics: ["Probability", "Discrete probability distributions"],
      },
      {
        name: "Graphing Techniques",
        syllabusReference: "Year 12, F2",
        subtopics: ["Transformations of graphs", "Inverse functions"],
      },
      {
        name: "Trigonometric Functions and Graphs",
        syllabusReference: "Year 12, T3",
        subtopics: ["Graphs of trigonometric functions", "Trigonometric equations"],
      },
      {
        name: "Differential Calculus",
        syllabusReference: "Year 12, C2",
        subtopics: ["Rules of differentiation", "Applications of the derivative"],
      },
      {
        name: "The Second Derivative",
        syllabusReference: "Year 12, C3",
        subtopics: ["Concavity and inflection", "Curve sketching"],
      },
      {
        name: "Integral Calculus",
        syllabusReference: "Year 12, C4",
        subtopics: ["Anti-differentiation", "Definite integrals", "Areas under curves"],
      },
      {
        name: "Exponential and Logarithmic Functions",
        syllabusReference: "Year 12, E2",
        subtopics: ["Calculus of exponential functions", "Calculus of logarithmic functions"],
      },
      {
        name: "Descriptive Statistics and Bivariate Data Analysis",
        syllabusReference: "Year 12, S2",
        subtopics: ["Data collection and sampling", "Bivariate data analysis"],
      },
      {
        name: "Random Variables",
        syllabusReference: "Year 12, S3",
        subtopics: ["Discrete random variables", "The normal distribution"],
      },
    ],
  },
  {
    name: "Mathematics Extension 1",
    slug: "mathematics-extension-1",
    topics: [
      {
        name: "Further Work with Functions",
        syllabusReference: "Year 11, ME-F1",
        subtopics: ["Polynomials", "Further functions and relations"],
      },
      {
        name: "Inverse Trigonometric Functions",
        syllabusReference: "Year 11, ME-T1",
        subtopics: ["Inverse trigonometric functions"],
      },
      {
        name: "Working with Combinatorics",
        syllabusReference: "Year 11, ME-A1",
        subtopics: ["Permutations", "Combinations", "Pascal's triangle and binomial expansion"],
      },
      {
        name: "Rates of Change",
        syllabusReference: "Year 11, ME-C1",
        subtopics: ["Related rates of change", "Exponential growth and decay"],
      },
      {
        name: "Polynomials",
        syllabusReference: "Year 12, ME-F2",
        subtopics: ["Remainder and factor theorems", "Roots of polynomials"],
      },
      {
        name: "Trigonometric Equations",
        syllabusReference: "Year 12, ME-T2",
        subtopics: ["Trigonometric equations and identities"],
      },
      {
        name: "Further Trigonometric Identities",
        syllabusReference: "Year 12, ME-T3",
        subtopics: ["Compound angle formulae", "t-formulae"],
      },
      {
        name: "Further Calculus Skills",
        syllabusReference: "Year 12, ME-C2",
        subtopics: ["Further differentiation", "Further integration"],
      },
      {
        name: "Applications of Calculus",
        syllabusReference: "Year 12, ME-C3",
        subtopics: ["Rates of change", "Related rates", "Differential equations"],
      },
      {
        name: "The Binomial Distribution",
        syllabusReference: "Year 12, ME-S1",
        subtopics: ["Bernoulli distribution", "Binomial distribution"],
      },
    ],
  },
  {
    name: "Physics",
    slug: "physics",
    topics: [
      {
        name: "Kinematics",
        syllabusReference: "Year 11, Module 1",
        subtopics: ["Motion in a straight line", "Motion on a plane (vectors)"],
      },
      {
        name: "Dynamics",
        syllabusReference: "Year 11, Module 2",
        subtopics: ["Forces", "Forces, acceleration and energy", "Momentum, energy and simple systems"],
      },
      {
        name: "Waves and Thermodynamics",
        syllabusReference: "Year 11, Module 3",
        subtopics: ["Wave properties", "Sound waves", "Ray model of light", "Thermodynamics"],
      },
      {
        name: "Electricity and Magnetism",
        syllabusReference: "Year 11, Module 4",
        subtopics: ["Electrostatics", "Electric circuits", "Magnetism"],
      },
      {
        name: "Advanced Mechanics",
        syllabusReference: "Year 12, Module 5",
        subtopics: ["Projectile motion", "Circular motion", "Motion in gravitational fields"],
      },
      {
        name: "Electromagnetism",
        syllabusReference: "Year 12, Module 6",
        subtopics: [
          "Charged particles, conductors and fields",
          "The motor effect",
          "Electromagnetic induction",
        ],
      },
      {
        name: "The Nature of Light",
        syllabusReference: "Year 12, Module 7",
        subtopics: [
          "Electromagnetic spectrum",
          "Light: wave model",
          "Light: quantum model",
          "Light and special relativity",
        ],
      },
      {
        name: "From the Universe to the Atom",
        syllabusReference: "Year 12, Module 8",
        subtopics: [
          "Origins of the elements",
          "Structure of the atom",
          "Quantum mechanical nature of the atom",
          "Properties of the nucleus",
          "Deep inside the atom",
        ],
      },
    ],
  },
  {
    name: "Legal Studies",
    slug: "legal-studies",
    topics: [
      {
        name: "The Legal System",
        syllabusReference: "Year 11, Preliminary Part I",
        subtopics: ["Nature of law", "Legal systems", "Law reform and social values", "Rights and law reform"],
      },
      {
        name: "The Individual and the Law",
        syllabusReference: "Year 11, Preliminary Part II",
        subtopics: ["Crime", "Family law", "Consumers"],
      },
      {
        name: "Law in Practice",
        syllabusReference: "Year 11, Preliminary Part III (focus study)",
        subtopics: ["Investigation and evaluation of a contemporary legal issue"],
      },
      {
        name: "Crime",
        syllabusReference: "Year 12, HSC Core Part I",
        subtopics: [
          "The nature of crime",
          "The criminal investigation process",
          "Criminal trial process",
          "Sentencing and punishment",
          "Young offenders",
          "International crime",
        ],
      },
      {
        name: "Human Rights",
        syllabusReference: "Year 12, HSC Core Part II",
        subtopics: [
          "Meaning of human rights",
          "Promoting and enforcing human rights",
          "Investigation of a contemporary human rights issue",
        ],
      },
      {
        name: "World Order",
        syllabusReference: "Year 12, HSC Option",
        subtopics: ["Nature and development of world order", "Responses to world order"],
      },
      {
        name: "Family Law",
        syllabusReference: "Year 12, HSC Option",
        subtopics: ["Nature of family law", "Responses to problems in family relationships"],
      },
      {
        name: "Workplace",
        syllabusReference: "Year 12, HSC Option",
        subtopics: ["Nature of employment relationships", "Regulation of employment"],
      },
    ],
  },
  {
    // English content is fundamentally text-specific (prescribed texts, essay
    // notes, quotes) rather than generic-topic-based — see spec section on
    // English workflow. This taxonomy captures the module structure only;
    // real practice content requires the student's own prescribed texts and
    // notes to be supplied (Phase 3). Uses the Advanced course's module
    // names, since Standard largely mirrors it minus the more literary
    // modules — differences can be reconciled once real content is added.
    name: "English",
    slug: "english",
    topics: [
      {
        name: "Reading to Write: Transition to Senior English",
        syllabusReference: "Year 11, Common Module",
        subtopics: ["Prose fiction", "Poetry", "Nonfiction", "Film", "Media/digital texts"],
      },
      {
        name: "Narratives that Shape our World",
        syllabusReference: "Year 11, Advanced Module",
        subtopics: ["Prescribed text study", "Related texts"],
      },
      {
        name: "Critical Study of Literature",
        syllabusReference: "Year 11, Advanced Module",
        subtopics: ["Prescribed text study"],
      },
      {
        name: "Language, Identity and Culture",
        syllabusReference: "Year 11, Advanced Module",
        subtopics: ["Prescribed text study", "Nonfiction/multimodal texts"],
      },
      {
        name: "Texts and Human Experiences",
        syllabusReference: "Year 12, HSC Common Module",
        subtopics: ["Prescribed text study", "Related texts", "Essay writing"],
      },
      {
        name: "Module A: Textual Conversations",
        syllabusReference: "Year 12, HSC Advanced Module A",
        subtopics: ["Comparative text study"],
      },
      {
        name: "Module B: Critical Study of Literature",
        syllabusReference: "Year 12, HSC Advanced Module B",
        subtopics: ["Prescribed text study"],
      },
      {
        name: "Module C: The Craft of Writing",
        syllabusReference: "Year 12, HSC Advanced Module C",
        subtopics: ["Imaginative writing", "Discursive writing", "Persuasive writing"],
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

createPrismaAdapter()
  .then((adapter) => {
    db = new PrismaClient({ adapter });
    return main();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
