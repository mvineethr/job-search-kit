'use client';

/** A form-post button that asks before doing something that cannot be undone. */
export default function ConfirmButton({
  action,
  fields = {},
  label,
  confirm: message,
}: {
  action: string;
  fields?: Record<string, string>;
  label: string;
  confirm: string;
}) {
  return (
    <form method="post" action={action} onSubmit={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className="btn" style={{ color: 'var(--danger)' }}>
        {label}
      </button>
    </form>
  );
}
