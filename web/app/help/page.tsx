import Link from 'next/link';
import type { Metadata } from 'next';
import LegalContact from '@/components/LegalContact';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Help · ${SITE_NAME}` };

const QA: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What does this do?',
    a: (
      <>
        You add your résumé (or your LinkedIn, or answer a few questions to build one), add the jobs you are going
        after, and it reviews the résumé, scores how well it fits each job from evidence in your résumé, tailors a
        copy to the job, and drafts a cover letter.
      </>
    ),
  },
  {
    q: 'Does it make things up?',
    a: (
      <>
        It is built not to. The AI is told never to invent experience or numbers, and the code checks its work:
        skills your résumé does not support are removed, and numbers or employers it cannot find in what you gave it
        are flagged. Where a number would help and you did not give one, it writes [METRIC NEEDED] and asks you,
        rather than guessing. It can still get things wrong, so read every line before you send anything.
      </>
    ),
  },
  {
    q: 'Why is there [METRIC NEEDED] in my résumé?',
    a: (
      <>
        A bullet that describes a result reads stronger with a number — how many, how much, how often. You did not
        give one, so it left a marked hole instead of inventing one. Use &quot;Tell us the numbers&quot; on the résumé
        page to fill them in, or leave them out.
      </>
    ),
  },
  {
    q: 'What does the fit score mean?',
    a: (
      <>
        It counts how many of the job&apos;s requirements your résumé shows evidence for, with must-haves counting
        more than nice-to-haves. Every match has to quote your résumé. It is a guide to your gaps, not a prediction
        of whether you will get an interview.
      </>
    ),
  },
  {
    q: 'Which LinkedIn file do I upload?',
    a: (
      <>
        Either the PDF from your profile page (More, then Save to PDF), or the zip from LinkedIn&apos;s Settings → Data
        privacy → Get a copy of your data. The zip can take LinkedIn a while to email you; the PDF is instant.
      </>
    ),
  },
  {
    q: 'I forgot my password.',
    a: <>Password reset emails are not switched on yet. Contact us (below) and we will send you a reset link.</>,
  },
  {
    q: 'Who can see my résumé?',
    a: (
      <>
        Only you, in the app. It is stored in our database and sent to the AI provider when you ask for something to
        be written. The <Link href="/privacy">Privacy Policy</Link> has the details.
      </>
    ),
  },
  {
    q: 'How do I get my data, or delete my account?',
    a: (
      <>
        In <Link href="/settings">Settings</Link>: Download my data gives you everything in one file, and Delete
        account removes your account and everything in it, immediately.
      </>
    ),
  },
  {
    q: 'Does it cost anything?',
    a: <>No. It is a free, open-source personal project, currently in testing.</>,
  },
];

export default function HelpPage() {
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Help</h1>
        <p className="sub">Common questions. Something else? Get in touch at the bottom.</p>
      </div>

      <div className="legal">
        {QA.map(({ q, a }) => (
          <section key={q}>
            <h2>{q}</h2>
            <p>{a}</p>
          </section>
        ))}

        <h2>Contact</h2>
        <LegalContact />
      </div>
    </div>
  );
}
