import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ResetPasswordRequest } from '../../models/reset-password-request.model';

function passwordsMatchValidator(control: AbstractControl) {
  const password = control.get('newPassword')?.value;
  const confirmation = control.get('confirmPassword')?.value;
  return password && confirmation && password !== confirmation ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password-form',
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
    <form class="reset-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-heading">
        <div class="form-badge">
          <mat-icon>device_hub</mat-icon>
        </div>
        <h2>Nueva contrasena</h2>
        <p>Define una nueva contrasena para restablecer el acceso a tu cuenta.</p>
      </div>

      <div class="state-banner error" *ngIf="tokenMissing">
        El enlace de recuperacion no es valido o no contiene un token.
      </div>
      <div class="state-banner success" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="state-banner error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <mat-form-field appearance="outline">
        <mat-label>Nueva contrasena</mat-label>
        <input
          matInput
          [type]="hidePassword ? 'password' : 'text'"
          formControlName="newPassword"
          autocomplete="new-password"
        />
        <button
          type="button"
          mat-icon-button
          matSuffix
          (click)="hidePassword = !hidePassword"
          [attr.aria-label]="hidePassword ? 'Mostrar contrasena' : 'Ocultar contrasena'"
        >
          <mat-icon>{{ hidePassword ? 'visibility' : 'visibility_off' }}</mat-icon>
        </button>
        <mat-error>{{ newPasswordError }}</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Confirmar contrasena</mat-label>
        <input
          matInput
          [type]="hideConfirmation ? 'password' : 'text'"
          formControlName="confirmPassword"
          autocomplete="new-password"
        />
        <button
          type="button"
          mat-icon-button
          matSuffix
          (click)="hideConfirmation = !hideConfirmation"
          [attr.aria-label]="hideConfirmation ? 'Mostrar contrasena' : 'Ocultar contrasena'"
        >
          <mat-icon>{{ hideConfirmation ? 'visibility' : 'visibility_off' }}</mat-icon>
        </button>
        <mat-error>{{ confirmationError }}</mat-error>
      </mat-form-field>

      <button
        mat-flat-button
        color="primary"
        class="submit-button"
        [disabled]="loading || tokenMissing"
      >
        <span class="button-content">
          <mat-spinner *ngIf="loading" diameter="16" />
          <span>{{ loading ? 'Actualizando...' : 'Actualizar contrasena' }}</span>
        </span>
      </button>

      <a class="secondary-link" routerLink="/auth/login">Volver al inicio de sesion</a>
    </form>
  `,
  styles: [`
    .reset-form {
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
      min-width: 168px;
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
export class ResetPasswordFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  @Input() loading = false;
  @Input() token = '';
  @Input() tokenMissing = false;
  @Input() errorMessage = '';
  @Input() successMessage = '';
  @Input() validationErrors: Record<string, string> | null = null;

  @Output() readonly resetSubmitted = new EventEmitter<ResetPasswordRequest>();

  protected hidePassword = true;
  protected hideConfirmation = true;

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    },
    {
      validators: passwordsMatchValidator
    }
  );

  protected get newPasswordError(): string {
    if (this.form.controls.newPassword.hasError('required')) {
      return 'La contrasena es obligatoria.';
    }

    if (this.form.controls.newPassword.hasError('minlength')) {
      return 'La contrasena debe tener al menos 6 caracteres.';
    }

    return this.validationErrors?.['newPassword'] ?? '';
  }

  protected get confirmationError(): string {
    if (this.form.controls.confirmPassword.hasError('required')) {
      return 'Confirma la contrasena.';
    }

    if (this.form.hasError('passwordsMismatch')) {
      return 'Las contrasenas no coinciden.';
    }

    return '';
  }

  protected submit(): void {
    if (this.form.invalid || this.tokenMissing) {
      this.form.markAllAsTouched();
      return;
    }

    this.resetSubmitted.emit({
      token: this.token,
      newPassword: this.form.controls.newPassword.getRawValue()
    });
  }
}
