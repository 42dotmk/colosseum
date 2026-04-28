/**
 * event controller
 */

import { factories } from '@strapi/strapi'
import {
  canUserRegisterNow,
  canUserRegisterForEvent,
  canUserSeeInviteOnlyEvent,
  isRegistrationOpenNow,
} from '../../../utils/event-registration';
import { getCurrentUser } from '../../../utils/current-user';

type LeaderboardVisibilityMode = 'public_only_live' | 'full_live';

type TestCaseLike = {
  documentId: string;
  hidden?: boolean;
  locked?: boolean;
  weight?: number;
};

type ExecutionLike = {
  processed?: boolean;
  passed?: boolean;
  stdout?: string;
  executionTime?: number;
  testCase?: {
    documentId: string;
    output?: string;
  };
};

type ProblemLike = {
  documentId: string;
  title?: string;
  points?: number;
  position: number;
  leaderboardVisibilityMode?: LeaderboardVisibilityMode;
  testCases?: TestCaseLike[];
};

type SubmissionLike = {
  documentId: string;
  createdAt?: string;
  metadata?: {
    mode?: string;
  };
  user?: {
    documentId: string;
    username?: string;
    email?: string;
  };
  problem?: {
    documentId: string;
  };
  executions?: ExecutionLike[];
};

type TrainingProblemLike = {
  documentId: string;
  testCases?: TestCaseLike[];
  position?: number;
};

type EventRegistrationLike = {
  documentId: string;
  registeredAt?: string;
  user?: {
    documentId?: string;
    id?: number;
    username?: string;
    email?: string;
  };
};

type EventLike = {
  documentId: string;
  title?: string;
  start?: string;
  end?: string;
  registrationMode?: 'open' | 'invite_only';
  allowedRegistrationUsers?: string | null;
  allowPostStartRegistration?: boolean;
  problems?: ProblemLike[];
};

type EventQuestionLike = {
  documentId: string;
  question?: string;
  answer?: string;
  answeredAt?: string;
  createdAt?: string;
  user?: {
    documentId?: string;
    username?: string;
    email?: string;
  };
  answeredBy?: {
    documentId?: string;
    username?: string;
    email?: string;
  };
};

const DEFAULT_POINTS = 100;

const getSafeWeight = (value?: number) =>
  typeof value === 'number' && value > 0 ? value : 1;

const round2 = (value: number) => Math.round(value * 100) / 100;

const isExecutionPassed = (execution?: ExecutionLike) => {
  if (!execution?.processed) {
    return false;
  }

  if (typeof execution.passed === 'boolean') {
    return execution.passed;
  }

  const stdout = (execution.stdout || '').trim();
  const expected = (execution.testCase?.output || '').trim();
  return stdout.length > 0 && stdout === expected;
};

const shouldUseTestCaseInLiveScore = (
  problem: ProblemLike,
  testCase: TestCaseLike,
  eventEnded: boolean,
) => {
  const mode: LeaderboardVisibilityMode =
    problem.leaderboardVisibilityMode || 'public_only_live';

  if (eventEnded) {
    return true;
  }

  if (mode === 'full_live') {
    return true;
  }

  return !testCase.hidden && !testCase.locked;
};

const getEventRegistrations = async (strapi: any, eventDocumentId: string) =>
  (await strapi.documents('api::event-registration.event-registration').findMany({
    filters: {
      event: {
        documentId: eventDocumentId,
      },
    },
    populate: ['user'],
    pagination: {
      page: 1,
      pageSize: 10000,
    },
  })) as EventRegistrationLike[];

const isUserRegisteredForEvent = (
  registrations: EventRegistrationLike[],
  user: any,
) => {
  if (!user) {
    return false;
  }

  return registrations.some((registration) => {
    const registrationUser = registration.user;
    if (!registrationUser) {
      return false;
    }

    if (
      registrationUser.documentId &&
      user.documentId &&
      registrationUser.documentId === user.documentId
    ) {
      return true;
    }

    if (
      typeof registrationUser.id === 'number' &&
      typeof user.id === 'number' &&
      registrationUser.id === user.id
    ) {
      return true;
    }

    return false;
  });
};

