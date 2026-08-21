import { connect } from "@colosseum/queue";
import type { Core } from "@strapi/strapi";

let disconnectRabbit: (() => Promise<void>) | undefined;

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
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    console.log("Senatus is bootstrapping");
    console.log(strapi.config.get("server.app.rabbitUrl"));
    const rabbitUrl = strapi.config.get("server.app.rabbitUrl") as string;
    const prefetchCount = strapi.config.get(
      "server.app.prefetchResults",
    ) as number;
    const { subscribe, disconnect } = await connect(rabbitUrl);

    disconnectRabbit = disconnect;

    console.log("Connected to RabbitMQ!");

    await subscribe(
      "results",
      async (msg) => {
        try {
          const parsed = JSON.parse(msg);

          for (const result of parsed.result) {
            console.log("Updating execution", result.metadata.executionId);
            const existing = await strapi
              .documents("api::execution.execution")
              .findOne({
                documentId: result.metadata.executionId,
                populate: ["testCase"],
              });

            if (!existing) {
              throw new Error(
                `Execution ${result.metadata.executionId} was not found`,
              );
            }

            if (!existing.testCase) {
              throw new Error(
                `Execution ${result.metadata.executionId} has no test case`,
              );
            }

            await strapi.documents("api::execution.execution").update({
              documentId: result.metadata.executionId,

              data: {
                stdout: result.stdout,
                stderr: result.stderr,
                executionTime: result.time,
                processed: true,
                passed: existing.testCase.output === result.stdout,
                processedAt: new Date(),
                publishedAt: new Date(),
              },
              status: "published",
            });
          }
        } catch (err) {
          console.error("Error in processing result", err);
          console.error(err);
        }
      },
      prefetchCount,
    );
  },
  async destroy() {
    console.log("Destroying Senatus");
    await disconnectRabbit?.();
  },
};
