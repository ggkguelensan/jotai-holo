import { useEffect, useState } from 'react';
import { Graph, SourcePane } from './graph';
import { nodes, trace } from './spec';
import type { VariantProps } from './main';
const steps = [
  { title: 'Данные', text: 'Query → модель', node: 'data', ids: ['query', 'data', 'game'] },
  {
    title: 'Редактирование',
    text: 'View → holo → атом',
    node: 'copies',
    ids: ['vCopies', 'hCopies', 'copies', 'total', 'hSummary', 'vSummary', 'control', 'email'],
  },
  {
    title: 'Покупка',
    text: 'Команда → мутация',
    node: 'buy',
    ids: ['vBuy', 'hBuy', 'buy', 'mutate', 'pending'],
  },
  {
    title: 'Факт',
    text: 'Успех → чек и событие',
    node: 'fact',
    ids: ['mutate', 'complete', 'receipt', 'fact', 'hReceipt', 'vReceipt'],
  },
  {
    title: 'Аналитика',
    text: 'Факт → два сообщения',
    node: 'mapping',
    ids: ['fact', 'mapping', 'amplitude', 'warehouse'],
  },
];
export function Trace(props: VariantProps) {
  const [step, setStep] = useState(0);
  const [follow, setFollow] = useState(true);
  useEffect(() => {
    if (follow) {
      setStep(props.phase);
      props.onSelect(nodes.find((node) => node.id === steps[props.phase]!.node)!);
    }
  }, [follow, props.phase, props.onSelect]);
  const current = steps[step]!;
  return (
    <section className="graph-card trace-card">
      <header className="card-heading">
        <div>
          <span className="eyebrow">03 / ТРАССА СЦЕНАРИЯ</span>
          <h2>Проследи одно действие через всю систему</h2>
        </div>
        <button
          className="quiet follow-button"
          aria-pressed={follow}
          onClick={() => setFollow(!follow)}
        >
          <i className={follow ? 'live-dot' : ''} />
          {follow ? 'Следим за действиями' : 'Обзор по шагам'}
        </button>
      </header>
      <div className="trace-workspace">
        <nav className="trace-steps" aria-label="Разобрать шаг сценария">
          {steps.map((item, index) => (
            <button
              key={item.node}
              aria-current={step === index ? 'step' : undefined}
              onClick={() => {
                setFollow(false);
                setStep(index);
                props.onSelect(nodes.find((node) => node.id === item.node)!);
              }}
            >
              <span className="step-index">0{index + 1}</span>
              <span>
                {item.title}
                <small>{item.text}</small>
              </span>
              {step === index && <span className="step-arrow">↗</span>}
            </button>
          ))}
          <p>Шаги — обзор связей. Покупка запускается в живом примере ниже.</p>
        </nav>
        <div>
          <Graph {...props} activity={current.ids} layout={trace} />
          <div className="trace-caption">
            <span>0{step + 1}</span>
            <strong>{current.title}</strong>
            <p>{current.text}</p>
          </div>
        </div>
      </div>
      <div className="trace-source">
        <SourcePane selection={props.selected} />
      </div>
    </section>
  );
}
