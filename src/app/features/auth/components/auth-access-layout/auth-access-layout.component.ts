import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-access-layout',
  standalone: true,
  template: `
    <main class="auth-page">
      <section class="auth-grid">
        <div class="auth-grid__side">
          <ng-content select="[auth-side]" />
        </div>

        <section class="auth-grid__main">
          <ng-content select="[auth-main]" />
        </section>
      </section>
    </main>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      padding: 16px;
      display: grid;
      place-items: center;
    }

    .auth-grid {
      width: min(920px, 100%);
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 0.9fr);
      gap: 0;
      align-items: stretch;
      min-height: 560px;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 48px rgba(29, 36, 51, 0.1), 0 1px 3px rgba(29, 36, 51, 0.06);
      background: #fffdf8;
      border: 1px solid #d7d0c4;
    }

    .auth-grid__main {
      display: grid;
      align-items: center;
      background: #fffdf8;
    }

    @media (max-width: 1080px) {
      .auth-grid {
        grid-template-columns: 1fr;
        min-height: auto;
      }
    }

    @media (max-width: 720px) {
      .auth-page {
        padding: 10px;
      }
    }
  `]
})
export class AuthAccessLayoutComponent {}
