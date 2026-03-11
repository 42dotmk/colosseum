export default {
  routes: [
    {
      method: 'GET',
      path: '/events/:id/leaderboard',
      handler: 'event.leaderboard',
      config: {
        auth: false,
      },
    },
  ],
};
