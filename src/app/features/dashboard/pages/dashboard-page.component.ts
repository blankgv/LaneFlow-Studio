import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthSessionService } from '../../auth/services/auth-session.service';
import { ProceduresApiService } from '../../operation/services/procedures-api.service';
import { TasksApiService } from '../../operation/services/tasks-api.service';
import { ApplicantsApiService } from '../../operation/services/applicants-api.service';
import { WorkflowApiService } from '../../design/services/workflow-api.service';
import { Invitation } from '../../design/models/invitation.model';

interface StatCard {
  label: string;
  value: number | null;
  icon: string;
  link: string;
  color: 'accent' | 'green' | 'orange' | 'purple';
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="dashboard">

      <!-- Header -->
      <header class="dashboard__header">
        <div>
          <h1 class="dashboard__greeting">Bienvenido, {{ username() }}</h1>
          <p class="dashboard__sub">{{ roleLabel() }}</p>
        </div>
        <span class="role-badge role-badge--{{ roleBadgeColor() }}">{{ session()?.roleCode }}</span>
      </header>

      <!-- Stats -->
      <div class="stats-grid" *ngIf="canOps && stats().length > 0">
        <a
          *ngFor="let s of stats()"
          class="stat-card stat-card--{{ s.color }}"
          [routerLink]="s.link"
        >
          <div class="stat-card__icon">
            <mat-icon>{{ s.icon }}</mat-icon>
          </div>
          <div class="stat-card__body">
            <span class="stat-card__value">
              <ng-container *ngIf="s.value !== null; else loadingTpl">{{ s.value }}</ng-container>
              <ng-template #loadingTpl>—</ng-template>
            </span>
            <span class="stat-card__label">{{ s.label }}</span>
          </div>
          <mat-icon class="stat-card__arrow">arrow_forward</mat-icon>
        </a>
      </div>

