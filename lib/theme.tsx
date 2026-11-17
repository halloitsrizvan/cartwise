"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePref = "system" | "light" | "dark" | "sunlight";
export type SizePref = "normal" | "large" | "xl";

/** Inline script (runs before paint) to avoid a theme flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('cw-theme')||'system';var t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;document.documentElement.setAttribute('data-theme',t);var s=localStorage.getItem('cw-size');if(s&&s!=='normal')document.documentElement.setAttribute('data-size',s);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

type Ctx = { theme: ThemePref; setTheme: (t: ThemePref) => void; size: SizePref; setSize: (s: SizePref) => void };
const ThemeCtx = createContext<Ctx>({ theme: "system", setTheme: () => {}, size: "normal", setSize: () => {} });

function apply(theme: ThemePref) {
  const resolved = theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [size, setSizeState] = useState<SizePref>("normal");
  useEffect(() => {
    try {
      const t = localStorage.getItem("cw-theme") as ThemePref | null;
      const s = localStorage.getItem("cw-size") as SizePref | null;
      if (t) setThemeState(t);
      if (s) setSizeState(s);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);
  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    apply(t);
    try {
      localStorage.setItem("cw-theme", t);
    } catch {
      /* ignore */
    }
  }, []);
  const setSize = useCallback((s: SizePref) => {
    setSizeState(s);
    if (s === "normal") document.documentElement.removeAttribute("data-size");
    else document.documentElement.setAttribute("data-size", s);
    try {
      localStorage.setItem("cw-size", s);
    } catch {
      /* ignore */
    }
  }, []);
  const value = useMemo(() => ({ theme, setTheme, size, setSize }), [theme, setTheme, size, setSize]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => useContext(ThemeCtx);
