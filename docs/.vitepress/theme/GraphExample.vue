<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useData, withBase } from 'vitepress';
import GraphCanvas from './GraphCanvas.vue';
import type { GraphScene, GraphUi, SourceRef } from '../graph/contracts';
const props = defineProps<{ scene: string }>();
const { lang, theme } = useData();
const root = ref<HTMLElement>();
const failure = ref(false);
const scene = shallowRef<GraphScene>();
const selected = ref<string | null>(null);
const ui = computed(() => theme.value.docsUi.graph as GraphUi);
const prefix = computed(() => (lang.value.startsWith('en') ? '' : `/${lang.value.split('-')[0]}`));
const href = computed(() =>
  withBase(
    `${prefix.value}/examples/graph?scene=${encodeURIComponent(props.scene)}${selected.value ? `&node=${encodeURIComponent(selected.value)}` : ''}`,
  ),
);
let observer: IntersectionObserver | undefined;
let disposed = false;
let generation = 0;
let highlighted: HTMLElement[] = [];
function lineForRef(ref: SourceRef) {
  const file = scene.value?.sources[ref.source]?.file;
  if (!file || !root.value) return undefined;
  const matches = [
    ...root.value.querySelectorAll<HTMLElement>('[data-code-source] pre .line'),
  ].filter(
    (line) =>
      line.closest<HTMLElement>('[data-code-source]')?.dataset.codeSource === file &&
      line.textContent?.includes(ref.anchor),
  );
  return matches[ref.occurrence ?? 0];
}
function linesForNode(id: string) {
  const node =
    scene.value?.nodes.find((node) => node.id === id) ??
    scene.value?.groups.find((group) => group.id === id);
  for (const ref of node?.refs ?? []) {
    const line = lineForRef(ref);
    if (line) return [line];
  }
  return [];
}
function highlight() {
  highlighted.forEach((line) => line.classList.remove('graph-source-selected'));
  highlighted = selected.value ? linesForNode(selected.value) : [];
  highlighted.forEach((line) => line.classList.add('graph-source-selected'));
}
function codeHover(event: Event) {
  const target =
    event.target instanceof Element ? event.target.closest<HTMLElement>('pre .line') : null;
  if (!target) return;
  const node = [...(scene.value?.nodes ?? []), ...(scene.value?.groups ?? [])].find((node) =>
    node.refs.some((ref) => lineForRef(ref) === target),
  );
  if (node) selected.value = node.id;
}
async function load() {
  const current = ++generation;
  failure.value = false;
  scene.value = undefined;
  selected.value = null;
  try {
    const { loadScene } = await import('../graph/scenes');
    const next = await loadScene(props.scene);
    if (disposed || current !== generation) return;
    scene.value = next;
    selected.value = null;
  } catch {
    if (!disposed && current === generation) failure.value = true;
  }
}
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer?.disconnect();
        void load();
      }
    },
    { rootMargin: '200px' },
  );
  observer.observe(root.value!);
});
watch(
  () => props.scene,
  () => {
    if (root.value) void load();
  },
);
watch(selected, highlight);
onBeforeUnmount(() => {
  disposed = true;
  ++generation;
  observer?.disconnect();
  highlighted.forEach((line) => line.classList.remove('graph-source-selected'));
});
</script>
<template>
  <div class="graph-example-frame">
    <div ref="root" class="graph-example" :data-graph-scene="props.scene">
      <div class="graph-example-source" @pointerover="codeHover" @focusin="codeHover"><slot /></div>
      <aside class="graph-example-rail">
        <div class="graph-example-sticky">
          <header>
            <span>{{ ui.title }}</span
            ><a :href="href" :aria-label="ui.open" :title="ui.open">↗</a>
          </header>
          <GraphCanvas
            v-if="scene"
            :scene="scene"
            :ui="ui"
            mode="mini"
            :selected="selected"
            @select="selected = $event"
          />
          <div v-else class="graph-loading" role="status">
            {{ failure ? ui.unavailable : ui.loading }}
          </div>
          <p class="graph-structure-note">{{ ui.structure }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>
