import { YEARS, SEARCH_STATUS, type Profile } from '@/lib/profile';

/** Plain form post; no client state needed. Everything is optional. */
export default function AboutForm({ profile, saved }: { profile: Profile | null; saved: boolean }) {
  return (
    <form method="post" action="/api/profile/about" className="sec" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div className="sec-head">
        <h2>About you</h2>
      </div>
      <p className="note">All optional. It helps us understand who this is useful for.</p>

      <div className="field">
        <label htmlFor="target_role">The role you are aiming for</label>
        <input id="target_role" name="target_role" type="text" defaultValue={profile?.target_role ?? ''} placeholder="e.g. Platform engineer" />
      </div>

      <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
        <div className="field">
          <label htmlFor="years_experience">Years of experience</label>
          <select id="years_experience" name="years_experience" defaultValue={profile?.years_experience ?? ''}>
            <option value="">Prefer not to say</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="search_status">Where are you in your search?</label>
          <select id="search_status" name="search_status" defaultValue={profile?.search_status ?? ''}>
            <option value="">Prefer not to say</option>
            {SEARCH_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="location">Where you are based</label>
        <input id="location" name="location" type="text" defaultValue={profile?.location ?? ''} placeholder="Town or city" />
      </div>

      <div className="field">
        <label htmlFor="heard_from">How did you find us?</label>
        <input id="heard_from" name="heard_from" type="text" defaultValue={profile?.heard_from ?? ''} />
      </div>

      <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center' }}>
        <button type="submit" className="btn">
          Save
        </button>
        {saved && (
          <span role="status" className="hint">
            Saved.
          </span>
        )}
      </div>
    </form>
  );
}
