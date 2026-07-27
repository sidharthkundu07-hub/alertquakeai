import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "alertquake-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem(KEY) as "dark" | "light" | null) ?? "dark";
    setTheme(saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem(KEY, theme);
  }, [theme, mounted]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative w-14 h-7 rounded-full glass border border-primary/30 hover:glow-border transition overflow-hidden flex items-center px-1"
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-cyan-glow shadow-md transition-transform duration-500 flex items-center justify-center ${
          mounted && theme === "light" ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {mounted && theme === "light" ? (
          <Sun className="w-3.5 h-3.5 text-primary-foreground" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-primary-foreground" />
        )}
      </span>
      <Sun className="w-3 h-3 text-muted-foreground ml-auto" />
      <Moon className="w-3 h-3 text-muted-foreground absolute left-2 opacity-70" />
    </button>
  );
}