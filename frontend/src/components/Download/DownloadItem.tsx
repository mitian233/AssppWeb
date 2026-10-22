import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppIcon from '../common/AppIcon';
import Badge from '../common/Badge';
import ProgressBar from '../common/ProgressBar';
import PackageQuickActions from './PackageQuickActions';
import { formatBytes } from '../../utils/format';
import type { DownloadTask } from '../../types';

interface DownloadItemProps {
  task: DownloadTask;
  preview?: boolean;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DownloadItem({ task, preview = false, onPause, onResume, onDelete }: DownloadItemProps) {
  const { t } = useTranslation();

  const isActive = task.status === 'downloading' || task.status === 'injecting';
  const isPaused = task.status === 'paused';
  const detailsHref = `/downloads/${task.id}${preview ? '?preview=downloads' : ''}`;

  return (
    <article className="min-w-0 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <AppIcon url={task.software.artworkUrl} name={task.software.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                to={detailsHref}
                className="block truncate text-[17px] leading-5.5 font-semibold text-app-ink transition-colors hover:text-app-link-action"
              >
                {task.software.name}
              </Link>
              <p className="mt-0.5 truncate text-[17px] leading-[1.47] text-app-secondary">
                {task.software.artistName}
              </p>
            </div>
            <div className="shrink-0 whitespace-nowrap">
              <Badge status={task.status} />
            </div>
          </div>
          <p title={task.software.bundleID} className="mt-1 truncate font-mono text-[14px] leading-5 text-app-tertiary">
            {task.software.bundleID}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid min-w-0 grid-cols-3 gap-2">
        <SummaryItem label={t('downloads.package.version')} value={task.software.version} />
        <SummaryItem label={t('downloads.package.size')} value={formatBytes(task.software.fileSizeBytes)} />
        <SummaryItem label={t('downloads.package.minOs')} value={`iOS ${task.software.minimumOsVersion || '—'}`} />
      </dl>

      {(isActive || isPaused) && (
        <div className="mt-3">
          <ProgressBar progress={task.progress} label={task.software.name} />
          <div className="mt-1.5 flex min-w-0 justify-between gap-3 text-[14px] leading-5 text-app-secondary">
            <span>{Math.round(task.progress)}%</span>
            {task.speed && isActive && <span className="max-w-[55%] truncate text-right">{task.speed}</span>}
          </div>
        </div>
      )}

      {task.error && (
        <p className="mt-3 wrap-break-word rounded-lg bg-red-50 p-2.5 text-[14px] leading-5 text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {task.error}
        </p>
      )}

      {task.status === 'completed' && task.hasFile && (
        <div className="mt-3 border-t border-app-divider pt-3">
          <PackageQuickActions task={task} size="compact" />
        </div>
      )}

      <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
        {isActive ? (
          <button type="button" onClick={() => onPause(task.id)} className="app-button-utility min-w-0">
            {t('downloads.package.pause')}
          </button>
        ) : isPaused ? (
          <button type="button" onClick={() => onResume(task.id)} className="app-button-primary min-w-0">
            {t('downloads.package.resume')}
          </button>
        ) : (
          <Link
            to={detailsHref}
            className="app-button-utility inline-flex min-w-0 items-center justify-center text-center"
          >
            {t('downloads.package.title')}
          </Link>
        )}
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="min-h-11 min-w-0 rounded-sm bg-red-50 px-3 py-2 text-[14px] leading-5 font-normal text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
        >
          {t('downloads.package.delete')}
        </button>
      </div>
    </article>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2.5 py-2">
      <dt className="truncate text-[14px] leading-5 text-app-tertiary">{label}</dt>
      <dd title={value} className="mt-0.5 truncate text-[14px] leading-5 text-app-secondary">
        {value}
      </dd>
    </div>
  );
}
