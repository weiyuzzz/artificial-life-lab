import type { Language } from "@/lib/types";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type Dictionary, type TranslationKey, en } from "./en";
import { zh } from "./zh";

export type { TranslationKey } from "./en";

const STORAGE_KEY = "alife-lab.language";
const dictionaries: Record<Language, Dictionary> = { zh, en };

export type TranslateParams = Record<string, string | number | bigint>;
export type TranslateFn = (
  key: TranslationKey,
  params?: TranslateParams,
) => string;

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "zh" ? stored : "zh";
  } catch {
    return "zh";
  }
}

export function interpolate(
  template: string,
  params?: TranslateParams,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // storage unavailable (private mode) — language still applies for this session
    }
  }, [language]);

  const setLanguage = useCallback(
    (next: Language) => setLanguageState(next),
    [],
  );
  const toggleLanguage = useCallback(
    () => setLanguageState((current) => (current === "zh" ? "en" : "zh")),
    [],
  );
  const t = useCallback<TranslateFn>(
    (key, params) =>
      interpolate(dictionaries[language][key] ?? en[key], params),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
