import { useRef, useState } from 'react';
import IssueForm from './components/IssueForm.jsx';
import ResultView from './components/ResultView.jsx';
import ErrorBanner from './components/ErrorBanner.jsx';
import { analyze } from './api.js';

// state: idle | loading | error | success
export default function App() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function run() {
    if (inFlight.current) return; // guards against double submits
    inFlight.current = true;
    setStatus('loading');
    setError('');
    try {
      setResult(await analyze(text.trim()));
      setStatus('success');
    } catch (e) {
      setError(e?.message || 'Something unexpected happened. Please retry.');
      setStatus('error');
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Issue<span>Bridge</span></h1>
        <p>Paste a GitHub issue. Get a plain-language explanation, the skills involved, an honest difficulty estimate, and a step-by-step plan for your first contribution.</p>
      </header>

      <main>
        <IssueForm value={text} onChange={setText} onSubmit={run} loading={status === 'loading'} />

        {status === 'loading' && (
          <div className="loading" role="status">
            <span className="spinner" aria-hidden="true" />
            Asking Gemma 4… this usually takes a few seconds.
          </div>
        )}
        {status === 'error' && <ErrorBanner message={error} onRetry={run} />}
        {status === 'success' && result && <ResultView data={result.data} meta={result.meta} />}
      </main>

      <footer className="footer">
        Powered by Gemma 4 (open-weight) through the Gemini API · Built for MLH Hacktoberfest Hack Day, AIT Pune · Plans are generic guidance based only on the text you paste.
      </footer>
    </div>
  );
}
