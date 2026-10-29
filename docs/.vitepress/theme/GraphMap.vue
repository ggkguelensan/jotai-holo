<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
} from 'vue';
import { useData, useRoute, withBase } from 'vitepress';
import GraphCanvas from './GraphCanvas.vue';
import Demo from './Demo.vue';
import { preserveGraphLocaleLinks } from '../graph/locale-links';
import { graphActivityKey } from '../graph/context';
import type { GraphActivity, GraphScene, GraphUi, SourceRef } from '../graph/contracts';
const { lang, theme } = useData();
const route = useRoute();
const ui = computed(() => theme.value.docsUi.graph as GraphUi);
const prefix = computed(() => (lang.value.startsWith('en') ? '' : `/${lang.value.split('-')[0]}`));
const scene = shallowRef<GraphScene>();
const codePane = ref<HTMLElement>();
const selected = ref<string | null>(null);
const failure = ref(false);
const branches = ref<Readonly<Record<string, boolean>>>({ analytics: false });
const active = ref<readonly string[]>([]);
let timer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
let disposed = false;
let fromCode = false;
let restoreLocaleLinks: (() => void) | undefined;
const node = computed(
  () =>
    scene.value?.nodes.find((node) => node.id === selected.value) ??
    scene.value?.groups.find((group) => group.id === selected.value),
);
function sourceLine(text: string, ref: SourceRef) {
  const matches = text
    .split('\n')
    .flatMap((line, index) => (line.includes(ref.anchor) ? [index] : []));
  return matches[ref.occurrence ?? 0] ?? -1;
}
const location = computed(() => {
  const target = node.value?.refs[0];
  if (!target || !scene.value) return undefined;
  const source = scene.value.sources[target.source]!;
  return {
    source,
    line: sourceLine(source.text, target),
  };
});
const displaySource = computed(
  () => location.value?.source ?? Object.values(scene.value?.sources ?? {})[0],
);
const lines = computed(() => displaySource.value?.text.split('\n') ?? []);
watch(location, async (value) => {
  const shouldScroll = !fromCode;
  fromCode = false;
  await nextTick();
  if (!shouldScroll) return;
  const line = codePane.value?.querySelector<HTMLElement>(
    `[data-line="${(value?.line ?? 0) + 1}"]`,
  );
  if (line && codePane.value)
    codePane.value.scrollTop =
      line.getBoundingClientRect().top -
      codePane.value.getBoundingClientRect().top +
      codePane.value.scrollTop -
      60;
});
const back = computed(() =>
  withBase(`${prefix.value}${scene.value?.article ?? '/topics/holo#mental-model'}`),
);
function select(id: string | null) {
  selected.value = id;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('node', id);
  else url.searchParams.delete('node');
  history.replaceState(null, '', url);
}
function codeHover(event: Event) {
  const line =
    event.target instanceof Element ? event.target.closest<HTMLElement>('[data-line]') : null;
  if (!line || !displaySource.value || !scene.value) return;
  const target = [...scene.value.nodes, ...scene.value.groups].find((node) =>
    node.refs.some(
      (ref) =>
        scene.value!.sources[ref.source]?.file === displaySource.value!.file &&
        sourceLine(displaySource.value!.text, ref) === Number(line.dataset.line) - 1,
    ),
  );
  if (target && target.id !== selected.value) {
    fromCode = true;
    select(target.id);
  }
}
function activity(event: GraphActivity) {
  if (event.type === 'branch') {
    branches.value = { ...branches.value, [event.id]: event.active };
    return;
  }
  const next =
    event.engine === 'posthog'
      ? ['gameFact', 'gameMapping', 'posthog']
      : ['searchFact', 'searchMapping', event.engine];
  active.value = [...new Set([...active.value, ...next])];
  clearTimeout(timer);
  timer = setTimeout(() => {
    active.value = [];
  }, 280);
}
provide(graphActivityKey, activity);
async function load() {
  const current = ++generation;
  failure.value = false;
  scene.value = undefined;
  try {
    const query = new URLSearchParams(window.location.search);
    const { loadScene } = await import('../graph/scenes');
    const next = await loadScene(query.get('scene') ?? 'holo-basics');
    if (disposed || current !== generation) return;
    scene.value = next;
    branches.value = { analytics: false };
    active.value = [];
    const id = query.get('node');
    selected.value = [...next.nodes, ...next.groups].some((node) => node.id === id) ? id : null;
  } catch {
    if (!disposed && current === generation) failure.value = true;
  }
}
onMounted(() => {
  void load();
  restoreLocaleLinks = preserveGraphLocaleLinks();
  window.addEventListener('popstate', load);
});
watch(
  () => route.path,
  () => {
    if (typeof window !== 'undefined') void load();
  },
);
onBeforeUnmount(() => {
  disposed = true;
  restoreLocaleLinks?.();
  ++generation;
  clearTimeout(timer);
  window.removeEventListener('popstate', load);
});
</script>
<template>
  <div v-if="scene && !failure" class="graph-map" :data-graph-scene="scene.id">
    <a class="graph-back" :href="back">← {{ ui.back }}</a>
    <div class="graph-map-header">
      <h2>
        {{
          scene.title === 'atoms'
            ? theme.docsUi.graphAtoms
            : scene.title === 'analytics'
              ? theme.docsUi.graphAnalytics
              : 'holo'
        }}
      </h2>
      <span>{{ scene.demo ? ui.live : ui.structure }}</span>
    </div>
    <div class="graph-map-workspace">
      <div class="graph-map-picture">
        <GraphCanvas
          :scene="scene"
          :ui="ui"
          mode="map"
          :selected="selected"
          :active-branches="branches"
          :active-nodes="active"
          @select="select"
        />
        <div class="graph-map-legend">
          <span><i class="graph-color-react" aria-hidden="true">●</i> {{ ui.kinds.react }}</span
          ><span><i class="graph-color-holo" aria-hidden="true">●</i> holo</span
          ><span>● {{ ui.kinds.atom }}</span
          ><span>○ {{ ui.kinds.resource }}</span>
        </div>
        <p>{{ ui.structure }}</p>
      </div>
      <aside class="graph-map-source">
        <header>
          <span>{{ node ? ui.kinds[node.kind] : ui.source }}</span
          ><strong>{{ node?.label ?? ui.title }}</strong
          ><small v-if="node && !node.refs.length">{{ ui.caller }}</small>
        </header>
        <div v-if="displaySource" class="graph-source-file">
          <span>{{ displaySource.file }}</span
          ><a
            :href="`${theme.sourceBase}/${displaySource.file.split('#')[0]}`"
            :aria-label="ui.source"
            >↗</a
          >
        </div>
        <pre
          v-if="displaySource"
          ref="codePane"
          class="graph-source-lines"
          tabindex="0"
          :aria-label="ui.source"
          @pointerover="codeHover"
        ><code><span v-for="(line,index) in lines" :key="index" :class="{'graph-source-selected':location?.line===index}" :data-line="index+1"><i>{{ index+1 }}</i>{{ line }}{{ '\n' }}</span></code></pre>
      </aside>
    </div>
    <div v-if="scene.demo" class="graph-map-live">
      <p>{{ ui.noReplay }}</p>
      <Demo :key="scene.id" :kind="scene.demo" />
    </div>
  </div>
  <p v-else role="status">{{ failure ? ui.unavailable : ui.loading }}</p>
</template>
