import { createRoot } from 'react-dom/client';
import { useAtomValue } from 'jotai';
import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createScenario, type Scenario } from './runtime';
import { initialSelection, Legend, type Selection } from './graph';
import { Flow } from './flow';
import { Constellation } from './constellation';
import { Trace } from './trace';
import './style.css';
import './picker.css';

export type VariantProps = {
  selected: Selection;
  onSelect: (s: Selection) => void;
  analytics: boolean;
  activity: string[];
  pulse: string;
  phase: number;
};
const names = ['Поток', 'Созвездие', 'Трасса'];
const variants = [Flow, Constellation, Trace];
function App() {
  const [variant, setVariant] = useState(() =>
    Math.min(2, Math.max(0, (Number(new URLSearchParams(location.search).get('v')) || 1) - 1)),
  );
  const [replay, setReplay] = useState(0);
  const picker = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const set = useCallback((index: number) => {
    setVariant(index);
    setReplay((n) => n + 1);
    const url = new URL(location.href);
    url.searchParams.set('v', String(index + 1));
    history.replaceState(null, '', url);
  }, []);
  useLayoutEffect(() => {
    const measure = () => {
      const button = picker.current?.querySelector<HTMLElement>('[data-active]');
      if (button && highlight.current) {
        highlight.current.style.width = `${button.offsetWidth}px`;
        highlight.current.style.transform = `translateX(${button.offsetLeft}px)`;
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [variant]);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => picker.current?.setAttribute('data-ready', ''));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
        target.isContentEditable ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      // Arrow keys on graph nodes remain available to a future graph navigator.
      if (event.target instanceof SVGElement && event.key.startsWith('Arrow')) return;
      const number = Number(event.key);
      if (number >= 1 && number <= 3) {
        event.preventDefault();
        set(number - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        set((variant + 1) % 3);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        set((variant + 2) % 3);
      } else if (event.key.toLowerCase() === 'r') {
        setReplay((n) => n + 1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [variant, set]);
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.23, ease: [0.23, 1, 0.32, 1] }}>
      <Experience key={`${variant}-${replay}`} variant={variant} />
      <nav className="proto-picker" aria-label="Prototype variants" ref={picker}>
        <span className="proto-picker-highlight" aria-hidden="true" ref={highlight} />
        {names.map((name, index) => (
          <button
            className="proto-picker-item"
            key={name}
            data-active={variant === index ? '' : undefined}
            aria-current={variant === index ? 'true' : undefined}
            onClick={() => set(index)}
          >
            {name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={() => setReplay((n) => n + 1)}
        >
          ↻
        </button>
      </nav>
    </MotionConfig>
  );
}
function Experience({ variant }: { variant: number }) {
  const [scenario] = useState(createScenario);
  useEffect(() => () => scenario.dispose(), [scenario]);
  return (
    <scenario.Scope>
      <Scene scenario={scenario} variant={variant} />
    </scenario.Scope>
  );
}
function Scene({ scenario, variant }: { scenario: Scenario; variant: number }) {
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
  const [phase, setPhase] = useState(0);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const last = previous.current;
    let next: { phase: number; ids: string[] } | undefined;
    if (logs.length !== last.logCount)
      next = { phase: 4, ids: ['fact', 'mapping', 'amplitude', 'warehouse'] };
    else if (receipt !== last.receipt)
      next = { phase: 3, ids: ['mutate', 'complete', 'receipt', 'fact', 'hReceipt', 'vReceipt'] };
    else if (pending && !last.pending)
      next = { phase: 2, ids: ['vBuy', 'hBuy', 'buy', 'mutate', 'pending'] };
    else if (copies !== last.copies)
      next = { phase: 1, ids: ['vCopies', 'hCopies', 'copies', 'total', 'hSummary', 'vSummary'] };
    else if (email !== last.email)
      next = { phase: 1, ids: ['vEmail', 'hForm', 'control', 'email'] };
    else if (game !== last.game)
      next = { phase: 0, ids: ['query', 'data', 'game', 'total', 'hSummary', 'vSummary'] };
    previous.current = { copies, email, pending, receipt, game, logCount: logs.length };
    if (next) {
      setPhase(next.phase);
      setActivity(next.ids);
      setPulse((n) => n + 1);
    }
  }, [copies, email, pending, receipt, game, logs.length]);
  const analytics = enabled && ready;
  const Variant = variants[variant]!;
  return (
    <main className={`prototype variant-${variant}`}>
      <header className="page-header">
        <a href="?v=1" className="wordmark">
          <span aria-hidden="true">◉</span> holo <small>/ laboratory</small>
        </a>
        <span className="prototype-label">
          ИНТЕРАКТИВНЫЙ ПРОТОТИП <b>0{variant + 1} / 03</b>
        </span>
      </header>
      <section className="intro">
        <div>
          <span className="eyebrow">МЕНТАЛЬНАЯ МОДЕЛЬ</span>
          <h1>Увидеть связи.</h1>
          <p>React собирает экран. holo связывает View с реактивным графом.</p>
        </div>
        <div className="intro-note">
          <span>ОДИН СЦЕНАРИЙ · ТРИ ВЗГЛЯДА</span>
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
        phase={phase}
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
          <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> варианты <b>·</b> <kbd>R</kbd> заново <b>·</b>{' '}
          <kbd>Enter</kbd> закрепить <b>·</b> <kbd>Esc</kbd> открепить
        </span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
