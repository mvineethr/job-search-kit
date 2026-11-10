import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type LetterRow } from '@/lib/db';
import type { StoredLinkedIn } from '@/lib/outreach';
import PageBar from '@/components/PageBar';
import CopyButton from '@/components/CopyButton';
import AiNotice from '@/components/AiNotice';
import GenericPhrases from '@/components/GenericPhrases';
import MarkedText from '@/components/MarkedText';

export const dynamic = 'force-dynamic';

function Section({ title, copy, children }: { title: string; copy?: string; children: React.ReactNode }) {
  return (
    <div className="card card-gap">
      <div className="card-head">
        <h2>{title}</h2>
        {copy && (
          <span className="ml-auto">
            <CopyButton text={copy} label="Copy" />
          </span>
        )}
      </div>
      <div className="card-body stack">{children}</div>
    </div>
  );
}

export default async function LinkedInView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const row = ((await sql()`
    SELECT id, content FROM letters WHERE id = ${id} AND sid = ${sid} AND kind = 'linkedin'`) as unknown as LetterRow[])[0];
  if (!row) notFound();
  const li = row.content as StoredLinkedIn;
  const n = li.unsupportedNumbers ?? [];

  const parts = [
    ...li.headline.suggested.map((text, i) => ({ where: `headline ${i + 1}`, text })),
    { where: 'About', text: li.about.suggested },
    ...li.experience.flatMap((r) => r.bullets.map((text) => ({ where: `${r.title}, ${r.company}`, text }))),
  ];

  return (
    <>
      <PageBar crumbs={[{ href: '/linkedin', label: 'LinkedIn' }, { label: 'Rewrite' }]} />
      <div className="wrap col-640">
        <div className="page-head">
          <h1>Your LinkedIn, rewritten</h1>
          <p className="sub">
            {li.fromLinkedIn ? 'From the profile you added, checked against your résumé.' : 'Written from your résumé, since no LinkedIn profile was added.'}{' '}
            Paste what you want into LinkedIn yourself.
          </p>
        </div>

        <AiNotice />

        {(n.length > 0 || li.removedSkills.length > 0 || li.removedRoles.length > 0) && (
          <div className="notice notice-warn stack card-gap">
            {n.length > 0 && <p>Numbers your résumé does not state, marked below: {n.join(', ')}. Check or remove them.</p>}
            {li.removedSkills.length > 0 && <p>Removed skills you never listed: {li.removedSkills.join(', ')}.</p>}
            {li.removedRoles.length > 0 && <p>Removed roles that are not in your résumé: {li.removedRoles.join('; ')}.</p>}
          </div>
        )}

        {(li.identity || li.audit.length > 0) && (
          <Section title="What is wrong now">
            {li.identity && (
              <p>
                <MarkedText text={li.identity} numbers={n} />
              </p>
            )}
            <ul className="facts-list">
              {li.audit.map((a, i) => (
                <li key={i}>
                  <span className="tag">{a.area}</span> <MarkedText text={a.problem} numbers={n} />
                  {a.quote && <span className="fix-before"> “{a.quote}”</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Headline">
          {li.headline.current && <p className="fix-before">{li.headline.current}</p>}
          {li.headline.suggested.map((h, i) => (
            <div key={i} className="row">
              <MarkedText text={h} numbers={n} />
              <span className="ml-auto">
                <CopyButton text={h} label="Copy" />
              </span>
            </div>
          ))}
        </Section>

        <Section title="About" copy={li.about.suggested}>
          {li.about.current && <p className="fix-before" style={{ whiteSpace: 'pre-line' }}>{li.about.current}</p>}
          <p style={{ whiteSpace: 'pre-line' }}>
            <MarkedText text={li.about.suggested} numbers={n} />
          </p>
          <p className="muted tnum">{li.about.suggested.length.toLocaleString()} of 2,000 characters</p>
        </Section>

        {li.experience.map((r) => (
          <Section key={`${r.title}-${r.company}`} title={`${r.title}, ${r.company}`} copy={r.bullets.map((b) => `• ${b}`).join('\n')}>
            <ul className="facts-list">
              {r.bullets.map((b, i) => (
                <li key={i}>
                  <MarkedText text={b} numbers={n} />
                </li>
              ))}
            </ul>
          </Section>
        ))}

        {li.skills.length > 0 && (
          <Section title="Skills to list" copy={li.skills.join(', ')}>
            <p>{li.skills.join(', ')}</p>
          </Section>
        )}

        <GenericPhrases parts={parts} />
      </div>
    </>
  );
}
