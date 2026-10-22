import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../Layout/PageContainer';
import Spinner from '../common/Spinner';
import { useAccounts } from '../../hooks/useAccounts';
import { useToastStore } from '../../store/toast';
import { Authenticator, AuthenticationError } from '../../apple/authenticate';
import { getErrorMessage } from '../../utils/error';
import { generateDeviceId } from '../../apple/config';
import type { AuthRetry } from '../../apple/authenticate';

export default function AddAccountForm() {
  const navigate = useNavigate();
  const { addAccount } = useAccounts();
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [deviceId, setDeviceId] = useState(() => generateDeviceId());
  const [needsCode, setNeedsCode] = useState(false);
  const authenticator = useRef<Authenticator | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState<AuthRetry | null>(null);
  const credentialInputClassName =
    'block min-h-11 w-full min-w-0 rounded-[8px] bg-transparent px-4 pb-3 pt-1 text-base text-app-ink placeholder:text-app-tertiary disabled:cursor-not-allowed disabled:opacity-60';
  const inputClassName =
    'block min-w-0 w-full max-w-full app-field text-app-ink disabled:cursor-not-allowed disabled:opacity-60';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanedDeviceId = deviceId.replace(/[: ]/g, '');
      setDeviceId(cleanedDeviceId);

      if (!needsCode || !authenticator.current) authenticator.current = new Authenticator(cleanedDeviceId);
      const account = await authenticator.current.authenticate(
        email,
        password,
        needsCode && code ? code : undefined,
        setRetry,
      );
      await addAccount(account);
      addToast(t('accounts.addForm.addSuccess'), 'success');
      navigate('/accounts');
    } catch (err) {
      if (err instanceof AuthenticationError && err.codeRequired) {
        setNeedsCode(true);
        addToast(err.message, 'error');
      } else {
        addToast(getErrorMessage(err, t('accounts.addForm.authFailed')), 'error');
      }
    } finally {
      setRetry(null);
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-lg py-5 sm:py-9">
        <header className="mb-8 flex flex-col items-center gap-6 text-center sm:mb-10">
          <img
            src="/icon-192x192.png"
            alt="Asspp Web"
            width={112}
            height={112}
            className="h-24 w-24 rounded-[25%] sm:h-28 sm:w-28"
          />
          <h1 className="app-heading text-balance">{t('accounts.addForm.signInTitle')}</h1>
        </header>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-6">
            <div className="rounded-sm border border-app-divider bg-app-surface">
              <div className="border-b border-app-divider">
                <label htmlFor="email" className="block px-4 pt-3 text-sm leading-5 text-app-secondary">
                  {t('accounts.addForm.email')}
                </label>
                <input
                  id="email"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder={t('accounts.addForm.emailPlaceholder')}
                  className={credentialInputClassName}
                />
              </div>
              <div>
                <label htmlFor="password" className="block px-4 pt-3 text-sm leading-5 text-app-secondary">
                  {t('accounts.addForm.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={credentialInputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="deviceId" className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
                {t('accounts.addForm.deviceId')}
              </label>
              <div className="flex gap-2 flex-row items-center">
                <input
                  id="deviceId"
                  aria-describedby="deviceId-help"
                  type="text"
                  required
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  disabled={loading || needsCode}
                  className={`${inputClassName} min-w-0 flex-1 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setDeviceId(generateDeviceId())}
                  disabled={loading || needsCode}
                  className="app-button-utility shrink-0 disabled:cursor-not-allowed disabled:opacity-50 w-auto whitespace-nowrap"
                >
                  {t('accounts.addForm.randomize')}
                </button>
              </div>
              <p id="deviceId-help" className="mt-2 text-sm leading-5 text-app-secondary">
                {t('accounts.addForm.deviceIdHelp')}
              </p>
            </div>

            {needsCode && (
              <div>
                <label htmlFor="code" className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
                  {t('accounts.addForm.code')}
                </label>
                <input
                  id="code"
                  autoComplete="one-time-code"
                  aria-describedby="code-help"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                  placeholder={t('accounts.addForm.codePlaceholder')}
                  className={inputClassName}
                  autoFocus
                />
                <p id="code-help" className="mt-2 text-sm leading-5 text-app-secondary">
                  {t('accounts.addForm.codeHelp')}
                </p>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 sm:pt-8">
            <button
              type="submit"
              disabled={loading}
              className="app-button-primary flex items-center justify-center gap-2 rounded-[8px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Spinner />}
              {needsCode ? t('accounts.addForm.verify') : t('accounts.addForm.signIn')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/accounts')}
              disabled={loading}
              className="app-button-secondary-rect disabled:opacity-50"
            >
              {t('accounts.addForm.cancel')}
            </button>
          </div>
          {retry && (
            <p role="status" className="text-sm leading-5 text-app-secondary">
              {t('accounts.addForm.retrying', {
                status: retry.status,
                seconds: Math.round(retry.delayMs / 1000),
                attempt: retry.attempt,
                attempts: retry.attempts,
              })}
            </p>
          )}
        </form>
      </div>
    </PageContainer>
  );
}