      <!-- Pending invitations -->
      <section class="panel" *ngIf="canDesign && pendingInvitations().length > 0">
        <div class="panel__header">
          <mat-icon>mail</mat-icon>
          <span>Invitaciones pendientes</span>
          <span class="badge">{{ pendingInvitations().length }}</span>
        </div>
        <ul class="inv-list">
          <li *ngFor="let inv of pendingInvitations()" class="inv-item">
            <div class="inv-item__info">
              <span class="inv-item__name">{{ inv.workflowName }}</span>
              <span class="inv-item__meta">De <strong>{{ inv.invitedByUsername }}</strong></span>
            </div>
            <div class="inv-item__actions">
              <button mat-stroked-button [disabled]="responding() === inv.id" (click)="respond(inv, 'reject')">
                Rechazar
              </button>
              <button mat-flat-button color="primary" [disabled]="responding() === inv.id" (click)="respond(inv, 'accept')">
                {{ responding() === inv.id ? '...' : 'Aceptar' }}
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- Quick access -->
      <section class="panel">
        <div class="panel__header">
          <mat-icon>apps</mat-icon>
          <span>Acceso rápido</span>
        </div>
        <div class="quick-grid">
          <a class="quick-card" routerLink="/operation/procedures" *ngIf="canOps">
            <mat-icon>folder_open</mat-icon>
            <span>Trámites</span>
          </a>
          <a class="quick-card" routerLink="/operation/tasks" *ngIf="canOps">
            <mat-icon>assignment</mat-icon>
            <span>Tareas</span>
          </a>
          <a class="quick-card" routerLink="/operation/applicants" *ngIf="canOps">
            <mat-icon>people</mat-icon>
            <span>Solicitantes</span>
          </a>
          <a class="quick-card" routerLink="/design" *ngIf="canDesign">
            <mat-icon>account_tree</mat-icon>
            <span>Políticas</span>
          </a>
          <a class="quick-card" routerLink="/admin/departments" *ngIf="canAdmin">
            <mat-icon>apartment</mat-icon>
            <span>Departamentos</span>
          </a>
          <a class="quick-card" routerLink="/admin/staff" *ngIf="canAdmin">
            <mat-icon>badge</mat-icon>
            <span>Personal</span>
          </a>
          <a class="quick-card" routerLink="/admin/users" *ngIf="canAdmin">
            <mat-icon>manage_accounts</mat-icon>
            <span>Usuarios</span>
          </a>
          <a class="quick-card" routerLink="/admin/roles" *ngIf="canAdmin">
            <mat-icon>admin_panel_settings</mat-icon>
            <span>Roles</span>
          </a>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 960px;
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Header */
    .dashboard__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 4px;
    }

    .dashboard__greeting {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text);
    }

    .dashboard__sub {
      margin: 4px 0 0;
      font-size: 0.84rem;
      color: var(--text-muted);
    }

    .role-badge {
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    .role-badge--admin  { background: #fef3c7; color: #92400e; }
    .role-badge--sup    { background: #ede9fe; color: #5b21b6; }
    .role-badge--func   { background: #d1fae5; color: #065f46; }
    .role-badge--app    { background: var(--accent-soft); color: var(--accent-strong); }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      text-decoration: none;
      transition: box-shadow 120ms ease, border-color 120ms ease;
    }

    .stat-card:hover {
      border-color: var(--accent);
      box-shadow: var(--shadow-sm);
    }

    .stat-card__icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-card--accent .stat-card__icon { background: var(--accent-soft); color: var(--accent-strong); }
    .stat-card--green  .stat-card__icon { background: #d1fae5; color: #065f46; }
    .stat-card--orange .stat-card__icon { background: #fef3c7; color: #92400e; }
    .stat-card--purple .stat-card__icon { background: #ede9fe; color: #5b21b6; }

    .stat-card__body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .stat-card__value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1;
    }

    .stat-card__label {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .stat-card__arrow {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-subtle);
      flex-shrink: 0;
    }

    /* Panel */
    .panel {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      overflow: hidden;
    }

    .panel__header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-2);
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text);
    }

    .panel__header mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: var(--accent);
    }

    .badge {
      margin-left: auto;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    /* Invitations */
    .inv-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .inv-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
    }

    .inv-item:last-child { border-bottom: 0; }

    .inv-item__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .inv-item__name {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text);
    }

    .inv-item__meta {
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    .inv-item__actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    /* Quick access */
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 1px;
      background: var(--border);
    }

    .quick-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px 12px;
      background: var(--surface);
      text-decoration: none;
      color: var(--text-muted);
      font-size: 0.8rem;
      font-weight: 500;
      transition: background 120ms ease, color 120ms ease;
    }

    .quick-card:hover {
      background: var(--surface-hover);
      color: var(--accent-strong);
    }

    .quick-card mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    @media (max-width: 600px) {
      .dashboard {
        padding: 16px;
      }
      .stats-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
  `]
})
export class DashboardPageComponent implements OnInit {
  private readonly authSession = inject(AuthSessionService);
  private readonly proceduresApi = inject(ProceduresApiService);
  private readonly tasksApi = inject(TasksApiService);
  private readonly applicantsApi = inject(ApplicantsApiService);
  private readonly workflowApi = inject(WorkflowApiService);

  protected readonly session = this.authSession.session;
  protected readonly responding = signal('');
  protected readonly pendingInvitations = signal<(Invitation & { workflowName: string })[]>([]);
  protected readonly stats = signal<StatCard[]>([]);

  protected readonly canOps    = this.authSession.hasPermission('TRAMITE_READ');
  protected readonly canDesign = this.authSession.hasPermission('WORKFLOW_READ');
  protected readonly canAdmin  = this.authSession.hasPermission('DEPT_READ');

  protected readonly username = computed(() => this.session()?.username ?? '');

  protected readonly roleLabel = computed(() => {
    switch (this.session()?.roleCode) {
      case 'ADMINISTRADOR': return 'Administrador del sistema';
      case 'SUPERVISOR':    return 'Supervisor de trámites';
      case 'FUNCIONARIO':   return 'Funcionario operativo';
      case 'APPLICANT':     return 'Portal del solicitante';
      default:              return this.session()?.roleCode ?? '';
    }
  });

  protected readonly roleBadgeColor = computed(() => {
    switch (this.session()?.roleCode) {
      case 'ADMINISTRADOR': return 'admin';
      case 'SUPERVISOR':    return 'sup';
      case 'FUNCIONARIO':   return 'func';
      default:              return 'app';
    }
  });

  ngOnInit(): void {
    if (this.canOps) this.loadStats();
    if (this.canDesign) this.loadInvitations();
  }

  protected respond(inv: Invitation, action: 'accept' | 'reject'): void {
    this.responding.set(inv.id);
    const call = action === 'accept'
      ? this.workflowApi.acceptInvitation(inv.id)
      : this.workflowApi.rejectInvitation(inv.id);
    call.subscribe({
      next: () => {
        this.pendingInvitations.update((l) => l.filter((i) => i.id !== inv.id));
        this.responding.set('');
      },
      error: () => this.responding.set('')
    });
  }

  private loadStats(): void {
    forkJoin({
      procedures:  this.proceduresApi.getProcedures().pipe(catchError(() => of([]))),
      tasks:       this.tasksApi.getMyTasks().pipe(catchError(() => of([]))),
      available:   this.tasksApi.getAvailableTasks().pipe(catchError(() => of([]))),
      applicants:  this.applicantsApi.getApplicants().pipe(catchError(() => of([])))
    }).subscribe(({ procedures, tasks, available, applicants }) => {
      this.stats.set([
        { label: 'Trámites',          value: procedures.length,               icon: 'folder_open',  link: '/operation/procedures', color: 'accent'  },
        { label: 'Mis tareas',        value: tasks.length,                    icon: 'assignment',   link: '/operation/tasks',      color: 'green'   },
        { label: 'Tareas disponibles',value: available.length,               icon: 'inbox',         link: '/operation/tasks',      color: 'orange'  },
        { label: 'Solicitantes',      value: (applicants as any[]).length,    icon: 'people',        link: '/operation/applicants', color: 'purple'  }
      ]);
    });
  }

  private loadInvitations(): void {
    this.workflowApi.getMyInvitations().subscribe({
      next: (list) => {
        const pending = list
          .filter((i) => i.status === 'PENDING')
          .map((i) => ({ ...i, workflowName: (i as any).workflowName ?? i.workflowDefinitionId }));
        this.pendingInvitations.set(pending);
      },
      error: () => {}
    });
  }
}
