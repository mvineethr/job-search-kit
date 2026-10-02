import Link from 'next/link';
import StartForm from '@/components/StartForm';

export default async function StartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <h1>Set up your profile</h1>
        <p className="sub">
          Start from what you already have: a résumé, your LinkedIn, or both. Files are turned into
          text and then discarded. Check the text before you continue.
        </p>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s-4)' }}>
          {error}
        </p>
      )}

      <StartForm />

      <div className="sec">
        <div className="sec-head">
          <h2>No résumé and no LinkedIn?</h2>
        </div>
        <Link href="/start/build" className="entry entry-lead">
          <strong>Build one with me</strong>
          <span>
            Answer a few questions about your work in your own words. They are turned into a résumé,
            and nothing you did not say is added.
          </span>
        </Link>
      </div>
    </div>
  );
}
