<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useData } from 'vitepress';

const props = defineProps<{ kind: string }>();
const { lang, theme } = useData();
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
        const [{ mountDemo }, { loadTranslator }] = await Promise.all([
          import('./mount-demo'),
          import('../i18n/runtime'),
        ]);
        const t = await loadTranslator(lang.value);
        if (current === generation && host.value) root = mountDemo(host.value, props.kind, t);
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
      <span><span class="example-dot" />{{ theme.docsUi.liveExample }}</span
      ><code>{{ kind }}</code>
    </div>
    <div ref="host" class="example-preview" :data-demo="kind" />
    <p v-if="failure" role="alert">{{ failure }}</p>
    <details class="example-source">
      <summary>{{ theme.docsUi.viewCode }} <span aria-hidden="true">↗</span></summary>
      <slot />
      <a
        class="example-file"
        :href="`https://github.com/ggkguelensan/jotai-holo/blob/docs/lingui-i18n/examples/${kind === 'bunshi' ? 'docs-bunshi' : ['operators', 'model', 'query', 'form'].includes(kind) ? 'docs-infrastructure' : 'docs-demos'}.tsx`"
        >{{ theme.docsUi.fullSource }} ↗</a
      >
    </details>
  </div>
</template>
