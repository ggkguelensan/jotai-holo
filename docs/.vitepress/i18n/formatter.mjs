import { formatter } from '@lingui/format-po';
import { literalMessage, unliteralMessage } from './markdown.mjs';

const po = formatter({ lineNumbers: false });
const markdown = (filename) => /[/\\]docs\.po$/.test(filename);
const mapCatalog = (catalog, transform) =>
  Object.fromEntries(
    Object.entries(catalog).map(([id, entry]) => [
      id,
      {
        ...entry,
        ...(entry.message ? { message: transform(entry.message) } : {}),
        ...(entry.translation ? { translation: transform(entry.translation) } : {}),
      },
    ]),
  );

/** Markdown is literal prose/code, while the UI catalog retains full ICU plural/interpolation support. */
export const catalogFormatter = {
  ...po,
  parse(content, ctx) {
    const catalog = po.parse(content, ctx);
    return markdown(ctx.filename) ? mapCatalog(catalog, literalMessage) : catalog;
  },
  serialize(catalog, ctx) {
    return po.serialize(
      markdown(ctx.filename) ? mapCatalog(catalog, unliteralMessage) : catalog,
      ctx,
    );
  },
};
