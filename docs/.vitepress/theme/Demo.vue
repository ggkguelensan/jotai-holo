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
        const [{ mountDemo }, { loadI18n }] = await Promise.all([
          import('./mount-demo'),
          import('../i18n/runtime'),
        ]);
        const i18n = await loadI18n(lang.value);
        if (current === generation && host.value) root = mountDemo(host.value, props.kind, i18n);
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
    <div class="example-live">
      <div class="example-toolbar">
        <span><span class="example-dot" />{{ theme.docsUi.liveExample }}</span
        ><code>{{ kind }}</code>
      </div>
      <div ref="host" class="example-preview" :data-demo="kind" />
      <p v-if="failure" role="alert">{{ failure }}</p>
    </div>
    <div class="example-source">
      <p class="example-source-title">{{ theme.docsUi.viewCode }}</p>
      <slot />
      <a
        class="example-file"
        :href="`https://github.com/ggkguelensan/jotai-holo/blob/docs/lingui-i18n/examples/docs/${kind}.tsx`"
        >{{ theme.docsUi.fullSource }} ↗</a
      >
    </div>
  </div>
</template>
