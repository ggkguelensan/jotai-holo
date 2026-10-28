import { setupI18n } from '@lingui/core';
import { stat } from 'node:fs/promises';

/** Build-time instances never share mutable locale state between generated pages. */
export async function loadCatalog(locale, name) {
  const url = new URL(`./locales/${locale}/${name}.mjs`, import.meta.url);
  const { mtimeMs } = await stat(url);
  const { messages } = await import(`${url.href}?version=${mtimeMs}`);
  return setupI18n({ locale, messages: { [locale]: messages } });
}
