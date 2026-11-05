/**
 * Users can read and update only their own user record through the REST API.
 *
 * The profile page needs PUT /users/:id for the current user, but Strapi's default
 * controllers let any authenticated user target any id, so one participant could
 * rename or read another participant's account.
 */
const onlySelf = (handler: (ctx: any) => any) => async (ctx: any) => {
  const currentUserId = ctx.state?.user?.id;
  if (currentUserId === undefined || String(currentUserId) !== String(ctx.params?.id)) {
    return ctx.forbidden('You can only access your own user record');
  }
  return handler(ctx);
};

export default (plugin: any) => {
  const originalUserController = plugin.controllers.user;

  plugin.controllers.user = (context: any) => {
    const controller =
      typeof originalUserController === 'function' ? originalUserController(context) : originalUserController;

    return {
      ...controller,
      update: onlySelf(controller.update),
      findOne: onlySelf(controller.findOne),
    };
  };

  return plugin;
};
