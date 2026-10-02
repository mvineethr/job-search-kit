/**
 * Facts the legal pages and chrome quote. One place, so a rename or a new contact
 * address is a one-line change.
 */
export const SITE_NAME = 'Job Search Kit';
export const OPERATOR = `${SITE_NAME}, a personal open-source project by Vineeth`;
export const REPO_URL = 'https://github.com/mvineethr/job-search-kit';

/** Public address for privacy and legal requests. Unset until the project is renamed. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

/** US state whose law governs the Terms, e.g. "Texas". Unset leaves the clause out. */
export const GOVERNING_STATE = process.env.NEXT_PUBLIC_GOVERNING_STATE?.trim() || null;

/**
 * Bump when the Terms or Privacy Policy change in substance. Everyone is asked to
 * accept again on their next visit, and the version they accepted is recorded.
 */
export const TERMS_VERSION = '2026-10-02';
/** Shown on both legal pages. */
export const TERMS_UPDATED = '2 October 2026';

/** People under this age may not use the service (GDPR's default age of digital consent). */
export const MIN_AGE = 16;
