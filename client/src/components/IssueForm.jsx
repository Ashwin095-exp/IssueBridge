import { SAMPLES } from '../samples.js';

export const MIN = 20;
export const MAX = 8000;

export default function IssueForm({ value, onChange, onSubmit, loading }) {
  const len = value.trim().length;
  const tooShort = len < MIN;
  const tooLong = len > MAX;
  const invalid = tooShort || tooLong;
  let hint = `${len.toLocaleString()} / ${MAX.toLocaleString()} characters`;
  if (len > 0 && tooShort) hint = `Add at least ${MIN - len} more characters (minimum ${MIN}).`;
  if (tooLong) hint = `${(len - MAX).toLocaleString()} characters over the ${MAX.toLocaleString()} limit. Trim it to the main description.`;

  return (
    <form
      className="card"
      onSubmit={(e) => { e.preventDefault(); if (!invalid && !loading) onSubmit(); }}
    >
      <label htmlFor="issue" className="label">GitHub issue (title and description)</label>
      <textarea
        id="issue"
        rows={11}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the issue title and description here…"
        aria-describedby="issue-hint"
        aria-invalid={tooLong || (len > 0 && tooShort)}
        disabled={loading}
      />
      <div className="row">
        <span id="issue-hint" className={`hint ${tooLong ? 'hint-bad' : ''}`}>{hint}</span>
      </div>
      <div className="row wrap">
        <div className="samples">
          <span className="hint">Try a sample:</span>
          {SAMPLES.map((s) => (
            <button key={s.label} type="button" className="chip" onClick={() => onChange(s.text)} disabled={loading}>
              {s.label}
            </button>
          ))}
        </div>
        <button type="submit" className="btn btn-primary" disabled={invalid || loading}>
          {loading ? 'Analyzing…' : 'Analyze issue'}
        </button>
      </div>
      <p className="privacy">
        Privacy: the text you submit is sent to Google’s Gemini API to run Gemma 4. Don’t paste confidential or private content.
      </p>
    </form>
  );
}
