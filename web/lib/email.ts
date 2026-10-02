/**
 * Outgoing email through Resend's HTTP API (no SDK: one POST is all it takes).
 *
 * Off until both values are set. Without a verified domain Resend can only mail
 * the account owner, so a key alone is not enough to send to anyone else.
 */
export function emailConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim());
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend returned ${res.status}`);
}
