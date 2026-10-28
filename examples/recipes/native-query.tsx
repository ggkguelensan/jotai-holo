import { useSuspenseQuery } from '@tanstack/react-query';
import { proposalDetailQO } from './proposal-api.js';

// #region native-query
export function ProposalSeatCount({ proposalId }: { proposalId: string }) {
  const { data: seats } = useSuspenseQuery({
    ...proposalDetailQO({ proposalId }),
    select: (proposal) => proposal.seats,
  });

  return <output>{seats} seats</output>;
}
// #endregion native-query
