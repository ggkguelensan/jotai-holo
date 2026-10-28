<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUpdated, provide, ref, useId } from 'vue';

const host = ref<HTMLElement>();
provide('holo-docs-code-notes', useId());
let observer: ResizeObserver | undefined;
let frame = 0;
let active = false;

function positionNotes() {
  const root = host.value;
  if (!root) return;
  const notes = [...root.querySelectorAll<HTMLElement>('.code-note')];
  const lines = [...root.querySelectorAll<HTMLElement>('pre .line')];
  const entries = notes.map((note) => ({
    note,
    line: lines.find((line) => line.textContent?.includes(note.dataset.codeAnchor ?? '')),
  }));
  root.dataset.aligned = String(
    Number.parseFloat(getComputedStyle(root).paddingRight) > 0 && entries.every(({ line }) => line),
  );
  const origin = root.getBoundingClientRect().top;
  let bottom = 0;
  for (const { note, line } of entries) {
    if (!line) continue;
    line.id = note.dataset.codeTarget!;
    line.classList.add('code-note-target');
    line.setAttribute('aria-describedby', note.id);
    const top = Math.max(line.getBoundingClientRect().top - origin, bottom);
    note.style.setProperty('--code-note-top', `${top}px`);
    bottom = top + note.getBoundingClientRect().height + 20;
  }
  const blocks = [...root.querySelectorAll<HTMLElement>('[class*="language-"]')];
  const sourceEnd = Math.max(
    0,
    ...blocks.map((block) => block.getBoundingClientRect().bottom - origin),
  );
  root.style.minHeight =
    root.dataset.aligned === 'true' ? `${Math.max(sourceEnd, bottom - 20)}px` : '';
}
function schedule() {
  if (!active) return;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(positionNotes);
}
onMounted(() => {
  active = true;
  observer = new ResizeObserver(schedule);
  observer.observe(host.value!);
  void document.fonts.ready.then(schedule);
  schedule();
});
onUpdated(schedule);
onBeforeUnmount(() => {
  active = false;
  observer?.disconnect();
  cancelAnimationFrame(frame);
});
</script>

<template>
  <div class="code-notes-frame">
    <div ref="host" class="code-notes"><slot /></div>
  </div>
</template>
