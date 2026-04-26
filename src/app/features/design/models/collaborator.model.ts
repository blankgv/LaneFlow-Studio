export interface Collaborator {
  id: string;
  workflowDefinitionId: string;
  userId: string;
  username: string;
  email: string;
  addedBy: string;
  createdAt: string;
}

export interface Invitee {
  id: string;
  username: string;
  email: string;
}
