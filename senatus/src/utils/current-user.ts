export const getCurrentUser = async (strapi: any, ctx: any) => {
  if (!strapi.config.server.app.authEnabled) {
    const dbUser = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({
        where: {},
        select: ['id', 'documentId', 'username', 'email'],
      });
    return dbUser || null;
  }

  const authUser = ctx.state?.user;
  if (authUser?.documentId) {
    return authUser;
  }

  if (authUser?.id) {
    const dbUser = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({
        where: { id: authUser.id },
        select: ['id', 'documentId', 'username', 'email'],
      });

    return dbUser || authUser;
  }

  const jwtService = strapi.plugin('users-permissions')?.service('jwt');
  const token = jwtService?.getToken ? await jwtService.getToken(ctx) : null;
  const tokenUserId = token?.id;

  if (!tokenUserId) {
    return null;
  }

  const dbUser = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({
      where: { id: tokenUserId },
      select: ['id', 'documentId', 'username', 'email'],
    });

  return dbUser || null;
};
