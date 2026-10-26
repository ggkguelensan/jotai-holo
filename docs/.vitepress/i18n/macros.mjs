import { transformAsync } from '@babel/core';
import linguiMacro from '@lingui/babel-plugin-lingui-macro';

/** Compile the official React macros before Vite lowers TSX. */
export function transformMacros(code, filename) {
  return transformAsync(code, {
    filename,
    babelrc: false,
    configFile: false,
    sourceMaps: true,
    parserOpts: { plugins: ['typescript', 'jsx'] },
    plugins: [linguiMacro],
  });
}

export function linguiMacros() {
  return {
    name: 'docs-lingui-macros',
    enforce: 'pre',
    async transform(code, id) {
      const filename = id.split('?')[0];
      if (!filename.endsWith('.tsx') || !filename.replaceAll('\\', '/').includes('/examples/docs/'))
        return;
      const result = await transformMacros(code, filename);
      return result && { code: result.code, map: result.map };
    },
  };
}
