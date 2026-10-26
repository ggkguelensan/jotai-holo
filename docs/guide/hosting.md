# Hosting the docs

## Local development

Documentation tooling requires Node 22.19+ for Lingui. This does not change the published library's runtime requirements.

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
pnpm docs:check
pnpm docs:build
pnpm docs:preview
# Requires Chromium: pnpm exec playwright install chromium
pnpm test:docs
```

VitePress generates a static site in `docs/.vitepress/dist`. Upload that directory to any static host. The library runtime does not depend on VitePress. The default base is `/` for a site at the domain root.

## GitHub Pages

Build a project site with its path prefix:

```sh
DOCS_BASE=/jotai-holo/ pnpm docs:build
```

In Settings → Pages, select GitHub Actions. Once the documentation is on the default branch, manually run the **Documentation** workflow. It checks translations and code snippets, builds with the repository base, and deploys the Pages artifact. Creating these files publishes nothing by itself; the workflow has no push trigger. A maintainer can add one for automatic deployment after merge.

## Maintenance

Add English reference pages in `docs/reference`. Maintain translations in the Lingui PO catalogs under `docs/.vitepress/i18n/locales/{locale}`. Localized Markdown and compiled catalogs are generated; do not edit them. Code snippets come from checked example sources. API pages explain purpose, contract, motivation and reading. Engineering reports remain in English and are labeled accordingly.

After editing English text, run `pnpm i18n:extract`, translate the `msgstr` entries in each PO catalog, then run `pnpm docs:check`. Development and production commands prepare catalogs and pages automatically on startup; rerun `pnpm docs:prepare` after editing translations during a running dev session. Strict compilation rejects missing translations. Keep Markdown links, inline code and list structure intact; shared code blocks are excluded from translation.

`docs:check` validates translation parity, required API sections, internal link paths and snippet regions. `docs:build` additionally validates VitePress links and builds the search index. TypeScript and tests exercise the executable example source. External website availability depends on the network and is not part of local builds.

English edit links point to Markdown sources; translated edit links point to their Lingui PO catalog. Source links use the documentation branch until it is merged.

Reading: [VitePress deployment](https://vitepress.dev/guide/deploy), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-github-actions-to-create-a-github-pages-site).

Live examples use React and the actual jotai-holo implementation. The Vue shell mounts them only on the client and unmounts on page changes. Each example has an isolated store. `pnpm test:docs` exercises interactions, disposal, Bunshi scopes and navigation. Site dependencies do not enter the library runtime.
