import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { RolePayload } from '../../models/role-payload.model';
import { Role } from '../../models/role.model';

export interface PermissionOption {
  code: string;
  label: string;
  helper: string;
}

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
    <form class="role-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="role-form__grid">
        <mat-form-field appearance="outline">
          <mat-label>Codigo</mat-label>
          <input matInput formControlName="code" />
          <mat-error>{{ fieldError('code', 'El codigo es obligatorio.') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
          <mat-error>{{ fieldError('name', 'El nombre es obligatorio.') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Descripcion</mat-label>
          <textarea matInput rows="3" formControlName="description"></textarea>
        </mat-form-field>
      </div>

      <section class="permissions-block">
        <header class="permissions-block__header">
          <strong>Permisos del rol</strong>
          <span>Selecciona las capacidades que este perfil tendra dentro del sistema.</span>
        </header>

        <div class="permissions-grid">
          <label class="permission-card" *ngFor="let permission of permissionsCatalog">
            <mat-checkbox
              [checked]="isSelected(permission.code)"
              (change)="togglePermission(permission.code, $event.checked)"
            />
            <div>
              <strong>{{ permission.label }}</strong>
              <span>{{ permission.helper }}</span>
            </div>
          </label>
        </div>
      </section>

      <div class="form-message error" *ngIf="permissionsError()">{{ permissionsError() }}</div>
      <div class="form-message error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="form-actions">
        <a mat-button routerLink="/admin/roles">Cancelar</a>
        <button mat-flat-button color="primary" [disabled]="loading">
          <span class="button-content">
            <mat-spinner *ngIf="loading" diameter="16" />
            <span>{{ loading ? 'Guardando...' : submitLabel }}</span>
          </span>
        </button>
      </div>
    </form>
  `,
  styles: [`
    .role-form {
      display: grid;
      gap: 18px;
    }

    .role-form__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .span-2 {
      grid-column: span 2;
    }

    .permissions-block {
      padding: 18px;
      border-radius: 18px;
      background: rgba(10, 122, 108, 0.03);
      border: 1px solid rgba(29, 36, 51, 0.08);
    }

    .permissions-block__header {
      margin-bottom: 14px;
    }

    .permissions-block__header strong,
    .permissions-block__header span {
      display: block;
    }

    .permissions-block__header strong {
      margin-bottom: 6px;
      color: #1d2433;
    }

    .permissions-block__header span {
      color: #637087;
      font-size: 0.88rem;
    }

    .permissions-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .permission-card {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 10px;
      align-items: start;
      padding: 12px;
      border-radius: 14px;
      background: #fffdf8;
      border: 1px solid rgba(29, 36, 51, 0.06);
      cursor: pointer;
    }

    .permission-card strong,
    .permission-card span {
      display: block;
    }

    .permission-card strong {
      margin-bottom: 4px;
      color: #1d2433;
      font-size: 0.88rem;
    }

    .permission-card span {
      color: #637087;
      font-size: 0.8rem;
      line-height: 1.45;
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
      .role-form__grid,
      .permissions-grid {
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
export class RoleFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() validationErrors: Record<string, string> | null = null;
  @Input() submitLabel = 'Guardar rol';
  @Input() permissionsCatalog: PermissionOption[] = [];

  @Output() readonly formSubmitted = new EventEmitter<RolePayload>();

  protected readonly selectedPermissions = this.formBuilder.nonNullable.control<string[]>([], [
    Validators.required
  ]);

  protected readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: ['']
  });

  @Input() set initialValue(value: Role | null) {
    if (!value) {
      this.form.reset({
        code: '',
        name: '',
        description: ''
      });
      this.selectedPermissions.setValue([]);
      return;
    }

    this.form.reset({
      code: value.code,
      name: value.name,
      description: value.description ?? ''
    });
    this.selectedPermissions.setValue(value.permissions);
  }

  protected fieldError(controlName: 'code' | 'name', fallback: string): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return fallback;
    }

    return this.validationErrors?.[controlName] ?? '';
  }

  protected permissionsError(): string {
    if (this.selectedPermissions.hasError('required') || this.selectedPermissions.value.length === 0) {
      return 'Selecciona al menos un permiso.';
    }

    return this.validationErrors?.['permissions'] ?? '';
  }

  protected isSelected(code: string): boolean {
    return this.selectedPermissions.value.includes(code);
  }

  protected togglePermission(code: string, checked: boolean): void {
    const current = this.selectedPermissions.value;
    const next = checked
      ? [...current, code]
      : current.filter((permission) => permission !== code);

    this.selectedPermissions.setValue(next);
    this.selectedPermissions.markAsTouched();
    this.selectedPermissions.updateValueAndValidity();
  }

  protected submit(): void {
    if (this.form.invalid || this.selectedPermissions.invalid) {
      this.form.markAllAsTouched();
      this.selectedPermissions.markAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.formSubmitted.emit({
      code: value.code,
      name: value.name,
      description: value.description || null,
      permissions: this.selectedPermissions.value
    });
  }
}
