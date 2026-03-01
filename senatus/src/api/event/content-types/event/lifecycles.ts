type ProblemRef = string;

type ProblemLike = {
  id?: number;
  documentId: string;
  title?: string;
  description?: string;
  points?: number;
  leaderboardVisibilityMode?: 'public_only_live' | 'full_live';
  starterCodes?: Array<{
    code?: string;
    language?: {
      id?: number;
      documentId?: string;
    };
  }>;
  testCases?: Array<{
    input?: string;
    output?: string;
    hidden?: boolean;
    locked?: boolean;
    weight?: number;
    explanation?: string;
  }>;
  event?: {
    documentId?: string;
  };
  isSnapshot?: boolean;
  snapshotSource?: {
    documentId?: string;
  };
};

const normalizeProblemRef = (value: any): string | null => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  if (value.documentId) {
    return String(value.documentId);
  }

  if (value.id) {
    return String(value.id);
  }

  return null;
};

const extractProblemRefs = (problems: any): ProblemRef[] => {
  if (!problems) {
    return [];
  }

  if (Array.isArray(problems)) {
    return problems
      .map(normalizeProblemRef)
      .filter((value): value is string => !!value);
  }

  if (typeof problems === 'object') {
    const refs = [
      ...(Array.isArray(problems.set) ? problems.set : []),
      ...(Array.isArray(problems.connect) ? problems.connect : []),
    ]
      .map(normalizeProblemRef)
      .filter((value): value is string => !!value);

    return refs;
  }

  return [];
};

const resolveEventDocumentIdFromParams = async (strapi: any, params: any) => {
  const documentId = params?.where?.documentId;
  if (documentId) {
    return documentId;
  }

  const id = params?.where?.id;
  if (!id) {
    return null;
  }

  const event = await strapi.db.query('api::event.event').findOne({
    where: { id },
    select: ['documentId'],
  });

  return event?.documentId || null;
};

const getEventWithProblems = async (strapi: any, eventDocumentId: string) =>
  (await strapi.documents('api::event.event').findOne({
    documentId: eventDocumentId,
    populate: {
      problems: {
        populate: {
          event: true,
          snapshotSource: true,
          testCases: true,
          starterCodes: {
            populate: {
              language: true,
            },
          },
        },
      },
    },
  })) as { documentId: string; problems?: ProblemLike[] } | null;

const createProblemSnapshot = async (strapi: any, eventDocumentId: string, problem: ProblemLike) => {
  const now = new Date();

  const sourceDocumentId = problem.snapshotSource?.documentId || problem.documentId;

  const starterCodes = (problem.starterCodes || []).map((starterCode) => ({
    code: starterCode.code || '',
    language: starterCode.language?.documentId || starterCode.language?.id,
  }));

  const createdProblem = await strapi.documents('api::problem.problem').create({
    data: {
      title: problem.title,
      description: problem.description,
      points: problem.points,
      leaderboardVisibilityMode: problem.leaderboardVisibilityMode,
      starterCodes,
      event: eventDocumentId,
      isSnapshot: true,
      snapshotSource: sourceDocumentId,
      publishedAt: now,
    },
    status: 'published',
  });

  for (const testCase of problem.testCases || []) {
    await strapi.documents('api::test-case.test-case').create({
      data: {
        input: testCase.input,
        output: testCase.output,
        hidden: testCase.hidden,
        locked: testCase.locked,
        weight: testCase.weight,
        explanation: testCase.explanation,
        problem: createdProblem.documentId,
        publishedAt: now,
      },
      status: 'published',
    });
  }

  return createdProblem.documentId as string;
};

const snapshotAssignedProblems = async (strapi: any, event: any) => {
  const refs = (event.state?.selectedProblemRefs || []) as string[];
  if (refs.length === 0) {
    return;
  }

  const eventDocumentId =
    event.result?.documentId || (await resolveEventDocumentIdFromParams(strapi, event.params));

  if (!eventDocumentId) {
    return;
  }

  const currentEvent = await getEventWithProblems(strapi, eventDocumentId);
  if (!currentEvent) {
    return;
  }

  const selectedProblems = (currentEvent.problems || []).filter((problem) => {
    const byDocumentId = refs.includes(problem.documentId);
    const byId = typeof problem.id === 'number' ? refs.includes(String(problem.id)) : false;
    return byDocumentId || byId;
  });

  const originalsToClone = selectedProblems.filter((problem) => !problem.isSnapshot);
  if (originalsToClone.length === 0) {
    return;
  }

  const cloneByOriginal = new Map<string, string>();
  for (const original of originalsToClone) {
    const cloneDocumentId = await createProblemSnapshot(strapi, eventDocumentId, original);
    cloneByOriginal.set(original.documentId, cloneDocumentId);
  }

  const updatedProblemRefs = (currentEvent.problems || []).map((problem) =>
    cloneByOriginal.get(problem.documentId) || problem.documentId,
  );

  await strapi.documents('api::event.event').update({
    documentId: eventDocumentId,
    data: {
      problems: updatedProblemRefs,
    },
  });

  const previousEventByProblem = (event.state?.previousEventByProblem || {}) as Record<string, string>;

  for (const original of originalsToClone) {
    const previousEventDocumentId = previousEventByProblem[original.documentId];
    await strapi.documents('api::problem.problem').update({
      documentId: original.documentId,
      data: {
        event: previousEventDocumentId || null,
      },
    });
  }
};

export default {
  async beforeCreate(event: any) {
    event.state = event.state || {};
    event.state.selectedProblemRefs = extractProblemRefs(event.params?.data?.problems);
  },

  async beforeUpdate(event: any) {
    event.state = event.state || {};

    const selectedProblemRefs = extractProblemRefs(event.params?.data?.problems);
    event.state.selectedProblemRefs = selectedProblemRefs;

    if (selectedProblemRefs.length === 0) {
      return;
    }

    const allProblems = (await strapi.documents('api::problem.problem').findMany({
      populate: ['event'],
      pagination: {
        page: 1,
        pageSize: 10000,
      },
    })) as ProblemLike[];

    const previousEventByProblem: Record<string, string> = {};

    for (const problem of allProblems) {
      const byDocumentId = selectedProblemRefs.includes(problem.documentId);
      const byId = typeof problem.id === 'number' ? selectedProblemRefs.includes(String(problem.id)) : false;

      if (!byDocumentId && !byId) {
        continue;
      }

      if (problem.event?.documentId) {
        previousEventByProblem[problem.documentId] = problem.event.documentId;
      }
    }

    event.state.previousEventByProblem = previousEventByProblem;
  },

  async afterCreate(event: any) {
    await snapshotAssignedProblems(strapi, event);
  },

  async afterUpdate(event: any) {
    await snapshotAssignedProblems(strapi, event);
  },
};
