import { createStore, Provider } from 'jotai';
import { act } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import FocusDemo from '../examples/docs/imperative-focus.js';
import AnimationDemo from '../examples/docs/imperative-animation.js';
import { ShareGame } from '../examples/docs/imperative-share.js';
import { createHarness } from './browser-harness.js';

vi.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (parts: TemplateStringsArray) => parts.join('') }),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('a connected toolbar focuses the search field on every request', async () => {
  const h = createHarness();
  await h.render(
    <Provider store={createStore()}>
      <FocusDemo />
    </Provider>,
  );
  const button = h.container.querySelector('button')!;
  const input = h.container.querySelector('input')!;
  for (let index = 0; index < 2; index++) {
    await act(async () => {
      button.focus();
      button.click();
    });
    expect(document.activeElement).toBe(input);
  }
});

test('a cart request restarts its animation and respects reduced motion', async () => {
  const h = createHarness();
  let reduced = false;
  vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: reduced }) as MediaQueryList);
  await h.render(
    <Provider store={createStore()}>
      <AnimationDemo />
    </Provider>,
  );
  const output = h.container.querySelector('output')!;
  const animate = vi.spyOn(output, 'animate');
  const button = h.container.querySelector('button')!;
  await act(async () => button.click());
  const first = animate.mock.results[0]!.value;
  await act(async () => button.click());
  expect(first.playState).toBe('idle');
  expect(animate).toHaveBeenCalledTimes(2);
  reduced = true;
  await act(async () => button.click());
  expect(animate).toHaveBeenCalledTimes(2);
});

test('Reactuse share runs during the click and reads the latest committed props', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share });
  const h = createHarness();
  const store = createStore();
  const render = (title: string) =>
    h.render(
      <Provider store={store}>
        <ShareGame title={title} url={`https://example.com/games/${title}`} />
      </Provider>,
    );
  await render('starfall');
  await act(async () => {
    h.container.querySelector('button')!.click();
    expect(share).toHaveBeenCalledWith({
      title: 'starfall',
      url: 'https://example.com/games/starfall',
    });
  });
  await render('moon-harbor');
  await act(async () => h.container.querySelector('button')!.click());
  expect(share).toHaveBeenLastCalledWith({
    title: 'moon-harbor',
    url: 'https://example.com/games/moon-harbor',
  });
  share.mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'));
  const report = vi.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () => h.container.querySelector('button')!.click());
  expect(report).not.toHaveBeenCalled();
  const failure = new Error('Share rejected');
  share.mockRejectedValueOnce(failure);
  await act(async () => h.container.querySelector('button')!.click());
  expect(report).toHaveBeenCalledWith(failure);
});

test('sharing is disabled on unsupported platforms', async () => {
  vi.stubGlobal('navigator', {});
  const h = createHarness();
  await h.render(<ShareGame title="Starfall" url="https://example.com/games/starfall" />);
  expect(h.container.querySelector('button')!.disabled).toBe(true);
});
