
export default  {
  routes: [
    {
      method: 'POST',
      path: '/submissions/submit',
      handler: 'submission.submit',
      config: {
        auth: false,
      },
    },
  ],
};
