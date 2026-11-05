/**
 * event-registration controller
 */

import { factories } from '@strapi/strapi'
import { getCurrentUser, isApiTokenRequest } from '../../../utils/current-user';

const getCurrentUserFilter = (user: any) => {
	if (user?.documentId) {
		return { documentId: user.documentId };
	}

	if (typeof user?.id === 'number') {
		return { id: user.id };
	}

	return null;
};

export default factories.createCoreController('api::event-registration.event-registration', ({ strapi }) => ({
	async find(ctx) {
		const user = await getCurrentUser(strapi, ctx);
		if (!user) {
			// Admin-issued API tokens are trusted server-to-server credentials: Strapi already enforced their permissions
			if (isApiTokenRequest(ctx)) {
			  return super.find(ctx);
			}
			return ctx.unauthorized('Authentication required');
		}

		const userFilter = getCurrentUserFilter(user);
		if (!userFilter) {
			return ctx.unauthorized('Authentication required');
		}

		const sortQuery = ctx.query?.sort;
		const sort = Array.isArray(sortQuery) ? sortQuery.join(',') : (sortQuery || 'registeredAt:desc');

		const registrations = await strapi.documents('api::event-registration.event-registration').findMany({
			filters: {
				user: userFilter,
			},
			populate: ['event'],
			sort,
			pagination: {
				page: 1,
				pageSize: 10000,
			},
		});

		ctx.body = {
			data: registrations,
			meta: {
				pagination: {
					page: 1,
					pageSize: registrations.length,
					pageCount: 1,
					total: registrations.length,
				},
			},
		};
	},
}));
