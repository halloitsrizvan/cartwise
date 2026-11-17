"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import ml from "@/messages/ml.json";
import en from "@/messages/en.json";

export type Lang = "ml" | "en";
const DICT: Record<Lang, Record<string, string>> = { ml, en };

/** Pure translate helper (also used outside React). Falls back to English, then the key. */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: Record<string, string | number>) => string };
const I18nCtx = createContext<Ctx>({ lang: "ml", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ml");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cw-lang");
      if (saved === "ml" || saved === "en") setLangState(saved);
    } catch {
      /* storage blocked */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("cw-lang", l);
    } catch {
      /* ignore */
    }
  }, []);
  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}
export const useI18n = () => useContext(I18nCtx);
export const useT = () => useContext(I18nCtx).t;
