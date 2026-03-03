export default {
  routes: [
    {
      method: 'GET',
      path: '/events/:id/questions',
      handler: 'qa.questions',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/events/:id/questions',
      handler: 'qa.askQuestion',
      config: {
        auth: false,
      },
    },
  ],
};
