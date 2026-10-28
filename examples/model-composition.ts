import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import {
  modelConnection,
  modelRegistry,
  pipe,
  type ModelSource,
} from 'jotai-holo/model';

// #region factory
type ShipmentStatus = 'preparing' | 'in-transit' | 'delivered';
type ShipmentInput = { shipmentId: string };

export function createShipmentModel(initial: ShipmentInput) {
  const $status = stateAtom<ShipmentStatus>('preparing');

  const statusReceived = actionAtom((_get, set, status: ShipmentStatus) =>
    set($status, status),
  );

  return { $status, statusReceived };
}
// #endregion factory

// #region extend
export function createShipmentSummary(initial: ShipmentInput) {
  const $$shipment = createShipmentModel(initial);

  const $canCancel = stateAtom(
    (get) => get($$shipment.$status) === 'preparing',
  );

  return { ...$$shipment, $canCancel };
}
// #endregion extend

// #region modifier
type Shipment = ReturnType<typeof createShipmentModel>;
type TrackingFeed = {
  subscribe(id: string, receive: (status: ShipmentStatus) => void): () => void;
};

export function modelTrackingFeed(feed: TrackingFeed) {
  return <Model extends Shipment, Initial extends ShipmentInput>(
    source: ModelSource<Model, Initial>,
  ) =>
    pipe(
      source,
      modelConnection((shipment, { store, initial }) =>
        feed.subscribe(initial.shipmentId, (status) => {
          store.set(shipment.statusReceived, status);
        }),
      ),
    );
}
// #endregion modifier

// #region composition
export function createShipmentDefinition(feed: TrackingFeed) {
  return pipe(createShipmentModel, modelRegistry(), modelTrackingFeed(feed));
}
// #endregion composition
