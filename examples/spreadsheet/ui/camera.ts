import { holo } from 'jotai-holo';
import { selectView } from '../workbook.js';
import { CameraView } from './views/camera-views.js';

export const Camera = holo({
  models: { view: selectView },
  view: CameraView,
  read: ({ view }) => ({ address: view.$selected }),
  write: ({ view }) => ({ onSelect: view.select, onMove: view.move }),
});
