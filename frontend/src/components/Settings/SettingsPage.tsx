import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import PageContainer from '../Layout/PageContainer';
import Modal from '../common/Modal';
import { useAccountsStore } from '../../store/accounts';
import { useToastStore } from '../../store/toast';
import { apiGet } from '../../api/client';
import { encryptData, decryptData } from '../../utils/crypto';
import { countryCodeMap } from '../../apple/config';
import type { Account } from '../../types';

interface ServerInfo {
  uptime?: number;
  buildCommit?: string;
  buildDate?: string;
  port?: number;
  dataDir?: string;
  publicBaseUrl?: string;
  disableHttpsRedirect?: boolean;
  autoCleanupDays?: number;
  autoCleanupMaxMB?: number;
  maxDownloadMB?: number;
  downloadThreads?: number;
}

const entityTypes = [
  { value: 'software', label: 'iPhone' },
  { value: 'iPadSoftware', label: 'iPad' },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { accounts, addAccount, updateAccount } = useAccountsStore();
  const addToast = useToastStore((s) => s.addToast);

  const [country, setCountry] = useState(() => localStorage.getItem('asspp-default-country') || 'US');
  const [entity, setEntity] = useState(() => localStorage.getItem('asspp-default-entity') || 'software');
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportConfirmPassword, setExportConfirmPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [importFileData, setImportFileData] = useState('');

  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingAccounts, setPendingAccounts] = useState<Account[]>([]);
  const [conflictStats, setConflictStats] = useState({ conflict: 0, new: 0 });

  useEffect(() => {
    localStorage.setItem('asspp-default-country', country);
  }, [country]);

  useEffect(() => {
    localStorage.setItem('asspp-default-entity', entity);
  }, [entity]);

  useEffect(() => {
    apiGet<ServerInfo>('/api/settings')
      .then(setServerInfo)
      .catch(() => setServerInfo(null));
  }, []);

  const sortedCountries = Object.keys(countryCodeMap).sort((a, b) =>
    t(`countries.${a}`, a).localeCompare(t(`countries.${b}`, b)),
  );

  const handleExport = async () => {
    if (exportPassword !== exportConfirmPassword) {
      addToast(t('settings.data.passwordMismatch'), 'error');
      return;
    }
    try {
      const encrypted = await encryptData(accounts, exportPassword);
      const blob = new Blob([encrypted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'asspp-accounts.enc';
      a.click();
      URL.revokeObjectURL(url);

      setExportModalOpen(false);
      setExportPassword('');
      setExportConfirmPassword('');
      addToast(t('settings.data.exportSuccess'), 'success');
    } catch {
      addToast(t('settings.data.exportFailed'), 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportFileData(content);
      setImportModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    try {
      const parsed = await decryptData(importFileData, importPassword);
      if (!Array.isArray(parsed)) throw new Error('Invalid format');
      const valid = parsed.filter(
        (item: any) => item && typeof item === 'object' && typeof item.email === 'string' && item.email.length > 0,
      ) as Account[];
      if (valid.length === 0) throw new Error('No valid accounts found');

      if (accounts.length === 0) {
        for (const acc of valid) {
          await addAccount(acc);
        }
        addToast(t('settings.data.importSuccess'), 'success');
        setImportModalOpen(false);
        setImportPassword('');
      } else {
        let conflictCount = 0;
        let newCount = 0;
        valid.forEach((imported) => {
          if (accounts.some((a) => a.email === imported.email)) conflictCount++;
          else newCount++;
        });

        if (conflictCount > 0) {
          setConflictStats({ conflict: conflictCount, new: newCount });
          setPendingAccounts(valid);
          setImportModalOpen(false);
          setImportPassword('');
          setConflictModalOpen(true);
        } else {
          for (const acc of valid) {
            await addAccount(acc);
          }
          addToast(t('settings.data.importSuccess'), 'success');
          setImportModalOpen(false);
          setImportPassword('');
        }
      }
    } catch {
      addToast(t('settings.data.incorrectPassword'), 'error');
    }
  };

  const handleResolveConflict = async (overwrite: boolean) => {
    for (const imported of pendingAccounts) {
      const exists = accounts.some((a) => a.email === imported.email);
      if (exists) {
        if (overwrite) await updateAccount(imported);
      } else {
        await addAccount(imported);
      }
    }
    setConflictModalOpen(false);
    setPendingAccounts([]);
    addToast(t('settings.data.importSuccess'), 'success');
  };

  return (
    <PageContainer title={t('settings.title')}>
      <div className="min-w-0 space-y-6">
        <section className="min-w-0 border-b border-app-divider px-4 py-4 sm:px-6 sm:py-6">
          <h2 className="mb-4 text-[21px] leading-[25px] font-semibold text-app-ink">{t('settings.language.title')}</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="language" className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
                {t('settings.language.label')}
              </label>
              <select
                id="language"
                value={i18n.resolvedLanguage || 'en-US'}
                onChange={async (e) => {
                  const newLang = e.target.value;
                  await i18n.changeLanguage(newLang);
                  addToast(t('settings.language.changed'), 'success');
                }}
                className="app-field block min-w-0 w-full max-w-full truncate text-app-ink"
              >
                <option value="en-US">English (US)</option>
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁體中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="ru">Русский</option>
              </select>
            </div>
          </div>
        </section>

        <section className="min-w-0 border-b border-app-divider px-4 py-4 sm:px-6 sm:py-6">
          <h2 className="mb-4 text-[21px] leading-[25px] font-semibold text-app-ink">{t('settings.defaults.title')}</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="country" className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
                {t('settings.defaults.country')}
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  addToast(t('settings.defaults.countryChanged'), 'success');
                }}
                className="app-field block min-w-0 w-full max-w-full truncate text-app-ink"
              >
                {sortedCountries.map((code) => (
                  <option key={code} value={code}>
                    {t(`countries.${code}`, code)} ({code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="entity" className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
                {t('settings.defaults.entity')}
              </label>
              <select
                id="entity"
                value={entity}
                onChange={(e) => {
                  setEntity(e.target.value);
                  addToast(t('settings.defaults.entityChanged'), 'success');
                }}
                className="app-field block min-w-0 w-full max-w-full truncate text-app-ink"
              >
                {entityTypes.map((et) => (
                  <option key={et.value} value={et.value}>
                    {et.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="min-w-0 border-b border-app-divider px-4 py-4 sm:px-6 sm:py-6">
          <h2 className="mb-4 text-[21px] leading-[25px] font-semibold text-app-ink">{t('settings.server.title')}</h2>
          {serverInfo ? (
            <div className="min-w-0 space-y-6">
              <dl className="min-w-0 divide-y divide-app-divider">
                {serverInfo.uptime != null && (
                  <SettingsInfoRow label={t('settings.server.uptime')}>
                    {formatUptime(serverInfo.uptime)}
                  </SettingsInfoRow>
                )}
              </dl>

              <div className="min-w-0">
                <h3 className="mb-3 text-[17px] leading-[22px] font-semibold text-app-ink">
                  {t('settings.server.configuration')}
                </h3>
                <dl className="min-w-0 divide-y divide-app-divider border-y border-app-divider">
                  <SettingsInfoRow label="PORT" mono>
                    {serverInfo.port}
                  </SettingsInfoRow>
                  <SettingsInfoRow label="DATA_DIR" mono valueTitle={serverInfo.dataDir}>
                    {serverInfo.dataDir}
                  </SettingsInfoRow>
                  <SettingsInfoRow label="PUBLIC_BASE_URL" mono valueTitle={serverInfo.publicBaseUrl || undefined}>
                    {serverInfo.publicBaseUrl || (
                      <span className="text-app-tertiary italic">{t('settings.server.notSet')}</span>
                    )}
                  </SettingsInfoRow>
                  <SettingsInfoRow label="UNSAFE_DANGEROUSLY_DISABLE_HTTPS_REDIRECT" mono>
                    {serverInfo.disableHttpsRedirect ? t('settings.server.enabled') : t('settings.server.disabled')}
                  </SettingsInfoRow>
                  <SettingsInfoRow label="AUTO_CLEANUP_DAYS" mono>
                    {serverInfo.autoCleanupDays || t('settings.server.disabled')}
                  </SettingsInfoRow>
                  <SettingsInfoRow label="AUTO_CLEANUP_MAX_MB" mono>
                    {serverInfo.autoCleanupMaxMB || t('settings.server.disabled')}
                  </SettingsInfoRow>
                  <SettingsInfoRow label="MAX_DOWNLOAD_MB" mono>
                    {serverInfo.maxDownloadMB || t('settings.server.disabled')}
                  </SettingsInfoRow>
                  <SettingsInfoRow label="DOWNLOAD_THREADS" mono>
                    {serverInfo.downloadThreads ?? 8}
                  </SettingsInfoRow>
                </dl>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-5 text-app-tertiary">{t('settings.server.offline')}</p>
          )}
        </section>

        <section className="min-w-0 border-b border-app-divider px-4 py-4 sm:px-6 sm:py-6">
          <h2 className="mb-4 text-[21px] leading-6.25 font-semibold text-app-ink">{t('settings.data.title')}</h2>
          <p className="mb-4 max-w-full text-[17px] leading-relaxed text-app-secondary">
            {t('settings.data.description')}
          </p>

          <div className="mb-6 grid w-full min-w-0 grid-cols-2 gap-3">
            <button
              onClick={() => setExportModalOpen(true)}
              className="app-button-secondary-rect w-full min-w-0 whitespace-normal wrap-break-word text-center sm:w-auto"
            >
              {t('settings.data.exportBtn')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="app-button-secondary-rect w-full min-w-0 whitespace-normal wrap-break-word text-center sm:w-auto"
            >
              {t('settings.data.importBtn')}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".enc" onChange={handleFileSelect} />
          </div>

          <button
            onClick={() => {
              if (!confirm(t('settings.data.confirm'))) return;
              localStorage.clear();
              indexedDB.deleteDatabase('asspp-accounts');
              addToast(t('settings.data.cleared'), 'success');
              setTimeout(() => {
                window.location.href = '/';
              }, 1000);
            }}
            className="min-h-11 w-full min-w-0 whitespace-normal wrap-break-word rounded-sm border border-red-600 px-4 py-2 text-center text-sm leading-5 font-normal text-red-600 transition-colors hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {t('settings.data.button')}
          </button>
        </section>

        <section className="min-w-0 px-4 py-4 sm:px-6 sm:py-6">
          <h2 className="mb-4 text-[21px] leading-[25px] font-semibold text-app-ink">{t('settings.about.title')}</h2>
          <p className="max-w-full text-[17px] leading-relaxed text-app-secondary">{t('settings.about.description')}</p>
          {serverInfo && (
            <dl className="mt-3 min-w-0 divide-y divide-app-divider">
              {serverInfo.buildCommit && serverInfo.buildCommit !== 'unknown' && (
                <SettingsInfoRow
                  label={t('settings.about.buildCommit')}
                  mono
                  compact
                  valueTitle={serverInfo.buildCommit}
                >
                  {serverInfo.buildCommit}
                </SettingsInfoRow>
              )}
              {serverInfo.buildDate && serverInfo.buildDate !== 'unknown' && (
                <SettingsInfoRow label={t('settings.about.buildDate')} compact valueTitle={serverInfo.buildDate}>
                  {new Date(serverInfo.buildDate).toLocaleString()}
                </SettingsInfoRow>
              )}
            </dl>
          )}
        </section>
      </div>

      <Modal open={exportModalOpen} onClose={() => setExportModalOpen(false)} title={t('settings.data.exportBtn')}>
        <div className="min-w-0 space-y-4">
          <div className="min-w-0">
            <label className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
              {t('settings.data.passwordPrompt')}
            </label>
            <input
              type="password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              className="app-field block min-w-0 w-full max-w-full text-app-ink"
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
              {t('settings.data.passwordConfirm')}
            </label>
            <input
              type="password"
              value={exportConfirmPassword}
              onChange={(e) => setExportConfirmPassword(e.target.value)}
              className="app-field block min-w-0 w-full max-w-full text-app-ink"
            />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 w-full gap-3 flex-row-reverse flex-wrap ">
          <button
            onClick={() => setExportModalOpen(false)}
            className="app-button-secondary min-w-0 whitespace-normal break-words sm:w-auto"
          >
            {t('settings.data.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={!exportPassword || !exportConfirmPassword}
            className="app-button-primary min-w-0 whitespace-normal break-words disabled:opacity-50 sm:w-auto"
          >
            {t('settings.data.confirmBtn')}
          </button>
        </div>
      </Modal>

      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title={t('settings.data.importBtn')}>
        <div className="min-w-0 space-y-4">
          <div className="min-w-0">
            <label className="mb-1 block text-sm leading-5 font-normal text-app-secondary">
              {t('settings.data.passwordPrompt')}
            </label>
            <input
              type="password"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              className="app-field block min-w-0 w-full max-w-full text-app-ink"
            />
          </div>
        </div>
        <div className="mt-6 flex min-w-0 flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            onClick={() => setImportModalOpen(false)}
            className="app-button-secondary min-w-0 whitespace-normal break-words sm:w-auto"
          >
            {t('settings.data.cancel')}
          </button>
          <button
            onClick={handleImport}
            disabled={!importPassword}
            className="app-button-primary min-w-0 whitespace-normal break-words disabled:opacity-50 sm:w-auto"
          >
            {t('settings.data.confirmBtn')}
          </button>
        </div>
      </Modal>

      <Modal
        open={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        title={t('settings.data.conflictTitle')}
      >
        <p className="mb-6 min-w-0 break-words text-sm leading-5 text-app-secondary">
          {t('settings.data.conflictDesc', {
            conflict: conflictStats.conflict,
            new: conflictStats.new,
          })}
        </p>
        <div className="flex min-w-0 flex-col gap-3">
          <button
            onClick={() => handleResolveConflict(true)}
            className="min-h-11 w-full min-w-0 whitespace-normal break-words rounded-full bg-red-600 px-4 py-2 text-sm leading-5 font-normal text-white transition-colors hover:bg-red-700"
          >
            {t('settings.data.conflictOverwrite')}
          </button>
          <button
            onClick={() => handleResolveConflict(false)}
            className="app-button-secondary w-full min-w-0 whitespace-normal break-words"
          >
            {t('settings.data.conflictSkip')}
          </button>
          <button
            onClick={() => setConflictModalOpen(false)}
            className="app-button-secondary mt-2 w-full min-w-0 whitespace-normal break-words"
          >
            {t('settings.data.cancel')}
          </button>
        </div>
      </Modal>
    </PageContainer>
  );
}

function SettingsInfoRow({
  label,
  children,
  mono = false,
  compact = false,
  valueTitle,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
  compact?: boolean;
  valueTitle?: string;
}) {
  const labelSize = compact ? 'text-xs leading-4' : 'text-sm leading-5';
  const valueSize = compact ? 'text-xs leading-4' : 'text-sm leading-5';

  return (
    <div className="grid min-w-0 grid-cols-1 gap-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-start sm:gap-6">
      <dt className={`${labelSize} min-w-0 break-all font-normal text-app-tertiary`}>{label}</dt>
      <dd
        title={valueTitle}
        className={`${valueSize} min-w-0 max-w-full whitespace-pre-wrap break-all text-app-ink sm:text-right ${mono ? 'font-mono' : ''
          }`}
      >
        {children}
      </dd>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}
