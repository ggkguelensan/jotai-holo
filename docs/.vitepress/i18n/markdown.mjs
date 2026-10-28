import { parse, stringify } from 'yaml';

const anchorLine = /^\s*<span id="[^"]+"><\/span>\s*$/;

const frontmatterKeys = new Set(['text', 'tagline', 'alt', 'title', 'details']);
export function frontmatterMessages(value) {
  const result = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node)) {
      if (frontmatterKeys.has(key) && typeof child === 'string') result.push(child);
      else walk(child);
    }
  };
  walk(value);
  return result;
}

/** Keep code, Vue demo wrappers and snippet imports outside translation messages. */
export function markdownParts(source) {
  const lines = source.split(/(?<=\n)/);
  const parts = [];
  let index = 0;
  if (lines[0]?.trim() === '---') {
    let end = 1;
    while (end < lines.length && lines[end].trim() !== '---') end++;
    if (end === lines.length) throw new Error('Unclosed Markdown frontmatter.');
    const raw = lines.slice(0, end + 1).join('');
    parts.push({ type: 'frontmatter', raw, value: parse(lines.slice(1, end).join('')), line: 1 });
    index = end + 1;
  }
  while (index < lines.length) {
    const start = index;
    const line = lines[index];
    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      index++;
      while (index < lines.length && !lines[index].trim().startsWith(fence[1])) index++;
      if (index === lines.length) throw new Error(`Unclosed code fence at ${start + 1}.`);
      index++;
      parts.push({ type: 'raw', raw: lines.slice(start, index).join(''), line: start + 1 });
      continue;
    }
    if (
      !line.trim() ||
      line.trim() === ':::' ||
      anchorLine.test(line) ||
      /^\s*(?:<<< |<\/?[A-Z]|<!--|::: ?$)/.test(line)
    ) {
      parts.push({ type: 'raw', raw: line, line: ++index });
      continue;
    }
    const heading = line.match(/^(#{1,6} )(.+?)(\n?)$/);
    const directive = line.match(/^(::: (?:info|tip|warning|danger|details) )(.+?)(\n?)$/);
    if (heading || directive) {
      const match = heading ?? directive;
      parts.push({
        type: heading ? 'heading' : 'text',
        prefix: match[1],
        value: heading ? match[2].replace(/\s+\{#[^}]+\}$/, '') : match[2],
        ...(heading ? { anchor: match[2].match(/\s+\{#([^}]+)\}$/)?.[1] } : {}),
        suffix: match[3],
        raw: line,
        line: ++index,
      });
      continue;
    }
    index++;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !anchorLine.test(lines[index]) &&
      !/^\s*(?:`{3,}|~{3,}|<<< |<\/?[A-Z]|:::|#{1,6} )/.test(lines[index])
    )
      index++;
    const raw = lines.slice(start, index).join('');
    parts.push({
      type: 'text',
      value: raw.replace(/\n$/, ''),
      suffix: raw.endsWith('\n') ? '\n' : '',
      raw,
      line: start + 1,
    });
  }
  return parts;
}

export function markdownMessages(source) {
  return markdownParts(source).flatMap((part) =>
    part.type === 'frontmatter'
      ? frontmatterMessages(part.value).map((value) => ({ value, line: part.line }))
      : part.value === undefined
        ? []
        : [{ value: part.value, line: part.line }],
  );
}

export function translateMarkdown(source, translate, slugify) {
  return markdownParts(source)
    .map((part) => {
      if (part.type === 'frontmatter') {
        const walk = (node) => {
          if (!node || typeof node !== 'object') return;
          for (const [key, value] of Object.entries(node)) {
            if (frontmatterKeys.has(key) && typeof value === 'string') node[key] = translate(value);
            else walk(value);
          }
        };
        walk(part.value);
        return `---\n${stringify(part.value)}---\n`;
      }
      if (part.value === undefined) return part.raw;
      const heading = part.type === 'heading' ? ` {#${part.anchor ?? slugify(part.value)}}` : '';
      return `${part.prefix ?? ''}${translate(part.value)}${heading}${part.suffix ?? ''}`;
    })
    .join('');
}

// Catalogs keep readable literal Markdown; only the compiler sees ICU quoting.
export const literalMessage = (value) =>
  value.replace(/'/g, "''").replace(/[{}]/g, (char) => `'${char}'`);
export const unliteralMessage = (value) => value.replace(/'([{}])'/g, '$1').replace(/''/g, "'");
