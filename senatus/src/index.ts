import { connect } from '@colosseum/queue/amqp'
import { Strapi } from '@strapi/strapi';

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
    const { 
      subscribe,
      publish,
    } = await connect(strapi.config.get("server.app.rabbitUrl"));
    console.log("Connected to RabbitMQ!");
    await subscribe("results", async (msg) => {
      const parsed = JSON.parse(msg);
      const submission = await strapi.entityService.findOne('api::submission.submission', parsed.metadata.submissionId, {
        populate: ['user', 'problem', 'language'],
      });

      for (const result of parsed.result) {
        console.log("Updating execution", result.metadata.executionId);
        const execution = await strapi.entityService.update('api::execution.execution', result.metadata.executionId, {
          data: {
            stdout: result.stdout,
            stderr: result.stderr,
            executionTime: result.time,
            processed: true,
            processedAt: new Date(),
            publishedAt: new Date(),
          }
        });
      }
    });
  },
};
