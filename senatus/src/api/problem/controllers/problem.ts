/**
 * problem controller
 */

import { factories } from '@strapi/strapi'
import { canUserRegisterForEvent } from '../../../utils/event-registration';
import { getCurrentUser } from '../../../utils/current-user';

const sanitizeProblemTestCases = (problem: any) => {
	if (!problem || !Array.isArray(problem.testCases)) {
		return problem;
	}

	const sanitizedTestCases = problem.testCases
		.filter((testCase: any) => !testCase?.locked)
		.map((testCase: any) => {
			if (!testCase?.hidden) {
				return testCase;
			}

			return {
				...testCase,
				input: undefined,
				output: undefined,
				explanation: undefined,
			};
		});

	return {
		...problem,
		testCases: sanitizedTestCases,
	};
};

const isUserRegisteredForEvent = (registrations: any[], user: any) =>
	registrations.some((registration) => {
		const registrationUser = registration?.user;
		if (!registrationUser || !user) {
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

export default factories.createCoreController('api::problem.problem', ({ strapi }) => ({
	async findOne(ctx) {
		const user = await getCurrentUser(strapi, ctx);
		if (!user) {
			return ctx.unauthorized('Authentication required');
		}

		const problemId = ctx.params.id as string;
		const problem = await strapi.documents('api::problem.problem').findOne({
			documentId: problemId,
			populate: ['event'],
		});

		if (!problem) {
			return ctx.notFound('Problem not found');
		}

		const event = problem.event;
		if (!event?.documentId) {
			return ctx.forbidden('Problem is not available for competition');
		}

		if (event.start) {
			const eventStartMs = new Date(event.start).getTime();
			if (!Number.isNaN(eventStartMs) && eventStartMs > Date.now()) {
				return ctx.forbidden('Problems will be available when the event starts');
			}
		}

		if (event.end) {
			const eventEndMs = new Date(event.end).getTime();
			if (!Number.isNaN(eventEndMs) && eventEndMs < Date.now()) {
				const response = await super.findOne(ctx);
				if ((response as any)?.data) {
					(response as any).data = sanitizeProblemTestCases((response as any).data);
					return response;
				}

				return sanitizeProblemTestCases(response);
			}
		}

		const registrations = await strapi.documents('api::event-registration.event-registration').findMany({
			filters: {
				event: {
					documentId: event.documentId,
				},
			},
			populate: ['user'],
			pagination: {
				page: 1,
				pageSize: 10000,
			},
		});

		const isRegistered = isUserRegisteredForEvent(registrations, user);
		const isEligible = canUserRegisterForEvent(
			{
				documentId: event.documentId,
				registrationMode: event.registrationMode,
				allowedRegistrationUsers: event.allowedRegistrationUsers,
			},
			user,
		);

		if (!isRegistered || !isEligible) {
			return ctx.forbidden('You must be registered for this event to access problems');
		}

		const response = await super.findOne(ctx);
		if ((response as any)?.data) {
			(response as any).data = sanitizeProblemTestCases((response as any).data);
			return response;
		}

		return sanitizeProblemTestCases(response);
	},
}));
