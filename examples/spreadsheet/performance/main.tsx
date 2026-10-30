import { I18nProvider } from '@lingui/react';
import { setupI18n } from '@lingui/core';
import { Provider } from 'jotai';
import { createRoot } from 'react-dom/client';
import { messages } from '../../../docs/.vitepress/i18n/locales/en/ui.mjs';
import Book from '../ui/book.js';
import '../../../docs/.vitepress/theme/style.css';
import './style.css';

const i18n = setupI18n({ locale: 'en', messages: { en: messages } });
const root = document.getElementById('root');
if (!root) throw new Error('Missing spreadsheet root.');
createRoot(root).render(
  <I18nProvider i18n={i18n}>
    <Provider>
      <main className="vp-doc holo-example">
        <div className="example-preview" data-demo="spreadsheet">
          <Book />
        </div>
      </main>
    </Provider>
  </I18nProvider>,
);
