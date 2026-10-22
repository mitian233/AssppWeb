import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../Layout/PageContainer';
import Modal from '../common/Modal';
import ProgressBar from '../common/ProgressBar';
import Spinner from '../common/Spinner';
import DownloadItem from './DownloadItem';
import { isDownloadPreviewEnabled, isPreviewDownloadTask, previewDownloadTasks } from './previewTasks';
import { useDownloads } from '../../hooks/useDownloads';
import { useAccounts } from '../../hooks/useAccounts';
import { useDownloadAction } from '../../hooks/useDownloadAction';
import { useToastStore } from '../../store/toast';
import { lookupApp } from '../../api/search';
import { getAccountContext } from '../../utils/toast';
import { isNewerVersion } from '../../utils/version';
import { storeIdToCountry } from '../../apple/config';
import type { DownloadTask } from '../../types';

type StatusFilter = 'all' | DownloadTask['status'];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function DownloadList() {
  const { t } = useTranslation();
  const location = useLocation();
  const { tasks, loading, pauseDownload, resumeDownload, deleteDownload, hashToEmail } = useDownloads();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const addToast = useToastStore((s) => s.addToast);
  const { accounts } = useAccounts();
  const { startDownload } = useDownloadAction();
  const filterTabsRef = useRef<HTMLDivElement>(null);
  const filterDragRef = useRef({ startX: 0, scrollLeft: 0, dragging: false, moved: false });
  const [filterOverflow, setFilterOverflow] = useState({ left: false, right: false });
  const previewEnabled = isDownloadPreviewEnabled(location.search);
  const displayTasks = previewEnabled ? previewDownloadTasks : tasks;

  const [checkingAll, setCheckingAll] = useState(false);
  const cancelCheckRef = useRef(false);
  const [checkProgress, setCheckProgress] = useState({
    current: 0,
    total: 0,
    appName: '',
  });

  useEffect(() => {
    return () => {
      cancelCheckRef.current = true;
    };
  }, []);

  useEffect(() => {
    const container = filterTabsRef.current;
    if (!container) return;

    const updateOverflow = () => {
      const firstTab = container.firstElementChild;
      const lastTab = container.lastElementChild;
      if (!firstTab || !lastTab) {
        setFilterOverflow({ left: false, right: false });
        return;
      }

      const containerBounds = container.getBoundingClientRect();
      const styles = getComputedStyle(container);
      const leftEdge = containerBounds.left + Number.parseFloat(styles.borderLeftWidth || '0');
      const rightEdge = containerBounds.right - Number.parseFloat(styles.borderRightWidth || '0');
      const firstTabBounds = firstTab.getBoundingClientRect();
      const lastTabBounds = lastTab.getBoundingClientRect();
      const left = firstTabBounds.left < leftEdge - 1;
      const right = lastTabBounds.right > rightEdge + 1;

      setFilterOverflow((current) => (current.left === left && current.right === right ? current : { left, right }));
    };

    updateOverflow();
    container.addEventListener('scroll', updateOverflow, { passive: true });
    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(container);
    container.querySelectorAll('button').forEach((button) => resizeObserver.observe(button));

    return () => {
      container.removeEventListener('scroll', updateOverflow);
      resizeObserver.disconnect();
    };
  }, []);

  const filtered = filter === 'all' ? displayTasks : displayTasks.filter((task) => task.status === filter);

  const sortedTasks = [...filtered].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  function handleDelete(id: string) {
    const task = displayTasks.find((item) => item.id === id);
    if (task && isPreviewDownloadTask(task)) {
      showPreviewNotice();
      return;
    }

    if (!confirm(t('downloads.deleteConfirm'))) return;

    if (task) {
      const accountEmail = hashToEmail[task.accountHash];
      const account = accounts.find((a) => a.email === accountEmail);
      const ctx = getAccountContext(account, t);

      addToast(t('toast.msg', { appName: task.software.name, ...ctx }), 'success', t('toast.title.deleteSuccess'));
    }

    deleteDownload(id);
  }

  function showPreviewNotice() {
    addToast(t('downloads.preview.actionHint'), 'info', t('downloads.preview.badge'));
  }

  function handlePause(id: string) {
    if (previewEnabled) {
      showPreviewNotice();
      return;
    }
    pauseDownload(id);
  }

  function handleResume(id: string) {
    if (previewEnabled) {
      showPreviewNotice();
      return;
    }
    resumeDownload(id);
  }

  function handleCancelCheck() {
    cancelCheckRef.current = true;
    setCheckingAll(false);
  }

  async function handleCheckAllUpdates() {
    if (previewEnabled) {
      showPreviewNotice();
      return;
    }

    cancelCheckRef.current = false;
    setCheckingAll(true);
    addToast(t('downloads.checkUpdatesStarted'), 'info');
    let count = 0;
    const completedTasks = tasks.filter((t) => t.status === 'completed');

    setCheckProgress({ current: 0, total: completedTasks.length, appName: '' });

    for (let i = 0; i < completedTasks.length; i++) {
      if (cancelCheckRef.current) break;

      const task = completedTasks[i];
      const accountEmail = hashToEmail[task.accountHash];
      const account = accounts.find((a) => a.email === accountEmail);

      setCheckProgress((prev) => ({ ...prev, appName: task.software.name }));

      if (!account) {
        setCheckProgress((prev) => ({ ...prev, current: i + 1 }));
        continue;
      }

      try {
        await delay(1500);
        if (cancelCheckRef.current) break;

        const country = storeIdToCountry(account.store) ?? 'US';
        const latestApp = await lookupApp(task.software.bundleID, country);

        if (latestApp && isNewerVersion(latestApp.version, task.software.version)) {
          await startDownload(account, latestApp);
          await deleteDownload(task.id);
          count++;
        }
      } catch {
        // Continue with next item
      }

      setCheckProgress((prev) => ({ ...prev, current: i + 1 }));
    }

    if (!cancelCheckRef.current) {
      await delay(500);
      if (!cancelCheckRef.current) {
        setCheckingAll(false);
        addToast(t('downloads.checkUpdatesCompleted', { count }), 'success');
      }
    }
  }

  return (
    <PageContainer>
      <div className="mb-6 grid grid-cols-2 items-start gap-2 min-[360px]:grid-cols-3 sm:mb-7 sm:grid-cols-6">
        <h1 className="app-heading col-span-2 min-w-0 text-[28px] leading-tight min-[360px]:col-span-1 sm:col-span-4 sm:text-[32px]">
          {t('downloads.title')}
        </h1>
        <button
          onClick={handleCheckAllUpdates}
          disabled={checkingAll}
          className="app-button-secondary flex h-11 w-full min-w-0 items-center justify-center px-2.5 text-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checkingAll ? t('downloads.checkingUpdates') : t('downloads.checkUpdates')}
        </button>
        <Link
          to="/downloads/add"
          className="app-button-primary flex h-11 w-full min-w-0 items-center justify-center px-2.5 text-center"
        >
          {t('downloads.new')}
        </Link>
      </div>

      <div className="download-filter-wrap mb-5">
        <div
          ref={filterTabsRef}
          className="download-filter-bar"
          role="group"
          aria-label={t('downloads.title')}
          onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' || event.button !== 0) return;
          const container = filterTabsRef.current;
          if (!container) return;
          filterDragRef.current = {
            startX: event.clientX,
            scrollLeft: container.scrollLeft,
            dragging: true,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = filterDragRef.current;
          const container = filterTabsRef.current;
          if (!drag.dragging || !container) return;
          const distance = event.clientX - drag.startX;
          if (Math.abs(distance) > 4) drag.moved = true;
          if (drag.moved) container.scrollLeft = drag.scrollLeft - distance;
        }}
        onPointerUp={() => {
          filterDragRef.current.dragging = false;
        }}
        onPointerLeave={() => {
          filterDragRef.current.dragging = false;
        }}
        onClickCapture={(event) => {
          if (!filterDragRef.current.moved) return;
          event.preventDefault();
          event.stopPropagation();
          filterDragRef.current.moved = false;
        }}
      >
          {(['all', 'downloading', 'pending', 'paused', 'completed', 'failed'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`download-filter-tab${filter === status ? ' is-active' : ''}`}
            >
              {t(`downloads.status.${status}`)}
              <span className="ml-1">
                {`(${status === 'all' ? displayTasks.length : displayTasks.filter((task) => task.status === status).length})`}
              </span>
            </button>
          ))}
        </div>
        {filterOverflow.left && <span aria-hidden="true" className="download-filter-fade-left" />}
        {filterOverflow.right && <span aria-hidden="true" className="download-filter-fade-right" />}
      </div>

      <div
        role="note"
        aria-label={t('downloads.warning')}
        title={t('downloads.warning')}
        className="mb-5 min-w-0 max-w-full overflow-hidden rounded-2xl bg-amber-50 px-2.5 py-3 text-center leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
      >
        <span aria-hidden="true" className="block whitespace-nowrap text-[12px] leading-[15px] xl:hidden">
          {t('downloads.warningShort')}
        </span>
        <span aria-hidden="true" className="hidden whitespace-nowrap text-[12px] leading-[15px] xl:block">
          {t('downloads.warning')}
        </span>
      </div>

      {previewEnabled && (
        <div className="mb-5 flex min-w-0 items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3 text-[17px] leading-[1.47] text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full bg-blue-600 px-2 text-[10px] font-semibold uppercase tracking-wide text-white"
          >
            {t('downloads.preview.badge')}
          </span>
          <p className="min-w-0 leading-5">{t('downloads.preview.description')}</p>
        </div>
      )}

      {loading && displayTasks.length === 0 ? (
        <div className="py-12 text-center text-app-secondary">{t('downloads.loading')}</div>
      ) : sortedTasks.length === 0 ? (
        <div className="my-4 flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center">
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
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-center text-[17px] leading-[22px] font-semibold text-app-ink">
            {filter === 'all'
              ? t('downloads.emptyAll')
              : t('downloads.emptyFilter', {
                status: t(`downloads.status.${filter}`),
              })}
          </h3>
          <p
            className="mb-6 max-w-full overflow-hidden text-center text-[17px] leading-[1.47] text-app-secondary"
            aria-label={filter === 'all' ? t('downloads.emptyAllDesc') : t('downloads.emptyFilterDesc')}
            title={filter === 'all' ? t('downloads.emptyAllDesc') : t('downloads.emptyFilterDesc')}
          >
            {filter === 'all' ? (
              <>
                <span aria-hidden="true" className="block whitespace-nowrap text-[12px] leading-[15px] xl:hidden">
                  {t('downloads.emptyAllDescShort')}
                </span>
                <span aria-hidden="true" className="hidden whitespace-nowrap text-[17px] leading-[1.47] xl:block">
                  {t('downloads.emptyAllDesc')}
                </span>
              </>
            ) : (
              <span className="block whitespace-nowrap text-[12px] leading-[15px]">
                {t('downloads.emptyFilterDesc')}
              </span>
            )}
          </p>
          {filter === 'all' && (
            <Link to="/search" className="app-button-primary inline-flex min-h-11 items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              {t('downloads.searchApps')}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => (
            <DownloadItem
              key={task.id}
              task={task}
              preview={previewEnabled}
              onPause={handlePause}
              onResume={handleResume}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Modal
        open={checkingAll && checkProgress.total > 0}
        onClose={handleCancelCheck}
        title={t('downloads.checkingUpdates')}
      >
        <div className="space-y-4">
          <div className="flex justify-center text-app-action">
            <Spinner />
          </div>
          <div className="text-center">
            <p className="truncate text-[17px] leading-[1.47] text-app-secondary">
              {checkProgress.appName ? `${t('downloads.checkingApp')}${checkProgress.appName}` : '...'}
            </p>
            <p className="mt-1 font-mono text-[14px] leading-5 text-app-secondary">
              {checkProgress.current} / {checkProgress.total}
            </p>
          </div>
          <ProgressBar
            label={t('downloads.checkingUpdates')}
            progress={checkProgress.total > 0 ? (checkProgress.current / checkProgress.total) * 100 : 0}
          />
          <p className="text-center text-[14px] leading-5 text-app-tertiary">{t('downloads.checkUpdatesDesc')}</p>
          <div className="flex justify-center">
            <button onClick={handleCancelCheck} className="app-button-utility">
              {t('settings.data.cancel')}
            </button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
