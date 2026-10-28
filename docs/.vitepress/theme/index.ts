import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import Demo from './Demo.vue';
import CodeNotes from './CodeNotes.vue';
import CodeNote from './CodeNote.vue';
import './style.css';
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Demo', Demo);
    app.component('CodeNotes', CodeNotes);
    app.component('CodeNote', CodeNote);
  },
} satisfies Theme;
