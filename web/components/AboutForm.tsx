import { YEARS, SEARCH_STATUS, SENIORITY, WORK_SETUP, type Profile } from '@/lib/profile';

/** Plain form post; no client state needed. Everything is optional. */
export default function AboutForm({ profile, saved }: { profile: Profile | null; saved: boolean }) {
  const p = profile?.preferences;
  return (
    <form method="post" action="/api/profile/about" className="card card-gap">
      <div className="card-head">
        <h2>About you</h2>
      </div>
      <div className="card-body">
      <p className="notice">All optional. It helps us understand who this is useful for.</p>

      <div className="field">
        <label htmlFor="target_role">The role you are aiming for</label>
        <input id="target_role" name="target_role" type="text" defaultValue={profile?.target_role ?? ''} placeholder="e.g. Platform engineer" />
      </div>

      <div className="form-pair">
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

      <h3>What you want next</h3>
      <p className="hint">
        In your own words. The LinkedIn and cold email writers read your field, roles, goals, interests and
        strengths. Where you would work, sponsorship, pay and dealbreakers are kept for matching jobs and are
        never sent to the AI.
      </p>

      <div className="field">
        <label htmlFor="field">Your field</label>
        <input id="field" name="field" type="text" defaultValue={p?.field ?? ''} placeholder="e.g. Pediatric nursing, or backend engineering in fintech" />
      </div>

      <div className="field">
        <label htmlFor="target_roles">Other roles you would take</label>
        <input id="target_roles" name="target_roles" type="text" defaultValue={p?.target_roles.join(', ') ?? ''} placeholder="Up to five, separated by commas" />
      </div>

      <div className="form-pair">
        <div className="field">
          <label htmlFor="seniority">Level</label>
          <select id="seniority" name="seniority" defaultValue={p?.seniority ?? ''}>
            <option value="">Prefer not to say</option>
            {SENIORITY.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="needs_sponsorship">Do you need visa sponsorship?</label>
          <select id="needs_sponsorship" name="needs_sponsorship" defaultValue={p?.needs_sponsorship ?? ''}>
            <option value="">Prefer not to say</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="goals">Your goals for the next year or two</label>
        <textarea id="goals" name="goals" rows={3} defaultValue={p?.goals ?? ''} placeholder="e.g. Move from bedside care into teaching new nurses" />
      </div>

      <div className="field">
        <label htmlFor="interests">Areas or kinds of work that interest you</label>
        <input id="interests" name="interests" type="text" defaultValue={p?.interests ?? ''} />
      </div>

      <div className="field">
        <label htmlFor="strengths">What you are good at</label>
        <textarea id="strengths" name="strengths" rows={3} defaultValue={p?.strengths ?? ''} placeholder="What colleagues would say about you" />
      </div>

      <fieldset className="field">
        <legend>How you want to work</legend>
        <div className="row">
          {WORK_SETUP.map((w) => (
            <label key={w}>
              <input type="checkbox" name="work_setup" value={w} defaultChecked={p?.work_setup.includes(w)} /> {w}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-pair">
        <div className="field">
          <label htmlFor="places">Places you would work</label>
          <input id="places" name="places" type="text" defaultValue={p?.places ?? ''} />
        </div>
        <div className="field">
          <label htmlFor="pay_floor">Lowest pay you would accept</label>
          <input id="pay_floor" name="pay_floor" type="text" defaultValue={p?.pay_floor ?? ''} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="dealbreakers">Dealbreakers</label>
        <input id="dealbreakers" name="dealbreakers" type="text" defaultValue={p?.dealbreakers ?? ''} placeholder="e.g. No night shifts" />
      </div>

      <div className="row">
        <button type="submit" className="btn">
          Save
        </button>
        {saved && (
          <span role="status" className="hint">
            Saved.
          </span>
        )}
      </div>
      </div>
    </form>
  );
}
