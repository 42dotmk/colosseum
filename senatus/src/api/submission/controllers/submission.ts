/**
 * submission controller
 */

import { connect } from '@colosseum/queue';
import { factories } from '@strapi/strapi'
import { canUserRegisterForEvent, normalizeComparableIdentifiers } from '../../../utils/event-registration';
import { getCurrentUser } from '../../../utils/current-user';

let queueClientPromise: Promise<Awaited<ReturnType<typeof connect>>> | null = null;

const getQueueClient = async (strapi: any) => {
  if (!queueClientPromise) {
    queueClientPromise = connect(strapi.config.get('server.app.rabbitUrl'));
  }

  try {
    return await queueClientPromise;
  } catch (error) {
    queueClientPromise = null;
    throw error;
  }
};

const publishExecutionJob = async (strapi: any, msg: string, maxAttempts = 3) => {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const queueClient = await getQueueClient(strapi);
      await queueClient.publish('execution', msg);
      return;
    } catch (error) {
      lastError = error;
      queueClientPromise = null;

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
      }
    }
  }

  throw lastError;
};

const getEventRegistrations = async (strapi: any, eventDocumentId: string) =>
  await strapi.documents('api::event-registration.event-registration').findMany({
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
  });

type CompetitionBlockReason = {
  code: 'EVENT_NOT_STARTED' | 'EVENT_ENDED' | 'EVENT_REGISTRATION_REQUIRED' | 'EVENT_NOT_ELIGIBLE';
  message: string;
  details: Record<string, any>;
};

type CompetitionGuardOptions = {
  allowEndedPractice?: boolean;
};

const isUserRegisteredForEvent = (registrations: any[], user: any) =>
  registrations.some((registration) => {
    const registrationUser = registration?.user;
    if (!registrationUser || !user) {
      return false;
    }

    const registrationIdentifiers = normalizeComparableIdentifiers(registrationUser);
    const userIdentifiers = normalizeComparableIdentifiers(user);
    if (!registrationIdentifiers.length || !userIdentifiers.length) {
      return false;
    }

    return registrationIdentifiers.some((identifier) => userIdentifiers.includes(identifier));
  });

const getCompetitionBlockReason = async (
  strapi: any,
  user: any,
  event: any,
  options: CompetitionGuardOptions = {},
) => {
  if (!event?.documentId || !user) {
    return {
      code: 'EVENT_REGISTRATION_REQUIRED',
      message: 'Problem is not linked to a valid event',
      details: {
        eventDocumentId: event?.documentId || null,
      },
    } as CompetitionBlockReason;
  }

  if (event.start) {
    const eventStartMs = new Date(event.start).getTime();
    if (!Number.isNaN(eventStartMs) && eventStartMs > Date.now()) {
      return {
        code: 'EVENT_NOT_STARTED',
        message: 'Event has not started yet',
        details: {
          eventDocumentId: event.documentId,
          eventStart: event.start,
          now: new Date().toISOString(),
        },
      } as CompetitionBlockReason;
    }
  }

  if (event.end) {
    const eventEndMs = new Date(event.end).getTime();
    if (!Number.isNaN(eventEndMs) && eventEndMs < Date.now()) {
      if (options.allowEndedPractice) {
        return null;
      }

      return {
        code: 'EVENT_ENDED',
        message: 'Event has ended. Submissions are disabled.',
        details: {
          eventDocumentId: event.documentId,
          eventEnd: event.end,
          now: new Date().toISOString(),
        },
      } as CompetitionBlockReason;
    }
  }

  const registrations = await getEventRegistrations(strapi, event.documentId);
  if (!isUserRegisteredForEvent(registrations, user)) {
    return {
      code: 'EVENT_REGISTRATION_REQUIRED',
      message: 'You must register for this event before submitting',
      details: {
        eventDocumentId: event.documentId,
        userIdentifiers: normalizeComparableIdentifiers(user),
        registrationCount: registrations.length,
      },
    } as CompetitionBlockReason;
  }

  const eligible = canUserRegisterForEvent(
    {
      documentId: event.documentId,
      registrationMode: event.registrationMode,
      allowedRegistrationUsers: event.allowedRegistrationUsers,
    },
    user,
  );

  if (!eligible) {
    return {
      code: 'EVENT_NOT_ELIGIBLE',
      message: 'You are not eligible to compete in this event',
      details: {
        eventDocumentId: event.documentId,
        registrationMode: event.registrationMode || 'open',
        userIdentifiers: normalizeComparableIdentifiers(user),
      },
    } as CompetitionBlockReason;
  }

  return null;
};

const respondForbiddenWithReason = (ctx: any, reason: CompetitionBlockReason) => {
  ctx.status = 403;
  ctx.body = {
    error: {
      status: 403,
      name: 'ForbiddenError',
      message: reason.message,
      details: {
        code: reason.code,
        ...reason.details,
      },
    },
  };
};

const isOwnedByUser = (owner: any, user: any) => {
  if (!owner || !user) {
    return false;
  }

  if (owner.documentId && user.documentId) {
    return owner.documentId === user.documentId;
  }

  if (typeof owner.id === 'number' && typeof user.id === 'number') {
    return owner.id === user.id;
  }

  return false;
};