const ensureEventIsVisibleForUser = async (
  strapi: any,
  event: EventLike,
  user: any,
) => {
  const registrations = await getEventRegistrations(strapi, event.documentId);
  const isRegistered = isUserRegisteredForEvent(registrations, user);

  return canUserSeeInviteOnlyEvent(
    {
      documentId: event.documentId,
      registrationMode: event.registrationMode,
      allowedRegistrationUsers: event.allowedRegistrationUsers,
    },
    user,
    isRegistered,
  );
};

const hasEventStarted = (event: EventLike, nowMs = Date.now()) => {
  if (!event.start) {
    return true;
  }

  const startMs = new Date(event.start).getTime();
  if (Number.isNaN(startMs)) {
    return true;
  }

  return startMs <= nowMs;
};

const sanitizeEventForCompetitionView = (event: EventLike) => {
  if (hasEventStarted(event)) {
    return event;
  }

  return {
    ...event,
    problems: [],
  };
};

const reorderProblems = (problems: ProblemLike[], targetId: string, newPosition: number) => {
  const sorted = [...problems].sort((a, b) => (a.position || 0) - (b.position || 0));
  const index = sorted.findIndex(p => p.documentId === targetId);
  if (index === -1) return sorted;

  const [movingItem] = sorted.splice(index, 1);
  const boundedPosition = Math.max(1, Math.min(newPosition, sorted.length+1));
  sorted.splice(boundedPosition-1, 0, movingItem);

  return sorted.map((problem, index) => ({
    ...problem,
    position: index+1,
  }));
}

