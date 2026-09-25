import AtsUpload from '@/components/AtsUpload';

export default function AtsCheckPage() {
  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <h1>What an ATS sees</h1>
        <p className="sub">
          Before anyone reads your résumé, an applicant tracking system pulls the plain text out
          of the file. Upload the PDF you are about to send and see exactly what comes out.
        </p>
      </div>

      <p className="note" style={{ marginBottom: 'var(--s-6)' }}>
        Export your résumé from its page first, then upload that file here. This works for
        résumés made anywhere else too. It uses a standard PDF text extractor; each ATS has its
        own, so treat a pass as a good sign rather than a guarantee.
      </p>

      <AtsUpload />
    </div>
  );
}
