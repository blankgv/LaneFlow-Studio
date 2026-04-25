import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <header class="page-header">
      <div>
        <span class="page-header__eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
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
      align-items: start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
    }

    .page-header__eyebrow {
      display: inline-block;
      margin-bottom: 10px;
      color: #0a7a6c;
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0 0 8px;
      font-size: clamp(1.8rem, 2.4vw, 2.4rem);
      line-height: 1.06;
      color: #1d2433;
    }

    p {
      margin: 0;
      max-width: 64ch;
      color: #637087;
      line-height: 1.62;
    }

    .page-header__action {
      flex-shrink: 0;
      border-radius: 12px;
    }

    @media (max-width: 720px) {
      .page-header {
        flex-direction: column;
      }
    }
  `]
})
export class AdminPageHeaderComponent {
  @Input({ required: true }) eyebrow = '';
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input() actionLabel = '';
  @Input() actionLink: string[] | null = null;
  @Input() actionIcon = 'add';
}
