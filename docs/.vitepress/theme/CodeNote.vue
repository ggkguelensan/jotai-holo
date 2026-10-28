<script setup lang="ts">
import { computed, inject } from 'vue';

const props = defineProps<{ anchor: string }>();
const prefix = inject<string>('holo-docs-code-notes')!;
const slug = computed(() => props.anchor.replace(/[^a-zA-Z0-9_-]+/g, '-'));
const target = computed(() => `${prefix}-line-${slug.value}`);
</script>

<template>
  <aside
    :id="`${prefix}-note-${slug}`"
    class="code-note"
    role="note"
    :data-code-anchor="anchor"
    :data-code-target="target"
  >
    <a class="code-note-location" :href="`#${target}`"
      ><code>{{ anchor }}</code></a
    >
    <slot />
  </aside>
</template>
