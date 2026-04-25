import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div class="page-header__text">
        <h1>{{ title }}</h1>
        <p *ngIf="description">{{ description }}</p>
      </div>

      <a
        *ngIf="actionLabel && actionLink"
        mat-flat-button
        color="primary"
        [routerLink]="actionLink"
        class="page-header__action"
      >
        <mat-icon>{{ actionIcon }}</mat-icon>
        {{ actionLabel }}
      </a>
    </header>
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }

    .page-header__text {
      min-width: 0;
    }

    h1 {
      margin: 0 0 4px;
      font-size: 1.35rem;
      font-weight: 600;
      line-height: 1.3;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    p {
      margin: 0;
      max-width: 64ch;
      font-size: 0.86rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .page-header__action {
      flex-shrink: 0;
      border-radius: var(--radius);
      height: 36px;
    }

    @media (max-width: 720px) {
      .page-header {
        flex-direction: column;
      }
    }
  `]
})
export class AdminPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  @Input() actionLink: string[] | null = null;
  @Input() actionIcon = 'add';
}
