import { Suspense } from 'react';
import { atom } from 'jotai';
import { holo, actionAtom, stateAtom } from 'jotai-holo';

const $version = stateAtom(1);

// A local delay simulates preparing a game-library preview.
// Jotai aborts obsolete reads; the handler clears their timers and rejects.
// The native atom exposes Jotai’s AbortSignal options.
const $result = atom(async (get, { signal }) => {
  const version = get($version);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 300);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
  return `Library preview revision ${version}`;
});

const refresh = actionAtom((_get, set) => {
  set($version, (v) => v + 1);
});

function RefreshView({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick}>Refresh library preview</button>;
}

function ResultView({ text }: { text: string }) {
  return <output>{text}</output>;
}

const Refresh = holo({
  view: RefreshView,
  write: { onClick: refresh },
});

const Result = holo({
  view: ResultView,
  read: { text: $result },
});

export function AsyncExample() {
  return (
    <section>
      <h2>Game library preview · Suspense</h2>
      <Refresh />
      <Suspense fallback={<p>Loading…</p>}>
        <Result />
      </Suspense>
    </section>
  );
}
