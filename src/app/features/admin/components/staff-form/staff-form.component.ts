import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { DepartmentOption } from '../../models/department-option.model';
import { Staff } from '../../models/staff.model';
import { StaffPayload } from '../../models/staff-payload.model';

@Component({
  selector: 'app-staff-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  template: `
    <form class="staff-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="staff-form__grid">
        <mat-form-field appearance="outline">
          <mat-label>Codigo</mat-label>
          <input matInput formControlName="code" />
          <mat-error>{{ fieldError('code', 'El codigo es obligatorio.') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Departamento</mat-label>
          <mat-select formControlName="departmentId">
            <mat-option *ngFor="let department of departments" [value]="department.id">
              {{ department.code }} · {{ department.name }}
            </mat-option>
          </mat-select>
          <mat-error>{{ fieldError('departmentId', 'Selecciona un departamento.') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Nombres</mat-label>
          <input matInput formControlName="firstName" />
          <mat-error>{{ fieldError('firstName', 'Los nombres son obligatorios.') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Apellidos</mat-label>
          <input matInput formControlName="lastName" />
          <mat-error>{{ fieldError('lastName', 'Los apellidos son obligatorios.') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Correo</mat-label>
          <input matInput formControlName="email" autocomplete="email" />
          <mat-error>{{ emailError }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Telefono</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>
      </div>

      <div class="form-message error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="form-actions">
        <a mat-button routerLink="/admin/staff">Cancelar</a>
        <button mat-flat-button color="primary" [disabled]="loading || departments.length === 0">
          <span class="button-content">
            <mat-spinner *ngIf="loading" diameter="16" />
            <span>{{ loading ? 'Guardando...' : submitLabel }}</span>
          </span>
        </button>
      </div>
    </form>
  `,
  styles: [`
    .staff-form {
      display: grid;
      gap: 16px;
    }

    .staff-form__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
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
      min-width: 128px;
    }

    @media (max-width: 720px) {
      .staff-form__grid {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }
    }
  `]
})
export class StaffFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  @Input() departments: DepartmentOption[] = [];
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() validationErrors: Record<string, string> | null = null;
  @Input() submitLabel = 'Guardar personal';

  @Output() readonly formSubmitted = new EventEmitter<StaffPayload>();

  protected readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required]],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    departmentId: ['', [Validators.required]]
  });

  @Input() set initialValue(value: Staff | null) {
    if (!value) {
      this.form.reset({
        code: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        departmentId: ''
      });
      return;
    }

    this.form.reset({
      code: value.code,
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email,
      phone: value.phone ?? '',
      departmentId: value.departmentId
    });
  }

  protected fieldError(controlName: keyof StaffPayload, fallback: string): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return fallback;
    }

    return this.validationErrors?.[controlName] ?? '';
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

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.formSubmitted.emit({
      ...value,
      phone: value.phone || null
    });
  }
}
