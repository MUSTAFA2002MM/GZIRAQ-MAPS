import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="secondary-button theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label="تبديل الوضع الليلي"
      title="تبديل الوضع"
    >
      {theme === "dark" ? "وضع فاتح" : "وضع داكن"}
    </button>
  );
}
