export default (config, { strapi }) => {
  return async (ctx, next) => {
    if (!strapi.config.get('server.app.authEnabled') && !ctx.state?.user) {
      // Fetch (or synthesize) a user and attach the authenticated role so that
      // Strapi's users-permissions policy grants access without a JWT token.
      let user: any = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({
          where: {},
          populate: ['role'],
          select: ['id', 'documentId', 'username', 'email'],
        });

      if (!user) {
        // No real user exists — look up the authenticated role so Strapi's
        // permission check still passes.
        const authenticatedRole = await strapi.db
          .query('plugin::users-permissions.role')
          .findOne({ where: { type: 'authenticated' } });

        user = {
          id: 0,
          documentId: 'dev-user',
          username: 'dev',
          email: 'dev@localhost',
          role: authenticatedRole ?? { id: 1, type: 'authenticated', name: 'Authenticated' },
        };
      }

      ctx.state.user = user;
    }

    await next();
  };
};
