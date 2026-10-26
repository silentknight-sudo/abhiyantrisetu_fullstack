import type { Locale } from '@setu/domain';
import { t as domainStrings } from '@setu/domain';
import { createContext, type ReactNode, use, useEffect, useMemo, useRef, useState } from 'react';
import { $api, client } from './api';
import { hi, type MessageKey } from './messages/hi';
import { hinglish } from './messages/hinglish';
import { useSession } from './session';
import { secureStorage } from './storage';

export type { MessageKey };

/** Each language named in itself, for the language picker. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  hinglish: 'Hinglish',
};
const KEY = 'setu.locale';
const CATALOGUES: Record<Exclude<Locale, 'en'>, Record<MessageKey, string>> = { hi, hinglish };

type Vars = Record<string, string | number>;

/** Looks up an English message in the user's language and fills `{placeholders}`. */
export type Translate = (key: MessageKey, vars?: Vars) => string;

function translator(locale: Locale): Translate {
  const dict = locale === 'en' ? null : CATALOGUES[locale];
  return (key, vars) => {
    const text = dict?.[key] ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : text;
  };
}

interface I18n {
  locale: Locale;
  t: Translate;
  /** Shared labels (job states, request types) from @setu/domain, in the same language. */
  d: ReturnType<typeof domainStrings>;
  setLocale(locale: Locale): void;
}

const I18nContext = createContext<I18n | null>(null);

/**
 * The app's language: the account's saved language once signed in (the API also uses it
 * for WhatsApp and push), otherwise the choice made on the login screen. A language picked
 * on the login screen is saved to the account on sign-in.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const me = $api.useQuery('get', '/v1/me', {}, { enabled: status === 'signedIn' });
  const [chosen, setChosen] = useState<Locale | null>(null);
  useEffect(() => {
    void secureStorage.get(KEY).then((v) => {
      if (v === 'en' || v === 'hi' || v === 'hinglish') setChosen(v);
    });
  }, []);
  // Picked while signed out and not yet saved to the account; wins until it is.
  const pending = useRef(false);
  const saving = useRef(false);
  const saveToAccount = (next: Locale) =>
    client.api.PATCH('/v1/me', { body: { locale: next } }).then(() => me.refetch());
  useEffect(() => {
    if (status !== 'signedIn' || !me.data || !pending.current || !chosen) return;
    if (me.data.locale === chosen) pending.current = false;
    else if (!saving.current) {
      saving.current = true;
      saveToAccount(chosen)
        .catch(() => (pending.current = false))
        .finally(() => (saving.current = false));
    }
  });
  const locale: Locale =
    (pending.current ? chosen : null) ??
    (status === 'signedIn' ? me.data?.locale : undefined) ??
    chosen ??
    'en';

  // Stable per language, so screens can list `t` in effect dependencies.
  const t = useMemo(() => translator(locale), [locale]);
  const d = useMemo(() => domainStrings(locale), [locale]);
  const value: I18n = {
    locale,
    t,
    d,
    setLocale(next) {
      setChosen(next);
      void secureStorage.set(KEY, next);
      if (status === 'signedIn') void saveToAccount(next);
      else pending.current = true;
    },
  };
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const v = use(I18nContext);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
}
