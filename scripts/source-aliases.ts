import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Package exports are the source of truth for development entry points. */
export function sourceAliases(): { find: string; replacement: string }[] {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as {
    name: string;
    exports: Record<string, string | { import: string }>;
  };
  return Object.entries(manifest.exports)
    .filter((entry): entry is [string, { import: string }] => typeof entry[1] === 'object')
    .map(([name, entry]) => ({
      find: name === '.' ? manifest.name : `${manifest.name}${name.slice(1)}`,
      replacement: fileURLToPath(
        new URL(
          `../${entry.import.replace(/^\.\/dist\//, 'src/').replace(/\.js$/, '.ts')}`,
          import.meta.url,
        ),
      ),
    }))
    .sort((first, second) => second.find.length - first.find.length);
}
