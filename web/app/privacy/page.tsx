import Link from 'next/link';
import type { Metadata } from 'next';
import LegalContact from '@/components/LegalContact';
import { MIN_AGE, OPERATOR, SITE_NAME, TERMS_UPDATED } from '@/lib/site';

export const metadata: Metadata = { title: `Privacy Policy · ${SITE_NAME}` };

export default function PrivacyPage() {
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Privacy Policy</h1>
        <p className="sub">Last updated {TERMS_UPDATED}.</p>
      </div>

      <div className="legal">
        <p>
          This policy covers {OPERATOR} (&quot;we&quot;). It is free, it is in testing, and it makes no money:
          no ads, no paid plans, and your data is never sold. This page says what we collect, why, who else
          handles it, and what you can do about it.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Your account:</strong> your name and email address. If you sign up with a password, only a
            one-way hash of it is stored; we never see the password. If you sign in with Google or LinkedIn, we
            receive your name, email address and profile photo link from them, and nothing else — not your
            contacts, posts or work history.
          </li>
          <li>
            <strong>What you give us to work with:</strong> résumés you paste or upload, LinkedIn profile PDFs or
            data exports you upload, job descriptions, your answers to questions, and the documents the service
            writes for you. Uploaded files are turned into text and the file itself is discarded; we store the
            text.
          </li>
          <li>
            <strong>Optional profile details:</strong> the role you are aiming for, years of experience, where you
            are based, where you are in your search, and how you found us — only if you fill them in.
          </li>
          <li>
            <strong>Your agreement:</strong> which version of these terms you accepted, and when.
          </li>
          <li>
            <strong>Sign-in records:</strong> for each signed-in session, when it started and expires, plus the IP
            address and browser it came from, to keep accounts secure.
          </li>
        </ul>
        <p>
          We do not use analytics, advertising or tracking tools, and we do not build a profile of you for
          marketing.
        </p>

        <h2>Cookies</h2>
        <p>
          We use only cookies the site needs to work: one that keeps you signed in, and one that remembers you
          have accepted these terms. There are no analytics, advertising or third-party cookies, which is why
          there is no cookie banner. Fonts are served from this site, so loading a page does not contact Google.
        </p>

        <h2>How we use it</h2>
        <ul>
          <li>To run the service: store your documents, and review, tailor and write them when you ask.</li>
          <li>To keep it secure and working: sign-in, preventing abuse, and fixing problems.</li>
          <li>
            To understand who it is useful for: the operator can see a list of accounts with sign-up dates, how
            many documents each has, and the optional profile details above. We only look at the content of your
            documents when needed to fix a problem you reported or when the law requires it.
          </li>
        </ul>
        <p>
          If you are in the EU or UK, the legal bases are: performing our agreement with you (running the
          service), our legitimate interest in keeping it secure and understanding its use, and your consent for
          the optional profile details, which you can remove at any time.
        </p>

        <h2>Who else handles your data</h2>
        <p>We use these providers to run the service. They process data on our behalf, not for their own use:</p>
        <ul>
          <li>
            <strong>Vercel</strong> hosts the website (United States).
          </li>
          <li>
            <strong>Neon</strong> hosts the database where your account and documents are stored.
          </li>
          <li>
            <strong>Moonshot AI</strong>, the company behind the Kimi models, receives the text of your résumé, the
            job description and your answers when you ask for a review, a tailored résumé, a letter or anything
            else written by AI. Its servers may be outside your country, including in China. We send only what is
            needed for the request you made.
          </li>
          <li>
            <strong>Google</strong> and <strong>LinkedIn</strong>, only if you choose to sign in with them.
          </li>
          <li>
            <strong>Resend</strong> sends account emails such as password resets, once email is switched on.
          </li>
        </ul>
        <p>
          Your data may therefore be processed in countries other than yours, including the United States and
          China, which may have different data-protection laws. We may also disclose data if the law requires it,
          or to protect the service or its users from fraud or abuse.
        </p>

        <h2>How long we keep it</h2>
        <p>
          As long as your account exists. When you delete your account, your account, profile and documents are
          deleted from our database immediately. Copies may remain for a short time in our providers&apos; backups
          and logs until they expire on their normal schedule. Data you sent to the AI provider is kept according
          to its own policy.
        </p>

        <h2>Your choices and rights</h2>
        <ul>
          <li>
            <strong>See and take your data:</strong> Settings → Download my data gives you everything stored for
            your account in one file.
          </li>
          <li>
            <strong>Delete it:</strong> Settings → Delete account removes your account and all of its data.
          </li>
          <li>
            <strong>Correct it:</strong> edit your profile details on your <Link href="/start">profile</Link>, or
            add a corrected résumé.
          </li>
        </ul>
        <p>
          Depending on where you live (for example the EU, UK or California) you may also have the right to
          object to or restrict how we use your data, and to complain to your data-protection authority. We do
          not sell or share personal information for advertising, as California law defines those terms. To use
          any of these rights, contact us below.
        </p>

        <h2>Security</h2>
        <p>
          Connections are encrypted, passwords are hashed, every account&apos;s data is kept separate, and the
          code is open for anyone to inspect. No system is perfectly secure, so do not put anything in your
          documents you would not want a test service to hold — for example ID numbers or health details.
        </p>

        <h2>Children</h2>
        <p>
          The service is not for anyone under {MIN_AGE}. If we learn that someone under {MIN_AGE} has an account,
          we will delete it.
        </p>

        <h2>Changes</h2>
        <p>
          If this policy changes in a way that matters, we will update the date above and ask you to accept it
          again the next time you use the service.
        </p>

        <h2>Contact</h2>
        <LegalContact />
      </div>
    </div>
  );
}
