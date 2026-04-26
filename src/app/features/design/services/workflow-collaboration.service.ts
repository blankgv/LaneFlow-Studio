import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Client } from '@stomp/stompjs';

import { AppConfigService } from '../../../core/config/app-config.service';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { PresenceEvent } from '../models/presence.model';
import { WorkflowDraftSync } from '../models/workflow-draft-sync.model';

export interface CollaborationSession {
  presence$: Observable<PresenceEvent>;
  draft$: Observable<WorkflowDraftSync>;
  publishDraft(bpmnXml: string): void;
  disconnect(): void;
}

@Injectable({ providedIn: 'root' })
export class WorkflowCollaborationService {
  private readonly config = inject(AppConfigService);
  private readonly authSession = inject(AuthSessionService);
  private readonly zone = inject(NgZone);

  connect(workflowId: string): CollaborationSession | null {
    const wsUrl = this.config.wsBaseUrl;
    const token = this.authSession.token();

    if (!wsUrl || !token) return null;

    const presence$ = new Subject<PresenceEvent>();
    const draft$ = new Subject<WorkflowDraftSync>();
    let client: Client;

    import('sockjs-client').then(({ default: SockJS }) => {
      client = new Client({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webSocketFactory: () => new (SockJS as any)(`${wsUrl}?access_token=${token}`),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => {
          client.subscribe(`/topic/workflows/${workflowId}/presence`, (msg) => {
            try {
              const event = JSON.parse(msg.body) as PresenceEvent;
              this.zone.run(() => presence$.next(event));
            } catch { /* skip */ }
          });

          client.subscribe(`/topic/workflows/${workflowId}/draft`, (msg) => {
            try {
              const sync = JSON.parse(msg.body) as WorkflowDraftSync;
              this.zone.run(() => draft$.next(sync));
            } catch { /* skip */ }
          });

          client.publish({ destination: `/app/workflows/${workflowId}/presence.join`, body: '' });
        },
        onStompError: () => {
          presence$.error('STOMP error');
          draft$.error('STOMP error');
        }
      });

      client.activate();
    });

    return {
      presence$: presence$.asObservable(),
      draft$: draft$.asObservable(),
      publishDraft: (bpmnXml: string) => {
        if (client?.connected) {
          client.publish({
            destination: `/app/workflows/${workflowId}/draft.save`,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ bpmnXml })
          });
        }
      },
      disconnect: () => {
        if (client?.connected) {
          client.publish({ destination: `/app/workflows/${workflowId}/presence.leave`, body: '' });
        }
        client?.deactivate();
        presence$.complete();
        draft$.complete();
      }
    };
  }
}
