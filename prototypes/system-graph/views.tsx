import { motion, useReducedMotion } from 'motion/react';
import { useFormContext } from 'react-hook-form';
import type { Game, Receipt } from './business';

export function SummaryView({ game, total }: { game: Game | undefined | null; total: number }) {
  return (
    <header className="game-summary">
      <div className="game-art" aria-hidden="true">
        ✦
      </div>
      <div>
        <span className="eyebrow">ЦИФРОВОЙ ПОДАРОК</span>
        <h3>{game?.name ?? 'Загрузка игры…'}</h3>
        <p>{game ? `$${total} · ключ активации` : 'Локальная симуляция Query'}</p>
      </div>
    </header>
  );
}
export function EmailView() {
  const { register } = useFormContext<{ email: string }>();
  return (
    <label className="field">
      Email получателя
      <input type="email" autoComplete="off" {...register('email')} />
    </label>
  );
}
export function CopiesView({
  copies,
  onChange,
}: {
  copies: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="copies">
      <span>Количество</span>
      <div className="stepper">
        <button
          aria-label="Уменьшить количество"
          disabled={copies <= 1}
          onClick={() => onChange(copies - 1)}
        >
          −
        </button>
        <output aria-label="Количество копий">{copies}</output>
        <button
          aria-label="Увеличить количество"
          disabled={copies >= 5}
          onClick={() => onChange(copies + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
export function BuyView({
  pending,
  error,
  game,
  onBuy,
}: {
  pending: boolean;
  error: string;
  game: Game | undefined;
  onBuy: () => Promise<void>;
}) {
  return (
    <>
      <button
        className="buy"
        disabled={pending || !game}
        onClick={() => {
          void onBuy();
        }}
      >
        {pending ? 'Оформляем подарок…' : 'Купить в подарок'}
        <span aria-hidden="true">↗</span>
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
export function ReceiptView({ receipt }: { receipt: Receipt | null }) {
  const reduced = useReducedMotion();
  return (
    <div className="receipt" aria-live="polite">
      {receipt ? (
        <motion.div
          key={receipt.orderId}
          initial={{ opacity: 0, y: reduced ? 0 : 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <span className="success-dot" />
          {receipt.orderId} · ${receipt.total}
          <small>Подарок для {receipt.email}</small>
        </motion.div>
      ) : (
        <span>Чек появится после успешной мутации</span>
      )}
    </div>
  );
}
