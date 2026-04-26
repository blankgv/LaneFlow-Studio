import { AuthSessionService } from '../../features/auth/services/auth-session.service';

export function resolveHomeRoute(_authSession: AuthSessionService): string[] {
  return ['/'];
}
