import { useLingui } from '@lingui/react/macro';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Dimensions } from '../../coordinates.js';

export function TableViewportView({
  size,
  onWindow,
  children,
}: {
  size: Dimensions;
  onWindow: (size: Dimensions) => void;
  children: ReactNode;
}) {
  const { t } = useLingui();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      onWindow({ columns: entry!.contentRect.width < 430 ? 2 : 4, rows: 8 }),
    );
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, [onWindow]);
  return (
    <div className="sheet-viewport" ref={ref}>
      <table
        className="sheet-table"
        role="grid"
        aria-label={t`Gift budget`}
        aria-rowcount={size.rows + 1}
        aria-colcount={size.columns + 1}
      >
        {children}
      </table>
    </div>
  );
}
