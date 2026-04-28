import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AuthSessionService } from '../../features/auth/services/auth-session.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <header class="sidebar__brand">
          <span class="brand-mark">LF</span>
          <span class="brand-name">LaneFlow</span>
        </header>

        <nav class="sidebar__nav">
          <a class="nav-item" routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">
            <mat-icon>space_dashboard</mat-icon>
            <span>Dashboard</span>
          </a>

          <section class="nav-section" *ngIf="canDesign">
            <button
              type="button"
              class="nav-section__trigger"
              [class.is-open]="designExpanded()"
              (click)="toggleDesignExpanded()"
            >
              <span class="nav-section__title">
                <mat-icon>account_tree</mat-icon>
                <span>Diseno</span>
              </span>
              <mat-icon class="nav-section__chevron">expand_more</mat-icon>
            </button>

            <div class="nav-section__items" *ngIf="designExpanded()">
              <a
                *ngFor="let item of designNav"
                class="nav-item"
                [routerLink]="item.link"
                routerLinkActive="is-active"
              >
                <mat-icon>{{ item.icon }}</mat-icon>
                <span>{{ item.label }}</span>
              </a>
            </div>
          </section>

          <section class="nav-section">
            <button
              type="button"
              class="nav-section__trigger"
              [class.is-open]="operacionesExpanded()"
              (click)="toggleOperacionesExpanded()"
            >
              <span class="nav-section__title">
                <mat-icon>pending_actions</mat-icon>
                <span>Operaciones</span>
              </span>
              <mat-icon class="nav-section__chevron">expand_more</mat-icon>
            </button>

            <div class="nav-section__items" *ngIf="operacionesExpanded()">
              <a
                *ngFor="let item of operacionesNav"
                class="nav-item"
                [routerLink]="item.link"
                routerLinkActive="is-active"
              >
                <mat-icon>{{ item.icon }}</mat-icon>
                <span>{{ item.label }}</span>
              </a>
            </div>
          </section>

          <section class="nav-section" *ngIf="canAdmin">
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
        </nav>

        <footer class="sidebar__user">
          <span class="user-avatar">{{ userInitials() }}</span>
          <div class="user-meta">
            <strong>{{ authSession.session()?.username }}</strong>
            <small>{{ authSession.session()?.roleCode }}</small>
          </div>
          <button
            type="button"
            class="logout-btn"
            mat-icon-button
            aria-label="Cerrar sesion"
            (click)="logout()"
          >
            <mat-icon>logout</mat-icon>
          </button>
        </footer>
      </aside>

      <main class="app-shell__content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 240px 1fr;
      background: var(--surface-2);
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      padding: 18px 14px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }

    /* Brand */
    .sidebar__brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px 14px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 10px;
      flex-shrink: 0;
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
      flex-shrink: 0;
    }

    .brand-name {
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    /* Nav */
    .sidebar__nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

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

    /* Collapsible section */
    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 4px;
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
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 10px;
      border-top: 1px solid var(--border);
      margin-top: auto;
      flex-shrink: 0;
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

    .logout-btn {
      margin-left: auto;
      flex-shrink: 0;
      color: var(--text-muted);
      width: 30px;
      height: 30px;
    }

    .logout-btn:hover {
      color: var(--danger);
    }

    .logout-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Content */
    .app-shell__content {
      min-width: 0;
      background: var(--surface-2);
    }

    @media (max-width: 960px) {
      .app-shell {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: static;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--border);
      }
    }
  `]
})
export class AppShellComponent {
  protected readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);
  protected readonly designExpanded = signal(true);
  protected readonly operacionesExpanded = signal(true);
  protected readonly adminExpanded = signal(true);

  protected readonly canDesign = this.authSession.hasPermission('WORKFLOW_READ');
  protected readonly canAdmin = this.authSession.hasPermission('DEPT_READ')
    || this.authSession.hasPermission('STAFF_READ')
    || this.authSession.hasPermission('ROLE_READ')
    || this.authSession.hasPermission('USER_READ');

  protected readonly designNav: NavItem[] = [
    { label: 'Politicas', icon: 'policy', link: '/design' }
  ];

  protected readonly operacionesNav: NavItem[] = [
    { label: 'Tramites',     icon: 'folder_open',  link: '/operation/procedures' },
    { label: 'Solicitantes', icon: 'people',        link: '/operation/applicants' },
    { label: 'Tareas',       icon: 'assignment',    link: '/operation/tasks' },
  ];

  protected readonly adminNav: NavItem[] = [
    { label: 'Departamentos', icon: 'apartment',         link: '/admin/departments' },
    { label: 'Personal',      icon: 'badge',             link: '/admin/staff' },
    { label: 'Roles y permisos', icon: 'admin_panel_settings', link: '/admin/roles' },
    { label: 'Usuarios',      icon: 'manage_accounts',   link: '/admin/users' }
  ];

  protected readonly userInitials = computed(() => {
    const username = this.authSession.session()?.username ?? '';
    const trimmed = username.trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  protected logout(): void {
    this.authSession.logout().subscribe(() => {
      void this.router.navigate(['/auth/login']);
    });
  }

  protected toggleDesignExpanded(): void {
    this.designExpanded.update((v) => !v);
  }

  protected toggleOperacionesExpanded(): void {
    this.operacionesExpanded.update((v) => !v);
  }

  protected toggleAdminExpanded(): void {
    this.adminExpanded.update((v) => !v);
  }
}
