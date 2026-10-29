import { motion } from 'motion/react';
import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import type { CampaignInput } from './mutation.js';

export function DiscountView({
  discount,
  onDiscount,
}: {
  discount: number;
  onDiscount: (value: number) => void;
}) {
  const [empty, setEmpty] = useState(false);
  const { t } = useLingui();

  return (
    <label>
      {t`Discount, %`}
      <input
        type="number"
        min="0"
        max="50"
        value={empty ? '' : discount}
        onChange={(event) => {
          const value = event.target.value;
          setEmpty(value === '');
          if (value !== '') {
            onDiscount(Number(value));
          }
        }}
        onBlur={() => setEmpty(false)}
      />
    </label>
  );
}

export function CampaignNoteView({
  note,
  onNote,
}: {
  note: string;
  onNote: (value: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Campaign note`}
      <input value={note} onChange={(event) => onNote(event.target.value)} />
    </label>
  );
}

export function SaveControlsView({
  pending,
  onReset,
}: {
  pending: boolean;
  onReset: () => void;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-controls">
      <button type="submit" disabled={pending}>
        {pending ? t`Saving campaign…` : t`Save campaign`}
      </button>
      <button type="button" onClick={onReset}>
        {t`Clear feedback`}
      </button>
    </div>
  );
}

export function SaveErrorView({ error }: { error: Error | null }) {
  const { t } = useLingui();

  return error ? (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="alert"
    >{t`Demo policy limits campaign discounts to 25%.`}</motion.p>
  ) : null;
}

export function SavedCampaignView({
  campaign,
}: {
  campaign: CampaignInput | undefined;
}) {
  const { t } = useLingui();

  return (
    <output aria-live="polite">
      {campaign && (
        <motion.span
          key={campaign.discount}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {`${t`Saved campaign discount`}: ${campaign.discount}%`}
        </motion.span>
      )}
    </output>
  );
}
