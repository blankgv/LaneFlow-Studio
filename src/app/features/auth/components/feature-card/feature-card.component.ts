import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-feature-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="feature-card">
      <header class="feature-card__head">
        <span class="feature-card__icon">
          <mat-icon>{{ icon }}</mat-icon>
        </span>
        <span class="feature-card__badge" *ngIf="badge">{{ badge }}</span>
      </header>

      <div class="feature-card__body">
        <strong class="feature-card__title">{{ title }}</strong>
        <p class="feature-card__description">{{ description }}</p>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .feature-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      height: 100%;
      padding: 18px 20px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.97);
      color: #2f3d60;
      box-shadow: 0 14px 32px rgba(33, 52, 99, 0.22);
      box-sizing: border-box;
    }

    .feature-card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .feature-card__icon {
      width: 38px;
      height: 38px;
      border-radius: 11px;
      background: rgba(75, 105, 182, 0.12);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .feature-card__icon mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      color: #4b69b6;
    }

    .feature-card__badge {
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(75, 105, 182, 0.1);
      color: #4b69b6;
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .feature-card__body {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .feature-card__title {
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.25;
      color: #1f2a44;
    }

    .feature-card__description {
      margin: 0;
      font-size: 0.82rem;
      line-height: 1.5;
      color: #66748f;
    }
  `]
})
export class FeatureCardComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input() badge?: string;
}
