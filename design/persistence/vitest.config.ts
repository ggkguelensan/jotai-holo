import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['design/persistence/current-behavior.test.ts'] },
});
