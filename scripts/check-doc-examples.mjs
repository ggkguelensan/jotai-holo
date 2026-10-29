import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { sourceDirectories } from '../docs/.vitepress/content.mjs';

const root = process.cwd();
const configFile = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const context = path.join(root, 'tests/fixtures/docs-context.tsx');
const files = ['README.md'];
for (const directory of ['docs', ...sourceDirectories.map((dir) => `docs/${dir}`)]) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(`${directory}/${entry.name}`);
  }
}
const imports = new Map();
for (const [module, names] of Object.entries({
  jotai: ['atom', 'createStore', 'useAtomValue', 'useSetAtom'],
  'jotai-holo': [
    'stateAtom',
    'actionAtom',
    'eventAtom',
    'holo',
    'holoList',
    'holoMatch',
    'ion',
    'prism',
    'bond',
  ],
  'jotai-holo/model': ['defineModel', 'pipe', 'modelRegistry', 'modelLifecycle', 'modelConnection'],
  'jotai-holo/analytics': ['modelAnalytics'],
  'jotai-effect': ['withAtomEffect', 'atomEffect'],
}))
  for (const name of names) imports.set(name, { module, name });
const fixtureSource = ts.createSourceFile(
  context,
  await readFile(context, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
function bindings(name) {
  return ts.isIdentifier(name)
    ? [name.text]
    : name.elements.flatMap((element) =>
        ts.isOmittedExpression(element) ? [] : bindings(element.name),
      );
}
function declarations(source) {
  return new Set(
    source.statements.flatMap((statement) => {
      if (ts.isVariableStatement(statement))
        return statement.declarationList.declarations.flatMap((d) => bindings(d.name));
      if (ts.isImportDeclaration(statement)) {
        const clause = statement.importClause;
        return [
          clause?.name?.text,
          ...(clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
            ? clause.namedBindings.elements.map((e) => e.name.text)
            : []),
        ].filter(Boolean);
      }
      return statement.name && ts.isIdentifier(statement.name) ? [statement.name.text] : [];
    }),
  );
}
for (const name of declarations(fixtureSource))
  if (!imports.has(name)) imports.set(name, { module: context.replace(/\.tsx$/, '.js'), name });
for (const statement of fixtureSource.statements) {
  if (
    ts.isExportDeclaration(statement) &&
    statement.exportClause &&
    ts.isNamedExports(statement.exportClause)
  )
    for (const element of statement.exportClause.elements)
      imports.set(element.name.text, {
        module: context.replace(/\.tsx$/, '.js'),
        name: element.name.text,
      });
}
const virtual = new Map();
const locations = new Map();
let count = 0;
for (const file of files) {
  const markdown = await readFile(file, 'utf8');
  for (const match of markdown.matchAll(/^```(tsx?|jsx?)\s*\n([\s\S]*?)^```/gm)) {
    const code = match[2];
    const source = ts.createSourceFile(
      file + '.tsx',
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const local = declarations(source);
    const used = new Set();
    function visit(node) {
      if (ts.isIdentifier(node)) used.add(node.text);
      ts.forEachChild(node, visit);
    }
    visit(source);
    const prelude =
      [...used]
        .filter((name) => !local.has(name) && imports.has(name))
        .map((name) => {
          let { module, name: imported } = imports.get(name);
          if (
            name === 'CounterView' &&
            ['docs/reference/holo.md', 'docs/topics/holo.md'].includes(file)
          )
            imported = 'CounterIncrementView';
          if (name === 'CounterView' && file === 'docs/integrations.md')
            imported = 'CounterReadView';
          return `import ${['User', 'CampaignInput'].includes(name) ? 'type ' : ''}{ ${imported}${imported === name ? '' : ` as ${name}`} } from ${JSON.stringify(module)};`;
        })
        .join('\n') + '\n';
    const filename = path.join(root, '.vercel/doc-types', `example-${count++}.tsx`);
    virtual.set(filename, prelude + code + '\nexport {};\n');
    locations.set(filename, {
      file,
      line: markdown.slice(0, match.index).split('\n').length + 1,
      offset: prelude.split('\n').length - 1,
    });
  }
}
const host = ts.createCompilerHost(options);
const originalSource = host.getSourceFile.bind(host);
host.getSourceFile = (file, languageVersion, onError) =>
  virtual.has(file)
    ? ts.createSourceFile(file, virtual.get(file), languageVersion, true, ts.ScriptKind.TSX)
    : originalSource(file, languageVersion, onError);
host.resolveModuleNames = (names, containingFile) =>
  names.map((name) => {
    if (name === './search.analytics' && virtual.has(containingFile))
      return {
        resolvedFileName: path.join(root, 'examples/analytics/search.analytics.ts'),
        extension: ts.Extension.Ts,
      };
    return ts.resolveModuleName(name, containingFile, options, host).resolvedModule;
  });
const program = ts.createProgram([...virtual.keys()], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
for (const diagnostic of diagnostics) {
  const origin = diagnostic.file && locations.get(diagnostic.file.fileName);
  const position = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
  const file = origin?.file ?? diagnostic.file?.fileName ?? 'TypeScript';
  const line = origin ? origin.line + position.line - origin.offset : (position?.line ?? 0) + 1;
  console.error(
    `${file}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
  );
}
assert.equal(diagnostics.length, 0, 'Markdown examples must typecheck against the real API.');
const invalid = [
  `import { holo, stateAtom } from 'jotai-holo';
   holo({view: (_props: {count: number}) => null, read: {count: stateAtom('wrong')}});`,
  `import { Counter } from ${JSON.stringify(path.join(root, 'examples/input-contract.js'))};
   const element = <Counter counterId="users" />;`,
  `import { holo } from 'jotai-holo'; holo({core: () => null});`,
];
for (const [index, code] of invalid.entries()) {
  const filename = path.join(root, '.vercel/doc-types', `negative-${index}.tsx`);
  virtual.set(filename, code);
  const rejected = ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host));
  assert.ok(rejected.length > 0, `The checker must reject invalid example ${index}.`);
}
console.log(
  `TypeScript: ${count} inline examples and ${invalid.length} rejection controls checked with strict, typed contexts.`,
);
