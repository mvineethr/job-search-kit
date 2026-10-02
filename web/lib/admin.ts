/** Admins are listed by email in ADMIN_EMAILS, comma-separated. Unset means nobody. */
export function isAdmin(email: string | null | undefined, list = process.env.ADMIN_EMAILS ?? ''): boolean {
  if (!email) return false;
  const admins = list
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}
