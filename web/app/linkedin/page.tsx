import NotBuiltYet from '@/components/NotBuiltYet';

export default function LinkedInPage() {
  return (
    <NotBuiltYet
      title="LinkedIn"
      blurb="Nothing connects to your LinkedIn account and nothing is posted on your behalf. You upload your profile export, and it gives you text to paste back yourself."
      planned={[
        'Upload your profile export so the audit is about your real headline, not a guess',
        'An audit quoting your current profile back at you, worst problems first',
        'New headline and About section, shown as Currently versus Suggested',
        'Experience bullets rewritten for a human reader rather than an ATS',
        'No export? It writes a profile from your master résumé instead',
      ]}
    />
  );
}
