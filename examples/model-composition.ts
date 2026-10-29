import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import {
  modelConnection,
  modelRegistry,
  pipe,
  type ModelSource,
} from 'jotai-holo/model';

// #region factory
type DownloadStatus = 'queued' | 'downloading' | 'installed';
type DownloadInput = { downloadId: string };

export function createDownloadModel(initial: DownloadInput) {
  const $status = stateAtom<DownloadStatus>('queued');

  const statusReceived = actionAtom((_get, set, status: DownloadStatus) =>
    set($status, status),
  );

  return { $status, statusReceived };
}
// #endregion factory

// #region extend
export function createDownloadSummary(initial: DownloadInput) {
  const $$download = createDownloadModel(initial);

  const $canCancel = stateAtom((get) => {
    const status = get($$download.$status);
    return status === 'queued' || status === 'downloading';
  });

  return { ...$$download, $canCancel };
}
// #endregion extend

// #region modifier
type Download = ReturnType<typeof createDownloadModel>;
type DownloadFeed = {
  // The disposer stops observation; the download continues in its service.
  subscribe(id: string, receive: (status: DownloadStatus) => void): () => void;
};

export function modelDownloadFeed(feed: DownloadFeed) {
  return <Model extends Download, Initial extends DownloadInput>(
    source: ModelSource<Model, Initial>,
  ) =>
    pipe(
      source,
      modelConnection(($$download, { store, initial }) =>
        feed.subscribe(initial.downloadId, (status) => {
          store.set($$download.statusReceived, status);
        }),
      ),
    );
}
// #endregion modifier

// #region composition
export function createDownloadDefinition(feed: DownloadFeed) {
  return pipe(createDownloadModel, modelRegistry(), modelDownloadFeed(feed));
}
// #endregion composition
