import Link from 'next/link';
import { CONTACT_EMAIL, REPO_URL } from '@/lib/site';

/** How to reach the operator. Falls back to self-service plus the repo until an address is published. */
export default function LegalContact() {
  if (CONTACT_EMAIL) {
    return (
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We aim to answer within 30 days.
      </p>
    );
  }
  return (
    <p>
      A dedicated contact address will be published here shortly. Until then, you can download or delete
      everything yourself in <Link href="/settings">Settings</Link>, or open an issue on the project&apos;s{' '}
      <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
        GitHub page
      </a>{' '}
      — issues are public, so do not put personal details in one; ask for a private way to reply instead.
    </p>
  );
}
