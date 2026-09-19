import { useState } from 'react';
import { useNavigate } from 'react-router';
import { API_URL } from '../src/api.js';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }

      localStorage.setItem('token', body.token);
      navigate('/', { replace: true });
    } catch {
      // fetch only rejects on network failure, not on 4xx/5xx responses
      setError('Cannot reach the server. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass =
    'min-h-11 rounded-sm border border-border bg-surface-raised px-3.5 text-base text-ink placeholder:text-ink-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
  const labelClass =
    'text-body-small font-semibold uppercase tracking-[0.04em] text-ink-muted';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center gap-1">
        <h1 className="font-heading text-2xl font-semibold">Churo Bites</h1>
        <p className="text-body-small text-ink-muted">Ops Dashboard</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-5 rounded-md bg-surface-raised px-5 py-6 shadow-sm"
      >
        <h2 className="font-heading text-page-title">Log in</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className={labelClass}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-body-small text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="min-h-12 rounded-md bg-brand text-button-primary text-on-brand hover:bg-brand-hover active:bg-brand-hover disabled:opacity-60"
        >
          {isLoading ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-center text-label text-ink-muted">
          Trouble logging in? Ask your co-owner for help.
        </p>
      </form>
    </main>
  );
}

export default Login;
