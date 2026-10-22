import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import {
  AccountsIcon,
  DownloadsIcon,
  HomeIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  SystemIcon,
} from '../common/icons';
import { useSettingsStore } from '../../store/settings';

const navItems = [
  { to: '/', label: 'home', icon: HomeIcon },
  { to: '/accounts', label: 'accounts', icon: AccountsIcon },
  { to: '/search', label: 'search', icon: SearchIcon },
  { to: '/downloads', label: 'downloads', icon: DownloadsIcon },
];

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="sticky top-0 z-30 hidden h-dvh w-68 flex-col border-r border-app-divider bg-app-canvas transition-colors duration-200 md:flex">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <img src="/icon-192x192.png" alt="" className="h-10 w-10 rounded-[25%]" />
          <h1 className="text-[17px] font-semibold tracking-[-0.015em] text-app-ink">Asspp Web</h1>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-sm px-3.5 py-2.5 text-[15px] font-normal transition-colors motion-safe:active:scale-[0.95] ${
                isActive ? 'bg-app-selected text-app-ink' : 'text-app-secondary hover:bg-app-hover hover:text-app-ink'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {t(`nav.${item.label}`)}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2 border-t border-app-divider p-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-sm px-3.5 py-2.5 text-[15px] font-normal transition-colors motion-safe:active:scale-[0.95] ${
              isActive ? 'bg-app-selected text-app-ink' : 'text-app-secondary hover:bg-app-hover hover:text-app-ink'
            }`
          }
        >
          <SettingsIcon className="h-5 w-5 shrink-0" />
          {t('nav.settings')}
        </NavLink>
        <ThemeToggle />
      </div>
    </aside>
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border-app-divider text-app-secondary transition-transform hover:bg-app-hover hover:text-app-ink motion-safe:active:scale-[0.95]"
      aria-label={t(`theme.${theme}`)}
      title={t(`theme.${theme}`)}
    >
      {theme === 'light' && <SunIcon className="h-5 w-5" />}
      {theme === 'dark' && <MoonIcon className="h-5 w-5" />}
      {theme === 'system' && <SystemIcon className="h-5 w-5" />}
    </button>
  );
}
