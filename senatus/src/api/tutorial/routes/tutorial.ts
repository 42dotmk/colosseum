/**
 * tutorial router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::tutorial.tutorial', {
	config: {
		find: {
			auth: false,
		},
		findOne: {
			auth: false,
		},
	},
});
