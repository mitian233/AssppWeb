import { useState, useEffect, useMemo, useRef, useId } from 'react';
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

  const hero = (
    <section className="relative isolate overflow-hidden bg-[#30343b] text-white wrap-anywhere">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -inset-16 bg-cover bg-center blur-3xl"
          style={{ backgroundImage: app.artworkUrl ? `url(${JSON.stringify(app.artworkUrl)})` : undefined }}
        />
        <div className="absolute inset-0 bg-[#26282c]/75" />
      </div>
      <div className="relative mx-auto flex min-w-0 max-w-5xl items-center gap-5 px-5 py-8 sm:gap-8 sm:px-8 sm:py-10">
        <AppIcon url={app.artworkUrl} name={app.name} size="hero" />
        <div className="min-w-0 flex flex-col w-full gap-1">
          <h1 className="min-w-0 text-[21px] leading-tight font-bold tracking-[-0.02em] text-white wrap-anywhere min-[375px]:text-2xl sm:text-[32px]">
            {app.name}
          </h1>
          <p className="text-[17px] font-semibold leading-[1.47] text-white/85">{app.artistName}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[14px] leading-5 text-white/85">
            <span>{app.formattedPrice ?? t('search.product.free')}</span>
            <span>{app.primaryGenreName}</span>
            <span>v{app.version}</span>
          </div>
          <p className="text-[14px] leading-5 text-white/85">
            ★ {app.averageUserRating.toFixed(1)} ({app.userRatingCount} {t('search.product.ratings')})
          </p>
        </div>
      </div>
    </section>
  );

  return (
    <PageContainer hero={hero}>
      <div className="min-w-0 space-y-5 wrap-anywhere">
        {previewEnabled && (
          <Alert type="warning">
            <span className="font-semibold">{t('search.product.previewBadge')}</span>{' '}
            {t('search.product.previewDescription')}
          </Alert>
        )}

        {productAccounts.length === 0 ? (
          <div className="rounded-sm bg-yellow-50 p-4 text-sm leading-[1.47] text-center text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
            <Link to="/accounts/add" className="app-link-action font-normal underline">
              {t('search.product.addAccountLink')}
            </Link>{' '}
            {t('search.product.addAccountPrompt')}
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="rounded-sm bg-yellow-50 p-4 text-sm leading-[1.47] text-center text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
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
                className={`app-button-primary inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 px-2 disabled:cursor-not-allowed sm:gap-2 sm:px-5 ${!account || (loadingAction !== null && !isDownloading) ? 'opacity-50' : ''
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

        {app.screenshotUrls && app.screenshotUrls.length > 0 && (
          <section className="p-5 sm:p-6">
            <h2 className="mb-2 text-[21px] leading-tight font-semibold text-app-ink">
              {t('search.product.screenshots')}
            </h2>
            <ScreenshotGallery key={app.id} urls={app.screenshotUrls} />
          </section>
        )}

        {app.description && (
          <section className="p-5 sm:p-6">
            <h2 className="mb-2 text-[21px] leading-tight font-semibold text-app-ink">
              {t('search.product.description')}
            </h2>
            <CollapsibleProductText key={`${app.id}:${app.description}`} text={app.description} />
          </section>
        )}

        {app.releaseNotes && (
          <section className="p-5 sm:p-6">
            <h2 className="mb-2 text-[21px] leading-tight font-semibold text-app-ink">
              {t('search.product.releaseNotes')}
            </h2>
            <CollapsibleProductText key={`${app.id}:${app.releaseNotes}`} text={app.releaseNotes} />
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
      </div>
    </PageContainer>
  );
}

function ScreenshotGallery({ urls }: { urls: string[] }) {
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = galleryRef.current;
    if (!element) return;

    const updateMask = () => {
      const leftHidden = element.scrollLeft > 1;
      const rightHidden = element.scrollWidth - element.clientWidth - element.scrollLeft > 1;
      element.style.setProperty('--gallery-mask-left', leftHidden ? '0' : '1');
      element.style.setProperty('--gallery-mask-right', rightHidden ? '0' : '1');
    };

    updateMask();
    const observer = new ResizeObserver(updateMask);
    observer.observe(element);
    for (const image of element.children) observer.observe(image);
    element.addEventListener('scroll', updateMask, { passive: true });
    element.addEventListener('load', updateMask, true);
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', updateMask);
      element.removeEventListener('load', updateMask, true);
    };
  }, [urls]);

  return (
    <div
      ref={galleryRef}
      className="screenshot-gallery flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {urls.map((url, i) => (
        <img
          key={i}
          src={url}
          alt={`Screenshot ${i + 1}`}
          className="h-64 shrink-0 snap-start snap-always rounded-app-card object-contain sm:h-80"
          loading="lazy"
        />
      ))}
    </div>
  );
}

function CollapsibleProductText({ text }: { text: string }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const descriptionId = useId();

  useEffect(() => {
    const element = textRef.current;
    if (!element || expanded) return;

    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <div>
      <p
        ref={textRef}
        id={descriptionId}
        className={`text-sm leading-[1.47] text-app-secondary whitespace-pre-line ${expanded ? '' : 'line-clamp-4'}`}
      >
        {text}
      </p>
      {!expanded && overflowing && (
        <div className="flex justify-end">
          <button
            type="button"
            className="app-link-action min-h-11 rounded-sm px-1 text-sm"
            aria-expanded={expanded}
            aria-controls={descriptionId}
            onClick={() => setExpanded(true)}
          >
            {t('search.product.more')}
          </button>
        </div>
      )}
    </div>
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
