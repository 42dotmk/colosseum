import { getCurrentUser } from '../../../utils/current-user';
import { canUserSeeInviteOnlyEvent } from '../../../utils/event-registration';

type EventLike = {
  documentId: string;
  registrationMode?: 'open' | 'invite_only';
  allowedRegistrationUsers?: string | null;
};

type EventRegistrationLike = {
  user?: {
    documentId?: string;
    id?: number;
  };
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

const isUserRegisteredForEvent = (registrations: EventRegistrationLike[], user: any) => {
  if (!user) {
    return false;
  }

  return registrations.some((registration) => {
    const registrationUser = registration.user;
    if (!registrationUser) {
      return false;
    }

    if (registrationUser.documentId && user.documentId) {
      return registrationUser.documentId === user.documentId;
    }

    if (typeof registrationUser.id === 'number' && typeof user.id === 'number') {
      return registrationUser.id === user.id;
    }

    return false;
  });
};

const ensureEventIsVisibleForUser = async (strapi: any, event: EventLike, user: any) => {
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

export default {
  async questions(ctx: any) {
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

    const records = await strapi.documents('api::event-question.event-question').findMany({
      filters: {
        event: {
          documentId: event.documentId,
        },
        answer: {
          $notNull: true,
        },
      },
      populate: ['answeredBy'],
      sort: ['answeredAt:desc', 'createdAt:desc'],
      pagination: {
        page: 1,
        pageSize: 10000,
      },
    });

    ctx.body = {
      data: (records || []).map((record: any) => ({
        documentId: record.documentId,
        question: record.question || '',
        answer: record.answer || '',
        answeredAt: record.answeredAt || record.createdAt,
        answeredBy: {
          documentId: record.answeredBy?.documentId,
          displayName: record.answeredBy?.username || record.answeredBy?.email || 'organizer',
        },
      })),
    };
  },

  async askQuestion(ctx: any) {
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
};
