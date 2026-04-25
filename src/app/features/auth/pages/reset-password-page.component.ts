import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

import { ApiError } from '../../../core/models/api-error.model';
import { AuthAccessLayoutComponent } from '../components/auth-access-layout/auth-access-layout.component';
import { AuthHeroComponent } from '../components/auth-hero/auth-hero.component';
import { ResetPasswordFormComponent } from '../components/reset-password-form/reset-password-form.component';
import { ResetPasswordRequest } from '../models/reset-password-request.model';
import { AuthApiService } from '../services/auth-api.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    AuthAccessLayoutComponent,
    AuthHeroComponent,
    ResetPasswordFormComponent
  ],
  template: `
    <app-auth-access-layout>
      <app-auth-hero auth-side />

      <mat-card auth-main class="auth-card">
        <mat-card-content>
          <app-reset-password-form
            [loading]="isSubmitting()"
            [token]="token()"
            [tokenMissing]="tokenMissing()"
            [errorMessage]="errorMessage()"
            [successMessage]="successMessage()"
            [validationErrors]="validationErrors()"
            (resetSubmitted)="onResetPassword($event)"
          />
        </mat-card-content>
      </mat-card>
    </app-auth-access-layout>
  `,
  styles: [`
    .auth-card {
      border-radius: 0;
      border: 0;
      display: grid;
      align-items: center;
      box-shadow: none;
      background: #fffdf8;
    }

    .auth-card mat-card-content {
      padding: 30px 34px;
    }

    @media (max-width: 720px) {
      .auth-card mat-card-content {
        padding: 22px 20px;
      }
    }
  `]
})
export class ResetPasswordPageComponent {
  private readonly authApi = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly token = signal(this.route.snapshot.queryParamMap.get('token') ?? '');
  protected readonly tokenMissing = signal(!this.token());
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly validationErrors = signal<Record<string, string> | null>(null);

  protected onResetPassword(payload: ResetPasswordRequest): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.validationErrors.set(null);

    this.authApi.resetPassword(payload).subscribe({
      next: () => {
        this.successMessage.set(
          'La contrasena fue actualizada correctamente. Ya puedes iniciar sesion.'
        );

        setTimeout(() => {
          void this.router.navigate(['/auth/login']);
        }, 1200);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(
          apiError?.message || 'No fue posible actualizar la contrasena. Intenta nuevamente.'
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
