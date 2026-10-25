import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import Demo from './Demo.vue';
import './style.css';
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Demo', Demo);
  },
} satisfies Theme;
