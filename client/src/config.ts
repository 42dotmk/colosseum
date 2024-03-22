// https://vitejs.dev/guide/env-and-mode

export const SENATUS_URL = import.meta.env.VITE_SENATUS_URL;
export const GQL_URL = `${SENATUS_URL}/graphql`;
export const REST_URL = `${SENATUS_URL}/api`;
