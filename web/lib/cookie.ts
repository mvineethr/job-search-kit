/**
 * The cookie name lives alone, with no imports.
 *
 * Middleware runs on the edge runtime, where node:crypto does not exist. If it
 * imported this from session.ts it would pull the whole signing module into the
 * edge bundle and fail to build.
 */
export const COOKIE_NAME = 'jsk_session';
