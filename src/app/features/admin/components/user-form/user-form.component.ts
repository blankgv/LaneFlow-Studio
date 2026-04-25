import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { Role } from '../../models/role.model';
import { Staff } from '../../models/staff.model';
import { UserPayload } from '../../models/user-payload.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  template: `
    <form class="user-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="user-form__grid">
        <mat-form-field appearance="outline">
          <mat-label>Usuario</mat-label>
          <input matInput formControlName="username" [readonly]="isEditMode" />
          <mat-error>{{ usernameError }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Correo</mat-label>
          <input matInput formControlName="email" autocomplete="email" />
          <mat-error>{{ emailError }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" *ngIf="!isEditMode">
          <mat-label>Contrasena inicial</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          <mat-error>{{ passwordError }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="roleId">
            <mat-option *ngFor="let role of roles" [value]="role.id">
              {{ role.code }} - {{ role.name }}
            </mat-option>
          </mat-select>
          <mat-error>{{ fieldError('roleId', 'Selecciona un rol.') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Personal asociado</mat-label>
          <mat-select formControlName="staffId">
            <mat-option *ngFor="let person of staff" [value]="person.id">
              {{ person.code }} - {{ person.firstName }} {{ person.lastName }}
            </mat-option>
          </mat-select>
          <mat-error>{{ fieldError('staffId', 'Selecciona personal asociado.') }}</mat-error>
        </mat-form-field>
      </div>

      <div class="form-message error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="form-actions">
        <a mat-button routerLink="/admin/users">Cancelar</a>
        <button mat-flat-button color="primary" [disabled]="loading || blocked()">
          <span class="button-content">
            <mat-spinner *ngIf="loading" diameter="16" />
            <span>{{ loading ? 'Guardando...' : submitLabel }}</span>
          </span>
        </button>
      </div>
    </form>
  `,
  styles: [`
    .user-form {
      display: grid;
      gap: 16px;
    }

    .user-form__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .span-2 {
      grid-column: span 2;
    }

    .form-message.error {
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(211, 47, 47, 0.08);
      color: #b3261e;
      font-size: 0.9rem;
    }

    .form-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    .button-content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 126px;
    }

    @media (max-width: 720px) {
      .user-form__grid {
        grid-template-columns: 1fr;
      }

      .span-2 {
        grid-column: span 1;
      }

      .form-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }
    }
  `]
})
export class UserFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  @Input() staff: Staff[] = [];
  @Input() roles: Role[] = [];
  @Input() isEditMode = false;
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() validationErrors: Record<string, string> | null = null;
  @Input() submitLabel = 'Guardar usuario';

  @Output() readonly formSubmitted = new EventEmitter<UserPayload>();

  protected readonly form = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: [''],
    email: ['', [Validators.required, Validators.email]],
    staffId: ['', [Validators.required]],
    roleId: ['', [Validators.required]]
  });

  protected readonly blocked = signal(false);

  @Input() set initialValue(value: User | null) {
    if (!value) {
      this.form.reset({
        username: '',
        password: '',
        email: '',
        staffId: '',
        roleId: ''
      });
      this.blocked.set(false);
      return;
    }

    this.form.reset({
      username: value.username,
      password: '',
      email: value.email,
      staffId: value.staffId ?? '',
      roleId: value.roleId
    });
      this.blocked.set(false);
  }

  protected fieldError(controlName: 'staffId' | 'roleId', fallback: string): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return fallback;
    }

    return this.validationErrors?.[controlName] ?? '';
  }

  protected get usernameError(): string {
    if (this.form.controls.username.hasError('required')) {
      return 'El usuario es obligatorio.';
    }

    return this.validationErrors?.['username'] ?? '';
  }

  protected get emailError(): string {
    const control = this.form.controls.email;

    if (control.hasError('required')) {
      return 'El correo es obligatorio.';
    }

    if (control.hasError('email')) {
      return 'Ingresa un correo valido.';
    }

    return this.validationErrors?.['email'] ?? '';
  }

  protected get passwordError(): string {
    if (this.isEditMode) {
      return '';
    }

    const control = this.form.controls.password;

    if (control.hasError('required')) {
      return 'La contrasena inicial es obligatoria.';
    }

    if (control.hasError('minlength')) {
      return 'La contrasena debe tener al menos 6 caracteres.';
    }

    return this.validationErrors?.['password'] ?? '';
  }

  protected submit(): void {
    if (!this.isEditMode) {
      this.form.controls.password.addValidators([Validators.required, Validators.minLength(6)]);
      this.form.controls.password.updateValueAndValidity();
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.formSubmitted.emit({
      username: value.username,
      password: this.isEditMode ? null : value.password || null,
      email: value.email,
      staffId: value.staffId,
      roleId: value.roleId
    });
  }
}
