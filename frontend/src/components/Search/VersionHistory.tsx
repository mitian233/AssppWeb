import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../Layout/PageContainer';
import AppIcon from '../common/AppIcon';
import { useAccounts } from '../../hooks/useAccounts';
import { useDownloadAction } from '../../hooks/useDownloadAction';
import { useToastStore } from '../../store/toast';
import { listVersions } from '../../apple/versionFinder';
import { getVersionMetadata } from '../../apple/versionLookup';
import { getErrorMessage } from '../../utils/error';
import { storeIdToCountry } from '../../apple/config';
import type { Software, VersionMetadata } from '../../types';

export default function VersionHistory() {
  const { appId } = useParams<{ appId: string }>();
  const location = useLocation();
  const { accounts, updateAccount } = useAccounts();
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const { startDownload, toastDownloadError } = useDownloadAction();

  const stateApp = (location.state as { app?: Software; country?: string })?.app;
  const stateCountry = (location.state as { country?: string })?.country;
  const country = stateCountry ?? 'US';

  const [app] = useState<Software | null>(stateApp ?? null);
  const [selectedAccount, setSelectedAccount] = useState('');

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => storeIdToCountry(a.store) === country),
    [accounts, country],
  );
  const [versions, setVersions] = useState<string[]>([]);
  const [versionMeta, setVersionMeta] = useState<Record<string, VersionMetadata>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState<Record<string, boolean>>({});
  const [downloadingVersion, setDownloadingVersion] = useState<string | null>(null);

  useEffect(() => {
    if (filteredAccounts.length > 0 && !filteredAccounts.some((a) => a.email === selectedAccount)) {
      setSelectedAccount(filteredAccounts[0].email);
    }
  }, [filteredAccounts, selectedAccount]);

  const account = filteredAccounts.find((a) => a.email === selectedAccount);

  async function handleLoadVersions() {
    if (!account || !app) return;
    setLoading(true);
    try {
      const result = await listVersions(account, app);
      setVersions(result.versions);
      await updateAccount({ ...account, cookies: result.updatedCookies });
    } catch (e) {
      addToast(getErrorMessage(e, t('search.versions.loadFailed')), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMeta(versionId: string) {
    if (!account || !app || versionMeta[versionId]) return;
    setLoadingMeta((prev) => ({ ...prev, [versionId]: true }));
    try {
      const result = await getVersionMetadata(account, app, versionId);
      setVersionMeta((prev) => ({ ...prev, [versionId]: result.metadata }));
      await updateAccount({ ...account, cookies: result.updatedCookies });
    } catch {
      // Silently fail for individual version metadata
    } finally {
      setLoadingMeta((prev) => ({ ...prev, [versionId]: false }));
    }
  }

  async function handleDownloadVersion(versionId: string) {
    if (!account || !app) return;
    setDownloadingVersion(versionId);
    try {
      await startDownload(account, app, versionId);
    } catch (e) {
      toastDownloadError(account, app, e);
    } finally {
      setDownloadingVersion(null);
    }
  }

  if (!app) {
    return (
      <PageContainer title={t('search.versions.title')}>
        <p className="text-[17px] leading-[1.47] text-app-secondary [overflow-wrap:anywhere]">
          {t('search.versions.unavailable')}
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={t('search.versions.title')}>
      <div className="min-w-0 space-y-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0">
            <AppIcon url={app.artworkUrl} name={app.name} size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] leading-[22px] font-semibold text-app-ink [overflow-wrap:anywhere]">
              {app.name}
            </h2>
            <p className="text-[14px] leading-5 text-app-secondary [overflow-wrap:anywhere]">{app.bundleID}</p>
          </div>
        </div>

        {accounts.length > 0 && filteredAccounts.length === 0 ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-[17px] leading-[1.47] text-yellow-700 [overflow-wrap:anywhere] dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            {t('search.product.noAccountsForRegion')}
          </div>
        ) : (
          filteredAccounts.length > 0 && (
            <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-[14px] leading-5 text-app-secondary">
                  {t('search.versions.account')}
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="app-field min-h-11 w-full min-w-0"
                >
                  {filteredAccounts.map((a) => (
                    <option key={a.email} value={a.email}>
                      {a.firstName} {a.lastName} ({a.email})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleLoadVersions}
                disabled={loading || !account}
                className="app-button-primary w-full shrink-0 whitespace-normal sm:w-auto sm:whitespace-nowrap"
              >
                {loading ? t('search.versions.loading') : t('search.versions.load')}
              </button>
            </div>
          )
        )}

        {versions.length > 0 && (
          <div className="min-w-0 divide-y divide-app-divider overflow-hidden">
            {versions.map((versionId) => {
              const meta = versionMeta[versionId];
              const isLoadingMeta = loadingMeta[versionId];
              const isDownloading = downloadingVersion === versionId;

              return (
                <div key={versionId} className="flex min-w-0 items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] leading-[1.47] font-semibold text-app-ink [overflow-wrap:anywhere]">
                      {meta ? `v${meta.displayVersion}` : `ID: ${versionId}`}
                    </p>
                    {meta && (
                      <p className="text-[14px] leading-5 text-app-secondary [overflow-wrap:anywhere]">
                        {new Date(meta.releaseDate).toLocaleDateString()}
                      </p>
                    )}
                    {!meta && !isLoadingMeta && (
                      <button
                        onClick={() => handleLoadMeta(versionId)}
                        className="app-link-action max-w-full py-1 text-left text-[14px] leading-5 [overflow-wrap:anywhere]"
                      >
                        {t('search.versions.loadDetails')}
                      </button>
                    )}
                    {isLoadingMeta && (
                      <span className="text-[14px] leading-5 text-app-tertiary [overflow-wrap:anywhere]">
                        {t('search.versions.loading')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownloadVersion(versionId)}
                    disabled={isDownloading || downloadingVersion !== null}
                    className="app-button-primary max-w-[45%] shrink-0 text-center [overflow-wrap:anywhere]"
                  >
                    {isDownloading ? t('search.versions.downloading') : t('search.versions.download')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
