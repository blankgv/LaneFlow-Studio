import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="dashboard-page">
      <div class="dashboard-construction">
        <mat-icon>construction</mat-icon>
        <h1>Dashboard</h1>
        <p>Esta seccion esta en construccion.</p>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: grid;
      place-items: center;
      height: 100%;
      min-height: calc(100vh - 0px);
    }

    .dashboard-construction {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
      color: var(--text-muted);
    }

    .dashboard-construction mat-icon {
      width: 40px;
      height: 40px;
      font-size: 40px;
      color: var(--text-subtle);
    }

    h1 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--text);
    }

    p {
      margin: 0;
      font-size: 0.86rem;
    }
  `]
})
export class DashboardPageComponent {}
