/**
 * submission controller
 */

import { connect } from '@colosseum/queue';
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::submission.submission', ({ strapi }) => ({
  async submit(ctx) {
    try {
      ctx.body = ctx.request.query;

      const id = ctx.request.query.id as string;
      if (!id) {
        ctx.body = { error: 'No submission id provided' };
        return;
      }

      const submission = await strapi.documents('api::submission.submission').findOne({
        documentId: id,
        populate: ['user', 'problem', 'language'],
      });

      if (!submission) {
        ctx.status = 404;
        ctx.body = { error: 'Submission not found' };
        return;
      }

      if (!submission.problem) {
        ctx.status = 400;
        ctx.body = { error: 'Submission has no problem' };
        return;
      }

      if (!submission.language) {
        ctx.status = 400;
        ctx.body = { error: 'Submission has no source code' };
        return;
      }

      if (submission.code === null) {
        ctx.status = 400;
        ctx.body = { error: 'Submission has no source code' };
        return;
      }

      const testCases = await strapi.documents('api::test-case.test-case').findMany({
        filters: {
          problem: { documentId: submission.problem.documentId },
        },
      });

      const executionsToQueue = [];
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
          },
        ],
        input: executionsToQueue.map((pair) => ({
          filename: pair.execution.documentId.toString(),
          content: pair.testCase.input,
          metadata: {
            testCaseId: pair.testCase.documentId,
            executionId: pair.execution.documentId,
          },
        })),
        options: {
          language: submission.language.codeName,
          entrypointFile: submission.language.entrypoint,
        },
        metadata: {
          submissionId: submission.documentId,
        },
      };

      const msg = JSON.stringify(qPayload);

      const { publish, disconnect } = await connect(strapi.config.get('server.app.rabbitUrl'));

      console.log('Connected to RabbitMQ');

      await publish('execution', msg);

      await disconnect();

      ctx.body = {
        state: 'Queued',
        executions: executionsToQueue.map((pair) => pair.execution.documentId),
      };
    } catch (err) {
      console.log(err);
      ctx.body = err;
    }
  },

  async getExecutions(ctx) {
    try {
      const ids = ctx.request.query.ids as string;
      if (!ids) {
        ctx.body = { error: 'No execution ids provided' };
        return;
      }

      const executionIds = ids.split(',').map((id) => id.trim());

      const executions = await strapi.documents('api::execution.execution').findMany({
        filters: {
          documentId: { $in: executionIds },
        },
        populate: ['testCase'],
      });

      const allProcessed = executions.every((exec) => exec.processed);
      const results = executions.map((exec) => {
        if (!exec.testCase) {
          throw new Error(`Execution ${exec.documentId} has no associated test case`);
        }

        return {
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
          },
        };
      });

      ctx.body = {
        complete: allProcessed,
        executions: results,
      };
    } catch (err) {
      console.error(err);
      ctx.body = { error: 'Failed to fetch executions' };
    }
  },
}));
