export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'http://localhost:1337'),
  app: {
    keys: env.array('APP_KEYS'),
    rabbitUrl: env('RABBIT_URL', 'amqp://guest:guest@127.0.0.1:5672'),
    prefetchResults: env.int('PREFETCH_RESULTS', 10), // How many results to prefetch from the results queue
    authEnabled: env.bool('AUTH_ENABLED', false),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
