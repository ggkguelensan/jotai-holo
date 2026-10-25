<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useData } from 'vitepress';

const props = defineProps<{ kind: string }>();
const { lang } = useData();
const host = ref<HTMLElement>();
const failure = ref('');
let generation = 0;
let root: { unmount(): void } | undefined;
let stop: (() => void) | undefined;
onMounted(() => {
  stop = watch(
    [() => props.kind, lang],
    async () => {
      const current = ++generation;
      root?.unmount();
      root = undefined;
      failure.value = '';
      try {
        const { mountDemo } = await import('./mount-demo');
        if (current === generation && host.value)
          root = mountDemo(host.value, props.kind, lang.value === 'ru');
      } catch (error) {
        if (current === generation) failure.value = String(error);
      }
    },
    { immediate: true },
  );
});
onBeforeUnmount(() => {
  ++generation;
  stop?.();
  root?.unmount();
});
</script>

<template>
  <div class="holo-example">
    <div class="example-toolbar">
      <span><span class="example-dot" />{{ lang === 'ru' ? 'Живой пример' : 'Live example' }}</span
      ><code>{{ kind }}</code>
    </div>
    <div ref="host" class="example-preview" :data-demo="kind" />
    <p v-if="failure" role="alert">{{ failure }}</p>
    <details class="example-source">
      <summary>
        {{ lang === 'ru' ? 'Код примера' : 'View example code' }} <span aria-hidden="true">↗</span>
      </summary>
      <slot />
      <a
        class="example-file"
        :href="`https://github.com/ggkguelensan/jotai-holo/blob/docs/reference-site/examples/${kind === 'bunshi' ? 'docs-bunshi' : 'docs-demos'}.tsx`"
        >{{ lang === 'ru' ? 'Полный исходник с импортами' : 'Complete source with imports' }} ↗</a
      >
    </details>
  </div>
</template>
