import { defineConfig } from '@lingui/cli';
import { extractor } from './docs/.vitepress/i18n/extractor.mjs';
import { catalogFormatter } from './docs/.vitepress/i18n/formatter.mjs';
import { locales, sourceLocale } from './docs/.vitepress/i18n/locales.mjs';

export default defineConfig({
  locales: locales.map((locale) => locale.code),
  sourceLocale,
  compileNamespace: 'es',
  catalogs: [
    {
      name: 'docs',
      path: '<rootDir>/docs/.vitepress/i18n/locales/{locale}/docs',
      include: [
        '<rootDir>/docs/index.md',
        '<rootDir>/docs/guide',
        '<rootDir>/docs/reference',
        '<rootDir>/docs/recipes',
      ],
    },
    {
      name: 'ui',
      path: '<rootDir>/docs/.vitepress/i18n/locales/{locale}/ui',
      include: ['<rootDir>/docs/.vitepress/config.mts', '<rootDir>/examples/docs'],
    },
  ],
  extractors: [extractor],
  format: catalogFormatter,
  orderBy: 'origin',
});
