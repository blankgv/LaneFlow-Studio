import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LoginCredentials } from '../../models/login-credentials.model';

@Component({
  selector: 'app-login-form',
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
    <form class="login-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-heading">
        <div class="form-badge">
          <mat-icon>device_hub</mat-icon>
        </div>
        <h2>Hola otra vez</h2>
        <p>Ingresa tus credenciales para continuar.</p>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Usuario</mat-label>
        <input matInput formControlName="username" autocomplete="username" />
        <mat-icon matSuffix>person</mat-icon>
        <mat-error>{{ usernameError }}</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Contrasena</mat-label>
        <input
          matInput
          [type]="hidePassword ? 'password' : 'text'"
          formControlName="password"
          autocomplete="current-password"
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
        <mat-error>{{ passwordError }}</mat-error>
      </mat-form-field>

      <div class="server-error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <button mat-flat-button color="primary" class="submit-button" [disabled]="loading">
        <span class="button-content">
          <mat-spinner *ngIf="loading" diameter="16" />
          <span>{{ loading ? 'Validando acceso...' : 'Entrar al sistema' }}</span>
        </span>
      </button>

      <a class="secondary-link" routerLink="/auth/recover-access">Olvide mi contrasena</a>
    </form>
  `,
  styles: [`
    .login-form {
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

    .form-badge mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
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

    .server-error {
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(211, 47, 47, 0.08);
      color: #b3261e;
      font-size: 0.92rem;
      line-height: 1.45;
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
      min-width: 148px;
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
export class LoginFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() validationErrors: Record<string, string> | null = null;

  @Output() readonly loginSubmitted = new EventEmitter<LoginCredentials>();

  protected hidePassword = true;

  protected readonly form = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  protected get usernameError(): string {
    if (this.form.controls.username.hasError('required')) {
      return 'El usuario es obligatorio.';
    }

    return this.validationErrors?.['username'] ?? '';
  }

  protected get passwordError(): string {
    if (this.form.controls.password.hasError('required')) {
      return 'La contrasena es obligatoria.';
    }

    return this.validationErrors?.['password'] ?? '';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loginSubmitted.emit(this.form.getRawValue());
  }
}