const getCurrentUserFilter = (user: any) => {
  if (user?.documentId) {
    return { documentId: user.documentId };
  }

  if (typeof user?.id === 'number') {
    return { id: user.id };
  }

  return null;
};

const sanitizeExecutionForParticipant = (execution: any) => {
  if (!execution) {
    return null;
  }

  const testCase = execution.testCase;
  const isLocked = !!testCase?.locked;
  const isHidden = !!testCase?.hidden;

  if (isLocked) {
    return null;
  }

  const nextExecution = {
    ...execution,
  };

  if (isHidden) {
    nextExecution.stdout = '';
    nextExecution.stderr = '';
  }

  if (testCase) {
    nextExecution.testCase = {
      ...testCase,
      input: isHidden ? undefined : testCase.input,
      output: isHidden ? undefined : testCase.output,
      explanation: isHidden ? undefined : testCase.explanation,
    };
  }

  return nextExecution;
};

const sanitizeExecutionsForParticipant = (executions: any[]) =>
  (executions || [])
    .map((execution) => sanitizeExecutionForParticipant(execution))
    .filter((execution): execution is any => !!execution);

const sanitizeSubmissionForParticipant = (submission: any) => {
  if (!submission || !Array.isArray(submission.executions)) {
    return submission;
  }

  return {
    ...submission,
    executions: sanitizeExecutionsForParticipant(submission.executions),
  };
};

const sanitizeSubmissionCollectionResponse = (response: any) => {
  if (Array.isArray(response?.data)) {
    response.data = response.data.map((entry: any) => sanitizeSubmissionForParticipant(entry));
    return response;
  }

  if (Array.isArray(response)) {
    return response.map((entry: any) => sanitizeSubmissionForParticipant(entry));
  }

  return sanitizeSubmissionForParticipant(response);
};

