/**
 * training router
 */

import { factories } from '@strapi/strapi';
import { TrainingProblemLike } from '../../event/controllers/event';

export default {
  async trainingProblems(ctx) {
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
			  .map((problem: any) => ({...problem, eventId: event.id, eventTitle: event.title})))
			.filter((problem: any) => !!problem?.documentId) as TrainingProblemLike[];
		//*/

		ctx.body = problems;
	},
};
