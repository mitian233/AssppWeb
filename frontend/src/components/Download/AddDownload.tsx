import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PageContainer from '../Layout/PageContainer';
import AppIcon from '../common/AppIcon';
import CountrySelect from '../common/CountrySelect';
import { useAccounts } from '../../hooks/useAccounts';
import { useDownloadAction } from '../../hooks/useDownloadAction';
import { useSettingsStore } from '../../store/settings';
import { useToastStore } from '../../store/toast';
import { lookupApp } from '../../api/search';
import { listVersions } from '../../apple/versionFinder';
import { firstAccountCountry } from '../../utils/account';
import { getErrorMessage } from '../../utils/error';
import { countryCodeMap, storeIdToCountry } from '../../apple/config';
import type { Software } from '../../types';

export default function AddDownload() {
  const { accounts, updateAccount } = useAccounts();
  const { defaultCountry } = useSettingsStore();
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const { startDownload, acquireLicense, toastDownloadError, toastLicenseError } = useDownloadAction();

  const [bundleId, setBundleId] = useState('');
  const [country, setCountry] = useState(defaultCountry);
  const [countryTouched, setCountryTouched] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [app, setApp] = useState<Software | null>(null);
  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [step, setStep] = useState<'lookup' | 'ready' | 'versions'>('lookup');
  const [loadingAction, setLoadingAction] = useState<'lookup' | 'license' | 'versions' | 'download' | null>(null);

  const isLoading = loadingAction !== null;

  const availableCountryCodes = Array.from(
    new Set(accounts.map((a) => storeIdToCountry(a.store)).filter(Boolean) as string[]),
  ).sort((a, b) => t(`countries.${a}`, a).localeCompare(t(`countries.${b}`, b)));

  const allCountryCodes = Object.keys(countryCodeMap).sort((a, b) =>
    t(`countries.${a}`, a).localeCompare(t(`countries.${b}`, b)),
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => storeIdToCountry(a.store) === country);
  }, [accounts, country]);

  useEffect(() => {
    if (filteredAccounts.length > 0) {
      if (!selectedAccount || !filteredAccounts.find((a) => a.email === selectedAccount)) {
        setSelectedAccount(filteredAccounts[0].email);
      }
    } else if (selectedAccount !== '') {
      setSelectedAccount('');
    }
  }, [filteredAccounts, selectedAccount]);

  const account = accounts.find((a) => a.email === selectedAccount);
  const autoCountry = firstAccountCountry(accounts);

  useEffect(() => {
    if (countryTouched) return;
    const nextCountry = autoCountry ?? defaultCountry;
    if (nextCountry && nextCountry !== country) {
      setCountry(nextCountry);
    }
  }, [autoCountry, country, countryTouched, defaultCountry]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!bundleId.trim()) return;
    setLoadingAction('lookup');
    try {
      const result = await lookupApp(bundleId.trim(), country);
      if (!result) {
        addToast(t('downloads.add.notFound'), 'error');
        return;
      }
      setApp(result);
      setStep('ready');
    } catch (e) {
      addToast(getErrorMessage(e, t('downloads.add.lookupFailed')), 'error');
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleGetLicense() {
    if (!account || !app) return;
    setLoadingAction('license');
    try {
      await acquireLicense(account, app);
    } catch (e) {
      toastLicenseError(account, app, e);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLoadVersions() {
    if (!account || !app) return;
    setLoadingAction('versions');
    try {
      const result = await listVersions(account, app);
      setVersions(result.versions);
      await updateAccount({ ...account, cookies: result.updatedCookies });
      setStep('versions');
    } catch (e) {
      addToast(getErrorMessage(e, t('downloads.add.versionsFailed')), 'error');
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDownload() {
    if (!account || !app) return;
    setLoadingAction('download');
    try {
      await startDownload(account, app, selectedVersion || undefined);
    } catch (e) {
      toastDownloadError(account, app, e);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <PageContainer title={t('downloads.add.title')}>
      <div className="min-w-0 space-y-6">
        <form onSubmit={handleLookup} className="min-w-0 space-y-4">
          <div className="min-w-0">
            <label className="mb-1 block text-[14px] leading-5 text-app-secondary">{t('downloads.add.bundleId')}</label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                placeholder={t('downloads.add.placeholder')}
                className="app-field min-h-11 w-full min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !bundleId.trim()}
                className="app-button-primary min-w-0 rounded-[8px] whitespace-normal break-words disabled:opacity-50 sm:w-auto"
              >
                {loadingAction === 'lookup' ? t('downloads.add.lookingUp') : t('downloads.add.lookup')}
              </button>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <CountrySelect
              value={country}
              onChange={(v) => {
                setCountry(v);
                setCountryTouched(true);
              }}
              availableCountryCodes={availableCountryCodes}
              allCountryCodes={allCountryCodes}
              disabled={isLoading}
              className="app-field min-h-11 w-full min-w-0 max-w-full truncate disabled:cursor-not-allowed disabled:opacity-60"
            />
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="app-field min-h-11 w-full min-w-0 max-w-full truncate disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading || filteredAccounts.length === 0}
            >
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((a) => (
                  <option key={a.email} value={a.email}>
                    {a.firstName} {a.lastName} ({a.email})
                  </option>
                ))
              ) : (
                <option value="">{t('downloads.add.noAccountsForRegion')}</option>
              )}
            </select>
          </div>
        </form>

        {!app && !isLoading && (
          <div className="flex min-w-0 flex-col items-center justify-center px-5 py-14 text-center sm:px-6">
            <div className="mb-5 flex h-16 w-16 items-center justify-center">
              <svg
                className="h-8 w-8 text-app-action"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-2 min-w-0 break-words text-center text-[17px] leading-[22px] font-semibold text-app-ink [overflow-wrap:anywhere]">
              {t('downloads.add.emptyTitle')}
            </h3>
            <p className="max-w-sm min-w-0 break-words text-center text-[17px] leading-[1.47] text-app-secondary [overflow-wrap:anywhere]">
              {t('downloads.add.emptyDesc')}
            </p>
          </div>
        )}

        {app && (
          <div className="min-w-0 p-5 sm:p-6">
            <div className="mb-4 flex min-w-0 items-start gap-4">
              <AppIcon url={app.artworkUrl} name={app.name} size="md" />
              <div className="min-w-0 flex-1">
                <p
                  title={app.name}
                  className="min-w-0 break-words text-[17px] leading-[22px] font-semibold text-app-ink [overflow-wrap:anywhere]"
                >
                  {app.name}
                </p>
                <p
                  title={app.artistName}
                  className="min-w-0 break-words text-[17px] leading-[1.47] text-app-secondary [overflow-wrap:anywhere]"
                >
                  {app.artistName}
                </p>
                <p
                  title={`${app.version} - ${app.formattedPrice ?? t('search.product.free')}`}
                  className="min-w-0 break-all text-[14px] leading-5 text-app-tertiary"
                >
                  v{app.version} - {app.formattedPrice ?? t('search.product.free')}
                </p>
              </div>
            </div>

            {step === 'versions' && versions.length > 0 && (
              <div className="mb-4 min-w-0">
                <label className="mb-1 block text-[14px] leading-5 text-app-secondary">
                  {t('downloads.add.versionOptional')}
                </label>
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="app-field min-h-11 w-full min-w-0 max-w-full truncate disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">{t('downloads.add.latest')}</option>
                  {versions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              {(app.price === undefined || app.price === 0) && (
                <button
                  onClick={handleGetLicense}
                  disabled={isLoading || !account}
                  className="app-button-secondary-rect min-w-0 whitespace-normal break-words disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {loadingAction === 'license' ? t('downloads.add.processing') : t('downloads.add.getLicense')}
                </button>
              )}
              {step !== 'versions' && (
                <button
                  onClick={handleLoadVersions}
                  disabled={isLoading || !account}
                  className="app-button-utility min-w-0 whitespace-normal break-words disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {loadingAction === 'versions' ? t('downloads.add.processing') : t('downloads.add.selectVersion')}
                </button>
              )}
              <button
                onClick={handleDownload}
                disabled={isLoading || !account}
                className="app-button-primary min-w-0 rounded-[8px] whitespace-normal break-words disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loadingAction === 'download' ? t('downloads.add.processing') : t('downloads.add.download')}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
