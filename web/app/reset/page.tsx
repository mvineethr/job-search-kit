import ResetForm from '@/components/ResetForm';

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  return (
    <div className="wrap" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <h1>Choose a new password</h1>
      </div>
      {token && !error ? (
        <ResetForm token={token} />
      ) : (
        <p role="alert" className="note">
          This reset link has expired or was already used. Ask for a new one.
        </p>
      )}
    </div>
  );
}
