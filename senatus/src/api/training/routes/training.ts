export default {
  routes: [
    {
      method: 'GET',
      path: '/training',
      handler: 'api::training.training.trainingProblems',
      config: {
        auth: false,
      },
    },
  ],
};