export default {
  routes: [
    {
      method: 'GET',
      path: '/events/training-leaderboard',
      handler: 'event.trainingLeaderboard',
      config: {
        auth: false,
      },
    },
  ],
};
