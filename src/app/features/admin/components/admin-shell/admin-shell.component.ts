import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthSessionService } from '../../../auth/services/auth-session.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatIconModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-shell">
      <aside class="sidebar">
        <header class="sidebar__brand">
          <span class="brand-mark">LF</span>
          <span class="brand-name">LaneFlow</span>
        </header>

        <button type="button" class="nav-item nav-item--ghost" disabled>
          <mat-icon>space_dashboard</mat-icon>
          <span>Dashboard</span>
        </button>

        <section class="nav-section">
          <button
            type="button"
            class="nav-section__trigger"
            [class.is-open]="adminExpanded()"
            (click)="toggleAdminExpanded()"
          >
            <span class="nav-section__title">
              <mat-icon>settings_suggest</mat-icon>
              <span>Administracion</span>
            </span>
            <mat-icon class="nav-section__chevron">expand_more</mat-icon>
          </button>

          <div class="nav-section__items" *ngIf="adminExpanded()">
            <a
              *ngFor="let item of adminNav"
              class="nav-item"
              [routerLink]="item.link"
              routerLinkActive="is-active"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          </div>
        </section>

        <footer class="sidebar__user">
          <span class="user-avatar">{{ userInitials() }}</span>
          <div class="user-meta">
            <strong>{{ authSession.session()?.username }}</strong>
            <small>{{ authSession.session()?.roleCode }}</small>
          </div>
        </footer>
      </aside>

      <main class="admin-shell__content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .admin-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 240px 1fr;
      background: var(--surface-2);
    }

    .sidebar {
      display: grid;
      grid-template-rows: auto auto auto 1fr auto;
      gap: 6px;
      padding: 18px 14px;
      background: var(--surface);
      border-right: 1px solid var(--border);
    }

    /* Brand */
    .sidebar__brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px 14px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 6px;
    }

    .brand-mark {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: #f0b45a;
      color: #1d2433;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .brand-name {
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    /* Nav */
    .nav-item,
    .nav-section__trigger {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      background: transparent;
      border: 0;
      font-size: 0.86rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease;
    }

    .nav-item mat-icon,
    .nav-section__trigger mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .nav-item:hover,
    .nav-section__trigger:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .nav-item:hover mat-icon,
    .nav-section__trigger:hover mat-icon {
      color: var(--text);
    }

    .nav-item.is-active {
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-weight: 600;
    }

    .nav-item.is-active mat-icon {
      color: var(--accent);
    }

    .nav-item--ghost {
      opacity: 0.5;
      cursor: default;
    }

    .nav-item--ghost:hover {
      background: transparent;
      color: var(--text-secondary);
    }

    .nav-item--ghost:hover mat-icon {
      color: var(--text-muted);
    }

    /* Collapsible section */
    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 6px;
    }

    .nav-section__trigger {
      justify-content: space-between;
    }

    .nav-section__title {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .nav-section__chevron {
      transition: transform 160ms ease;
    }

    .nav-section__trigger.is-open .nav-section__chevron {
      transform: rotate(180deg);
    }

    .nav-section__items {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-left: 22px;
      margin-top: 2px;
    }

    .nav-section__items .nav-item {
      padding: 7px 10px;
      font-size: 0.84rem;
    }

    /* User footer */
    .sidebar__user {
      align-self: end;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 10px;
      border-top: 1px solid var(--border);
      margin-top: 6px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .user-meta strong {
      font-size: 0.84rem;
      color: var(--text);
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-meta small {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    /* Content */
    .admin-shell__content {
      min-width: 0;
      background: var(--surface-2);
    }

    @media (max-width: 960px) {
      .admin-shell {
        grid-template-columns: 1fr;
      }

      .sidebar {
        grid-template-rows: auto auto auto auto auto;
        border-right: 0;
        border-bottom: 1px solid var(--border);
      }
    }
  `]
})
export class AdminShellComponent {
  protected readonly authSession = inject(AuthSessionService);
  protected readonly adminExpanded = signal(true);

  protected readonly adminNav: NavItem[] = [
    { label: 'Departamentos', icon: 'apartment', link: '/admin/departments' },
    { label: 'Personal', icon: 'badge', link: '/admin/staff' },
    { label: 'Roles y permisos', icon: 'admin_panel_settings', link: '/admin/roles' },
    { label: 'Usuarios', icon: 'manage_accounts', link: '/admin/users' }
  ];

  protected readonly userInitials = computed(() => {
    const username = this.authSession.session()?.username ?? '';
    const trimmed = username.trim();

    if (!trimmed) {
      return '?';
    }

    const parts = trimmed.split(/[\s._-]+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  protected toggleAdminExpanded(): void {
    this.adminExpanded.update((value) => !value);
  }
}
