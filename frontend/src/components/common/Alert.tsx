import type { ReactNode } from 'react';

const styles = {
  error: 'border-red-200/80 bg-red-50/90 text-red-700 dark:border-red-900/70 dark:bg-red-950/45 dark:text-red-300',
  success:
    'border-green-200/80 bg-green-50/90 text-green-700 dark:border-green-900/70 dark:bg-green-950/45 dark:text-green-300',
  warning:
    'border-amber-200/80 bg-amber-50/90 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/45 dark:text-amber-300',
} as const;

export default function Alert({
  type,
  children,
  className = '',
}: {
  type: keyof typeof styles;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-app-card border bg-app-surface px-4 py-3 text-[13px] font-normal leading-5 [overflow-wrap:anywhere] ${styles[type]} ${className}`}
    >
      {children}
    </div>
  );
}
