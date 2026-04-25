import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { AuthSession } from '../../models/auth-session.model';

@Component({
  selector: 'app-session-overview',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  template: `
    <section class="workspace-page" *ngIf="session">
      <header class="workspace-header">
        <div>
          <span class="eyebrow">Panel inicial</span>
          <h1>Bienvenido, {{ session.username }}</h1>
          <p>
            El acceso fue autenticado correctamente. Esta vista funciona como
            punto de entrada inicial mientras continuamos construyendo el modulo.
          </p>
        </div>

        <button mat-flat-button color="primary" (click)="logoutRequested.emit()">
          <mat-icon>logout</mat-icon>
          Cerrar sesion
        </button>
      </header>

      <section class="summary-grid">
        <mat-card>
          <mat-card-content>
            <span class="label">Perfil asignado</span>
            <strong>{{ session.roleCode }}</strong>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content>
            <span class="label">Inicio de sesion</span>
            <strong>{{ session.loginAt | date: 'dd/MM/yyyy HH:mm' }}</strong>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content>
            <span class="label">Vigencia de sesion</span>
            <strong>{{ expiresAt | date: 'dd/MM/yyyy HH:mm' }}</strong>
          </mat-card-content>
        </mat-card>
      </section>
    </section>
  `,
  styles: [`
    .workspace-page {
      min-height: 100vh;
      padding: 32px;
      background:
        radial-gradient(circle at top left, rgba(197, 215, 225, 0.34), transparent 22%),
        linear-gradient(180deg, #f6f8fb 0%, #eef2f6 100%);
    }

    .workspace-header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 28px;
    }

    .eyebrow {
      display: inline-block;
      margin-bottom: 10px;
      color: #0f9789;
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }

    h1 {
      margin: 0 0 12px;
      font-size: clamp(2rem, 3vw, 3.25rem);
      line-height: 1.05;
      color: #172033;
    }

    p {
      margin: 0;
      max-width: 60ch;
      color: #5e6b82;
      line-height: 1.65;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }

    mat-card {
      border-radius: 22px;
      border: 1px solid rgba(23, 32, 51, 0.06);
      box-shadow: 0 18px 36px rgba(23, 32, 51, 0.06);
    }

    .label {
      display: block;
      margin-bottom: 10px;
      color: #75809a;
      font-size: 0.84rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    strong {
      color: #172033;
      font-size: 1.1rem;
    }

    @media (max-width: 960px) {
      .workspace-page {
        padding: 24px;
      }

      .workspace-header {
        flex-direction: column;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SessionOverviewComponent {
  @Input({ required: true }) session!: AuthSession;
  @Output() readonly logoutRequested = new EventEmitter<void>();

  protected get expiresAt(): number {
    return this.session.loginAt + this.session.expiresIn;
  }
}
