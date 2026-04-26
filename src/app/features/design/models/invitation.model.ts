export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Invitation {
  id: string;
  workflowDefinitionId: string;
  invitedUserId: string;
  invitedUsername: string;
  invitedUserEmail: string;
  invitedByUserId: string;
  invitedByUsername: string;
  status: InvitationStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface InvitationPayload {
  invitedUsername: string;
}
