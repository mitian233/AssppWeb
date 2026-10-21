interface ProgressBarProps {
  progress: number;
  className?: string;
  label?: string;
}

export default function ProgressBar({ progress, className = '', label }: ProgressBarProps) {
  const normalized = Number.isFinite(progress) ? progress : 0;
  const clamped = Math.min(100, Math.max(0, normalized));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={`${Math.round(clamped)}%`}
      aria-label={label}
      className={`h-2 w-full overflow-hidden rounded-full bg-app-selected ${className}`}
    >
      <div
        className="h-full rounded-full bg-app-action transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
