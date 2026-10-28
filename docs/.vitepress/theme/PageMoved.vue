<script setup lang="ts">
import { onMounted } from 'vue';
import { useData, useRouter, withBase } from 'vitepress';

const { frontmatter } = useData();
const router = useRouter();
onMounted(() => {
  const target: unknown = frontmatter.value.redirect;
  if (typeof target === 'string' && target.startsWith('/')) {
    const fragment = target.includes('#') ? '' : window.location.hash;
    void router.go(withBase(target) + fragment);
  }
});
</script>

<template>
  <div class="page-moved"><slot /></div>
</template>
