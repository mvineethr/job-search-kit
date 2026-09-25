/** Shown beside every AI-drafted document. Sits outside #printable, so it never prints. */
export default function AiNotice() {
  return (
    <p className="note" style={{ borderLeft: '3px solid var(--warn)' }}>
      Drafted by an AI model from your own résumé. Read every line before you send it — it goes
      out under your name.
    </p>
  );
}
