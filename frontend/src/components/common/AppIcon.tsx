import { useState } from 'react';

interface AppIconProps {
  url?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
  hero: 'h-20 w-20 min-[375px]:h-28 min-[375px]:w-28 sm:h-40 sm:w-40',
};

const surfaceClassName = 'shrink-0 rounded-[25%]';

export default function AppIcon({ url, name, size = 'md' }: AppIconProps) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        className={`${sizeClasses[size]} ${surfaceClassName} flex items-center justify-center bg-blue-700 text-white`}
        role="img"
        aria-label={name}
      >
        <span aria-hidden="true" className={size === 'hero' ? 'text-4xl font-semibold' : 'text-lg font-semibold'}>
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      className={`${sizeClasses[size]} ${surfaceClassName} object-cover`}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
