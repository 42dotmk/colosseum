/**
 * tutorial controller
 */

import { factories } from '@strapi/strapi'
export default factories.createCoreController(
  'api::tutorial.tutorial',
  ({ strapi }) => ({
    async find(ctx) {
      const data = await strapi.documents('api::tutorial.tutorial').findMany({
        ...ctx.query,
        populate: ['thumbnail', 'relatedProblem'],
      });

      return { data };
    }
  })
);
