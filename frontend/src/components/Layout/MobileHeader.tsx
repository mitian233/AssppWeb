import { useTranslation } from 'react-i18next';
import { MoonIcon, SunIcon, SystemIcon } from '../common/icons';
import { useSettingsStore } from '../../store/settings';

export default function MobileHeader() {
  const { t } = useTranslation();

  return (
    <>
      {/* Use fixed instead of sticky to prevent PWA overscroll gap, with safe-top / 使用 fixed 替代 sticky 防止 PWA 下拉出现空白缝隙，保留 safe-top */}
      <header className="safe-top fixed left-0 right-0 top-0 z-40 w-full border-b border-app-divider bg-app-surface transition-colors duration-200 md:hidden">
        <div className="grid h-14 grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 px-4">
          <img src="/icon-192x192.png" alt="" className="h-7 w-7 rounded-[25%]" />
          <h1 className="truncate text-center text-[17px] font-semibold tracking-[-0.015em] text-app-ink">Asspp Web</h1>
          <ThemeToggle />
        </div>
      </header>
      {/* Spacer to occupy the space of the fixed header in the document flow / 为 fixed 定位的顶栏提供占位，防止下方内容被遮挡 */}
      <div className="md:hidden safe-top">
        <div className="h-14" />
      </div>
    </>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useSettingsStore();
  const { t } = useTranslation();

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-app-surface text-app-action transition-transform hover:bg-app-hover motion-safe:active:scale-[0.95]"
      title={t(`theme.${theme}`)}
    >
      {theme === 'light' && <SunIcon className="h-[18px] w-[18px]" />}
      {theme === 'dark' && <MoonIcon className="h-[18px] w-[18px]" />}
      {theme === 'system' && <SystemIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}
