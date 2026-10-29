import { useState } from 'react';
import example from '../../examples/atoms-or-models.tsx?raw';
import { Miniature, type MiniData } from './miniature';

const data: MiniData = {
  nodes: [
    { id: 'theme', kind: 'atom', label: '$theme', anchor: 'export const $theme' },
    { id: 'help', kind: 'atom', label: 'helpRequested', anchor: 'export const helpRequested' },
    {
      id: 'hTheme',
      kind: 'holo',
      label: 'holo · ThemeControl',
      anchor: 'const ThemeControl = holo',
    },
    { id: 'hHelp', kind: 'holo', label: 'holo · Help', anchor: 'const Help = holo' },
    { id: 'vTheme', kind: 'react', label: 'ThemeView', anchor: 'view: ThemeView' },
    { id: 'vHelp', kind: 'react', label: 'HelpView', anchor: 'view: HelpView' },
    { id: 'parent', kind: 'react', label: 'Toolbar', anchor: 'export function Toolbar' },
  ],
  edges: [
    { from: 'theme', to: 'hTheme' },
    { from: 'help', to: 'hHelp' },
    { from: 'hTheme', to: 'vTheme' },
    { from: 'hHelp', to: 'vHelp' },
    { from: 'parent', to: 'hTheme' },
    { from: 'parent', to: 'hHelp' },
  ],
};
const region = example
  .split('// #region global-atoms\n')[1]!
  .split('// #endregion global-atoms')[0]!
  .trim();
const imports = "import { atom } from 'jotai';\nimport { eventAtom, holo } from 'jotai-holo';";
export function MiniPage({ full = false }: { full?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const node = data.nodes.find((node) => node.id === selected);
  const source = (
    <div className="article-code">
      <header>
        atoms-or-models.tsx <span>Исполняемый пример</span>
      </header>
      <pre>
        <code>
          {region.split('\n').map((line, index) => (
            <span
              key={index}
              className={`article-line ${node && line.includes(node.anchor) ? 'article-highlight' : ''}`}
            >
              <span className="article-line-number">{index + 1}</span>
              {line}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
  if (full)
    return (
      <main className="mini-page atoms-map-page">
        <header className="page-header">
          <a className="wordmark" href="?mode=mini">
            <span aria-hidden="true">◉</span>holo<small>/ atoms</small>
          </a>
          <a className="back-to-article" href="?mode=mini">
            ← К миниатюре в статье
          </a>
        </header>
        <section className="atoms-map-intro">
          <span className="eyebrow">ПОЛНАЯ КАРТА / АТОМЫ И МОДЕЛИ</span>
          <h1>Те же связи. Больше пространства.</h1>
          <p>Выбери узел, чтобы найти его объявление. Перетаскивание меняет раскладку.</p>
        </section>
        <div className="atoms-map-grid">
          <Miniature data={data} selected={selected} onSelect={setSelected} mode="map" />
          <aside>
            <div className="atoms-selection">
              <span className="eyebrow">{node?.kind ?? 'ГРАФ ПРИМЕРА'}</span>
              <h2>{node?.label ?? 'Toolbar → holo → View'}</h2>
            </div>
            {source}
          </aside>
        </div>
      </main>
    );
  return (
    <main className="mini-page">
      <header className="page-header">
        <a className="wordmark" href="?mode=map">
          <span aria-hidden="true">◉</span>holo<small>/ constellation</small>
        </a>
        <span className="prototype-label">МИНИАТЮРА В КОНТЕКСТЕ СТАТЬИ</span>
      </header>
      <div className="mini-article">
        <article>
          <span className="eyebrow">ТЕМЫ / АТОМЫ И МОДЕЛИ</span>
          <h1>
            Общие атомы.
            <br />
            Маленькие View.
          </h1>
          <p>
            Тема и запрос помощи — два независимых входа в реактивный граф. Каждый компонент
            подключается только к нужному атому.
          </p>
          <pre className="article-code">
            <code>{imports}</code>
          </pre>
          {source}
          <p>
            <code>ThemeControl</code> читает и изменяет тему. <code>Help</code> публикует событие.
            Для таких привязок регистрация модели не нужна.
          </p>
          <p>
            <code>Toolbar</code> собирает компоненты и передаёт заголовок обычным пропсом React.
            Связывать его через holo только ради статического заголовка незачем.
          </p>
          <aside className="mini-design-note">
            <strong>Схема рядом с кодом</strong>
            <p>
              Наведение на узел выделяет объявление. Перетаскивание меняет только раскладку — код и
              связи остаются прежними.
            </p>
          </aside>
        </article>
        <aside className="article-graph-aside">
          <div className="article-graph-sticky">
            <header>
              <span className="eyebrow">СВЯЗИ ПРИМЕРА</span>
              <a href="?mode=map&example=atoms" aria-label="Открыть полную карту">
                ↗
              </a>
            </header>
            <Miniature data={data} selected={selected} onSelect={setSelected} />
            <div className="mini-color-key">
              <span>
                <i className="dot react" />
                React
              </span>
              <span>
                <i className="dot holo" />
                holo
              </span>
              <span>
                <i className="dot atom" />
                Jotai
              </span>
            </div>
            <p className="mini-explanation">
              Миниатюра показывает зависимости, без направления и порядка исполнения. В полной карте
              доступны подробности.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
