import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { translations, type Language } from "./translations";

const STORAGE_KEY = "pantryos.lang";
const DEFAULT_LANG: Language = "en";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDict = Record<string, any>;

function resolvePath(dict: AnyDict, path: string): string | undefined {
  let cur: unknown = dict;
  for (const seg of path.split(".")) {
    if (cur && typeof cur === "object" && seg in (cur as AnyDict)) {
      cur = (cur as AnyDict)[seg];
    } else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

function detectInitial(): Language {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const saved = window.localStorage.getItem(STORAGE_KEY) as Language | null;
  if (saved && saved in translations) return saved;
  const nav = window.navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("it")) return "it";
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => detectInitial());

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      let value =
        resolvePath(translations[lang] as AnyDict, path) ??
        resolvePath(translations.en as AnyDict, path) ??
        path;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return value;
    },
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t }),
    [lang, setLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used inside <LanguageProvider>");
  return ctx;
}
