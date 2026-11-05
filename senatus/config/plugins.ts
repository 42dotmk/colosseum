export default ({ env }) => ({
  graphql: {
    // GraphQL resolvers bypass the REST controller sanitizers (hidden/locked test cases, problem
    // visibility, judge sources), and the web app does not use it. Opt in explicitly if needed.
    enabled: env.bool('ENABLE_GRAPHQL', false),
    config: {
      endpoint: '/graphql',
      shadowCRUD: true,
      playgroundAlways: true,
      depthLimit: 7,
      amountLimit: 100,
      apolloServer: {
        tracing: false,
        introspection: true
      }
    }
  }
});
