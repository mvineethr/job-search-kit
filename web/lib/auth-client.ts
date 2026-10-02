import { createAuthClient } from 'better-auth/react';

/** Browser side of the auth API. Same origin, so no base URL. */
export const authClient = createAuthClient();
