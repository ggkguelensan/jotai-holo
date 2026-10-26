import { setupI18n } from '@lingui/core';
import type { DocsTranslator } from '../../../../examples/docs-i18n.js';

const catalogs = {
  en: () => import('./locales/en/ui.mjs'),
  ru: () => import('./locales/ru/ui.mjs'),
  de: () => import('./locales/de/ui.mjs'),
  kk: () => import('./locales/kk/ui.mjs'),
};
export async function loadTranslator(locale: string): Promise<DocsTranslator> {
  const language = locale in catalogs ? (locale as keyof typeof catalogs) : 'en';
  const { messages } = await catalogs[language]();
  const i18n = setupI18n({ locale: language, messages: { [language]: messages } });
  return (message, values) => i18n._(message, values);
}
