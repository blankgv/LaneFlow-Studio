import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-module-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card module-page">
      <header class="hero">
        <div>
          <p class="kicker">{{ moduleName }}</p>
          <h2>{{ responsibility }}</h2>
        </div>
        <span class="badge">{{ useCases.length }} casos de uso</span>
      </header>

      <div class="grid">
        <article class="case-card" *ngFor="let useCase of useCases">
          <strong>{{ useCase.code }}</strong>
          <h3>{{ useCase.title }}</h3>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .module-page {
      padding: 28px;
    }

    .hero {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }

    .kicker {
      margin: 0 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.75rem;
      color: var(--color-primary);
      font-weight: 700;
    }

    h2 {
      margin: 0;
      font-size: 1.75rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(240, 180, 90, 0.22);
      color: var(--color-text);
      font-weight: 600;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .case-card {
      padding: 18px;
      border-radius: 16px;
      border: 1px solid var(--color-border);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.75), rgba(240, 239, 230, 0.8));
    }

    .case-card strong {
      color: var(--color-primary);
      font-size: 0.85rem;
      letter-spacing: 0.08em;
    }

    .case-card h3 {
      margin: 10px 0 0;
      font-size: 1rem;
      line-height: 1.4;
    }
  `]
})
export class ModulePageComponent {
  @Input({ required: true }) moduleName = '';
  @Input({ required: true }) responsibility = '';
  @Input({ required: true }) useCases: Array<{ code: string; title: string }> = [];
}
