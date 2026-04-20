export default {
  routes: [
    {
      method: 'POST',
      path: '/events/reorder',
      handler: 'event.reorder',
      config: {
        auth: false,
      },
    },
  ],
};