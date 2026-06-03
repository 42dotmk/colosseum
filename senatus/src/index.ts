import { connect } from '@colosseum/queue'

let disconnectRabbit: () => Promise<any> | undefined;

const normalizeOutput = (value: unknown) =>
  String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();

const ensureDefaultTutorialExists = async (strapi: any) => {
  const existing = await strapi.documents('api::tutorial.tutorial').findMany({
    filters: {
      title: {
        $eq: "What's Colosseum",
      },
    },
    pagination: {
      page: 1,
      pageSize: 1,
    },
  });

  if (Array.isArray(existing) && existing.length > 0) {
    return;
  }

  const now = new Date();

  await strapi.documents('api::tutorial.tutorial').create({
    data: {
      title: "What's Colosseum",
      readTimeMinutes: 4,
      thumbnailUrl:
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      summary:
        'A quick walkthrough of what Colosseum is, who it is for, and how to use it effectively.',
      content: [
        '# What\'s Colosseum?',
        '',
        'Colosseum is a competitive programming and practice platform designed for events, training, and learning.',
        '',
        '## Why Colosseum exists',
        '',
        '- Organize coding competitions with clear scoring and leaderboards.',
        '- Practice on past event problems in a dedicated training mode.',
        '- Learn from tutorials and explanations to improve problem-solving skills.',
        '',
        '## Core features',
        '',
        '- **Events**: Time-bounded contests with curated tasks.',
        '- **Practice**: Solve archived problems at your own pace.',
        '- **Leaderboards**: Track progress and compare performance.',
        '- **Q&A**: Ask and read clarifications during events.',
        '',
        '## How to get started',
        '',
        '1. Register for an event or open the training section.',
        '2. Pick a problem and submit your solution.',
        '3. Review verdicts, iterate, and improve.',
        '',
        'Colosseum is built to support both beginners and experienced participants with a clean workflow from learning to competing.',
      ].join('\n'),
      publishedAt: now,
    },
    status: 'published',
  });
};

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
  async bootstrap({ strapi }) {
    console.log("Senatus is bootstrapping");
    console.log(strapi.config.get("server.app.rabbitUrl"));
    await ensureDefaultTutorialExists(strapi);
    const prefetchCount = strapi.config.get("server.app.prefetchResults");
    const { 
      subscribe,
      disconnect,
    } = await connect(strapi.config.get("server.app.rabbitUrl"));

    disconnectRabbit = disconnect;

    console.log("Connected to RabbitMQ!");
    
    await subscribe("results", async (msg) => {
      try {
        const parsed = JSON.parse(msg);
        const submission = await strapi.documents('api::submission.submission').findOne({
          documentId: parsed.metadata.submissionId,
          populate: ['user', 'problem', 'language']
        });

        for (const result of parsed.result) {
          console.log("Updating execution", result.metadata.executionId);
          const existing = await strapi.documents('api::execution.execution').findOne({
            documentId: result.metadata.executionId,
            populate: ['testCase']
          });

          const expectedOutput = normalizeOutput(existing?.testCase?.output);
          const actualOutput = normalizeOutput(result.stdout);

          const rawVerdict: string | null = result.verdict ?? null;
          let verdict: string;
          if (rawVerdict === 'TLE') {
            verdict = 'time_limit_exceeded';
          } else if (rawVerdict === 'MLE') {
            verdict = 'memory_limit_exceeded';
          } else if (rawVerdict === 'RTE') {
            verdict = 'runtime_error';
          } else if (rawVerdict === 'CE') {
            verdict = 'compilation_error';
          } else {
            verdict = expectedOutput === actualOutput ? 'accepted' : 'wrong_answer';
          }

          await strapi.documents('api::execution.execution').update({
            documentId: result.metadata.executionId,
            data: {
              stdout: result.stdout,
              stderr: result.stderr,
              executionTime: result.time,
              memoryUsed: result.memoryKb ?? null,
              verdict,
              processed: true,
              passed: verdict === 'accepted',
              processedAt: new Date(),
              publishedAt: new Date(),
            },
            status: 'published',
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
