export interface PresenceEvent {
  userId: string;
  username: string;
  action: 'JOIN' | 'LEAVE';
}
