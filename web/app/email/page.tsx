import NotBuiltYet from '@/components/NotBuiltYet';

export default function EmailPage() {
  return (
    <NotBuiltYet
      title="Cold email"
      blurb="A short, specific note to a real person. No job description required — most cold emails are not about a posting at all."
      planned={[
        'Four situations: after applying, asking for a referral, nudging a recruiter, or no job posted',
        'Written from your résumé, so every claim traces back to something you did',
        'Kept under 120 words, because a long cold email does not get read',
        'Optionally attached to a saved job',
      ]}
    />
  );
}
