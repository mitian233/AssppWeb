import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../Layout/PageContainer';
import Alert from '../common/Alert';
import AppIcon from '../common/AppIcon';
import Spinner from '../common/Spinner';
import { isProductPreviewEnabled, previewProductAccounts, previewProductApp } from './productPreview';
import { useAccounts } from '../../hooks/useAccounts';
import { useDownloadAction } from '../../hooks/useDownloadAction';
import { useToastStore } from '../../store/toast';
import { lookupApp } from '../../api/search';
import { storeIdToCountry } from '../../apple/config';
import type { Software } from '../../types';

export default function ProductDetail() {
  const { appId } = useParams<{ appId: string }>();
  const location = useLocation();
  const { accounts } = useAccounts();
  const { t } = useTranslation();
  const addToast = useToastStore((state) => state.addToast);
  const { startDownload, acquireLicense, toastDownloadError, toastLicenseError } = useDownloadAction();

  const previewEnabled = isProductPreviewEnabled(location.search);
  const productAccounts = previewEnabled ? previewProductAccounts : accounts;
  const routeState = location.state as {
    app?: Software;
    country?: string;
  } | null;
  const stateApp = previewEnabled ? previewProductApp : routeState?.app;
  const stateCountry = previewEnabled ? 'US' : routeState?.country;
  const [country] = useState(stateCountry ?? 'US');
  const [app, setApp] = useState<Software | null>(stateApp ?? null);
  const [loading, setLoading] = useState(!stateApp);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loadingAction, setLoadingAction] = useState<'purchase' | 'download' | null>(null);

  const filteredAccounts = useMemo(
    () => productAccounts.filter((a) => storeIdToCountry(a.store) === country),
    [productAccounts, country],
  );

  const account = filteredAccounts.find((a) => a.email === selectedAccount);
  const isDownloading = loadingAction === 'download';

  useEffect(() => {
    if (!stateApp && appId) {
      setLoading(true);
      lookupApp(appId, country)
        .then((result) => {
          setApp(result);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [appId, stateApp, country]);

  useEffect(() => {
    if (filteredAccounts.length > 0 && !filteredAccounts.some((a) => a.email === selectedAccount)) {
      setSelectedAccount(filteredAccounts[0].email);
    }
  }, [filteredAccounts, selectedAccount]);

  if (loading) {
    return (
      <PageContainer title={t('search.product.title')}>
        <div className="py-12 text-center text-app-secondary">{t('loading')}</div>
      </PageContainer>
    );
  }

  if (!app) {
    return (
      <PageContainer title={t('search.product.title')}>
        <p className="text-[17px] leading-[1.47] text-app-secondary">{t('search.product.notFound')}</p>
      </PageContainer>
    );
  }

  async function handlePurchase() {
    if (!account || !app) return;
    setLoadingAction('purchase');
    try {
      if (previewEnabled) {
        await waitForPreviewAction();
        addToast(t('search.product.previewActionComplete'), 'success', t('search.product.previewBadge'));
        return;
      }
      await acquireLicense(account, app);
    } catch (e) {
      toastLicenseError(account, app, e);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDownload() {
    if (!account || !app) return;
    setLoadingAction('download');
    try {
      if (previewEnabled) {
        await waitForPreviewAction();
        addToast(t('search.product.previewActionComplete'), 'success', t('search.product.previewBadge'));
        return;
      }
      await startDownload(account, app);
    } catch (e) {
      toastDownloadError(account, app, e);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <PageContainer>
      <div className="min-w-0 space-y-5 [overflow-wrap:anywhere]">
        {previewEnabled && (
          <Alert type="warning">
            <span className="font-semibold">{t('search.product.previewBadge')}</span>{' '}
            {t('search.product.previewDescription')}
          </Alert>
        )}

        <section className="flex min-w-0 items-start gap-4 p-5 sm:gap-5 sm:p-6">
          <div className="shrink-0">
            <AppIcon url={app.artworkUrl} name={app.name} size="lg" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="app-heading min-w-0 break-words [overflow-wrap:anywhere]">{app.name}</h1>
            <p className="text-[17px] leading-[1.47] text-app-secondary">{app.artistName}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[14px] leading-5 font-normal text-app-secondary">
              <span className="rounded-full bg-app-canvas px-3 py-1">
                {app.formattedPrice ?? t('search.product.free')}
              </span>
              <span className="rounded-full bg-app-canvas px-3 py-1">{app.primaryGenreName}</span>
              <span className="rounded-full bg-app-canvas px-3 py-1">v{app.version}</span>
              <span>
                ★ {app.averageUserRating.toFixed(1)} ({app.userRatingCount} {t('search.product.ratings')})
              </span>
            </div>
          </div>
        </section>

        {productAccounts.length === 0 ? (
          <div className="rounded-2xl bg-yellow-50 p-4 text-[17px] leading-[1.47] text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
            <Link to="/accounts/add" className="app-link-action font-normal underline">
              {t('search.product.addAccountLink')}
            </Link>{' '}
            {t('search.product.addAccountPrompt')}
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="rounded-2xl bg-yellow-50 p-4 text-[17px] leading-[1.47] text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
            {t('search.product.noAccountsForRegion')}
          </div>
        ) : (
          <section className="space-y-4 p-5">
            <div className="min-w-0">
              <label className="mb-1 block text-[14px] leading-5 text-app-secondary">
                {t('search.product.account')}
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="app-field min-h-11 w-full min-w-0"
                disabled={loadingAction !== null}
              >
                {filteredAccounts.map((a) => (
                  <option key={a.email} value={a.email}>
                    {a.firstName} {a.lastName} ({a.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid min-w-0 grid-flow-col auto-cols-fr gap-2 sm:gap-3">
              {(app.price === undefined || app.price === 0) && (
                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={loadingAction !== null}
                  className="app-button-secondary inline-flex min-h-11 w-full min-w-0 items-center justify-center px-2 text-center disabled:opacity-50 sm:px-5"
                >
                  {loadingAction === 'purchase' ? t('search.product.processing') : t('search.product.getLicense')}
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                disabled={loadingAction !== null || !account}
                aria-busy={isDownloading}
                className={`app-button-primary inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 px-2 disabled:cursor-not-allowed sm:gap-2 sm:px-5 ${
                  !account || (loadingAction !== null && !isDownloading) ? 'opacity-50' : ''
                }`}
              >
                <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isDownloading ? <Spinner /> : <DownloadIcon />}
                </span>
                <span>{t('search.product.download')}</span>
              </button>
              <Link
                to={`/search/${app.id}/versions`}
                state={{ app, country }}
                className="app-button-utility inline-flex min-h-11 w-full min-w-0 items-center justify-center px-2 text-center sm:px-5"
              >
                {t('search.product.versionHistory')}
              </Link>
            </div>
          </section>
        )}

        <section className="p-5 sm:p-6">
          <h2 className="mb-2 text-[21px] leading-tight font-semibold text-app-ink">{t('search.product.details')}</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-[14px] leading-5 sm:grid-cols-2">
            <dt className="text-app-secondary">{t('search.product.bundleId')}</dt>
            <dd className="break-all text-app-ink">{app.bundleID}</dd>
            <dt className="text-app-secondary">{t('search.product.version')}</dt>
            <dd className="text-app-ink">{app.version}</dd>
            <dt className="text-app-secondary">{t('search.product.size')}</dt>
            <dd className="text-app-ink">
              {app.fileSizeBytes ? `${(parseInt(app.fileSizeBytes) / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
            </dd>
            <dt className="text-app-secondary">{t('search.product.minOs')}</dt>
            <dd className="text-app-ink">{app.minimumOsVersion}</dd>
            <dt className="text-app-secondary">{t('search.product.seller')}</dt>
            <dd className="text-app-ink">{app.sellerName}</dd>
            <dt className="text-app-secondary">{t('search.product.released')}</dt>
            <dd className="text-app-ink">{new Date(app.releaseDate).toLocaleDateString()}</dd>
          </dl>
        </section>

        {app.description && (
          <section className="p-5 sm:p-6">
            <h2 className="mb-2 text-[21px] leading-tight font-semibold text-app-ink">
              {t('search.product.description')}
            </h2>
            <p className="text-[17px] leading-[1.47] text-app-secondary whitespace-pre-line">{app.description}</p>
          </section>
        )}

        {app.releaseNotes && (
          <section className="p-5 sm:p-6">
            <h2 className="mb-2 text-[21px] leading-tight font-semibold text-app-ink">
              {t('search.product.releaseNotes')}
            </h2>
            <p className="text-[17px] leading-[1.47] text-app-secondary whitespace-pre-line">{app.releaseNotes}</p>
          </section>
        )}

        {app.screenshotUrls && app.screenshotUrls.length > 0 && (
          <section className="p-5 sm:p-6">
            <h2 className="mb-2 text-[21px] leading-tight font-semibold text-app-ink">
              {t('search.product.screenshots')}
            </h2>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {app.screenshotUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  className="h-64 shrink-0 snap-start snap-always rounded-app-card object-contain sm:h-80"
                  loading="lazy"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  );
}

function waitForPreviewAction(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 2000);
  });
}
