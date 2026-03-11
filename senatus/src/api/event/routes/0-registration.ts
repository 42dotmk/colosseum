export default {
  routes: [
    {
      method: 'GET',
      path: '/events/:id/registration-status',
      handler: 'event.registrationStatus',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/events/:id/register',
      handler: 'event.register',
      config: {
        auth: false,
      },
    },
  ],
};
