import path from 'node:path';
import ts from 'typescript';

/** Split complete declarations, never blank lines inside a View or callback. */
export function splitCode(source, language = 'tsx') {
  const file = ts.createSourceFile(
    `example.${language}`,
    source,
    ts.ScriptTarget.Latest,
    true,
    language === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  if (file.parseDiagnostics.length || file.statements.length < 2) return [source];
  const blocks = [];
  let pending = '';
  for (const statement of file.statements) {
    const text = source.slice(statement.getFullStart(), statement.end);
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      pending += text;
      continue;
    }
    if (ts.isExportAssignment(statement) && blocks.length && !pending) {
      blocks.at(-1).code += text;
      continue;
    }
    let group;
    if (ts.isImportDeclaration(statement)) group = 'imports';
    if (ts.isVariableStatement(statement) && statement.declarationList.declarations.length === 1) {
      const initializer = statement.declarationList.declarations[0].initializer;
      if (
        initializer &&
        ts.isCallExpression(initializer) &&
        ts.isIdentifier(initializer.expression)
      ) {
        const factory = initializer.expression.text;
        if (['atom', 'stateAtom', 'actionAtom', 'eventAtom'].includes(factory)) group = factory;
      }
    }
    if (group && blocks.at(-1)?.group === group && !pending) blocks.at(-1).code += text;
    else blocks.push({ group, code: pending + text });
    pending = '';
  }
  const tail = pending + source.slice(file.statements.end);
  if (blocks.length) blocks.at(-1).code += tail;
  else return [source];
  return blocks.map(({ code }) => code.trim() + '\n');
}

/** Reuse VitePress snippet resolution, highlighting and per-block copy buttons. */
export function logicalCodeBlocks(md) {
  const render = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index];
    // The original renderer resolves imported files and registers watch dependencies.
    const html = render(tokens, index, options, env, self);
    const language = token.info.trim();
    const source = Array.isArray(token.src) ? token.src[0] : undefined;
    const mark = (html) => {
      if (!source) return html;
      const relative = path
        .relative(process.cwd(), source)
        .split(path.sep)
        .join('/')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return html.replace('<div ', `<div data-code-source="${relative}" `);
    };
    if (!token.src || !['ts', 'tsx'].includes(language) || /\[!code\b/.test(token.content))
      return mark(html);
    const blocks = splitCode(token.content, language);
    if (blocks.length < 2) return mark(html);
    return blocks
      .map((content) => {
        const block = Object.assign(Object.create(Object.getPrototypeOf(token)), token, {
          src: undefined,
          content,
        });
        return mark(render([block], 0, options, env, self));
      })
      .join('\n');
  };
}
