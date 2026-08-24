export default {
  routes: [
    {
      method: 'POST',
      path: '/submissions/submit',
      handler: 'submission.submit',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/submissions/submit',
      handler: 'submission.submit',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/submissions/executions',
      handler: 'submission.getExecutions',
      config: {
        auth: false,
      },
    },
  ],
};
