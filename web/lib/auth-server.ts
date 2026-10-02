import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from '@neondatabase/serverless';
import { emailConfigured, sendEmail } from './email';

/**
 * Accounts. The user id is what every table calls `sid`, so the data model is
 * unchanged: one person's résumés, jobs and letters are still filtered by sid.
 *
 * Social providers are registered only when configured, so local dev works with
 * email and password alone.
 */

/**
 * Without email, a reset URL cannot be delivered. The admin reset-link route asks
 * for one and collects it here, keyed by email, within the same request.
 */
export const pendingResetLinks = new Map<string, string>();

function socialProviders(): BetterAuthOptions['socialProviders'] {
  const p: NonNullable<BetterAuthOptions['socialProviders']> = {};
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    p.google = { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
  }
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    p.linkedin = { clientId: process.env.LINKEDIN_CLIENT_ID, clientSecret: process.env.LINKEDIN_CLIENT_SECRET };
  }
  return p;
}

export const authOptions = {
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      if (emailConfigured()) {
        await sendEmail(
          user.email,
          'Reset your Job Search Kit password',
          `Use this link to choose a new password. It works once and expires in an hour.\n\n${url}\n\nIf you did not ask for this, ignore this email.`,
        );
      } else {
        pendingResetLinks.set(user.email.toLowerCase(), url);
      }
    },
  },
  socialProviders: socialProviders(),
  // Same person signing in with Google and later with LinkedIn (same verified email) gets one account.
  account: { accountLinking: { enabled: true, trustedProviders: ['google', 'linkedin'] } },
  plugins: [nextCookies()],
} satisfies BetterAuthOptions;

export const auth = betterAuth(authOptions);

/** Which sign-in buttons to show. */
export function enabledProviders(): { google: boolean; linkedin: boolean } {
  const p = socialProviders() ?? {};
  return { google: Boolean(p.google), linkedin: Boolean(p.linkedin) };
}