export default factories.createCoreController('api::event.event', ({ strapi }) => ({
  async find(ctx) {
    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const response = (await super.find(ctx)) as any;
    const events = response?.data || [];

    const visibilityChecks = await Promise.all(
      events.map(async (event: EventLike) => ({
        event,
        visible: await ensureEventIsVisibleForUser(strapi, event, user),
      })),
    );

    response.data = visibilityChecks
      .filter((entry) => entry.visible)
      .map((entry) => {
        const sanitizedEvent = sanitizeEventForCompetitionView(entry.event);
        if (sanitizedEvent.problems && Array.isArray(sanitizedEvent.problems))
          sanitizedEvent.problems.sort((a, b) => (a.position || 0) - (b.position || 0))
        return sanitizedEvent
      });

    if (response.meta?.pagination) {
      response.meta.pagination.total = response.data.length;
    }

    return response;
  },

  async findOne(ctx) {
    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const response = (await super.findOne(ctx)) as any;
    const event = response?.data as EventLike | undefined;

    if (!event) {
      return response;
    }

    const visible = await ensureEventIsVisibleForUser(strapi, event, user);
    if (!visible) {
      return ctx.notFound('Event not found');
    }

    const sanitizedEvent = sanitizeEventForCompetitionView(event);
    if (sanitizedEvent.problems && Array.isArray(sanitizedEvent.problems))
      sanitizedEvent.problems.sort((a, b) => (a.position || 0) - (b.position || 0));

    response.data = sanitizedEvent as any;

    return response;
  },

  async registrationStatus(ctx) {
    const eventId = ctx.params.id as string;
    if (!eventId) {
      return ctx.badRequest('Missing event id');
    }

    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const event = (await strapi.documents('api::event.event').findOne({
      documentId: eventId,
    })) as EventLike | null;

    if (!event) {
      return ctx.notFound('Event not found');
    }

    const registrations = await getEventRegistrations(strapi, event.documentId);
    const isRegistered = isUserRegisteredForEvent(registrations, user);
    const isEligible = canUserRegisterForEvent(
      {
        documentId: event.documentId,
        start: event.start,
        registrationMode: event.registrationMode,
        allowedRegistrationUsers: event.allowedRegistrationUsers,
        allowPostStartRegistration: event.allowPostStartRegistration,
      },
      user,
    );
    const registrationOpen = isRegistrationOpenNow({
      documentId: event.documentId,
      start: event.start,
      allowPostStartRegistration: event.allowPostStartRegistration,
    });
    const canRegister = canUserRegisterNow(
      {
        documentId: event.documentId,
        start: event.start,
        registrationMode: event.registrationMode,
        allowedRegistrationUsers: event.allowedRegistrationUsers,
        allowPostStartRegistration: event.allowPostStartRegistration,
      },
      user,
    );

    ctx.body = {
      eventId: event.documentId,
      registrationMode: event.registrationMode || 'open',
      allowPostStartRegistration: !!event.allowPostStartRegistration,
      registrationOpen,
      isEligible,
      isRegistered,
      canRegister: canRegister && !isRegistered,
    };
  },

  async register(ctx) {
    const eventId = ctx.params.id as string;
    if (!eventId) {
      return ctx.badRequest('Missing event id');
    }

    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const event = (await strapi.documents('api::event.event').findOne({
      documentId: eventId,
    })) as EventLike | null;

    if (!event) {
      return ctx.notFound('Event not found');
    }

    const canRegister = canUserRegisterNow(
      {
        documentId: event.documentId,
        start: event.start,
        registrationMode: event.registrationMode,
        allowedRegistrationUsers: event.allowedRegistrationUsers,
        allowPostStartRegistration: event.allowPostStartRegistration,
      },
      user,
    );

    if (!canRegister) {
      return ctx.forbidden('You are not allowed to register for this event');
    }

    const registrations = await getEventRegistrations(strapi, event.documentId);
    if (isUserRegisteredForEvent(registrations, user)) {
      ctx.body = {
        ok: true,
        alreadyRegistered: true,
      };
      return;
    }

    await (strapi.documents as any)('api::event-registration.event-registration').create({
      data: {
        event: event.documentId,
        user: user.documentId || user.id,
        registeredAt: new Date(),
      },
    });

    ctx.body = {
      ok: true,
      alreadyRegistered: false,
    };
  },

  async questions(ctx) {
    const eventId = ctx.params.id as string;
    if (!eventId) {
      return ctx.badRequest('Missing event id');
    }

    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const event = (await strapi.documents('api::event.event').findOne({
      documentId: eventId,
    })) as EventLike | null;

    if (!event) {
      return ctx.notFound('Event not found');
    }

    const visible = await ensureEventIsVisibleForUser(strapi, event, user);
    if (!visible) {
      return ctx.notFound('Event not found');
    }

    const records = (await strapi.documents('api::event-question.event-question').findMany({
      filters: {
        event: {
          documentId: event.documentId,
        },
        answer: {
          $notNull: true,
        },
      },
      populate: ['user', 'answeredBy'],
      sort: ['answeredAt:desc', 'createdAt:desc'],
      pagination: {
        page: 1,
        pageSize: 10000,
      },
    })) as EventQuestionLike[];

    ctx.body = {
      data: (records || []).map((record) => ({
        documentId: record.documentId,
        question: record.question || '',
        answer: record.answer || '',
        answeredAt: record.answeredAt || record.createdAt,
        askedBy: {
          documentId: record.user?.documentId,
          displayName: record.user?.username || record.user?.email || 'participant',
        },
        answeredBy: {
          documentId: record.answeredBy?.documentId,
          displayName: record.answeredBy?.username || record.answeredBy?.email || 'organizer',
        },
      })),
    };
  },

  async askQuestion(ctx) {
    const eventId = ctx.params.id as string;
    if (!eventId) {
      return ctx.badRequest('Missing event id');
    }

    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const event = (await strapi.documents('api::event.event').findOne({
      documentId: eventId,
    })) as EventLike | null;

    if (!event) {
      return ctx.notFound('Event not found');
    }

    const visible = await ensureEventIsVisibleForUser(strapi, event, user);
    if (!visible) {
      return ctx.notFound('Event not found');
    }

    const registrations = await getEventRegistrations(strapi, event.documentId);
    if (!isUserRegisteredForEvent(registrations, user)) {
      return ctx.forbidden('You must register for this event before posting questions');
    }

    const rawQuestion =
      ctx.request.body?.data?.question ||
      ctx.request.body?.question ||
      '';
    const question = String(rawQuestion).trim();

    if (!question) {
      return ctx.badRequest('Question is required');
    }

    if (question.length > 2000) {
      return ctx.badRequest('Question is too long');
    }

    const created = await strapi.documents('api::event-question.event-question').create({
      data: {
        question,
        event: event.documentId,
        user: user.documentId || user.id,
      },
    });

    ctx.body = {
      data: {
        documentId: created.documentId,
        question: created.question,
        createdAt: created.createdAt,
        status: 'pending_answer',
      },
    };
  },

  async trainingLeaderboard(ctx) {
    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const now = Date.now();

    const endedEvents = await strapi.documents('api::event.event').findMany({
      filters: {
        end: {
          $lt: new Date(now).toISOString(),
        },
      },
      populate: {
        problems: {
          populate: {
            testCases: true,
          },
        },
      },
      pagination: {
        page: 1,
        pageSize: 10000,
      },
    });

    const sortedEvents = ((endedEvents || []) as any[]).sort((a, b) =>
      new Date(a.end).getTime() - new Date(b.end).getTime());

    const trainingProblems: TrainingProblemLike[] = sortedEvents.flatMap((event: any) => {
      const eventProblems = (event.problems || []) as ProblemLike[];

      return eventProblems
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map(p => ({
          documentId: p.documentId,
          position: p.position,
          testCases: p.testCases
        }));
    });
    const uniqueProblems = Array.from(
      new Map(trainingProblems.map((problem) => [problem.documentId, problem]))
        .values()
    )

    const eligibleProblemIds = uniqueProblems
      .filter((problem) => (problem.testCases || []).some((testCase) => !testCase.hidden && !testCase.locked))
      .map((problem) => problem.documentId);

    if (eligibleProblemIds.length === 0) {
      ctx.body = {
        totals: {
          problems: 0,
        },
        leaderboard: [],
      };
      return;
    }

    const submissions = (await strapi.documents('api::submission.submission').findMany({
      filters: {
        problem: {
          documentId: {
            $in: eligibleProblemIds,
          },
        },
      },
      populate: ['user', 'problem', 'executions', 'executions.testCase'],
      pagination: {
        page: 1,
        pageSize: 10000,
      },
      sort: 'createdAt:asc',
    })) as SubmissionLike[];

    const practiceSubmissions = (submissions || []).filter(
      (submission) => submission?.metadata?.mode === 'practice',
    );

    const problemById = new Map(uniqueProblems.map((problem) => [problem.documentId, problem]));
    const usersById = new Map<string, { documentId: string; username?: string; email?: string }>();

    const byUserProblem = new Map<string, {
      solved: boolean;
      time: number;
      createdAtTs: number;
    }>();

    for (const submission of practiceSubmissions) {
      if (!submission.user?.documentId || !submission.problem?.documentId) {
        continue;
      }

      usersById.set(submission.user.documentId, submission.user);

      const problem = problemById.get(submission.problem.documentId);
      if (!problem) {
        continue;
      }

      const scopedCases = (problem.testCases || []).filter((testCase) => !testCase.hidden && !testCase.locked);
      if (scopedCases.length === 0) {
        continue;
      }

      const executionMap = new Map(
        (submission.executions || [])
          .filter((execution) => execution.testCase?.documentId)
          .map((execution) => [execution.testCase!.documentId, execution]),
      );

      let solved = true;
      let totalTime = 0;

      for (const testCase of scopedCases) {
        const execution = executionMap.get(testCase.documentId);
        if (!execution || !isExecutionPassed(execution)) {
          solved = false;
          break;
        }

        if (typeof execution.executionTime === 'number' && execution.executionTime >= 0) {
          totalTime += execution.executionTime;
        }
      }

      const createdAtTs = submission.createdAt
        ? new Date(submission.createdAt).getTime()
        : Number.MAX_SAFE_INTEGER;

      const key = `${submission.user.documentId}::${submission.problem.documentId}`;
      const existing = byUserProblem.get(key);

      if (!existing) {
        byUserProblem.set(key, {
          solved,
          time: totalTime,
          createdAtTs,
        });
        continue;
      }

      if (solved && !existing.solved) {
        byUserProblem.set(key, {
          solved: true,
          time: totalTime,
          createdAtTs,
        });
        continue;
      }

      if (solved && existing.solved) {
        const shouldReplace =
          totalTime < existing.time ||
          (totalTime === existing.time && createdAtTs < existing.createdAtTs);

        if (shouldReplace) {
          byUserProblem.set(key, {
            solved: true,
            time: totalTime,
            createdAtTs,
          });
        }
      }
    }

    const rows = new Map<string, {
      user: { documentId: string; username?: string; email?: string; displayName: string };
      solvedCount: number;
      totalTime: number;
    }>();

    for (const [key, result] of byUserProblem.entries()) {
      if (!result.solved) {
        continue;
      }

      const [userId] = key.split('::');
      const userRecord = usersById.get(userId);
      const displayName = userRecord?.username || userRecord?.email || `user-${userId.slice(0, 8)}`;

      if (!rows.has(userId)) {
        rows.set(userId, {
          user: {
            documentId: userId,
            username: userRecord?.username,
            email: userRecord?.email,
            displayName,
          },
          solvedCount: 0,
          totalTime: 0,
        });
      }

      const row = rows.get(userId)!;
      row.solvedCount += 1;
      row.totalTime += result.time;
    }

    const leaderboard = Array.from(rows.values())
      .sort((a, b) => {
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
        return a.user.displayName.localeCompare(b.user.displayName);
      })
      .map((row, index) => ({
        rank: index + 1,
        ...row,
      }));

    ctx.body = {
      totals: {
        problems: eligibleProblemIds.length,
      },
      leaderboard,
    };
  },

  async leaderboard(ctx) {
    const eventId = ctx.params.id as string;

    if (!eventId) {
      return ctx.badRequest('Missing event id');
    }

    const event = await strapi.documents('api::event.event').findOne({
      documentId: eventId,
      populate: {
        problems: {
          populate: {
            testCases: true,
          },
        },
      },
    });

    if (!event) {
      return ctx.notFound('Event not found');
    }

    const now = Date.now();
    const eventStarted = hasEventStarted(event as EventLike, now);
    const eventEnded = event.end ? new Date(event.end).getTime() <= now : false;

    if (!eventStarted) {
      ctx.body = {
        event: {
          documentId: event.documentId,
          title: event.title,
          start: event.start,
          end: event.end,
          eventStarted: false,
          eventEnded,
        },
        totals: {
          maxPoints: 0,
          scoredCap: 0,
        },
        leaderboardAvailable: false,
        problems: [],
        leaderboard: [],
      };
      return;
    }

    const uniqueProblems = Array.from(
      new Map(
        ((event.problems || []) as ProblemLike[])
          .filter((problem) => !!problem?.documentId)
          .map((problem) => [problem.documentId, problem]),
      ).values(),
    );

    const problems = uniqueProblems.map((problem) => ({
      ...problem,
      points:
        typeof problem.points === 'number' && problem.points >= 0
          ? problem.points
          : DEFAULT_POINTS,
      leaderboardVisibilityMode:
        (problem.leaderboardVisibilityMode as LeaderboardVisibilityMode) ||
        'public_only_live',
      testCases: problem.testCases || [],
    }));

    const registrations = await getEventRegistrations(strapi, event.documentId);

    const submissions = (await strapi.documents('api::submission.submission').findMany({
      filters: {
        event: {
          documentId: event.documentId,
        },
      },
      populate: ['user', 'problem', 'executions', 'executions.testCase'],
      pagination: {
        page: 1,
        pageSize: 10000,
      },
      sort: 'createdAt:asc',
    })) as SubmissionLike[];

    const problemMap = new Map(problems.map((problem) => [problem.documentId, problem]));
    const bestByUserProblem = new Map<string, {
      score: number;
      time: number;
      createdAtTs: number;
      maxScore: number;
      problemId: string;
    }>();

    for (const submission of submissions) {
      if (submission?.metadata?.mode === 'practice') {
        continue;
      }

      if (!submission.user?.documentId || !submission.problem?.documentId) {
        continue;
      }

      const problem = problemMap.get(submission.problem.documentId);
      if (!problem) {
        continue;
      }

      const scopedCases = (problem.testCases || []).filter((testCase) =>
        shouldUseTestCaseInLiveScore(problem, testCase, eventEnded),
      );

      const totalWeight = scopedCases.reduce(
        (sum, testCase) => sum + getSafeWeight(testCase.weight),
        0,
      );

      const executionMap = new Map(
        (submission.executions || [])
          .filter((execution) => execution.testCase?.documentId)
          .map((execution) => [execution.testCase!.documentId, execution]),
      );

      let passedWeight = 0;
      let totalExecutionTime = 0;

      for (const testCase of scopedCases) {
        const execution = executionMap.get(testCase.documentId);
        if (!execution?.processed) {
          continue;
        }

        const testWeight = getSafeWeight(testCase.weight);

        if (isExecutionPassed(execution)) {
          passedWeight += testWeight;
        }

        if (typeof execution.executionTime === 'number' && execution.executionTime >= 0) {
          totalExecutionTime += execution.executionTime;
        }
      }

      const problemMaxScore = problem.points || DEFAULT_POINTS;
      const rawScore = totalWeight > 0 ? (passedWeight / totalWeight) * problemMaxScore : 0;
      const score = round2(rawScore);
      const createdAtTs = submission.createdAt ? new Date(submission.createdAt).getTime() : Number.MAX_SAFE_INTEGER;

      const key = `${submission.user.documentId}::${problem.documentId}`;
      const existing = bestByUserProblem.get(key);

      const shouldReplace =
        !existing || createdAtTs >= existing.createdAtTs;

      if (shouldReplace) {
        bestByUserProblem.set(key, {
          score,
          time: totalExecutionTime,
          createdAtTs,
          maxScore: problemMaxScore,
          problemId: problem.documentId,
        });
      }
    }

    const usersById = new Map<string, { documentId: string; username?: string; email?: string }>();
    submissions.forEach((submission) => {
      if (submission.user?.documentId && !usersById.has(submission.user.documentId)) {
        usersById.set(submission.user.documentId, submission.user);
      }
    });

    registrations.forEach((registration) => {
      if (!registration.user?.documentId) {
        return;
      }

      if (!usersById.has(registration.user.documentId)) {
        usersById.set(registration.user.documentId, {
          documentId: registration.user.documentId,
          username: registration.user.username,
          email: registration.user.email,
        });
      }
    });

    const rows = new Map<string, {
      user: { documentId: string; username?: string; email?: string; displayName: string };
      totalScore: number;
      solvedCount: number;
      totalTime: number;
      lastSubmissionTs: number;
      byProblem: Record<string, { score: number; maxScore: number }>;
    }>();

    for (const [key, best] of bestByUserProblem.entries()) {
      const [userId] = key.split('::');
      const user = usersById.get(userId);
      const displayName = user?.username || user?.email || `user-${userId.slice(0, 8)}`;

      if (!rows.has(userId)) {
        rows.set(userId, {
          user: {
            documentId: userId,
            username: user?.username,
            email: user?.email,
            displayName,
          },
          totalScore: 0,
          solvedCount: 0,
          totalTime: 0,
          lastSubmissionTs: 0,
          byProblem: {},
        });
      }

      const row = rows.get(userId)!;
      row.totalScore += best.score;
      row.totalTime += best.time;
      row.lastSubmissionTs = Math.max(row.lastSubmissionTs, best.createdAtTs);
      row.byProblem[best.problemId] = {
        score: best.score,
        maxScore: best.maxScore,
      };

      if (best.score >= best.maxScore) {
        row.solvedCount += 1;
      }
    }

    for (const registration of registrations) {
      const registrationUser = registration.user;
      if (!registrationUser?.documentId) {
        continue;
      }

      if (rows.has(registrationUser.documentId)) {
        continue;
      }

      const displayName =
        registrationUser.username ||
        registrationUser.email ||
        `user-${registrationUser.documentId.slice(0, 8)}`;

      rows.set(registrationUser.documentId, {
        user: {
          documentId: registrationUser.documentId,
          username: registrationUser.username,
          email: registrationUser.email,
          displayName,
        },
        totalScore: 0,
        solvedCount: 0,
        totalTime: 0,
        lastSubmissionTs: registration.registeredAt
          ? new Date(registration.registeredAt).getTime()
          : Number.MAX_SAFE_INTEGER,
        byProblem: {},
      });
    }

    const ranked = Array.from(rows.values())
      .map((row) => ({
        ...row,
        totalScore: round2(row.totalScore),
        problemScores: problems.map((problem) => ({
          problemId: problem.documentId,
          score: row.byProblem[problem.documentId]?.score ?? 0,
          maxScore: row.byProblem[problem.documentId]?.maxScore ?? (problem.points || DEFAULT_POINTS),
        })),
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
        return a.lastSubmissionTs - b.lastSubmissionTs;
      })
      .map((row, index) => ({
        rank: index + 1,
        ...row,
      }));

    const totalMaxPoints = problems.reduce((sum, problem) => sum + (problem.points || DEFAULT_POINTS), 0);
    const totalScoredCap = problems.reduce((sum, problem) => {
      const scopedCases = (problem.testCases || []).filter((testCase) =>
        shouldUseTestCaseInLiveScore(problem, testCase, eventEnded),
      );

      if (scopedCases.length === 0) {
        return sum;
      }

      return sum + (problem.points || DEFAULT_POINTS);
    }, 0);

    ctx.body = {
      event: {
        documentId: event.documentId,
        title: event.title,
        start: event.start,
        end: event.end,
        eventStarted: true,
        eventEnded,
      },
      totals: {
        maxPoints: totalMaxPoints,
        scoredCap: totalScoredCap,
      },
      leaderboardAvailable: true,
      problems: problems.map((problem) => ({
        documentId: problem.documentId,
        title: problem.title,
        points: problem.points || DEFAULT_POINTS,
        leaderboardVisibilityMode: problem.leaderboardVisibilityMode || 'public_only_live',
      })),
      leaderboard: ranked,
    };
  },
  async reorder(ctx) {
    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const { problemId, newPosition } = ctx.request.body as any;
    if (typeof problemId !== 'string' || typeof newPosition !== 'number' || newPosition < 0) {
      return ctx.badRequest('Invalid problemId or newPosition');
    }

    const problem = await strapi.documents('api::problem.problem').findOne({
      documentId: problemId,
      populate: ['event'],
    }) as (ProblemLike & { event: { documentId: string } }) | null;
    if (!problem || !problem.event || !problem.event.documentId) {
      return ctx.notFound('Problem not found');
    }

    const allProblems = await strapi.documents('api::problem.problem').findMany({
      filters: {
        event: { documentId: problem.event.documentId },
      }
    }) as ProblemLike[];

    const reordered = reorderProblems(allProblems, problemId, newPosition);

    try {
      await Promise.all(
        reordered.map(async (p) => {
        return strapi.documents('api::problem.problem').update({
          documentId: p.documentId,
          data: {
            position: p.position,
          },
        });
      }));
      return ctx.send({ ok: true, data: reordered.map(p => ({ documentId: p.documentId, position: p.position })) });
    } catch (error) {
      strapi.log.error('Error reordering problems:', error);
      return ctx.internalServerError('Failed to reorder problems');
    }
  },
}));
