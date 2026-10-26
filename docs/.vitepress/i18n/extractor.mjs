import ts from 'typescript';
import { markdownMessages, literalMessage } from './markdown.mjs';

export const extractor = {
  match: (filename) => /\.(?:md|tsx|mts)$/.test(filename),
  extract(filename, code, onMessageExtracted) {
    if (filename.endsWith('.md')) {
      for (const { value, line } of markdownMessages(code))
        onMessageExtracted({
          id: value,
          message: literalMessage(value),
          origin: [filename, line],
          comment: 'Markdown. Preserve links, inline code and table/list syntax.',
        });
      return;
    }
    const source = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 't' &&
        node.arguments[0] &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        const message = node.arguments[0].text;
        onMessageExtracted({ id: message, message, origin: [filename, line + 1] });
      }
      if (
        (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
        node.tagName.getText(source) === 'Trans'
      ) {
        const id = node.attributes.properties.find(
          (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'id',
        );
        if (id && ts.isJsxAttribute(id) && id.initializer && ts.isStringLiteral(id.initializer)) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          const message = id.initializer.text;
          onMessageExtracted({ id: message, message, origin: [filename, line + 1] });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  },
};
