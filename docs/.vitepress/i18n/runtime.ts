import { setupI18n, type I18n } from '@lingui/core';

const catalogs = {
  en: () => import('./locales/en/ui.mjs'),
  ru: () => import('./locales/ru/ui.mjs'),
  de: () => import('./locales/de/ui.mjs'),
  kk: () => import('./locales/kk/ui.mjs'),
};
export async function loadI18n(locale: string): Promise<I18n> {
  const language = Object.hasOwn(catalogs, locale) ? (locale as keyof typeof catalogs) : 'en';
  const { messages } = await catalogs[language]();
  return setupI18n({ locale: language, messages: { [language]: messages } });
}
