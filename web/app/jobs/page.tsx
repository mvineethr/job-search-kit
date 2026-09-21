import NotBuiltYet from '@/components/NotBuiltYet';

export default function JobsPage() {
  return (
    <NotBuiltYet
      title="Jobs"
      blurb="Add a posting once. Everything you write for it — tailored résumé, cover letter, cold email — hangs off it, so you never paste the description twice."
      planned={[
        'Paste a job description once, with the company and role',
        'Tailor a copy of your résumé to it — your master is never touched',
        'See which of its requirements you match, and which are real gaps',
        'Generate a cover letter from the posting already stored',
      ]}
    />
  );
}
