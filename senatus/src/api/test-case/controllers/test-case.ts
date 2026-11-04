/**
 * test-case controller
 *
 * Participants may be allowed to read test cases (the problem page populates them), so
 * hidden/locked cases must never leak through the public REST API: locked cases are dropped,
 * hidden cases lose their input/output/explanation.
 */

import { factories } from '@strapi/strapi'

const sanitizeTestCase = (testCase: any) => {
  if (!testCase || testCase.locked) {
    return null;
  }
  if (!testCase.hidden) {
    return testCase;
  }
  return { ...testCase, input: undefined, output: undefined, explanation: undefined };
};

export default factories.createCoreController('api::test-case.test-case', () => ({
  async find(ctx) {
    const response: any = await super.find(ctx);
    if (Array.isArray(response?.data)) {
      response.data = response.data.map(sanitizeTestCase).filter(Boolean);
      if (response.meta?.pagination) {
        response.meta.pagination.total = response.data.length;
      }
    }
    return response;
  },

  async findOne(ctx) {
    const response: any = await super.findOne(ctx);
    const sanitized = sanitizeTestCase(response?.data);
    if (!sanitized) {
      return ctx.notFound('Test case not found');
    }
    response.data = sanitized;
    return response;
  },
}));
