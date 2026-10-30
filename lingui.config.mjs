import { defineConfig } from '@lingui/cli';
import { sourceDirectories } from './docs/.vitepress/content.mjs';
import { extractor as babelExtractor } from '@lingui/cli/api';
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
        ...sourceDirectories.map((dir) => `<rootDir>/docs/${dir}`),
      ],
    },
    {
      name: 'ui',
      path: '<rootDir>/docs/.vitepress/i18n/locales/{locale}/ui',
      include: [
        '<rootDir>/docs/.vitepress/config.mts',
        '<rootDir>/examples/docs',
        '<rootDir>/examples/spreadsheet/ui',
      ],
    },
  ],
  extractors: [extractor, babelExtractor],
  format: catalogFormatter,
  orderBy: 'origin',
});
