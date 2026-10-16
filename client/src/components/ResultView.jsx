const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', unclear: 'Unclear' };
const CONF_LABEL = { low: 'Low confidence', medium: 'Medium confidence', high: 'High confidence' };

// All model text is rendered as plain text (React escapes it); no HTML injection.
export default function ResultView({ data, meta }) {
  const { summary, skills, difficulty, steps, caveats } = data;
  return (
    <section aria-live="polite" className="results">
      <article className="card">
        <h2>What this issue is asking</h2>
        <p className="pre">{summary}</p>
      </article>

      <article className="card">
        <h2>Skills you’ll likely need</h2>
        <ul className="skills">
          {skills.map((s, i) => (
            <li key={i}>
              <strong>{s.name}</strong>
              {s.why && <span> — {s.why}</span>}
            </li>
          ))}
        </ul>
      </article>

      <article className="card">
        <h2>Estimated difficulty</h2>
        <div className="badges">
          <span className={`badge level-${difficulty.level}`}>{LEVEL_LABEL[difficulty.level]}</span>
          <span className={`badge conf-${difficulty.confidence}`}>{CONF_LABEL[difficulty.confidence]}</span>
        </div>
        <p className="pre">{difficulty.reasoning}</p>
        <p className="hint">This is a model estimate from the pasted text only. It can be wrong.</p>
      </article>

      <article className="card">
        <h2>Your contribution plan</h2>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={i}>
              <h3>{s.title}</h3>
              <p className="pre">{s.detail}</p>
            </li>
          ))}
        </ol>
      </article>

      {caveats.length > 0 && (
        <article className="card caveats">
          <h2>Assumptions and missing information</h2>
          <ul>
            {caveats.map((c, i) => <li key={i} className="pre">{c}</li>)}
          </ul>
        </article>
      )}

      <p className="powered">
        Powered by <code>{meta.model}</code> via the Gemini API · answered in {(meta.latencyMs / 1000).toFixed(1)} s
      </p>
    </section>
  );
}
