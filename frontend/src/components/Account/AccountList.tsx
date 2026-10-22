import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../Layout/PageContainer';
import { useAccountsStore } from '../../store/accounts';
import { storeIdToCountry } from '../../apple/config';

export default function AccountList() {
  const { t } = useTranslation();
  const { accounts, loading, loadAccounts } = useAccountsStore();

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  return (
    <PageContainer
      title={t('accounts.title')}
      action={
        <Link to="/accounts/add" className="app-button-primary inline-flex items-center rounded-[8px]">
          {t('accounts.add')}
        </Link>
      }
    >
      {loading ? (
        <div className="py-12 text-center text-sm leading-5 text-app-tertiary">{t('accounts.loading')}</div>
      ) : accounts.length === 0 ? (
        <div className="my-4 flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center text-app-action">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg leading-6 font-semibold text-app-ink">{t('accounts.empty')}</h3>
          <p className="mb-6 max-w-full text-[17px] leading-relaxed text-app-secondary">{t('accounts.emptyDesc')}</p>
          <Link to="/accounts/add" className="app-button-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('accounts.addFirst')}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="divide-y divide-app-divider">
            {accounts.map((account) => {
              const countryCode = storeIdToCountry(account.store) || account.store;
              const countryName = t(`countries.${countryCode}`, countryCode);

              return (
                <NavLink
                  key={account.email}
                  to={`/accounts/${encodeURIComponent(account.email)}`}
                  className={({ isActive }) =>
                    `flex items-center gap-4 p-4 transition-colors ${isActive ? 'bg-app-selected' : 'hover:bg-app-hover'
                    }`
                  }
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-app-action text-lg font-normal text-white">
                    {(account.firstName || account.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm leading-5 font-normal text-app-ink">
                      {account.firstName} {account.lastName}
                    </p>
                    <p className="truncate text-sm leading-5 text-app-secondary">{account.email}</p>
                  </div>
                  <div
                    title={countryName}
                    className="max-w-24 shrink-0 truncate rounded-full bg-app-canvas px-2.5 py-1 text-sm leading-5 font-normal text-app-tertiary sm:px-3"
                  >
                    <span className="sm:hidden">{countryCode}</span>
                    <span className="hidden truncate sm:block">{countryName}</span>
                  </div>
                  <span className="text-xl text-app-tertiary" aria-hidden="true">
                    ›
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
