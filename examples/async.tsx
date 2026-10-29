import { Suspense } from 'react';
import { atom } from 'jotai';
import { holo, actionAtom, stateAtom } from 'jotai-holo';

const $version = stateAtom(1);

// This delay demonstrates native Promise cancellation, not a server request.
// Use the native atom for Jotai's AbortSignal options.
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
  return `Loaded version ${version}`;
});

const refresh = actionAtom((_get, set) => {
  set($version, (v) => v + 1);
});

function RefreshView({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick}>Refresh async state</button>;
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
      <h2>Async + Suspense</h2>
      <Refresh />
      <Suspense fallback={<p>Loading…</p>}>
        <Result />
      </Suspense>
    </section>
  );
}
