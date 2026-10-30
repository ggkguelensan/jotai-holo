<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { GraphScene, GraphUi } from '../graph/contracts';
import type { GraphProps } from '../graph/mount';
const props = defineProps<{
  scene: GraphScene;
  ui: GraphUi;
  mode: 'mini' | 'map';
  selected: string | null;
  activeBranches?: Readonly<Record<string, boolean>>;
  activeNodes?: readonly string[];
}>();
const emit = defineEmits<{ select: [id: string | null] }>();
const host = ref<HTMLElement>();
const failure = ref('');
let root: { render: (props: GraphProps) => void; unmount: () => void } | undefined;
let observer: IntersectionObserver | undefined;
let disposed = false;
const snapshot = (): GraphProps => ({
  scene: props.scene,
  ui: props.ui,
  mode: props.mode,
  selected: props.selected,
  onSelect: (id) => emit('select', id),
  activeBranches: { ...props.activeBranches },
  activeNodes: [...(props.activeNodes ?? [])],
});
onMounted(() => {
  observer = new IntersectionObserver(
    async (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer?.disconnect();
      try {
        const { mountGraph } = await import('../graph/mount');
        if (!disposed && host.value) root = mountGraph(host.value, snapshot());
      } catch (error) {
        if (!disposed) failure.value = String(error);
      }
    },
    { rootMargin: '200px' },
  );
  observer.observe(host.value!);
});
watch(
  () => [
    props.scene,
    props.ui,
    props.mode,
    props.selected,
    props.activeBranches,
    props.activeNodes,
  ],
  () => root?.render(snapshot()),
);
onBeforeUnmount(() => {
  disposed = true;
  observer?.disconnect();
  root?.unmount();
});
</script>
<template>
  <div class="graph-canvas-host" :class="`graph-canvas-${mode}`">
    <div ref="host">
      <span v-if="!failure" class="graph-loading">{{ ui.loading }}</span>
    </div>
    <p v-if="failure" role="alert">{{ ui.unavailable }}</p>
  </div>
</template>
