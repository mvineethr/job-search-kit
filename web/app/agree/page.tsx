import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { safeNext } from '@/lib/consent';
import { MIN_AGE, SITE_NAME } from '@/lib/site';
import SignOutButton from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

/**
 * Clickwrap: the account exists, but nothing else works until this is accepted.
 * One page for email and social sign-ups alike, and the same page reappears when
 * the Terms version changes.
 */
export default async function AgreePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  if (!(await currentUser())) redirect('/login');

  const box = { display: 'flex', gap: 'var(--s-2)', alignItems: 'flex-start' } as const;

  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <div className="page-head">
        <h1>Before you start</h1>
        <p className="sub">The short version of what you are agreeing to. The full text is in the two links below.</p>
      </div>

      <ul className="note" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', paddingLeft: 'var(--s-6)' }}>
        <li>{SITE_NAME} is a free, personal project in testing. It may change, break or shut down, and comes with no guarantees.</li>
        <li>An AI model drafts reviews, résumés and letters from what you give it. It can be wrong. You check everything before you send it, and you are responsible for what you send.</li>
        <li>It is built to never invent experience or numbers. Do not use it to claim things that are not true.</li>
        <li>Your documents are stored in your account and sent to an AI provider to be processed. They are never sold or used for advertising.</li>
        <li>You can download your data or delete your account at any time from Settings.</li>
        <li>Nothing here guarantees an interview or a job.</li>
      </ul>

      <form method="post" action="/api/consent" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', marginTop: 'var(--s-6)' }}>
        <input type="hidden" name="next" value={safeNext(next)} />

        <label style={box}>
          <input type="checkbox" name="agree_terms" value="1" required style={{ marginTop: 3 }} />
          <span>
            I agree to the{' '}
            <Link href="/terms" target="_blank">
              Terms of Service
            </Link>{' '}
            and have read the{' '}
            <Link href="/privacy" target="_blank">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <label style={box}>
          <input type="checkbox" name="agree_ai" value="1" required style={{ marginTop: 3 }} />
          <span>I understand the documents are drafted by AI and I will check them before I send them.</span>
        </label>
        <label style={box}>
          <input type="checkbox" name="age_ok" value="1" required style={{ marginTop: 3 }} />
          <span>I am {MIN_AGE} or older.</span>
        </label>

        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">
            Agree and continue
          </button>
          <SignOutButton label="I don't agree — sign out" />
        </div>
      </form>
    </div>
  );
}
