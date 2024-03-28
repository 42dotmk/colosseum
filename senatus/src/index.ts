import { connect } from '@colosseum/queue'
import { Strapi } from '@strapi/strapi';
import fs from 'fs';

let disconnectRabbit: () => Promise<any> | undefined;

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Strapi }) {
    console.log("Senatus is bootstrapping");
    console.log(strapi.config.get("server.app.rabbitUrl"));
    const prefetchCount = strapi.config.get<number>("server.app.prefetchResults");
    const { 
      subscribe,
      disconnect,
    } = await connect(strapi.config.get("server.app.rabbitUrl"));

    disconnectRabbit = disconnect;

    console.log("Connected to RabbitMQ!");
    
    await subscribe("results", async (msg) => {
      try {
        const parsed = JSON.parse(msg);
        const submission = await strapi.entityService.findOne('api::submission.submission', parsed.metadata.submissionId, {
          populate: ['user', 'problem', 'language'],
        });

        for (const result of parsed.result) {
          console.log("Updating execution", result.metadata.executionId);
          const existing = await strapi.entityService.findOne('api::execution.execution', result.metadata.executionId, {
            populate: ['testCase'],
          });
          const execution = await strapi.entityService.update('api::execution.execution', result.metadata.executionId, {
            data: {
              stdout: result.stdout,
              stderr: result.stderr,
              executionTime: result.time,
              processed: true,
              passed: existing.testCase.output === result.stdout,
              processedAt: new Date(),
              publishedAt: new Date(),
            }
          });
        }
      } catch (err) {
        console.error("Error in processing result", err);
        console.error(err);
      }

    }, prefetchCount);
  },
  async destroy() {
    console.log("Destroying Senatus");
    await disconnectRabbit?.();
  }
};
