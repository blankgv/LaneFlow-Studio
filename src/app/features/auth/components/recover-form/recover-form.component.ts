import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { RecoverAccessRequest } from '../../models/recover-access-request.model';

@Component({
  selector: 'app-recover-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
    <form class="recover-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-heading">
        <div class="form-badge">
          <mat-icon>mark_email_unread</mat-icon>
        </div>
        <h2>Recuperar acceso</h2>
        <p>Ingresa tu correo para continuar.</p>
      </div>

      <div class="state-banner success" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="state-banner error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <mat-form-field appearance="outline">
        <mat-label>Correo electronico</mat-label>
        <input matInput formControlName="email" autocomplete="email" />
        <mat-icon matSuffix>alternate_email</mat-icon>
        <mat-error>{{ emailError }}</mat-error>
      </mat-form-field>

      <button mat-flat-button color="primary" class="submit-button" [disabled]="loading">
        <span class="button-content">
          <mat-spinner *ngIf="loading" diameter="16" />
          <span>{{ loading ? 'Enviando...' : 'Enviar instrucciones' }}</span>
        </span>
      </button>

      <a class="secondary-link" routerLink="/auth/login">Volver al inicio de sesion</a>
    </form>
  `,
  styles: [`
    .recover-form {
      display: grid;
      gap: 12px;
    }

    .form-heading {
      margin-bottom: 6px;
      text-align: center;
    }

    .form-badge {
      width: 48px;
      height: 48px;
      margin: 0 auto 14px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: rgba(10, 122, 108, 0.08);
      color: #0a7a6c;
      border: 1px solid rgba(10, 122, 108, 0.12);
    }

    .form-heading h2 {
      margin: 0 0 6px;
      font-size: 1.5rem;
      line-height: 1.08;
    }

    .form-heading p {
      margin: 0;
      color: #637087;
      line-height: 1.5;
      font-size: 0.86rem;
    }

    .state-banner {
      padding: 12px 14px;
      border-radius: 14px;
      font-size: 0.88rem;
      line-height: 1.45;
      border: 1px solid transparent;
    }

    .state-banner.success {
      background: rgba(10, 122, 108, 0.07);
      color: #075d53;
      border-color: rgba(10, 122, 108, 0.14);
    }

    .state-banner.error {
      background: rgba(211, 47, 47, 0.08);
      color: #b3261e;
    }

    .submit-button {
      height: 42px;
      border-radius: 10px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .button-content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 154px;
    }

    .button-content mat-spinner {
      flex-shrink: 0;
    }

    .secondary-link {
      text-align: center;
      color: #0a7a6c;
      text-decoration: none;
      font-size: 0.84rem;
      font-weight: 600;
    }

    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      padding-left: 6px;
    }
  `]
})
export class RecoverFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() successMessage = '';
  @Input() validationErrors: Record<string, string> | null = null;

  @Output() readonly recoverSubmitted = new EventEmitter<RecoverAccessRequest>();

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  protected get emailError(): string {
    if (this.form.controls.email.hasError('required')) {
      return 'El correo es obligatorio.';
    }

    if (this.form.controls.email.hasError('email')) {
      return 'Ingresa un correo valido.';
    }

    return this.validationErrors?.['email'] ?? '';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.recoverSubmitted.emit(this.form.getRawValue());
  }
}
