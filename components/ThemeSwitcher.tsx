"use client";

import { useEffect, useState } from "react";

const THEMES = [
  { id: "pulse", label: "Pulse" },
  { id: "bloom", label: "Bloom" },
  { id: "hexa", label: "Hexa" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("pulse");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "pulse" || current === "bloom" || current === "hexa") {
      setTheme(current);
    }
  }, []);

  function apply(id: ThemeId) {
    setTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem("fnt_theme", id);
    } catch {
      // no persistence available — theme still applies for this visit
    }
  }

  return (
    <div className="theme-switch" role="group" aria-label="Design theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          className={t.id === theme ? "on" : ""}
          onClick={() => apply(t.id)}
          aria-pressed={t.id === theme}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
