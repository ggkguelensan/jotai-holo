import { motion } from 'motion/react';
import { useLingui } from '@lingui/react/macro';
import { type Delivery } from './analytics-recording.js';
import type { ReactNode } from 'react';
import type { Game } from '../analytics/search-model.js';

export function SearchTermView({
  query,
  onTermChange,
}: {
  query: string;
  onTermChange: (value: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Search games`}
      <input
        value={query}
        onChange={(event) => onTermChange(event.target.value)}
      />
    </label>
  );
}

export function GameRowView({
  game,
  position,
  onGameOpen,
}: {
  game: Game;
  position: number;
  onGameOpen: (fact: { gameId: string; position: number }) => void;
}) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button onClick={() => onGameOpen({ gameId: game.id, position })}>
        {game.name} · ${game.price}
      </button>
    </motion.li>
  );
}

export function CloseGameView({ onClose }: { onClose: () => void }) {
  const { t } = useLingui();

  return <button onClick={onClose}>{t`Close details`}</button>;
}

export function ClearLogsView({
  enabled,
  onClear,
}: {
  enabled: boolean;
  onClear: (entries: readonly Delivery[]) => void;
}) {
  const { t } = useLingui();

  return (
    <button disabled={!enabled} onClick={() => onClear([])}>
      {t`Clear logs`}
    </button>
  );
}

export function DeliveryListView({
  deliveries,
}: {
  deliveries: readonly Delivery[];
}) {
  const { t } = useLingui();

  return (
    <>
      <ol aria-live="polite" aria-relevant="additions">
        {[...deliveries].reverse().map(({ id, engine, name, properties }) => (
          <motion.li key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div>
              <span>{engine}</span>
              <code>#{id}</code>
            </div>
            <strong>{name}</strong>
            <pre>{JSON.stringify(properties, null, 2)}</pre>
          </motion.li>
        ))}
      </ol>
      {!deliveries.length && (
        <p className="demo-analytics-empty">
          {t`Search for a game, then open it to see each engine's payload.`}
        </p>
      )}
    </>
  );
}

export function GameDetailsView({
  game,
  children,
}: {
  game: Game | null;
  children: ReactNode;
}) {
  const { t } = useLingui();
  if (!game) return null;

  return (
    <motion.article
      key={game.id}
      initial={{ opacity: 0, transform: 'translateY(6px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
    >
      <h3>{t`Game details`}</h3>
      <p>
        {game.name} · ${game.price}
      </p>
      {children}
    </motion.article>
  );
}
