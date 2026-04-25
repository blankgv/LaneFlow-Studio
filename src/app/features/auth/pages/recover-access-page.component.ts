import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { ApiError } from '../../../core/models/api-error.model';
import { AuthAccessLayoutComponent } from '../components/auth-access-layout/auth-access-layout.component';
import { AuthHeroComponent } from '../components/auth-hero/auth-hero.component';
import { RecoverFormComponent } from '../components/recover-form/recover-form.component';
import { RecoverAccessRequest } from '../models/recover-access-request.model';
import { AuthApiService } from '../services/auth-api.service';

@Component({
  selector: 'app-recover-access-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    AuthAccessLayoutComponent,
    AuthHeroComponent,
    RecoverFormComponent
  ],
  template: `
    <app-auth-access-layout>
      <app-auth-hero auth-side />

      <mat-card auth-main class="auth-card">
        <mat-card-content>
          <app-recover-form
            [loading]="isSubmitting()"
            [errorMessage]="errorMessage()"
            [successMessage]="successMessage()"
            [validationErrors]="validationErrors()"
            (recoverSubmitted)="onRecover($event)"
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
export class RecoverAccessPageComponent {
  private readonly authApi = inject(AuthApiService);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly validationErrors = signal<Record<string, string> | null>(null);

  protected onRecover(payload: RecoverAccessRequest): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.validationErrors.set(null);

    this.authApi.recover(payload).subscribe({
      next: () => {
        this.successMessage.set('Revisa tu correo para continuar.');
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(
          apiError?.message || 'No fue posible procesar la solicitud. Intenta nuevamente.'
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
