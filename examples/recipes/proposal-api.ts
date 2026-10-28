import { mutationOptions, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

// #region contract
export const draftSchema = z.object({
  seats: z.number().int().min(1),
  comment: z.string(),
});

const proposalSchema = draftSchema.extend({
  id: z.string(),
  customer: z.string(),
  seatPrice: z.number().nonnegative(),
});

export type ProposalDraft = z.infer<typeof draftSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type ProposalInput = { proposalId: string };

export function toDraft(proposal: Proposal): ProposalDraft {
  return { seats: proposal.seats, comment: proposal.comment };
}
// #endregion contract

// #region query-factory
export function proposalDetailQO({ proposalId }: ProposalInput) {
  return queryOptions({
    queryKey: ['proposals', 'detail', proposalId] as const,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const id = encodeURIComponent(proposalId);
      const response = await fetch(`/api/proposals/${id}`, { signal });
      if (!response.ok) throw new Error('Could not load the proposal.');
      return proposalSchema.parse(await response.json());
    },
  });
}
// #endregion query-factory

// #region mutation-factory
export function saveProposalMO() {
  return mutationOptions({
    mutationKey: ['proposals', 'save'],
    mutationFn: async (input: { id: string; draft: ProposalDraft }) => {
      const id = encodeURIComponent(input.id);
      const response = await fetch(`/api/proposals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftSchema.parse(input.draft)),
      });
      if (!response.ok) throw new Error('Could not save the proposal.');
      return proposalSchema.parse(await response.json());
    },
    onSuccess: (proposal, _variables, _context, { client }) => {
      const options = proposalDetailQO({ proposalId: proposal.id });
      client.setQueryData(options.queryKey, proposal);
    },
  });
}
// #endregion mutation-factory
