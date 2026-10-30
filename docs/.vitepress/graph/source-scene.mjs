import ts from 'typescript';

/**
 * Build-time structural graph. This never executes examples or pretends that an
 * imported implementation, a callback, or a dynamic import has already run.
 * Unknown references stay absent rather than becoming guessed dependencies.
 */
export function buildSourceScene({ id, title = 'atoms', article, sources }) {
  const nodes = [];
  const edges = [];
  const groups = [];
  const declarations = [];
  const scopes = new Map();
  const models = new Map();
  const bindings = [];
  const files = Object.entries(sources).map(([key, source]) => ({
    key,
    source,
    ast: ts.createSourceFile(
      source.file,
      source.text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
  }));
  const callName = (expression) => {
    if (!expression) return '';
    if (ts.isCallExpression(expression) || ts.isNewExpression(expression))
      return callName(expression.expression);
    if (ts.isIdentifier(expression)) return expression.text;
    if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
    return '';
  };
  const property = (object, key) =>
    object && ts.isObjectLiteralExpression(object)
      ? object.properties.find((p) => p.name?.getText().replace(/^['"]|['"]$/g, '') === key)
      : undefined;
  const value = (member) => member && ('initializer' in member ? member.initializer : member.name);
  const unwrap = (node) => {
    while (
      node &&
      (ts.isParenthesizedExpression(node) ||
        ts.isAsExpression(node) ||
        ts.isSatisfiesExpression(node))
    )
      node = node.expression;
    return node;
  };
  const objectOf = (node) => {
    node = unwrap(node);
    if (node && ts.isArrowFunction(node)) node = unwrap(node.body);
    return node && ts.isObjectLiteralExpression(node) ? node : undefined;
  };
  const functionOf = (node) => {
    node = unwrap(node);
    if (node && ts.isCallExpression(node) && callName(node) === 'defineModel')
      node = node.arguments[0];
    return node && (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) ? node : undefined;
  };
  const scopeOf = (node) => {
    while (node.parent && !ts.isSourceFile(node) && !ts.isFunctionLike(node)) node = node.parent;
    return node;
  };
  const ref = (file, node) => {
    const anchor = node.getText(file.ast).split('\n')[0].trim();
    const matches = file.source.text.split('\n').filter((line) => line.includes(anchor));
    const preceding = file.source.text.slice(0, node.getStart(file.ast)).split('\n').slice(0, -1);
    return {
      source: file.key,
      anchor,
      ...(matches.length > 1
        ? { occurrence: preceding.filter((line) => line.includes(anchor)).length }
        : {}),
    };
  };
  const visit = (node, fn) => {
    fn(node);
    ts.forEachChild(node, (child) => visit(child, fn));
  };
  const addEdge = (from, to, kind) => {
    if (
      from &&
      to &&
      from !== to &&
      !edges.some((e) => e.from === from && e.to === to && e.kind === kind)
    )
      edges.push({ from, to, kind });
  };
  const atomCalls = new Set([
    'atom',
    'stateAtom',
    'eventAtom',
    'actionAtom',
    'ion',
    'prism',
    'flatMapAtom',
    'matchAtom',
    'formAtom',
    'atomWithStorage',
    'atomWithImmer',
    'atomWithReset',
  ]);
  const holoCalls = new Set(['holo', 'holoForm', 'holoList', 'holoMatch']);
  const resourceCalls = new Set([
    'createAnalytics',
    'createAmplitudeAdapter',
    'localStorageAdapter',
    'indexedDBAdapter',
    'modelConnection',
    'modelAnalytics',
  ]);
  const modelCalls = new Set(['createQueryModel', 'createMutationModel', 'createFormModel']);

  // Register lexical declarations first, so forward JSX references are safe.
  for (const file of files) {
    visit(file.ast, (node) => {
      if (
        ts.isImportSpecifier(node) &&
        (node.propertyName?.text ?? node.name.text) === 'queryClientAtom' &&
        file.source.text.split(node.name.text).length > 2
      ) {
        const declaration = {
          name: node.name.text,
          node,
          file,
          scope: file.ast,
          id: `${file.key}:${node.pos}:${node.name.text}`,
          importedAtom: true,
        };
        declarations.push(declaration);
        if (!scopes.has(file.ast)) scopes.set(file.ast, new Map());
        scopes.get(file.ast).set(declaration.name, declaration);
        return;
      }
      const variable = ts.isVariableDeclaration(node);
      const fn = ts.isFunctionDeclaration(node) && node.name;
      if (!variable && !fn) return;
      const names = ts.isIdentifier(node.name)
        ? [node.name.text]
        : variable && ts.isObjectBindingPattern(node.name) && callName(node.initializer) === 'prism'
          ? node.name.elements
              .filter((element) => ts.isIdentifier(element.name))
              .map((element) => element.name.text)
          : [];
      for (const name of names) {
        const initializer = variable ? unwrap(node.initializer) : node;
        const declaration = {
          name,
          node,
          initializer,
          file,
          scope: scopeOf(node.parent),
          id: `${file.key}:${node.pos}:${name}`,
        };
        declarations.push(declaration);
        if (!scopes.has(declaration.scope)) scopes.set(declaration.scope, new Map());
        const symbols = scopes.get(declaration.scope);
        symbols.set(name, symbols.has(name) ? null : declaration);
      }
    });
  }
  const lookup = (name, at) => {
    let scope = scopeOf(at);
    while (scope) {
      const symbols = scopes.get(scope);
      if (symbols?.has(name)) return symbols.get(name) ?? undefined;
      scope = scope.parent ? scopeOf(scope.parent) : undefined;
    }
    // Cross-file access is resolved only through an explicit named import.
    const file = files.find((item) => item.ast === at.getSourceFile());
    if (!file) return undefined;
    for (const statement of file.ast.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !statement.importClause?.namedBindings ||
        !ts.isNamedImports(statement.importClause.namedBindings)
      )
        continue;
      const imported = statement.importClause.namedBindings.elements.find(
        (item) => item.name.text === name,
      );
      if (!imported || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const path = statement.moduleSpecifier.text;
      if (!path.startsWith('.')) continue;
      const base = file.source.file.split('/').slice(0, -1);
      for (const part of path.split('/')) {
        if (part === '..') base.pop();
        else if (part !== '.') base.push(part);
      }
      const target = base.join('/').replace(/\.[cm]?[jt]sx?$/, '');
      const importedName = imported.propertyName?.text ?? imported.name.text;
      return declarations.find(
        (item) =>
          ts.isSourceFile(item.scope) &&
          item.file.source.file.replace(/\.[cm]?[jt]sx?$/, '') === target &&
          item.name === importedName,
      );
    }
  };
  const addNode = (declaration, kind) => {
    if (nodes.some((node) => node.id === declaration.id)) return;
    nodes.push({
      id: declaration.id,
      kind,
      label: declaration.name,
      refs: [ref(declaration.file, declaration.node)],
      position: [0, 0],
    });
  };
  // Model factories are boundaries; factory calls are not new fake atom nodes.
  for (const declaration of declarations) {
    const { initializer, name } = declaration;
    const fn =
      initializer && ts.isFunctionDeclaration(initializer) ? initializer : functionOf(initializer);
    if (fn && (/^create.*Model$/.test(name) || callName(initializer) === 'defineModel')) {
      const group = {
        id: declaration.id,
        kind: 'model',
        label: name,
        refs: [ref(declaration.file, declaration.node)],
        bounds: [0, 0, 200, 200],
      };
      groups.push(group);
      models.set(declaration.id, { group, fn, members: new Map() });
    }
    if (modelCalls.has(callName(initializer))) {
      const group = {
        id: declaration.id,
        kind: 'model',
        label: name,
        refs: [ref(declaration.file, declaration.node)],
        bounds: [0, 0, 200, 200],
      };
      groups.push(group);
      models.set(declaration.id, { group, members: new Map() });
      const options = objectOf(initializer.arguments[0]);
      for (const field of ['prism']) {
        const projections = objectOf(value(property(options, field)));
        for (const projection of projections?.properties ?? []) {
          const label = projection.name?.getText();
          if (!label) continue;
          const node = {
            id: `${declaration.id}.${label}`,
            kind: 'atom',
            label,
            group: group.id,
            refs: [ref(declaration.file, projection)],
            position: [0, 0],
          };
          nodes.push(node);
          models.get(declaration.id).members.set(label, node.id);
        }
      }
    }
    if (declaration.importedAtom || atomCalls.has(callName(initializer)))
      addNode(declaration, 'atom');
    if (
      resourceCalls.has(callName(initializer)) ||
      (initializer &&
        ts.isCallExpression(initializer) &&
        ts.isPropertyAccessExpression(initializer.expression) &&
        ['event', 'connect', 'acquire'].includes(initializer.expression.name.text))
    )
      addNode(declaration, 'resource');
    if (fn && /^model[A-Z]/.test(name)) addNode(declaration, 'resource');
    if (['createStore', 'QueryClient'].includes(callName(initializer)))
      addNode(declaration, 'resource');
    if (fn && /^[A-Z]/.test(name)) {
      let jsx = false;
      visit(fn.body ?? fn, (node) => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node))
          jsx = true;
      });
      if (jsx) addNode(declaration, 'react');
    }
    if (holoCalls.has(callName(initializer))) {
      addNode(declaration, 'holo');
      bindings.push(declaration);
    }
  }
  const nodeById = (id) => nodes.find((node) => node.id === id);
  for (const declaration of declarations) {
    const node = nodeById(declaration.id);
    if (!node) continue;
    let parent = declaration.node.parent;
    while (parent) {
      const owner = [...models.values()].find((model) => model.fn === parent);
      if (owner) {
        node.group = owner.group.id;
        owner.members.set(declaration.name, node.id);
        break;
      }
      parent = parent.parent;
    }
  }
  // Return-property aliases are explicit evidence of a model's public surface.
  for (const model of models.values()) {
    if (!model.fn?.body) continue;
    visit(model.fn.body, (node) => {
      if (!ts.isReturnStatement(node) || scopeOf(node) !== model.fn) return;
      const record = objectOf(node.expression);
      for (const member of record?.properties ?? []) {
        const expression = value(member);
        if (!expression || !ts.isIdentifier(expression)) continue;
        const target = lookup(expression.text, expression);
        if (target && nodeById(target.id)) model.members.set(member.name.getText(), target.id);
      }
    });
  }
  const resolveModel = (expression, depth = 0) => {
    if (!expression || depth > 8) return;
    expression = unwrap(expression);
    if (ts.isArrowFunction(expression)) return resolveModel(expression.body, depth + 1);
    if (ts.isCallExpression(expression)) {
      if (callName(expression) === 'pipe') return resolveModel(expression.arguments[0], depth + 1);
      return resolveModel(expression.expression, depth + 1);
    }
    if (!ts.isIdentifier(expression)) return;
    const declaration = lookup(expression.text, expression);
    return (
      declaration &&
      (models.get(declaration.id) ?? resolveModel(declaration.initializer, depth + 1))
    );
  };
  const instances = [];
  // Calls and decorated definitions have their own identities. Only members
  // actually created inside the factory are cloned; module atoms stay shared.
  for (const declaration of declarations) {
    if (models.has(declaration.id) || !declaration.initializer) continue;
    const expression = declaration.initializer;
    const isPipeline =
      callName(expression) === 'pipe' &&
      (declaration.name.startsWith('$$') ||
        expression.arguments.slice(1).some((argument) => callName(argument).startsWith('model')));
    const isInstance =
      ts.isCallExpression(expression) &&
      declaration.name.startsWith('$$') &&
      /^create.*Model$/.test(callName(expression));
    if (!isPipeline && !isInstance) continue;
    const source = resolveModel(expression);
    const registry =
      (source?.group.registry ?? false) ||
      (isPipeline &&
        expression.arguments.some((argument) => callName(argument) === 'modelRegistry'));
    const group = {
      id: declaration.id + ':model',
      kind: 'model',
      label: declaration.name,
      refs: [ref(declaration.file, declaration.node)],
      registry,
      bounds: [0, 0, 200, 200],
    };
    groups.push(group);
    const remap = new Map();
    for (const node of source ? nodes.filter((node) => node.group === source.group.id) : []) {
      const clone = { ...node, id: `${declaration.id}:${node.id}`, group: group.id };
      nodes.push(clone);
      remap.set(node.id, clone.id);
    }
    const members = new Map(
      [...(source?.members ?? [])].map(([name, member]) => [name, remap.get(member) ?? member]),
    );
    models.set(declaration.id, { group, members });
    instances.push(remap);
    if (!remap.size) {
      addNode(declaration, 'resource');
      nodeById(declaration.id).group = group.id;
    }
  }
  const resolve = (expression, aliases = new Map()) => {
    expression = unwrap(expression);
    if (!expression) return;
    if (ts.isIdentifier(expression)) return lookup(expression.text, expression)?.id;
    if (ts.isPropertyAccessExpression(expression)) {
      const model = ts.isIdentifier(expression.expression)
        ? (aliases.get(expression.expression.text) ?? resolveModel(expression.expression))
        : resolveModel(expression.expression);
      return model?.members.get(expression.name.text);
    }
  };
  const resolveNode = (expression, aliases) => {
    const id = resolve(expression, aliases);
    return nodeById(id) ? id : undefined;
  };
  const ensureReact = (expression, file) => {
    if (!expression || !ts.isIdentifier(expression)) return;
    let declaration = lookup(expression.text, expression);
    if (!declaration) {
      // The view reference itself is known, its implementation may be omitted.
      declaration = {
        id: `${file.key}:view:${expression.text}`,
        name: expression.text,
        file,
        node: expression,
      };
    }
    if (!nodeById(declaration.id)) addNode(declaration, 'react');
    return declaration.id;
  };
  for (const binding of bindings) {
    const options = objectOf(binding.initializer.arguments[0]);
    const aliases = new Map();
    const boundModels = objectOf(value(property(options, 'models')));
    for (const member of boundModels?.properties ?? []) {
      const model = resolveModel(value(member));
      if (model) aliases.set(member.name.getText(), model);
    }
    const view = value(property(options, 'view'));
    const viewId = ensureReact(view, binding.file);
    addEdge(binding.id, viewId, 'props');
    addEdge(resolveNode(value(property(options, 'source')), aliases), binding.id, 'read');
    const empty = value(property(options, 'empty'));
    if (empty) addEdge(binding.id, ensureReact(empty, binding.file), 'props');
    for (const member of objectOf(value(property(options, 'cases')))?.properties ?? [])
      addEdge(binding.id, ensureReact(value(member), binding.file), 'props');
    for (const field of ['read', 'write', 'input', 'events', 'imperative']) {
      const mapping = objectOf(value(property(options, field)));
      for (const member of mapping?.properties ?? []) {
        const target = resolveNode(value(member), aliases);
        if (field === 'read' || field === 'events' || field === 'imperative')
          addEdge(target, binding.id, field === 'read' ? 'read' : 'fact');
        else addEdge(binding.id, target, 'write');
      }
      if (mapping?.properties.length && field === 'write') addEdge(viewId, binding.id, 'write');
    }
  }
  const inputNodes = (expression) => {
    expression = unwrap(expression);
    if (!expression) return [];
    if (ts.isObjectLiteralExpression(expression))
      return expression.properties.flatMap((member) => inputNodes(value(member)));
    if (ts.isArrayLiteralExpression(expression)) return expression.elements.flatMap(inputNodes);
    const target = resolveNode(expression);
    return target ? [target] : [];
  };
  // Explicit atom reads/writes and simple derived inputs.
  for (const declaration of declarations) {
    if (!nodeById(declaration.id) || nodeById(declaration.id).kind !== 'atom') continue;
    if (!declaration.initializer) continue;
    visit(declaration.initializer, (node) => {
      if (!ts.isCallExpression(node)) return;
      if (callName(node) === 'get') addEdge(resolveNode(node.arguments[0]), declaration.id, 'read');
      if (callName(node) === 'set')
        addEdge(declaration.id, resolveNode(node.arguments[0]), 'write');
    });
    if (['ion', 'prism', 'flatMapAtom', 'matchAtom'].includes(callName(declaration.initializer)))
      for (const input of inputNodes(declaration.initializer.arguments[0]))
        addEdge(input, declaration.id, 'read');
    if (callName(declaration.initializer) === 'matchAtom') {
      for (const input of inputNodes(declaration.initializer.arguments[1]))
        addEdge(input, declaration.id, 'read');
      const fallback = property(objectOf(declaration.initializer.arguments[2]), 'fallback');
      addEdge(resolveNode(value(fallback)), declaration.id, 'read');
    }
  }
  for (const file of files) {
    visit(file.ast, (node) => {
      if (
        !(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) ||
        !ts.isIdentifier(node.tagName) ||
        !/^[A-Z]/.test(node.tagName.text)
      )
        return;
      const child = lookup(node.tagName.text, node);
      if (!child) return;
      let parent = node.parent;
      while (parent && !ts.isFunctionLike(parent)) parent = parent.parent;
      if (!parent) return;
      const owner = declarations.find(
        (declaration) =>
          declaration.initializer === parent || functionOf(declaration.initializer) === parent,
      );
      if (!owner || !/^[A-Z]/.test(owner.name)) return;
      addNode(owner, 'react');
      if (!nodeById(child.id)) addNode(child, 'react');
      addEdge(owner.id, child.id, 'props');
    });
    visit(file.ast, (node) => {
      if (!ts.isCallExpression(node)) return;
      if (callName(node) === 'modelAnalytics' && ts.isExpressionStatement(node.parent)) {
        addNode(
          { id: `${file.key}:${node.pos}:modelAnalytics`, name: 'modelAnalytics', node, file },
          'resource',
        );
      }
      if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'set')
        addEdge(resolveNode(node.expression.expression), resolveNode(node.arguments[0]), 'write');
      if (callName(node) !== 'bond') return;
      const options = objectOf(node.arguments[0]);
      const aliases = new Map();
      let parent = node.parent;
      while (parent) {
        if (ts.isCallExpression(parent) && callName(parent) === 'modelConnection') {
          const connection = parent.arguments[0];
          const parameter =
            connection && ts.isArrowFunction(connection)
              ? connection.parameters[0]?.name
              : undefined;
          let pipeline = parent.parent;
          while (pipeline && !(ts.isCallExpression(pipeline) && callName(pipeline) === 'pipe'))
            pipeline = pipeline.parent;
          const definition =
            pipeline && declarations.find((declaration) => declaration.initializer === pipeline);
          const model = definition ? models.get(definition.id) : pipeline && resolveModel(pipeline);
          if (model && parameter && ts.isIdentifier(parameter)) aliases.set(parameter.text, model);
          break;
        }
        parent = parent.parent;
      }
      const trigger = resolveNode(value(property(options, 'trigger')), aliases);
      const target = resolveNode(value(property(options, 'write')), aliases);
      addEdge(trigger, target, 'fact');
    });
  }
  // Each clone inherits only the factory's internal/read dependencies.
  // It never inherits another component's subscription to that factory.
  for (const remap of instances) {
    for (const edge of [...edges]) {
      if (remap.has(edge.to) && (remap.has(edge.from) || nodeById(edge.from)?.kind === 'atom'))
        addEdge(remap.get(edge.from) ?? edge.from, remap.get(edge.to), edge.kind);
      if (remap.has(edge.from) && (remap.has(edge.to) || nodeById(edge.to)?.kind === 'atom'))
        addEdge(remap.get(edge.from), remap.get(edge.to) ?? edge.to, edge.kind);
    }
  }
  // Disjoint islands communicate membership without enclosing unrelated nodes.
  let cursor = 35;
  const visibleGroups = groups.filter((group) => nodes.some((node) => node.group === group.id));
  for (const group of visibleGroups) {
    const members = nodes.filter((node) => node.group === group.id);
    const columns = Math.min(4, Math.ceil(Math.sqrt(members.length)));
    const rows = Math.ceil(members.length / columns);
    const width = Math.max(180, columns * 70 + 40);
    const height = rows * 80 + 90;
    group.bounds = [cursor, 35, width, height];
    members.forEach((node, index) => {
      node.position = [
        cursor + 50 + (index % columns) * 70,
        110 + Math.floor(index / columns) * 80,
      ];
    });
    cursor += width + 45;
  }
  const external = nodes.filter((node) => !node.group);
  const top = Math.max(90, ...visibleGroups.map((group) => group.bounds[1] + group.bounds[3] + 70));
  external.forEach((node, index) => {
    node.position = [70 + (index % 7) * 120, top + Math.floor(index / 7) * 100];
  });
  const maxX = Math.max(200, cursor, ...nodes.map((node) => node.position[0] + 40));
  const maxY = Math.max(
    180,
    ...nodes.map((node) => node.position[1] + 60),
    ...visibleGroups.map((group) => group.bounds[1] + group.bounds[3] + 30),
  );
  const scale = Math.min(1, 960 / maxX, 610 / maxY);
  for (const node of nodes)
    node.position = [20 + node.position[0] * scale, 20 + node.position[1] * scale];
  for (const group of visibleGroups)
    group.bounds = [
      20 + group.bounds[0] * scale,
      20 + group.bounds[1] * scale,
      group.bounds[2] * scale,
      group.bounds[3] * scale,
    ];
  return {
    id,
    title,
    article,
    nodes,
    edges,
    groups: groups.filter((group) => nodes.some((node) => node.group === group.id)),
    sources,
  };
}
