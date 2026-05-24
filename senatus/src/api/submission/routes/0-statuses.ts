export default {
  routes: [
    {
      method: 'GET',
      path: '/submissions/statuses',
      handler: 'api::submission.statuses.getProblemStatuses', // Calls our new file/method
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};