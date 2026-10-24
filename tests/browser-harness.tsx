import { afterEach, beforeEach } from 'vitest';
import { act, Component, startTransition, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

export function deferred<Value>() {
  let resolve: (value: Value | PromiseLike<Value>) => void = () => {
    throw new Error('not initialized');
  };
  let reject: (reason: unknown) => void = () => {
    throw new Error('not initialized');
  };
  const promise = new Promise<Value>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const disposers: (() => Promise<void>)[] = [];
beforeEach(() => {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
});
afterEach(async () => {
  for (const dispose of disposers.splice(0)) await dispose();
  Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
});

export function createHarness() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const caught: unknown[] = [];
  const root = createRoot(container, {
    onCaughtError(error) {
      caught.push(error);
    },
  });
  let mounted = true;
  async function render(node: ReactNode) {
    await act(async () => root.render(node));
  }
  async function transition(node: ReactNode) {
    await act(async () => startTransition(() => root.render(node)));
  }
  async function unmount() {
    if (!mounted) return;
    mounted = false;
    await act(async () => root.unmount());
    container.remove();
  }
  disposers.push(unmount);
  return { container, render, transition, unmount, caught };
}

export function suspense(node: ReactNode) {
  return <Suspense fallback={<b data-loading>loading</b>}>{node}</Suspense>;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <b data-error>error</b> : this.props.children;
  }
}
