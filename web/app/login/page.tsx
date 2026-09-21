export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ wrong?: string }>;
}) {
  const { wrong } = await searchParams;

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

        {wrong && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>
            That password is not right. Ask whoever sent you the link.
          </p>
        )}

        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          Let me in
        </button>
      </form>

      <p className="note" style={{ marginTop: 'var(--s-6)' }}>
        Your résumé is stored so you can come back to it, and it is sent to a model provider to
        be reviewed. Do not put anything here you would mind a test build holding.
      </p>
    </div>
  );
}
