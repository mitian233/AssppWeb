import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../Layout/PageContainer';
import { useAccounts } from '../../hooks/useAccounts';
import { apiGet } from '../../api/client';
import { accountHash } from '../../utils/account';

interface Stats {
  accounts: number;
  downloads: number;
  packages: number;
}

export default function HomePage() {
  const { t } = useTranslation();
  const { accounts } = useAccounts();
  const [stats, setStats] = useState<Stats>({
    accounts: 0,
    downloads: 0,
    packages: 0,
  });

  useEffect(() => {
    setStats((prev) => ({ ...prev, accounts: accounts.length }));

    if (accounts.length === 0) {
      setStats((prev) => ({ ...prev, downloads: 0, packages: 0 }));
      return;
    }

    let cancelled = false;

    (async () => {
      const hashes = await Promise.all(accounts.map((a) => accountHash(a)));
      if (cancelled) return;

      const params = new URLSearchParams({
        accountHashes: hashes.join(','),
      });

      const [downloads, packages] = await Promise.all([
        apiGet<any[]>(`/api/downloads?${params}`).catch(() => []),
        apiGet<any[]>(`/api/packages?${params}`).catch(() => []),
      ]);

      if (cancelled) return;

      setStats((prev) => ({
        ...prev,
        downloads: Array.isArray(downloads) ? downloads.length : 0,
        packages: Array.isArray(packages) ? packages.length : 0,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [accounts]);

  const primaryAction =
    accounts.length === 0
      ? {
          to: '/accounts/add',
          label: t('home.actions.addAccount'),
        }
      : {
          to: '/search',
          label: t('home.actions.searchApps'),
        };

  return (
    <PageContainer>
      <div className="space-y-8 pb-4">
        <section className="relative min-h-80 overflow-hidden bg-app-surface px-6 py-8 sm:min-h-96 sm:px-10 sm:py-10">
          <div className="relative z-10 flex min-h-64 max-w-xl flex-col items-start justify-center sm:min-h-76">
            <h1 className="app-heading text-[28px] sm:text-[clamp(2.5rem,5vw,3.5rem)]">{t('home.welcome')}</h1>
            <p className="mt-4 max-w-full text-[17px] leading-[1.47] text-app-secondary sm:max-w-lg">
              {t('home.subtitle')}
            </p>
            <Link to={primaryAction.to} className="app-button-primary mt-7 gap-2 text-[17px]">
              {primaryAction.label}
              <ArrowRightIcon />
            </Link>
          </div>
          <div
            aria-hidden="true"
            className="absolute -bottom-6 -right-5 hidden h-64 w-64 grid-cols-2 gap-3 border border-app-divider bg-app-surface p-5 lg:grid"
          >
            <div className="flex items-center justify-center bg-app-canvas text-app-action">
              <SearchGlyph className="h-10 w-10" />
            </div>
            <div className="flex items-center justify-center bg-app-canvas text-app-action">
              <AccountGlyph className="h-10 w-10" />
            </div>
            <div className="flex items-center justify-center bg-app-canvas text-app-action">
              <DownloadGlyph className="h-10 w-10" />
            </div>
            <div className="flex items-center justify-center bg-app-canvas text-2xl font-semibold text-app-action">
              A
            </div>
          </div>
        </section>

        <section aria-label={t('home.welcome')} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<AccountGlyph className="h-5 w-5" />}
            iconClassName="bg-app-surface text-app-action"
            label={t('home.stats.accounts')}
            value={stats.accounts}
          />
          <StatCard
            icon={<DownloadGlyph className="h-5 w-5" />}
            iconClassName="bg-app-surface text-app-action"
            label={t('home.stats.downloads')}
            value={stats.downloads}
          />
          <StatCard
            icon={<PackageGlyph className="h-5 w-5" />}
            iconClassName="bg-app-surface text-app-action"
            label={t('home.stats.packages')}
            value={stats.packages}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            to="/accounts/add"
            icon={<AccountGlyph className="h-6 w-6" />}
            iconClassName="bg-app-surface text-app-action"
            title={t('home.actions.addAccount')}
            description={t('home.actions.addAccountDesc')}
          />
          <ActionCard
            to="/search"
            icon={<SearchGlyph className="h-6 w-6" />}
            iconClassName="bg-app-surface text-app-action"
            title={t('home.actions.searchApps')}
            description={t('home.actions.searchAppsDesc')}
          />
          <ActionCard
            to="/downloads"
            icon={<DownloadGlyph className="h-6 w-6" />}
            iconClassName="bg-app-surface text-app-action"
            title={t('home.actions.viewDownloads')}
            description={t('home.actions.viewDownloadsDesc')}
          />
        </section>
      </div>
    </PageContainer>
  );
}

function StatCard({
  icon,
  iconClassName,
  label,
  value,
}: {
  icon: ReactNode;
  iconClassName: string;
  label: string;
  value: number;
}) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[14px] leading-5 text-app-secondary">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-app-ink">{value}</p>
        </div>
        <div
          aria-hidden="true"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  iconClassName,
  title,
  description,
}: {
  to: string;
  icon: ReactNode;
  iconClassName: string;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="group flex min-h-44 flex-col p-5 transition-colors hover:bg-app-surface">
      <div className="flex items-start justify-between gap-4">
        <div aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClassName}`}>
          {icon}
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-app-canvas text-app-secondary transition-colors group-hover:bg-app-action group-hover:text-white">
          <ArrowRightIcon />
        </span>
      </div>
      <div className="mt-auto pt-5">
        <h2 className="text-[17px] leading-5.5 font-semibold text-app-ink">{title}</h2>
        <p className="mt-1 text-[17px] leading-[1.47] text-app-secondary">{description}</p>
      </div>
    </Link>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
    </svg>
  );
}

function AccountGlyph({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.12a7.5 7.5 0 0 1 15 0A17.93 17.93 0 0 1 12 21.75a17.93 17.93 0 0 1-7.5-1.63Z"
      />
    </svg>
  );
}

function SearchGlyph({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.05 6.05a7.5 7.5 0 0 0 10.6 10.6Z"
      />
    </svg>
  );
}

function DownloadGlyph({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4.5 19.5h15" />
    </svg>
  );
}

function PackageGlyph({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 8.25-9-5.25-9 5.25m18 0-9 5.25m9-5.25v7.5L12 21m0-7.5L3 8.25m9 5.25V21M3 8.25v7.5L12 21"
      />
    </svg>
  );
}
