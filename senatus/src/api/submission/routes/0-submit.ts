
export default  {
  routes: [
    {
      method: 'GET',
      path: '/submissions/submit',
      handler: 'submission.submit',
      config: {
        auth: false,
      },
    },
  ],
};
