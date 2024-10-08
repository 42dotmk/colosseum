/**
 * submission controller
 */

import { connect } from '@colosseum/queue/amqp';
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::submission.submission', ({ strapi }) => ({
  async submit(ctx) {
    try {
      ctx.body = ctx.request.query;

      const id = parseInt(ctx.request.query.id as string);
      if (!id) {
        ctx.body = 'Please provide an id';
        return;
      }
      const entry = await strapi.documents('api::submission.submission').findOne({
        documentId: "__TODO__",
        populate: ['user', 'problem', 'language']
      });

      const testCases = await strapi.documents('api::test-case.test-case').findMany({
        filters: {
          problem: entry.problem.id as any,
        }
      });

      if (!entry) {
        ctx.body = 'Submission not found';
        return;
      }

      const executionsToQueue: { testCase: any, execution: any }[] = [];
      for (const testCase of testCases) {
        const execution = await strapi.documents('api::execution.execution').create({
          data: {
            stdout: '',
            stderr: '',
            executionTime: -1,
            testCase: testCase.id,
            submission: entry.id,
            processed: false,
            publishedAt: new Date(),
            code: entry.code,
          }
        });
        executionsToQueue.push({
          testCase,
          execution,
        });
      }

      const qPayload = {
        sources: [
          {
            filename: entry.language.entrypoint,
            content: entry.code,
          }
        ],
        input: executionsToQueue.map(pair => ({
          filename: pair.execution.id.toString(),
          content: pair.testCase.input,
          metadata: {
            testCaseId: pair.testCase.id,
            executionId: pair.execution.id,
          }
        })),
        options: {
          language: entry.language.codeName,
          entrypointFile: entry.language.entrypoint,
        },
        metadata: {
          submissionId: entry.id,
        }
      };

      const { 
        publish,
        disconnect,
      } = await connect(strapi.config.get("server.app.rabbitUrl"));
      
      console.log("Connected to RabbitMQ");

      await publish("execution", JSON.stringify(qPayload));

      await disconnect();

      ctx.body = {
        state: 'Queued',
        executions: executionsToQueue.map(pair => pair.execution.id),
      }
    } catch (err) {
      console.log(err);
      ctx.body = err;
    }
  },
}));
