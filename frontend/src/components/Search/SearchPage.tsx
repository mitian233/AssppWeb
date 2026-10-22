import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../Layout/PageContainer';
import AppIcon from '../common/AppIcon';
import CountrySelect from '../common/CountrySelect';
import { useSearch } from '../../hooks/useSearch';
import { useAccounts } from '../../hooks/useAccounts';
import { useSettingsStore } from '../../store/settings';
import { useToastStore } from '../../store/toast';
import { firstAccountCountry } from '../../utils/account';
import { countryCodeMap, storeIdToCountry } from '../../apple/config';

export default function SearchPage() {
  const { t } = useTranslation();
  const { defaultCountry, defaultEntity } = useSettingsStore();
  const { accounts } = useAccounts();
  const initialCountry = firstAccountCountry(accounts) ?? defaultCountry;
  const addToast = useToastStore((s) => s.addToast);

  const { term, country, entity, results, loading, error, search, setSearchParam } = useSearch();

  useEffect(() => {
    if (error) {
      addToast(error, 'error');
    }
  }, [error, addToast]);

  useEffect(() => {
    if (!country && initialCountry) setSearchParam({ country: initialCountry });
    if (!entity && defaultEntity) setSearchParam({ entity: defaultEntity });
  }, [country, initialCountry, entity, defaultEntity, setSearchParam]);

  const activeCountry = country || initialCountry;
  const activeEntity = entity || defaultEntity;

  const availableCountryCodes = Array.from(
    new Set(accounts.map((a) => storeIdToCountry(a.store)).filter(Boolean) as string[]),
  ).sort((a, b) => t(`countries.${a}`, a).localeCompare(t(`countries.${b}`, b)));

  const allCountryCodes = Object.keys(countryCodeMap).sort((a, b) =>
    t(`countries.${a}`, a).localeCompare(t(`countries.${b}`, b)),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim()) return;
    search(term.trim(), activeCountry, activeEntity);
  }

  return (
    <PageContainer title={t('search.title')}>
      <form onSubmit={handleSubmit} className="mb-8 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={term}
            onChange={(e) => setSearchParam({ term: e.target.value })}
            placeholder={t('search.placeholder')}
            className="app-search-field min-h-11 flex-1"
          />
          <button
            type="submit"
            disabled={loading || !term.trim()}
            className="app-button-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t('search.searching') : t('search.button')}
          </button>
        </div>
        <div className="flex w-full gap-3 overflow-hidden border-t border-app-divider pt-3">
          <CountrySelect
            value={activeCountry}
            onChange={(c) => setSearchParam({ country: c })}
            availableCountryCodes={availableCountryCodes}
            allCountryCodes={allCountryCodes}
            className="app-field w-1/2 truncate"
          />
          <select
            value={activeEntity}
            onChange={(e) => setSearchParam({ entity: e.target.value })}
            aria-label={t('settings.defaults.entity')}
            className="app-field min-h-11 w-1/2 truncate"
          >
            <option value="iPhone">iPhone</option>
            <option value="iPad">iPad</option>
          </select>
        </div>
      </form>

      {results.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center bg-app-surface">
            <svg
              className="h-8 w-8 text-app-action"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-[17px] leading-[22px] font-semibold text-app-ink">{t('search.empty')}</h3>
          <p className="max-w-full text-[17px] leading-[1.47] text-app-secondary">{t('search.emptyDesc')}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden">
          <div className="divide-y divide-app-divider">
            {results.map((app) => (
              <Link
                key={app.id}
                to={`/search/${app.id}`}
                state={{ app, country: activeCountry }}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-app-hover active:bg-app-selected"
              >
                <AppIcon url={app.artworkUrl} name={app.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] leading-[22px] font-semibold text-app-ink">{app.name}</p>
                  <p className="truncate text-[17px] leading-[1.47] text-app-secondary">{app.artistName}</p>
                  <div className="mt-1 flex items-center gap-2 overflow-hidden text-[14px] leading-5 text-app-tertiary">
                    <span className="shrink-0">{app.formattedPrice ?? t('search.free')}</span>
                    <span className="truncate">{app.primaryGenreName}</span>
                    <span className="shrink-0">★ {app.averageUserRating.toFixed(1)}</span>
                  </div>
                </div>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-canvas text-xl text-app-action"
                  aria-hidden="true"
                >
                  ›
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
