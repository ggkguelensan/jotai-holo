import { createRoot } from 'react-dom/client';
import { useAtomValue } from 'jotai';
import { MotionConfig } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createScenario, type Scenario } from './runtime';
import { initialSelection, Legend, type Selection } from './graph';
import { Constellation } from './constellation';
import { MiniPage } from './mini-page';
import './style.css';

export type VariantProps = {
  selected: Selection;
  onSelect: (s: Selection) => void;
  analytics: boolean;
  activity: string[];
  pulse: string;
};
function App() {
  const [mode, setMode] = useState(() =>
    new URLSearchParams(location.search).get('mode') === 'mini' ? 'mini' : 'map',
  );
  const [example, setExample] = useState(() => new URLSearchParams(location.search).get('example'));
  const [replay, setReplay] = useState(0);
  const changeMode = (next: string) => {
    setMode(next);
    setExample(null);
    const url = new URL(location.href);
    url.searchParams.delete('v');
    url.searchParams.delete('example');
    url.searchParams.set('mode', next);
    history.replaceState(null, '', url);
  };
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.23, ease: [0.23, 1, 0.32, 1] }}>
      <nav className="mode-nav" aria-label="Режим графа">
        <button
          aria-current={mode === 'map' ? 'page' : undefined}
          onClick={() => changeMode('map')}
        >
          Полная карта
        </button>
        <button
          aria-current={mode === 'mini' ? 'page' : undefined}
          onClick={() => changeMode('mini')}
        >
          Миниатюра
        </button>
        <button aria-label="Начать заново" onClick={() => setReplay((n) => n + 1)}>
          ↻
        </button>
      </nav>
      {mode === 'map' ? (
        example === 'atoms' ? (
          <MiniPage key={`atoms-${replay}`} full />
        ) : (
          <Experience key={`map-${replay}`} />
        )
      ) : (
        <MiniPage key={`mini-${replay}`} />
      )}
    </MotionConfig>
  );
}
function Experience() {
  const [scenario] = useState(createScenario);
  useEffect(() => () => scenario.dispose(), [scenario]);
  return (
    <scenario.Scope>
      <Scene scenario={scenario} />
    </scenario.Scope>
  );
}
function Scene({ scenario }: { scenario: Scenario }) {
  const [selected, onSelect] = useState<Selection>(initialSelection);
  const [enabled, setEnabled] = useState(false);
  const ready = useAtomValue(scenario.$analyticsReady);
  const logs = useAtomValue(scenario.$logs);
  const gift = useAtomValue(scenario.selection);
  const copies = useAtomValue(gift.$copies);
  const receipt = useAtomValue(gift.$receipt);
  const game = useAtomValue(scenario.$$gameQuery.$game);
  const pending = useAtomValue(scenario.$$purchaseMutation.$pending);
  const form = useAtomValue(scenario.formSelection);
  const email = useAtomValue(form.$email);
  // Prototype instrumentation observes changes; it is not business wiring.
  const previous = useRef({ copies, email, pending, receipt, game, logCount: logs.length });
  const [activity, setActivity] = useState<string[]>([]);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const last = previous.current;
    let next: { ids: string[] } | undefined;
    if (logs.length !== last.logCount)
      next = { ids: ['fact', 'mapping', 'amplitude', 'warehouse'] };
    else if (receipt !== last.receipt)
      next = { ids: ['mutate', 'complete', 'receipt', 'fact', 'hReceipt', 'vReceipt'] };
    else if (pending && !last.pending) next = { ids: ['vBuy', 'hBuy', 'buy', 'mutate', 'pending'] };
    else if (copies !== last.copies)
      next = { ids: ['vCopies', 'hCopies', 'copies', 'total', 'hSummary', 'vSummary'] };
    else if (email !== last.email) next = { ids: ['vEmail', 'hForm', 'control', 'email'] };
    else if (game !== last.game)
      next = { ids: ['query', 'data', 'game', 'total', 'hSummary', 'vSummary'] };
    previous.current = { copies, email, pending, receipt, game, logCount: logs.length };
    if (next) {
      setActivity(next.ids);
      setPulse((n) => n + 1);
    }
  }, [copies, email, pending, receipt, game, logs.length]);
  const analytics = enabled && ready;
  const Variant = Constellation;
  return (
    <main className="prototype constellation-prototype">
      <header className="page-header">
        <a href="?v=1" className="wordmark">
          <span aria-hidden="true">◉</span> holo <small>/ laboratory</small>
        </a>
        <span className="prototype-label">
          СОЗВЕЗДИЕ <b>ПОЛНАЯ КАРТА</b>
        </span>
      </header>
      <section className="intro">
        <div>
          <span className="eyebrow">МЕНТАЛЬНАЯ МОДЕЛЬ</span>
          <h1>Увидеть связи.</h1>
          <p>React собирает экран. holo связывает View с реактивным графом.</p>
        </div>
        <div className="intro-note">
          <span>ОДНА СИСТЕМА · ДВА МАСШТАБА</span>
          <p>
            Покупка подарка: данные, форма,
            <br />
            бизнес-правила и аналитика.
          </p>
        </div>
      </section>
      <div className="graph-toolbar">
        <Legend />
        <label className="analytics-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => {
              setEnabled(event.target.checked);
              if (
                !event.target.checked &&
                (('group' in selected && selected.group === 'analytics') ||
                  selected.id === 'analytics')
              )
                onSelect(initialSelection);
            }}
          />
          <span className="switch-track" aria-hidden="true" />
          <span>Ленивая аналитика</span>
          <small className={analytics ? 'connected' : ''}>
            {enabled ? (ready ? 'подключена' : 'импорт…') : 'отключена'}
          </small>
        </label>
      </div>
      <div className="test-driver">
        <div>
          <span className="eyebrow">ПУЛЬТ ПРИМЕРА</span>
          <span aria-live="polite">
            {pending
              ? 'Mutation · запрос выполняется'
              : receipt
                ? `Последний чек ${receipt.orderId}`
                : game
                  ? 'Измени значение и проследи связи'
                  : 'Query · загружаем игру'}
          </span>
        </div>
        <div className="driver-controls">
          <scenario.Controls />
        </div>
      </div>
      <Variant
        selected={selected}
        onSelect={onSelect}
        analytics={analytics}
        activity={activity}
        pulse={String(pulse)}
      />
      {enabled && <scenario.AnalyticsOwner />}
      <section className="live-lab">
        <div className="live-heading">
          <span className="eyebrow">
            <i className="live-dot" />
            ЖИВОЙ СЦЕНАРИЙ
          </span>
          <h2>Измени количество. Купи подарок. Найди путь в графе.</h2>
          <p>
            Данные и покупка имитируются локально. Jotai, holo, RHF и TanStack работают
            по-настоящему.
          </p>
        </div>
        <div className="live-grid">
          <scenario.Checkout />
          <section className="log-panel" aria-label="Логи аналитики">
            <header>
              <span>
                <i className={analytics ? 'live-dot' : 'offline-dot'} />
                Выход аналитики
              </span>
              <small>{logs.length} сообщений</small>
            </header>
            <div className="logs" aria-live="polite">
              {!logs.length ? (
                <div className="empty-logs">
                  <span>⌁</span>
                  <strong>
                    {analytics
                      ? 'Ждём успешную покупку'
                      : enabled
                        ? 'Загружаем модуль…'
                        : 'Наблюдение отключено'}
                  </strong>
                  <p>
                    {analytics
                      ? 'Один факт → разные поля в двух движках.'
                      : 'Включи аналитику перед покупкой, чтобы увидеть сообщения.'}
                  </p>
                </div>
              ) : (
                logs.map((log) => (
                  <article key={log.id}>
                    <span className="log-index">{String(log.id).padStart(2, '0')}</span>
                    <div>
                      <span className={`engine ${log.engine === 'Amplitude' ? 'engine-a' : ''}`}>
                        {log.engine}
                      </span>
                      <strong>{log.name}</strong>
                      <code>{JSON.stringify(log.properties, null, 2)}</code>
                    </div>
                  </article>
                ))
              )}
            </div>
            <footer>Демо-адаптеры · без SDK и отправки данных</footer>
          </section>
        </div>
      </section>
      <footer className="page-foot">
        <p>
          Схема описана вручную и связана с исходником этого примера. Это прототип визуализации, не
          автоматический devtools.
        </p>
        <p>
          Наблюдение аналитики начинается после загрузки фабрики. Предыдущие покупки не
          воспроизводятся.
        </p>
        <span>
          <kbd>Tab</kbd> узлы <b>·</b> <kbd>Enter</kbd> закрепить <b>·</b> <kbd>Esc</kbd> открепить
        </span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
