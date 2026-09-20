import ResumeDocument from '@/components/ResumeDocument';
import { ResumeSchema } from '@/lib/resume-schema';
import fixture from '@/test/fixtures/priya.json';

export default function Page() {
  const resume = ResumeSchema.parse(fixture);
  return (
    <main style={{ padding: 'var(--s-6) var(--s-4)' }}>
      <ResumeDocument resume={resume} />
    </main>
  );
}
