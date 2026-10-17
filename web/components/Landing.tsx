import Link from 'next/link';
import WritingDemo from '@/components/WritingDemo';
import { REPO_URL } from '@/lib/site';

const USES = [
  { title: 'Review a résumé', body: 'A diagnosis first: what is vague, what is missing, what an ATS will trip on. Then rewrites.' },
  { title: 'Tailor to a job', body: 'Aim a copy at a real posting. Skills you never claimed are removed, not slipped in.' },
  { title: 'Write a cover letter', body: 'Built from your résumé and the posting, with the gaps it could not fill listed.' },
  { title: 'Check what an ATS sees', body: 'Upload a PDF and read the plain text a tracking system pulls out of it.' },
];

const INTEGRATIONS = [
  { title: 'Word and PDF', body: 'Export any résumé as .docx or a single-column PDF.', soon: false },
  { title: 'LinkedIn export', body: 'Start from the zip LinkedIn gives you, or a profile PDF.', soon: false },
  { title: 'Google sign-in', body: 'Or an email and password.', soon: false },
  { title: 'MCP server', body: 'Use the same prompts from your own AI assistant.', soon: true },
];

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    note: 'Available now',
    items: ['Résumé review and rewrites', 'Tailoring with an invented-content audit', 'Cover letters', 'Word and PDF export'],
    cta: { href: '/signup', label: 'Create account', primary: true },
  },
  {
    name: 'Pro',
    price: 'Not offered yet',
    note: 'Pricing undecided',
    items: ['Everything in Free', 'Higher usage limits', 'Features still being planned'],
    cta: null,
  },
  {
    name: 'Self-host',
    price: '$0',
    note: 'MIT licence',
    items: ['Run it on your own server', 'Bring your own model key', 'Read every prompt'],
    cta: { href: REPO_URL, label: 'Source code', primary: false },
  },
];

/** The home page for people who are not signed in. */
export default function Landing() {
  return (
    <div className="landing wrap">
      <section className="land-hero">
        <div>
          <h1>A writing assistant for job applications that never invents a number</h1>
          <p className="sub">
            Review your résumé, tailor it to real postings and draft cover letters. Where a metric is
            missing, it says so instead of making one up.
          </p>
          <div className="land-cta">
            <Link href="/signup" className="btn btn-primary">Create account</Link>
            <Link href="/login" className="btn">Sign in</Link>
          </div>
        </div>
        <WritingDemo />
      </section>

      <section className="sec">
        <div className="sec-head"><h2>What it writes</h2></div>
        <div className="entries">
          {USES.map((u) => (
            <div key={u.title} className="entry">
              <strong>{u.title}</strong>
              <span>{u.body}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="sec-head"><h2>Works with</h2></div>
        <div className="entries">
          {INTEGRATIONS.map((i) => (
            <div key={i.title} className={i.soon ? 'entry entry-soon' : 'entry'}>
              <strong>
                {i.title} {i.soon && <span className="tag tag-soon">Planned</span>}
              </strong>
              <span>{i.body}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="sec-head"><h2>Plans</h2></div>
        <div className="land-tiers">
          {TIERS.map((t) => (
            <div key={t.name} className={t.cta?.primary ? 'card tier tier-lead' : 'card tier'}>
              <div className="card-body">
                <h3>{t.name}</h3>
                <p className="tier-price tnum">{t.price}</p>
                <p className="hint">{t.note}</p>
                <ul className="soon-list">
                  {t.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
                {t.cta && (
                  <Link href={t.cta.href} className={t.cta.primary ? 'btn btn-primary' : 'btn'}>
                    {t.cta.label}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
