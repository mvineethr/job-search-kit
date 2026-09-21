import Link from 'next/link';

export default function Home() {
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Fix your résumé against the jobs you actually want</h1>
        <p className="sub">
          Diagnose before rewriting, anchor everything to real job descriptions, and never
          invent a number. Where a metric is missing it says so rather than making one up.
        </p>
      </div>

      <div className="identity">
        <div className="identity-avatar" aria-hidden="true">
          JS
        </div>
        <div className="identity-main">
          <strong>Not signed in</strong>
          <span>Nothing is saved yet — accounts arrive with the jobs workspace.</span>
        </div>
        <span className="pill">Free while in testing</span>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Start something</h2>
          <span className="count">1 of 4 available</span>
        </div>

        <div className="entries">
          <Link href="/review" className="entry entry-lead">
            <strong>Review my résumé</strong>
            <span>
              An honest read of what is weak, quoting your own lines back at you. Takes about
              half a minute.
            </span>
          </Link>

          <Link href="/jobs" className="entry entry-soon">
            <strong>Tailor to a job</strong>
            <span>Aim a copy of your résumé at one posting, matching its exact keywords.</span>
          </Link>

          <Link href="/email" className="entry entry-soon">
            <strong>Write a cold email</strong>
            <span>A short, specific note to a hiring manager or someone who could refer you.</span>
          </Link>

          <Link href="/linkedin" className="entry entry-soon">
            <strong>Fix my LinkedIn</strong>
            <span>Headline, About, experience bullets, and what to post.</span>
          </Link>
        </div>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Your documents</h2>
        </div>
        <p className="note" style={{ maxWidth: 640 }}>
          Nothing saved yet. Saved résumés, version history and the jobs you are going after
          all arrive together with accounts — until then every review is a one-off, and closing
          the tab loses it.
        </p>
      </div>
    </div>
  );
}
