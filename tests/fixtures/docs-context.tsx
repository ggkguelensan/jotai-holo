/** Typed application dependencies omitted from short Markdown examples.
 * The checker imports only names used by a snippet; it never executes this file.
 * Library helpers and example factories use their actual implementations.
 */
import { atom, createStore } from 'jotai/vanilla';
import { createFormControl } from 'react-hook-form';
import { actionAtom, eventAtom, stateAtom, bond } from '../../src/vanilla.js';
import { modelRegistry, pipe } from '../../src/model.js';
import { createMutationModel } from '../../src/query.js';
import { createShipmentDefinition as defineShipment } from '../../examples/model-composition.js';
import { createFormModel } from '../../src/rhf.js';
export { createSearchModel } from '../../examples/analytics/search-model.js';
export { createSearchAnalyticsModel } from '../../examples/analytics/search.analytics.js';
export {
  createShipmentModel,
  createShipmentDefinition,
  modelTrackingFeed,
} from '../../examples/model-composition.js';

export type User = {
  id: string;
  name: string;
  age: number;
  profile: { bio: string };
};
export const $user = atom<User>({ id: '42', name: 'Ada', age: 35, profile: { bio: '' } });
export const $asyncUser = atom(Promise.resolve({ id: '42', name: 'Ada' }));
export const $count = atom(0);
export const $type = atom<'eq' | 'double'>('eq');
export const $status = atom<'loading' | 'ready' | 'error'>('ready');
export const $left = atom(1);
export const $right = atom(2);
export const $userId = atom('42');
export const $draft = atom({ name: 'Ada', email: 'ada@example.com' });
export const $canSave = atom(true);
export const $valid = atom(true);
export const $allowed = atom(true);
export const $isOwner = atom(true);
export const $isAdmin = atom(false);
export const $first = atom({ available: true });
export const $second = atom({ available: false });
export const $items = atom([{ available: true }]);
export const $goods = atom(100);
export const $delivery = atom(20);
export const $tax = atom(10);
export const $prices = atom<readonly number[]>([100, 20]);
export const $users = atom<readonly User[]>([]);
export const $loading = atom(false);
export const $error = atom<Error | null>(null);
export const $message = atom('');
export const $localState = atom('');
export const $remoteState = atom('');
export const $name = atom('Ada');
export const changeName = actionAtom((_get, set, name: string) => set($name, name));
export const saveRequested = eventAtom<boolean>();
export const amountRequested = eventAtom<number>();
export const increment = actionAtom((_get, set, amount: number) => set($count, (n) => n + amount));
export const saveUser = actionAtom(
  (
    _get,
    _set,
    input: {
      id: string;
      draft: { name: string; email: string };
      notify: boolean;
    },
  ) => input,
);
const savePort = actionAtom(
  (
    _get,
    _set,
    input: {
      draft: { name: string; email: string };
      notify: boolean;
    },
  ) => input,
);
export const $savePort = atom(savePort);
export const store = createStore();
export const reportError = (_error: unknown) => {};
export const reportProfileError = reportError;
export const notifying = bond({ trigger: eventAtom<string>(), write: $message });
export const userSelected = eventAtom<string>();
export declare function fetchUser(): Promise<User>;

export function CounterView(_props: {
  count: number;
  title: string;
  onChange: (count: number) => void;
}) {
  return null;
}
export function CounterIncrementView(_props: { count: number; onIncrement: () => void }) {
  return null;
}
export function CounterReadView(_props: { count: number }) {
  return null;
}
export function NameView(_props: {
  name: string;
  title: string;
  onChange: (name: string) => void;
}) {
  return null;
}
export function UserView(_props: { user: User; title: string; onSelect: (id: string) => void }) {
  return null;
}
export function EmptyUsersView() {
  return null;
}
export function LoadingView() {
  return null;
}
export function UsersError() {
  return null;
}
export function UsersList() {
  return null;
}
export function ShipmentView(_props: { status: 'preparing' | 'in-transit' | 'delivered' }) {
  return null;
}
export declare const trackingFeed: Parameters<
  typeof import('../../examples/model-composition.js').createShipmentDefinition
>[0];
export const $$shipment = defineShipment(trackingFeed);
export const $$base = pipe(() => ({ $count }), modelRegistry());
export const $$counter = pipe(
  () => ({ $count, increment: actionAtom((_get, set) => set($count, (n) => n + 1)) }),
  modelRegistry(),
);
export const $$session = pipe(() => ({}), modelRegistry());

export function createProfileModel(initial: { profileId: string }) {
  const $draft = stateAtom({ name: '', email: '' });
  const loaded = actionAtom((_get, set, draft: { name: string; email: string }) =>
    set($draft, draft),
  );
  return { $draft, loaded };
}
export declare const loadSearchAnalytics: () => Promise<
  typeof import('../../examples/analytics/search.analytics.js').createSearchAnalyticsModel
>;
export type ProposalInput = { proposalId: string; discount: number; comment: string };
export type Proposal = ProposalInput & { approved: boolean };
export const proposalSaved = eventAtom<Proposal>();
export const $$proposalMutation = createMutationModel({
  mutation: () => ({
    mutationFn: async (input: ProposalInput): Promise<Proposal> => ({ ...input, approved: true }),
  }),
});

export const form = createFormControl({
  defaultValues: { email: '', address: { city: '' } },
});
export const $$contact = pipe(
  createFormModel({ initial: { email: '' }, options: (initial) => ({ defaultValues: initial }) }),
  modelRegistry(),
);
export function ContactView() {
  return null;
}
