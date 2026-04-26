import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, inject, signal
} from '@angular/core';
import { Subscription } from 'rxjs';

import { AuthSessionService } from '../../../auth/services/auth-session.service';
import { CollaborationSession } from '../../services/workflow-collaboration.service';

interface OnlineUser {
  userId: string;
  username: string;
}

@Component({
  selector: 'app-presence-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="presence" *ngIf="users().length > 0">
      <div
        *ngFor="let u of visibleUsers()"
        class="presence-avatar"
        [title]="u.username"
      >
        {{ initials(u.username) }}
      </div>
      <div class="presence-overflow" *ngIf="overflowCount() > 0" [title]="overflowLabel()">
        +{{ overflowCount() }}
      </div>
    </div>
  `,
  styles: [`
    .presence {
      display: flex;
      align-items: center;
    }

    .presence-avatar,
    .presence-overflow {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      font-size: 0.68rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--surface);
      flex-shrink: 0;
      cursor: default;
      margin-left: -6px;
    }

    .presence-avatar:first-child,
    .presence-overflow:first-child {
      margin-left: 0;
    }

    .presence-avatar {
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .presence-overflow {
      background: var(--surface-3);
      color: var(--text-muted);
    }
  `]
})
export class PresenceIndicatorComponent implements OnChanges, OnDestroy {
  @Input() session: CollaborationSession | null = null;

  private readonly authSession = inject(AuthSessionService);
  private sub: Subscription | null = null;

  protected readonly users = signal<OnlineUser[]>([]);

  protected visibleUsers() { return this.users().slice(0, 4); }
  protected overflowCount() { return Math.max(0, this.users().length - 4); }
  protected overflowLabel() { return this.users().slice(4).map((u) => u.username).join(', '); }

  ngOnChanges(): void {
    this.sub?.unsubscribe();
    this.users.set([]);

    if (!this.session) return;

    const me = this.authSession.session()?.username;

    this.sub = this.session.presence$.subscribe((event) => {
      if (event.username === me) return;

      if (event.action === 'JOIN') {
        this.users.update((list) => {
          if (list.some((u) => u.userId === event.userId)) return list;
          return [...list, { userId: event.userId, username: event.username }];
        });
      } else {
        this.users.update((list) => list.filter((u) => u.userId !== event.userId));
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  protected initials(username: string): string {
    const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
}
