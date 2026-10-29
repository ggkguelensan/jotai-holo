import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { queryClientAtom } from 'jotai-holo/query';
import { GiftOrderEditor } from './gift-order-model.js';

// #region setup
const client = new QueryClient();
const store = createStore();
store.set(queryClientAtom, client);

export function GiftOrderApp() {
  return (
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <GiftOrderEditor />
      </Provider>
    </QueryClientProvider>
  );
}
// #endregion setup
