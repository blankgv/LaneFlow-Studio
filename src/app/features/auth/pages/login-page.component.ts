import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

import { ApiError } from '../../../core/models/api-error.model';
import { resolveHomeRoute } from '../../../core/utils/resolve-home-route';
import { AuthAccessLayoutComponent } from '../components/auth-access-layout/auth-access-layout.component';
import { AuthHeroComponent } from '../components/auth-hero/auth-hero.component';
import { LoginFormComponent } from '../components/login-form/login-form.component';
import { LoginCredentials } from '../models/login-credentials.model';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    AuthAccessLayoutComponent,
    AuthHeroComponent,
    LoginFormComponent
  ],
  template: `
    <app-auth-access-layout>
      <app-auth-hero auth-side />

      <mat-card auth-main class="login-card">
        <mat-card-content>
          <div class="reason-banner" *ngIf="reasonMessage()">{{ reasonMessage() }}</div>

          <app-login-form
            [loading]="isSubmitting()"
            [errorMessage]="errorMessage()"
            [validationErrors]="validationErrors()"
            (loginSubmitted)="onLogin($event)"
          />
        </mat-card-content>
      </mat-card>
    </app-auth-access-layout>
  `,
  styles: [`
    .login-card {
      border-radius: 0;
      border: 0;
      display: grid;
      align-items: center;
      box-shadow: none;
      background: #fffdf8;
    }

    .login-card mat-card-content {
      padding: 30px 34px;
    }

    .reason-banner {
      margin-bottom: 16px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(10, 122, 108, 0.07);
      color: #075d53;
      font-size: 0.84rem;
      line-height: 1.5;
      border: 1px solid rgba(10, 122, 108, 0.14);
    }

    @media (max-width: 720px) {
      .login-card mat-card-content {
        padding: 22px 20px;
      }
    }
  `]
})
export class LoginPageComponent {
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly validationErrors = signal<Record<string, string> | null>(null);
  protected readonly reasonMessage = signal(
    this.route.snapshot.queryParamMap.get('reason') === 'session-expired'
      ? 'La sesion anterior expiro. Ingresa nuevamente para continuar.'
      : ''
  );

  protected onLogin(credentials: LoginCredentials): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.validationErrors.set(null);

    this.authSession.login(credentials).subscribe({
      next: () => {
        void this.router.navigate(resolveHomeRoute(this.authSession));
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(
          apiError?.message || 'No fue posible iniciar sesion. Intenta nuevamente.'
        );
        this.validationErrors.set(apiError?.validationErrors ?? null);
        this.isSubmitting.set(false);
      },
      complete: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}
