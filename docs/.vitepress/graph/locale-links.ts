/** VitePress locale links omit query parameters; keep the selected graph context. */
export function preserveGraphLocaleLinks() {
  const patched = new Map<HTMLAnchorElement, { before: string; after: string }>();
  const patch = (event: Event) => {
    const link =
      event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!link) return;
    const current = new URL(window.location.href),
      next = new URL(link.href);
    if (
      next.origin !== current.origin ||
      !next.pathname.replace(/\/$/, '').endsWith('/examples/graph') ||
      next.pathname === current.pathname
    )
      return;
    if (next.search && !patched.has(link)) return;
    const before = patched.get(link)?.before ?? link.getAttribute('href')!;
    next.search = current.search;
    const after = next.pathname + next.search + next.hash;
    link.setAttribute('href', after);
    patched.set(link, { before, after });
  };
  for (const event of ['pointerover', 'focusin', 'click'])
    document.addEventListener(event, patch, true);
  return () => {
    for (const event of ['pointerover', 'focusin', 'click'])
      document.removeEventListener(event, patch, true);
    for (const [link, { before, after }] of patched)
      if (link.getAttribute('href') === after) link.setAttribute('href', before);
  };
}
