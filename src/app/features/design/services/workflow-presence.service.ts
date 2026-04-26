import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Client } from '@stomp/stompjs';

import { AppConfigService } from '../../../core/config/app-config.service';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { PresenceEvent } from '../models/presence.model';

@Injectable({ providedIn: 'root' })
export class WorkflowPresenceService {
  private readonly config = inject(AppConfigService);
  private readonly authSession = inject(AuthSessionService);

  connect(workflowId: string): Observable<PresenceEvent> {
    return new Observable<PresenceEvent>((observer) => {
      const wsUrl = this.config.wsBaseUrl;
      if (!wsUrl) return;

      const token = this.authSession.token();
      if (!token) return;

      let client: Client;

      import('sockjs-client').then(({ default: SockJS }) => {
        client = new Client({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          webSocketFactory: () => new (SockJS as any)(`${wsUrl}/ws`),
          connectHeaders: { Authorization: `Bearer ${token}` },
          reconnectDelay: 5000,
          onConnect: () => {
            client.subscribe(`/topic/workflow/${workflowId}/presence`, (msg) => {
              try {
                observer.next(JSON.parse(msg.body) as PresenceEvent);
              } catch {
                // ignore malformed messages
              }
            });
            client.publish({ destination: `/app/workflow/${workflowId}/join`, body: '' });
          },
          onStompError: () => observer.error('STOMP error')
        });

        client.activate();
      });

      return () => {
        if (client?.connected) {
          client.publish({ destination: `/app/workflow/${workflowId}/leave`, body: '' });
        }
        client?.deactivate();
      };
    });
  }
}
