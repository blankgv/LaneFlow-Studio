import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthSessionService } from '../../../auth/services/auth-session.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, MatButtonModule, MatIconModule],
  template: `
    <div class="admin-shell">
      <aside class="admin-shell__sidebar">
        <div class="brand-block">
          <span class="brand-block__kicker">Admin</span>
          <h1>Estructura organizacional y cuentas</h1>
          <p>
            Espacio de administracion para configurar personal, roles, usuarios y
            departamentos de forma ordenada.
          </p>
        </div>

        <nav class="module-nav">
          <a routerLink="/admin/departments" routerLinkActive="active">
            <mat-icon>apartment</mat-icon>
            <span>Departamentos</span>
          </a>
          <a routerLink="/admin/staff" routerLinkActive="active">
            <mat-icon>badge</mat-icon>
            <span>Personal</span>
          </a>
          <div class="module-nav__coming-soon">
            <span>Usuarios y roles se integraran en los siguientes casos.</span>
          </div>
        </nav>

        <section class="session-mini">
          <span class="session-mini__label">Sesion activa</span>
          <strong>{{ authSession.session()?.username }}</strong>
          <small>{{ authSession.session()?.roleCode }}</small>
        </section>
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
      grid-template-columns: 280px 1fr;
      background:
        radial-gradient(circle at top left, rgba(10, 122, 108, 0.08), transparent 18%),
        linear-gradient(180deg, #f7f5ef 0%, #f1ede4 100%);
    }

    .admin-shell__sidebar {
      padding: 28px 22px;
      border-right: 1px solid rgba(29, 36, 51, 0.08);
      background: rgba(255, 253, 248, 0.78);
      backdrop-filter: blur(10px);
      display: grid;
      align-content: start;
      gap: 28px;
    }

    .brand-block__kicker {
      display: inline-block;
      margin-bottom: 10px;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(10, 122, 108, 0.08);
      color: #0a7a6c;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .brand-block h1 {
      margin: 0 0 10px;
      font-size: 1.7rem;
      line-height: 1.08;
      color: #1d2433;
    }

    .brand-block p {
      margin: 0;
      color: #637087;
      font-size: 0.92rem;
      line-height: 1.65;
    }

    .module-nav {
      display: grid;
      gap: 12px;
    }

    .module-nav a {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 14px;
      text-decoration: none;
      color: #364055;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(29, 36, 51, 0.06);
      font-weight: 600;
      transition: 160ms ease-in-out;
    }

    .module-nav a.active,
    .module-nav a:hover {
      color: #fff;
      background: linear-gradient(135deg, #0a7a6c, #075d53);
    }

    .module-nav__coming-soon {
      padding: 14px;
      border-radius: 14px;
      background: rgba(10, 122, 108, 0.05);
      color: #637087;
      font-size: 0.82rem;
      line-height: 1.55;
      border: 1px dashed rgba(10, 122, 108, 0.16);
    }

    .session-mini {
      padding: 16px;
      border-radius: 16px;
      background: #fffdf8;
      border: 1px solid rgba(29, 36, 51, 0.08);
      box-shadow: 0 12px 24px rgba(29, 36, 51, 0.04);
    }

    .session-mini__label,
    .session-mini strong,
    .session-mini small {
      display: block;
    }

    .session-mini__label {
      margin-bottom: 8px;
      color: #7a869d;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .session-mini strong {
      margin-bottom: 6px;
      color: #1d2433;
    }

    .session-mini small {
      color: #637087;
    }

    .admin-shell__content {
      min-width: 0;
    }

    @media (max-width: 960px) {
      .admin-shell {
        grid-template-columns: 1fr;
      }

      .admin-shell__sidebar {
        border-right: 0;
        border-bottom: 1px solid rgba(29, 36, 51, 0.08);
      }
    }
  `]
})
export class AdminShellComponent {
  protected readonly authSession = inject(AuthSessionService);
}
