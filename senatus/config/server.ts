import type { StrapiConfigContext } from "../src/types/strapi-env";

export default ({ env }: StrapiConfigContext) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  url: env("PUBLIC_URL", "http://localhost:1337"),
  app: {
    keys: env.array("APP_KEYS"),
    rabbitUrl: env("RABBIT_URL", "amqp://guest:guest@localhost"),
    prefetchResults: env.int("PREFETCH_RESULTS", 10), // How many results to prefetch from the results queue
  },
  webhooks: {
    populateRelations: env.bool("WEBHOOKS_POPULATE_RELATIONS", false),
  },
});
