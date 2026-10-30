import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import Demo from './Demo.vue';
import GraphExample from './GraphExample.vue';
import GraphMap from './GraphMap.vue';
import CodeNotes from './CodeNotes.vue';
import CodeNote from './CodeNote.vue';
import FileNavigation from './FileNavigation.vue';
import PageMoved from './PageMoved.vue';
import './style.css';
import './graph.css';
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Demo', Demo);
    app.component('GraphExample', GraphExample);
    app.component('GraphMap', GraphMap);
    app.component('CodeNotes', CodeNotes);
    app.component('CodeNote', CodeNote);
    app.component('FileNavigation', FileNavigation);
    app.component('PageMoved', PageMoved);
  },
} satisfies Theme;
