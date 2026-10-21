import { useTranslation } from 'react-i18next';

export default function CountrySelect({
  value,
  onChange,
  availableCountryCodes,
  allCountryCodes,
  disabled,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  availableCountryCodes: string[];
  allCountryCodes: string[];
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t('regions.all')}
      className={`rounded-[6px] border border-app-divider bg-app-surface px-3.5 py-2.5 text-base text-app-ink transition-colors focus-visible:border-app-action disabled:cursor-not-allowed disabled:bg-app-canvas disabled:text-app-tertiary ${className}`}
      disabled={disabled}
    >
      {availableCountryCodes.length > 0 && (
        <optgroup label={t('regions.available')}>
          {availableCountryCodes.map((c) => (
            <option key={`avail-${c}`} value={c}>
              {t(`countries.${c}`, c)} ({c})
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label={t('regions.all')}>
        {allCountryCodes.map((c) => (
          <option key={`all-${c}`} value={c}>
            {t(`countries.${c}`, c)} ({c})
          </option>
        ))}
      </optgroup>
    </select>
  );
}
