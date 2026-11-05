/**
 * training router
 */

import { factories } from '@strapi/strapi';
import { TrainingProblemLike } from '../../event/controllers/event';
import { getCurrentUser } from '../../../utils/current-user';

export default {
  async trainingProblems(ctx) {
		// auth: false on the route, so the check lives here: training problems are for signed-in users only
		const user = await getCurrentUser(strapi, ctx);
		if (!user) {
			return ctx.unauthorized('Authentication required');
		}

		const now = Date.now();

		const endedEvents = await strapi.documents('api::event.event').findMany({
			filters: {
				end: {
					$lt: now,
				},
			},
			populate: ['problems'],
		});
		const problems = ((endedEvents || []) as any[])
			.flatMap((event) => (event.problems || [])
			  // judge-side sources must never be sent to participants
			  .map((problem: any) => ({...problem, interactorSource: undefined, checkerSource: undefined, eventId: event.id, eventTitle: event.title})))
			.filter((problem: any) => !!problem?.documentId) as TrainingProblemLike[];
		//*/

		ctx.body = problems;
	},
};
