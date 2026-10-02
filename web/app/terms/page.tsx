import Link from 'next/link';
import type { Metadata } from 'next';
import LegalContact from '@/components/LegalContact';
import { GOVERNING_STATE, MIN_AGE, OPERATOR, REPO_URL, SITE_NAME, TERMS_UPDATED } from '@/lib/site';

export const metadata: Metadata = { title: `Terms of Service · ${SITE_NAME}` };

export default function TermsPage() {
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Terms of Service</h1>
        <p className="sub">Last updated {TERMS_UPDATED}.</p>
      </div>

      <div className="legal">
        <p>
          These terms are an agreement between you and {OPERATOR} (&quot;we&quot;) for using {SITE_NAME} (&quot;the
          service&quot;). By creating an account or using the service you agree to them, and to
          our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the service.
        </p>

        <h2>1. What the service is</h2>
        <p>
          A free tool that reviews résumés, tailors them to job descriptions, and drafts cover letters and related
          documents using AI. It is a personal, non-commercial project in testing: features may change, stop
          working, or be removed, and the service may be paused or shut down at any time, with or without notice.
          It is not a recruiter, employer or career-advice service.
        </p>

        <h2>2. Who can use it</h2>
        <p>
          You must be at least {MIN_AGE} years old and able to agree to these terms. You must give accurate account
          details, keep your sign-in secure, and are responsible for what happens under your account. One account
          per person.
        </p>

        <h2>3. Your content</h2>
        <p>
          You keep ownership of everything you put in — résumés, job descriptions, answers — and of the documents
          the service writes for you. You give us permission to store, process and send your content to the
          providers listed in the Privacy Policy, only as needed to run the service for you. You confirm you have
          the right to upload what you upload. Do not upload other people&apos;s personal information without their
          permission, or anything you are not allowed to share, such as an employer&apos;s confidential material.
        </p>

        <h2>4. AI-generated output</h2>
        <p>
          Reviews, tailored résumés, letters and scores are produced by an AI model and by automated checks. They
          can be wrong, incomplete or unsuitable. The service tries to avoid inventing facts, but{' '}
          <strong>you are responsible for checking every document before you use it</strong>, and for everything
          you send to an employer or anyone else. Fit scores and checks are rough guides, not predictions. Nothing
          on the service is professional career, legal, immigration or financial advice.
        </p>

        <h2>5. No guarantees about jobs</h2>
        <p>
          We do not promise interviews, offers, or that any applicant-tracking system will accept your résumé.
          Hiring decisions are made by employers.
        </p>

        <h2>6. Be honest</h2>
        <p>
          Use the service to present your real experience well, not to misrepresent it. You must not use it to
          create false claims about your work history, education, qualifications, identity or right to work.
          Doing so may break employers&apos; rules or the law, and is your responsibility alone.
        </p>

        <h2>7. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>break the law, or use the service to harass, deceive or harm anyone;</li>
          <li>
            access it by automated means (bots, scrapers, scripts), overload it, or use it in bulk on behalf of
            others;
          </li>
          <li>try to get into other accounts, test or bypass its security, or interfere with how it works;</li>
          <li>upload malicious code, or content you have no right to use;</li>
          <li>resell the service, or present its output as a paid professional service;</li>
          <li>use it to build a competing AI product or dataset.</li>
        </ul>

        <h2>8. Other services</h2>
        <p>
          Signing in with Google or LinkedIn, and the AI and hosting providers we use, are subject to those
          companies&apos; own terms. {SITE_NAME} is not affiliated with, endorsed by or sponsored by LinkedIn, Google,
          or any employer or applicant-tracking-system vendor. Their names are trademarks of their owners and are
          used only to describe compatibility.
        </p>

        <h2>9. Open-source code</h2>
        <p>
          The service&apos;s source code is published at{' '}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            {REPO_URL.replace('https://', '')}
          </a>{' '}
          under the MIT License, which governs use of the code itself. These terms govern use of this hosted
          service.
        </p>

        <h2>10. Ending your use</h2>
        <p>
          You can stop at any time and delete your account in <Link href="/settings">Settings</Link>, which deletes
          your data as described in the Privacy Policy. We may suspend or close an account that breaks these terms or
          puts the service or others at risk, and may remove content that does. Sections 4, 5, 6 and 11–14 continue
          to apply after your use ends.
        </p>

        <h2>11. Disclaimer</h2>
        <p className="caps">
          The service is provided &quot;as is&quot; and &quot;as available&quot;, free of charge, without warranties of
          any kind, express or implied, including warranties of merchantability, fitness for a particular purpose,
          accuracy, availability and non-infringement. We do not warrant that the service or its output will be
          error-free, secure, uninterrupted, or that data will never be lost — keep your own copies.
        </p>

        <h2>12. Limitation of liability</h2>
        <p className="caps">
          To the fullest extent the law allows, we will not be liable for any indirect, incidental, special,
          consequential or punitive damages, or for any loss of opportunities, employment, income, data or
          goodwill, arising from or related to the service or its output, however caused. Our total liability for
          any claim relating to the service is limited to fifty US dollars (US$50).
        </p>
        <p>
          Some places do not allow these exclusions or limits, so some of them may not apply to you. Nothing in
          these terms limits rights you have under consumer-protection law that cannot be waived.
        </p>

        <h2>13. Indemnity</h2>
        <p>
          If you use the service in breach of these terms or the law — for example by sending misleading documents
          or uploading content you had no right to — and that leads to a claim against us, you agree to cover the
          reasonable losses and costs it causes us.
        </p>

        <h2>14. General</h2>
        <p>
          {GOVERNING_STATE
            ? `These terms are governed by the laws of the State of ${GOVERNING_STATE}, United States, without regard to its conflict-of-law rules. `
            : ''}
          If a part of these terms cannot be enforced, the rest still applies. Not enforcing a term is not a
          waiver of it. These terms and the Privacy Policy are the whole agreement between you and us about the
          service. You may not transfer your account or these terms to anyone else.
        </p>

        <h2>15. Changes</h2>
        <p>
          We may update these terms. If a change matters, we will update the date above and ask you to accept the
          new version before you continue using the service.
        </p>

        <h2>16. Contact</h2>
        <LegalContact />
      </div>
    </div>
  );
}
