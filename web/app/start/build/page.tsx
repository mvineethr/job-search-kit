import Link from 'next/link';
import BuildForm from '@/components/BuildForm';
import PageBar from '@/components/PageBar';

export default function BuildPage() {
  return (
    <>
    <PageBar crumbs={[{ label: 'Build a résumé' }]} />
    <div className="wrap col-720">
      <div className="page-head">
        <h1>Build your résumé</h1>
        <p className="sub">
          A few questions about your work. Your answers are turned into a résumé you can review and
          tailor. Where a number would help and you did not give one, it says [METRIC NEEDED] rather
          than guessing.
        </p>
      </div>
      <BuildForm />
      <p className="notice card-gap">
        Have a résumé or LinkedIn after all? <Link href="/start">Start from that instead.</Link>
      </p>
    </div>
    </>
  );
}
