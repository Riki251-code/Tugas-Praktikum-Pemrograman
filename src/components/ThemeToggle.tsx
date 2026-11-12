"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./icons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.setAttribute("data-theme", next);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove("theme-switching");
      });
    });
    try {
      localStorage.setItem("labtrack-theme", next);
    } catch {
      // Ignore storage errors in restricted browsing contexts.
    }
  }

  const label = theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={theme === "dark"}
      className="btn-surface inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[6px] border px-3 text-sm font-medium"
    >
      {mounted && theme === "dark" ? <IconSun className="shrink-0" /> : <IconMoon className="shrink-0" />}
      <span className="hidden sm:inline">
        {mounted ? (theme === "dark" ? "Mode Terang" : "Mode Gelap") : "Tema"}
      </span>
    </button>
  );
}
