export const getCurrentUser = async (strapi: any, ctx: any) => {
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
	let token: any = null;
	try {
		token = jwtService?.getToken ? await jwtService.getToken(ctx) : null;
	} catch {
		// not a user JWT (for example an API token): no user, never a 500
		token = null;
	}
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

/** True when the request was authenticated with an admin-issued API token instead of a user JWT. */
export const isApiTokenRequest = (ctx: any) => ctx.state?.auth?.strategy?.name === 'api-token';
