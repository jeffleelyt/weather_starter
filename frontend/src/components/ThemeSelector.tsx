import { useTheme } from '../state/ThemeProvider';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <label className="weather-theme-selector flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/25 px-3 py-2 text-xs text-white shadow-lg shadow-slate-950/10 backdrop-blur-xl">
      <span className="font-medium">Theme</span>
      <select
        value={theme}
        onChange={(event) => {
          const nextTheme = event.target.value;
          setTheme(
            nextTheme === 'google' || nextTheme === 'swiss' || nextTheme === 'coastal'
              ? nextTheme
              : 'apple',
          );
        }}
        aria-label="Choose visual theme"
        className="cursor-pointer border-0 bg-transparent p-0 pr-1 text-xs font-semibold text-inherit focus-visible:outline-none"
      >
        <option value="apple">Apple</option>
        <option value="google">Google</option>
        <option value="swiss">Swiss Forecast</option>
        <option value="coastal">Coastal Atlas</option>
      </select>
    </label>
  );
}
