# Hosting the docs

## Local development

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

Add reference pages in both `docs/reference` and `docs/ru/reference`. Code is included through snippet regions from `examples/documentation.tsx` and other checked examples. API pages explain purpose, contract, design motivation and external reading. Engineering reports remain in English and are labeled that way in navigation.

`docs:check` validates translation parity, required API sections, internal link paths and snippet regions. `docs:build` additionally validates VitePress links and builds the search index. TypeScript and tests exercise the executable example source. External website availability depends on the network and is not part of local builds.

Edit/source links currently target `docs/reference-site`; after merging, update the site config and links to `main`.

Reading: [VitePress deployment](https://vitepress.dev/guide/deploy), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-github-actions-to-create-a-github-pages-site).
