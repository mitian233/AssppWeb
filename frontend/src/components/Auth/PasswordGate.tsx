import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Spinner from '../common/Spinner';

const SESSION_KEY = 'auth-token';

export function getAccessToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function PasswordGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'required' | 'verified'>('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then(async (data: { required: boolean }) => {
        if (!data.required) {
          sessionStorage.removeItem(SESSION_KEY);
          setStatus('verified');
          return;
        }

        const storedToken = sessionStorage.getItem(SESSION_KEY);
        if (storedToken) {
          // Validate stored token — it may be stale after a password change
          try {
            const res = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: storedToken }),
            });
            const result = (await res.json()) as { ok: boolean };
            if (result.ok) {
              setStatus('verified');
              return;
            }
          } catch {
            // Validation failed — fall through to show password form
          }
          sessionStorage.removeItem(SESSION_KEY);
        }

        setStatus('required');
      })
      .catch(() => {
        // If we can't reach the server, let the app load normally
        setStatus('verified');
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const hash = await hashPassword(password);
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: hash }),
      });
      const data = (await res.json()) as { ok: boolean };

      if (data.ok) {
        sessionStorage.setItem(SESSION_KEY, hash);
        setStatus('verified');
      } else {
        setError(t('auth.error'));
      }
    } catch {
      setError(t('auth.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <GateBackdrop>
        <div className="flex flex-col items-center gap-4 text-blue-600 dark:text-blue-400">
          <AppMark />
          <div className="flex items-center gap-2 text-[13px] leading-4 font-medium text-app-tertiary">
            <Spinner />
            <span>{t('loading')}</span>
          </div>
        </div>
      </GateBackdrop>
    );
  }

  if (status === 'verified') {
    return <>{children}</>;
  }

  return (
    <GateBackdrop>
      <main className="w-full max-w-md rounded-app-card border border-app-divider bg-app-surface/85 p-6 shadow-app-card backdrop-blur-2xl sm:p-8">
        <div className="text-center">
          <AppMark />
          <h1 className="mt-5 text-[26px] leading-8 font-bold tracking-tight text-app-ink">{t('auth.title')}</h1>
          <p className="mt-2 text-[13px] leading-4 text-app-secondary">Asspp Web</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-app-tertiary">
              <LockIcon />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder={t('auth.placeholder')}
              aria-label={t('auth.placeholder')}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'access-password-error' : undefined}
              autoComplete="current-password"
              autoFocus
              className="min-h-12 w-full rounded-[6px] border border-app-divider bg-app-canvas py-3 pl-11 pr-4 text-base text-app-ink outline-none transition-colors placeholder:text-app-tertiary focus:border-blue-500 focus:bg-app-surface focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          {error && (
            <p
              id="access-password-error"
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-[13px] leading-4 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            aria-busy={submitting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-app-action px-5 py-3 text-[13px] leading-4 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Spinner />}
            {submitting ? t('auth.verifying') : t('auth.submit')}
          </button>
        </form>
      </main>
    </GateBackdrop>
  );
}

function GateBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-app-canvas px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute -left-32 -top-36 h-96 w-96 rounded-full bg-blue-300/40 blur-3xl dark:bg-blue-900/30"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-28 h-96 w-96 rounded-full bg-purple-300/30 blur-3xl dark:bg-purple-900/20"
      />
      <div className="relative z-10 flex w-full items-center justify-center">{children}</div>
    </div>
  );
}

function AppMark() {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 text-white">
      <svg
        aria-hidden="true"
        className="h-11 w-11"
        fill="none"
        viewBox="0 0 48 48"
        stroke="currentColor"
        strokeWidth={4}
      >
        <path strokeLinecap="round" d="M13 35 27 11M21 35h16M12 27h20" />
      </svg>
    </div>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 10.5V8.25a4.5 4.5 0 0 1 9 0v2.25m-10.5 0h12a1.5 1.5 0 0 1 1.5 1.5v7.5H4.5V12A1.5 1.5 0 0 1 6 10.5Z"
      />
    </svg>
  );
}
