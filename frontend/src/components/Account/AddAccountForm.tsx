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
    <PageContainer title={t('accounts.addForm.title')}>
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-5 p-5 sm:p-6">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
                {t('accounts.addForm.email')}
              </label>
              <input
                id="email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder={t('accounts.addForm.emailPlaceholder')}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
                {t('accounts.addForm.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="deviceId" className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
                {t('accounts.addForm.deviceId')}
              </label>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <input
                  id="deviceId"
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
                  className="app-button-utility w-full shrink-0 whitespace-normal disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:whitespace-nowrap"
                >
                  {t('accounts.addForm.randomize')}
                </button>
              </div>
              <p className="mt-1 text-sm leading-5 text-app-tertiary">{t('accounts.addForm.deviceIdHelp')}</p>
            </div>

            {needsCode && (
              <div>
                <label htmlFor="code" className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
                  {t('accounts.addForm.code')}
                </label>
                <input
                  id="code"
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
                <p className="mt-1 text-sm leading-5 text-app-tertiary">{t('accounts.addForm.codeHelp')}</p>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="submit"
              disabled={loading}
              className="app-button-primary flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Spinner />}
              {needsCode ? t('accounts.addForm.verify') : t('accounts.addForm.signIn')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/accounts')}
              disabled={loading}
              className="app-button-secondary disabled:opacity-50"
            >
              {t('accounts.addForm.cancel')}
            </button>
          </div>
          {retry && (
            <p className="text-sm leading-5 text-app-secondary">
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
