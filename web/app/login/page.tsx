export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ wrong?: string; ack?: string }>;
}) {
  const { wrong, ack } = await searchParams;

  return (
    <div className="wrap" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <h1>This one is still in testing</h1>
        <p className="sub">
          Enter the password you were given. Your work is kept separate from everyone
          else&apos;s, but this is a test build — treat it as temporary.
        </p>
      </div>

      <form
        method="post"
        action="/api/login"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}
      >
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoFocus required />
        </div>

        <div className="note" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          <strong>This tool uses AI</strong>
          <span>
            Reviews, tailored résumés and cover letters are written by an AI model from what you
            give it. It is told never to invent experience or numbers, and skills your résumé
            does not support are removed in code — but it can still get things wrong.
          </span>
          <span>
            Your résumé is stored so you can come back to it, and sent to the model provider to
            be processed. Do not put anything here you would mind a test build holding.
          </span>
          <label style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'flex-start' }}>
            <input type="checkbox" name="ai_ack" value="1" required style={{ marginTop: 3 }} />
            <span>I understand the documents are drafted by AI and I will check them before I send them.</span>
          </label>
        </div>

        {wrong && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>
            That password is not right. Ask whoever sent you the link.
          </p>
        )}

        {ack && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>
            Tick the box above to continue.
          </p>
        )}

        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          Let me in
        </button>
      </form>
    </div>
  );
}