export default factories.createCoreController('api::submission.submission', ({ strapi }) => ({
  async find(ctx) {
    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const response = (await super.find(ctx)) as any;
    const entries = Array.isArray(response?.data)
      ? response.data
      : (Array.isArray(response) ? response : []);

    if (entries.length === 0) {
      return response;
    }

    const submissionIds = entries
      .map((entry: any) => entry?.documentId)
      .filter(Boolean);

    if (submissionIds.length === 0) {
      if (Array.isArray(response?.data)) {
        response.data = [];
        if (response?.meta?.pagination) {
          response.meta.pagination.total = 0;
        }
        return response;
      }
      return [];
    }

    const ownershipRecords = await strapi.documents('api::submission.submission').findMany({
      filters: {
        documentId: { $in: submissionIds },
      },
      populate: ['user'],
      pagination: {
        page: 1,
        pageSize: 10000,
      },
    });

    const ownedIds = new Set(
      (ownershipRecords || [])
        .filter((record: any) => isOwnedByUser(record?.user, user))
        .map((record: any) => record.documentId)
        .filter(Boolean),
    );

    const filteredEntries = entries.filter((entry: any) => ownedIds.has(entry?.documentId));

    if (Array.isArray(response?.data)) {
      response.data = filteredEntries;
      if (response?.meta?.pagination) {
        response.meta.pagination.total = filteredEntries.length;
      }
      return sanitizeSubmissionCollectionResponse(response);
    }

    return sanitizeSubmissionCollectionResponse(filteredEntries);
  },

  async findOne(ctx) {
    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const submission = await strapi.documents('api::submission.submission').findOne({
      documentId: ctx.params.id,
      populate: ['user'],
    });

    if (!submission || !isOwnedByUser(submission.user, user)) {
      return ctx.notFound('Submission not found');
    }

    const response = await super.findOne(ctx);
    return sanitizeSubmissionCollectionResponse(response);
  },

  async create(ctx) {
    const user = await getCurrentUser(strapi, ctx);
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const problemId = ctx.request.body?.data?.problem as string | undefined;
    if (!problemId) {
      return ctx.badRequest('Problem is required');
    }

    const problem = await strapi.documents('api::problem.problem').findOne({
      documentId: problemId,
      populate: ['event'],
    });

    if (!problem?.event?.documentId) {
      return ctx.badRequest('Problem is not linked to an event');
    }

    const payload = ctx.request.body?.data || {};
    const isPracticeSubmission =
      payload?.mode === 'practice' ||
      payload?.metadata?.mode === 'practice';

    if (isPracticeSubmission) {
      const eventEndMs = problem.event?.end ? new Date(problem.event.end).getTime() : Number.NaN;
      if (Number.isNaN(eventEndMs) || eventEndMs > Date.now()) {
        return ctx.forbidden('Practice mode is available only for ended events');
      }
    } else {
      const blockReason = await getCompetitionBlockReason(strapi, user, problem.event);
      if (blockReason) {
        respondForbiddenWithReason(ctx, blockReason);
        return;
      }
    }

    const createdSubmission = await strapi.documents('api::submission.submission').create({
      data: {
        code: payload.code,
        language: payload.language,
        problem: problemId,
        user: user.documentId || user.id,
        event: isPracticeSubmission ? null : problem.event.documentId,
        metadata: {
          ...(payload.metadata || {}),
          mode: isPracticeSubmission ? 'practice' : (payload?.metadata?.mode || 'competition'),
          sourceEvent: problem.event.documentId,
        },
        publishedAt: new Date(),
      },
      status: 'published',
    });

    ctx.body = {
      data: createdSubmission,
      meta: {},
    };
  },

  async submit(ctx) {
    try {
      ctx.body = ctx.request.query;

      const user = await getCurrentUser(strapi, ctx);
      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const id = ctx.request.query.id as string;
      if (!id) {
        ctx.body = { error: 'No submission id provided' };
        return;
      }
      
      const submission = await strapi.documents('api::submission.submission').findOne({
        documentId: id,
        populate: ['user', 'problem', 'problem.event', 'language']
      });

      if (!submission) {
        ctx.body = { error: 'Submission not found' };
        return;
      }

      if (!isOwnedByUser(submission.user, user)) {
        return ctx.notFound('Submission not found');
      }

      const testCases = await strapi.documents('api::test-case.test-case').findMany({
        filters: {
          problem: { documentId: submission.problem.documentId as any },
        }
      });

      const submissionMode = (submission?.metadata as any)?.mode;
      const isPracticeSubmission = submissionMode === 'practice';
      if (!isPracticeSubmission) {
        const blockReason = await getCompetitionBlockReason(strapi, user, submission.problem?.event);
        if (blockReason) {
          respondForbiddenWithReason(ctx, blockReason);
          return;
        }
      }

      const executionsToQueue: { testCase: any, execution: any }[] = [];
      for (const testCase of testCases) {
        const execution = await strapi.documents('api::execution.execution').create({
          data: {
            stdout: '',
            stderr: '',
            executionTime: -1,
            testCase: testCase.id,
            submission: submission.id,
            processed: false,
            publishedAt: new Date(),
            code: submission.code,
          },
          status: 'published',
        });
        executionsToQueue.push({
          testCase,
          execution,
        });
      }

      const qPayload = {
        sources: [
          {
            filename: submission.language.entrypoint,
            content: submission.code,
          }
        ],
        input: executionsToQueue.map(pair => ({
          filename: pair.execution.documentId.toString(),
          content: pair.testCase.input,
          metadata: {
            testCaseId: pair.testCase.documentId,
            executionId: pair.execution.documentId,
          }
        })),
        options: {
          language: submission.language.codeName,
          entrypointFile: submission.language.entrypoint,
        },
        metadata: {
          submissionId: submission.documentId,
        }
      };

      const msg = JSON.stringify(qPayload);

      try {
        await publishExecutionJob(strapi, msg, 3);
      } catch (publishError: any) {
        for (const pair of executionsToQueue) {
          await strapi.documents('api::execution.execution').update({
            documentId: pair.execution.documentId,
            data: {
              processed: true,
              passed: false,
              stderr: `Queue publish failed: ${publishError?.message || 'unknown error'}`,
            },
          });
        }

        return ctx.internalServerError('Execution queue is temporarily unavailable. Please retry.');
      }

      ctx.body = {
        state: 'Queued',
        executions: executionsToQueue.map(pair => pair.execution.documentId),
      }
    } catch (err) {
      console.log(err);
      ctx.body = err;
    }
  },

  async getExecutions(ctx) {
    try {
      const user = await getCurrentUser(strapi, ctx);
      if (!user) {
        return ctx.unauthorized('Authentication required');
      }

      const userFilter = getCurrentUserFilter(user);
      if (!userFilter) {
        return ctx.unauthorized('Authentication required');
      }

      const ids = ctx.request.query.ids as string;
      if (!ids) {
        ctx.body = { error: 'No execution ids provided' };
        return;
      }

      const executionIds = ids.split(',').map(id => id.trim());
      
      const executions = await strapi.documents('api::execution.execution').findMany({
        filters: {
          documentId: { $in: executionIds },
        },
        populate: ['testCase', 'submission', 'submission.user']
      });

      const ownedExecutions = (executions || []).filter((execution: any) =>
        isOwnedByUser(execution?.submission?.user, user)
      );

      const sanitizedExecutions = sanitizeExecutionsForParticipant(ownedExecutions);

      const allProcessed = sanitizedExecutions.every(exec => exec.processed);
      const results = sanitizedExecutions
      .filter((exec: any) => !!exec?.testCase?.documentId)
      .map(exec => ({
        id: exec.documentId,
        processed: exec.processed,
        passed: exec.passed,
        executionTime: exec.executionTime,
        stdout: exec.stdout,
        stderr: exec.stderr,
        testCase: {
          id: exec.testCase.documentId,
          input: exec.testCase.input,
          output: exec.testCase.output,
          hidden: !!exec.testCase.hidden,
          locked: !!exec.testCase.locked,
        }
      }));

      ctx.body = {
        complete: allProcessed,
        executions: results,
      };
    } catch (err) {
      console.error(err);
      ctx.body = { error: 'Failed to fetch executions' };
    }
  }
}));
