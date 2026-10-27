/** Draft contract only. Not exported by jotai-holo. */
export type Json =
  | null
  | boolean
  | number
  | string
  | readonly Json[]
  | { readonly [key: string]: Json };

export type AnalyticsMessage = {
  readonly type: string;
  readonly payload: { readonly [key: string]: Json };
};

export type AnalyticsEnvelope<
  Message extends AnalyticsMessage,
  Context extends { readonly [key: string]: Json },
> = {
  readonly id: string;
  readonly occurredAt: number;
  readonly source: {
    readonly kind: 'model' | 'view';
    readonly id: string;
  };
  readonly message: Message;
  readonly context: Context;
};

export type AnalyticsDiagnostic = {
  readonly phase: 'load' | 'write' | 'receipt' | 'flush' | 'dispose';
  readonly messageId?: string;
  readonly error: unknown;
};

export type AnalyticsAdapterContext = {
  readonly signal: AbortSignal;
  /** Nonthrowing, revocable reporter. Must not retain the source model/View. */
  readonly report: (diagnostic: AnalyticsDiagnostic) => void;
};

export type AnalyticsAdapter<
  Message extends AnalyticsMessage,
  Context extends { readonly [key: string]: Json },
> = {
  /** Completion means handoff to this adapter/SDK, not server delivery. */
  write(
    envelope: AnalyticsEnvelope<Message, Context>,
    context: AnalyticsAdapterContext,
  ): void | Promise<void>;
  /** Completes a bounded attempt; does not certify ingestion. */
  flush?(context: AnalyticsAdapterContext): void | Promise<void>;
  /** Only when the SDK has a genuine teardown operation. */
  dispose?(context: AnalyticsAdapterContext): void | Promise<void>;
};
