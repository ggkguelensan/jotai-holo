import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { queryClientAtom } from 'jotai-holo/query';
import { ProposalEditor } from './proposal-model.js';

// #region setup
const client = new QueryClient();
const store = createStore();
store.set(queryClientAtom, client);

export function ProposalApp() {
  return (
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <ProposalEditor />
      </Provider>
    </QueryClientProvider>
  );
}
// #endregion setup
