import type { StrapiConfigContext } from "../src/types/strapi-env";

export default ({ env }: StrapiConfigContext) => ({
  auth: {
    secret: env("ADMIN_JWT_SECRET"),
  },
  apiToken: {
    salt: env("API_TOKEN_SALT"),
  },
  transfer: {
    token: {
      salt: env("TRANSFER_TOKEN_SALT"),
    },
  },
  url: env("PUBLIC_ADMIN_URL", "/admin"),
});
