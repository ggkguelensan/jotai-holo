import business from './business.ts?raw';
import runtime from './runtime.tsx?raw';
import analytics from './analytics.ts?raw';
import views from './views.tsx?raw';

export const sources = {
  'business.ts': business,
  'runtime.tsx': runtime,
  'analytics.ts': analytics,
  'views.tsx': views,
};
export type SourceFile = keyof typeof sources;
export type Kind = 'react' | 'holo' | 'atom';
export type GraphNode = {
  id: string;
  kind: Kind;
  label: string;
  description: string;
  group?: string;
  file: SourceFile;
  anchor: string;
};
export type Group = {
  id: string;
  name: string;
  tag: string;
  description: string;
  file: SourceFile;
  anchor: string;
  lazy?: boolean;
};
export const groups: Group[] = [
  {
    id: 'query',
    name: '$$gameQuery',
    tag: 'QUERY',
    description: 'QueryClient хранит серверные данные. Атом даёт к ним реактивный доступ.',
    file: 'runtime.tsx',
    anchor: 'const $$gameQuery',
  },
  {
    id: 'gift',
    name: '$$gift',
    tag: 'REGISTRY',
    description:
      'Один экземпляр в store: key = ["gift", "starfall"]. Summary, Copies и Receipt используют его совместно.',
    file: 'runtime.tsx',
    anchor: 'const $$gift = pipe',
  },
  {
    id: 'form',
    name: '$$giftForm',
    tag: 'RHF',
    description:
      'Один RHF control, key = ["gift", "starfall"]. $email читает поле формы без второго хранилища.',
    file: 'runtime.tsx',
    anchor: 'const $$giftForm',
  },
  {
    id: 'mutation',
    name: '$$purchaseMutation',
    tag: 'MUTATION',
    description:
      'TanStack Mutation выполняет запрос и хранит pending. Факт покупки публикуется только после await.',
    file: 'runtime.tsx',
    anchor: 'const $$purchaseMutation',
  },
  {
    id: 'analytics',
    name: '$$giftAnalytics',
    tag: 'LAZY',
    description:
      'Динамический импорт добавляет потребителя факта. Бизнес-модель не импортирует SDK аналитики.',
    file: 'analytics.ts',
    anchor: 'export function',
    lazy: true,
  },
];
export const nodes: GraphNode[] = [
  {
    id: 'query',
    kind: 'atom',
    label: '$result',
    description: 'Результат TanStack Query. На схеме показана проекция данных, не отдельный кэш.',
    group: 'query',
    file: 'runtime.tsx',
    anchor: 'const $$gameQuery',
  },
  {
    id: 'data',
    kind: 'atom',
    label: '$game',
    description: 'Нативные данные Query → вход бизнес-модели через modelConnection.',
    group: 'query',
    file: 'runtime.tsx',
    anchor: 'prism: { $game',
  },
  {
    id: 'game',
    kind: 'atom',
    label: '$game',
    description: 'Игра внутри экземпляра подарка. Модель не знает источник её загрузки.',
    group: 'gift',
    file: 'business.ts',
    anchor: 'const $game',
  },
  {
    id: 'copies',
    kind: 'atom',
    label: '$copies',
    description: 'Локальное состояние экземпляра. Изменение пересчитывает $total.',
    group: 'gift',
    file: 'business.ts',
    anchor: 'const $copies',
  },
  {
    id: 'total',
    kind: 'atom',
    label: '$total',
    description: 'Вычисление ion: цена × количество. Его читает только Summary.',
    group: 'gift',
    file: 'business.ts',
    anchor: 'const $total',
  },
  {
    id: 'receipt',
    kind: 'atom',
    label: '$receipt',
    description: 'Последний полученный чек. ReceiptView читает его отдельно от остальных View.',
    group: 'gift',
    file: 'business.ts',
    anchor: 'const $receipt',
  },
  {
    id: 'fact',
    kind: 'atom',
    label: 'purchaseCompleted',
    description:
      'Факт успешной покупки со снимком суммы и номера заказа. Это событие, а не состояние.',
    group: 'gift',
    file: 'business.ts',
    anchor: 'const purchaseCompleted',
  },
  {
    id: 'complete',
    kind: 'atom',
    label: 'complete',
    description: 'Команда принимает успешный ответ и публикует доменный факт.',
    group: 'gift',
    file: 'business.ts',
    anchor: 'const complete',
  },
  {
    id: 'control',
    kind: 'atom',
    label: 'form.control',
    description: 'RHF владеет значением поля и его состоянием. Это control, не Jotai atom.',
    group: 'form',
    file: 'runtime.tsx',
    anchor: 'options: initial',
  },
  {
    id: 'email',
    kind: 'atom',
    label: '$email',
    description:
      'formAtom — реактивный доступ к email. Команда покупки читает его в момент вызова.',
    group: 'form',
    file: 'runtime.tsx',
    anchor: 'model: ({ form })',
  },
  {
    id: 'buy',
    kind: 'atom',
    label: 'buy',
    description:
      'Сборочная команда: читает сумму и email, вызывает мутацию и передаёт успешный ответ модели.',
    file: 'runtime.tsx',
    anchor: 'const buy = actionAtom',
  },
  {
    id: 'mutate',
    kind: 'atom',
    label: 'mutate',
    description: 'Команда createMutationModel. Возвращает Promise результата TanStack Mutation.',
    group: 'mutation',
    file: 'runtime.tsx',
    anchor: 'const receipt = await',
  },
  {
    id: 'pending',
    kind: 'atom',
    label: '$pending',
    description: 'Проекция isPending из нативного результата мутации. Кнопка подписана на неё.',
    group: 'mutation',
    file: 'runtime.tsx',
    anchor: 'prism: { $pending',
  },
  {
    id: 'mapping',
    kind: 'atom',
    label: 'purchaseCompleted',
    description: 'Подписка analytics.event: один факт превращается в разные сообщения движков.',
    group: 'analytics',
    file: 'analytics.ts',
    anchor: 'const purchaseCompleted',
  },
  {
    id: 'amplitude',
    kind: 'atom',
    label: 'Amplitude adapter',
    description: 'Демо-адаптер получает Gift purchased: game и revenue. Это ресурс, не атом.',
    group: 'analytics',
    file: 'analytics.ts',
    anchor: 'amplitude: fact',
  },
  {
    id: 'warehouse',
    kind: 'atom',
    label: 'Warehouse adapter',
    description: 'Демо-адаптер получает total_cents = total × 100. Доменный факт остаётся прежним.',
    group: 'analytics',
    file: 'analytics.ts',
    anchor: 'warehouse: fact',
  },
  {
    id: 'parent',
    kind: 'react',
    label: 'Checkout',
    description: 'Parent собирает подключённые компоненты. Не читает их реактивные значения.',
    file: 'runtime.tsx',
    anchor: 'function Checkout',
  },
  {
    id: 'hSummary',
    kind: 'holo',
    label: 'holo · Summary',
    description:
      'read превращает $game и $total в обычные props. Выбор модели — один и тот же key.',
    file: 'runtime.tsx',
    anchor: 'const Summary = holo',
  },
  {
    id: 'vSummary',
    kind: 'react',
    label: 'SummaryView',
    description: 'View рисует название и сумму. В ней нет загрузки данных и логики покупки.',
    file: 'views.tsx',
    anchor: 'export function SummaryView',
  },
  {
    id: 'hCopies',
    kind: 'holo',
    label: 'holo · Copies',
    description: 'read → число, write → callback. Кнопки пишут в $copies общего экземпляра.',
    file: 'runtime.tsx',
    anchor: 'const Copies = holo',
  },
  {
    id: 'vCopies',
    kind: 'react',
    label: 'CopiesView',
    description: 'Небольшой stepper. Обычные props: copies и onChange.',
    file: 'views.tsx',
    anchor: 'export function CopiesView',
  },
  {
    id: 'hBuy',
    kind: 'holo',
    label: 'holo · Buy',
    description: 'write связывает кнопку с buy, read подписывает её на pending.',
    file: 'runtime.tsx',
    anchor: 'const Buy = holo',
  },
  {
    id: 'vBuy',
    kind: 'react',
    label: 'BuyView',
    description: 'Кнопка покупки. Блокируется во время запроса; ошибку получает через props.',
    file: 'views.tsx',
    anchor: 'export function BuyView',
  },
  {
    id: 'hForm',
    kind: 'holo',
    label: 'holoForm · Email',
    description: 'Подключает модель формы и передаёт её control в FormProvider.',
    file: 'runtime.tsx',
    anchor: 'const Email = holoForm',
  },
  {
    id: 'vEmail',
    kind: 'react',
    label: 'EmailView',
    description: 'Нативный RHF register. Данные поля принадлежат форме.',
    file: 'views.tsx',
    anchor: 'export function EmailView',
  },
  {
    id: 'hReceipt',
    kind: 'holo',
    label: 'holo · Receipt',
    description: 'Третий владелец того же registry-экземпляра. Читает только $receipt.',
    file: 'runtime.tsx',
    anchor: 'const Receipt = holo',
  },
  {
    id: 'vReceipt',
    kind: 'react',
    label: 'ReceiptView',
    description: 'Получает чек через read. Motion анимирует появление результата внутри View.',
    file: 'views.tsx',
    anchor: 'export function ReceiptView',
  },
];
export type Edge = {
  from: string;
  to: string;
  type: 'data' | 'write' | 'props' | 'fact' | 'owner';
};
export const edges: Edge[] = [
  ['query', 'data', 'data'],
  ['data', 'game', 'write'],
  ['game', 'total', 'data'],
  ['copies', 'total', 'data'],
  ['control', 'email', 'data'],
  ['email', 'buy', 'data'],
  ['total', 'buy', 'data'],
  ['buy', 'mutate', 'write'],
  ['mutate', 'pending', 'data'],
  ['mutate', 'complete', 'write'],
  ['complete', 'receipt', 'write'],
  ['complete', 'fact', 'fact'],
  ['fact', 'mapping', 'fact'],
  ['mapping', 'amplitude', 'data'],
  ['mapping', 'warehouse', 'data'],
  ['game', 'hSummary', 'data'],
  ['total', 'hSummary', 'data'],
  ['copies', 'hCopies', 'data'],
  ['hCopies', 'copies', 'write'],
  ['vCopies', 'hCopies', 'write'],
  ['vBuy', 'hBuy', 'write'],
  ['hBuy', 'buy', 'write'],
  ['pending', 'hBuy', 'data'],
  ['control', 'hForm', 'owner'],
  ['receipt', 'hReceipt', 'data'],
  ['parent', 'hSummary', 'props'],
  ['parent', 'hCopies', 'props'],
  ['parent', 'hBuy', 'props'],
  ['parent', 'hForm', 'props'],
  ['parent', 'hReceipt', 'props'],
  ['hSummary', 'vSummary', 'props'],
  ['hCopies', 'vCopies', 'props'],
  ['hBuy', 'vBuy', 'props'],
  ['hForm', 'vEmail', 'props'],
  ['hReceipt', 'vReceipt', 'props'],
].map(([from, to, type]) => ({ from: from!, to: to!, type: type as Edge['type'] }));
export type Layout = {
  width: number;
  height: number;
  positions: Record<string, [number, number]>;
  bounds: Record<string, [number, number, number, number]>;
  curved?: boolean;
};
export const flow: Layout = {
  width: 1040,
  height: 650,
  bounds: {
    query: [35, 45, 180, 125],
    gift: [300, 45, 330, 215],
    form: [35, 250, 180, 120],
    mutation: [745, 45, 255, 125],
    analytics: [745, 240, 255, 150],
  },
  positions: {
    query: [80, 120],
    data: [165, 120],
    game: [350, 115],
    copies: [455, 115],
    total: [565, 115],
    complete: [350, 215],
    receipt: [455, 215],
    fact: [565, 215],
    control: [80, 325],
    email: [165, 325],
    buy: [670, 195],
    mutate: [800, 120],
    pending: [945, 120],
    mapping: [800, 320],
    amplitude: [945, 290],
    warehouse: [945, 355],
    parent: [75, 535],
    hSummary: [290, 435],
    vSummary: [440, 435],
    hCopies: [290, 535],
    vCopies: [440, 535],
    hBuy: [720, 435],
    vBuy: [905, 435],
    hForm: [290, 600],
    vEmail: [440, 600],
    hReceipt: [720, 550],
    vReceipt: [905, 550],
  },
};
export const constellation: Layout = {
  width: 1040,
  height: 700,
  curved: true,
  bounds: {
    gift: [335, 80, 350, 235],
    query: [45, 50, 225, 145],
    form: [45, 295, 205, 135],
    mutation: [775, 70, 225, 145],
    analytics: [760, 345, 250, 175],
  },
  positions: {
    game: [390, 155],
    copies: [505, 130],
    total: [620, 155],
    complete: [390, 250],
    receipt: [505, 265],
    fact: [620, 250],
    query: [100, 130],
    data: [215, 130],
    control: [95, 370],
    email: [200, 370],
    buy: [720, 285],
    mutate: [825, 160],
    pending: [950, 130],
    mapping: [815, 440],
    amplitude: [955, 410],
    warehouse: [955, 485],
    parent: [520, 650],
    hSummary: [335, 400],
    vSummary: [270, 475],
    hCopies: [495, 385],
    vCopies: [465, 510],
    hBuy: [650, 385],
    vBuy: [680, 515],
    hForm: [210, 550],
    vEmail: [105, 610],
    hReceipt: [795, 580],
    vReceipt: [900, 635],
  },
};
export const trace: Layout = {
  width: 1200,
  height: 530,
  bounds: {
    query: [25, 40, 160, 115],
    form: [25, 240, 160, 120],
    gift: [250, 40, 340, 230],
    mutation: [680, 40, 200, 115],
    analytics: [965, 40, 210, 230],
  },
  positions: {
    query: [65, 115],
    data: [145, 115],
    control: [65, 315],
    email: [145, 315],
    game: [295, 115],
    copies: [420, 115],
    total: [545, 115],
    complete: [295, 220],
    receipt: [420, 220],
    fact: [545, 220],
    buy: [635, 220],
    mutate: [725, 115],
    pending: [835, 115],
    mapping: [1010, 115],
    amplitude: [1120, 180],
    warehouse: [1120, 235],
    parent: [65, 455],
    hForm: [230, 385],
    vEmail: [230, 455],
    hCopies: [390, 385],
    vCopies: [390, 455],
    hSummary: [550, 385],
    vSummary: [550, 455],
    hBuy: [755, 385],
    vBuy: [755, 455],
    hReceipt: [950, 385],
    vReceipt: [950, 455],
  },
};
