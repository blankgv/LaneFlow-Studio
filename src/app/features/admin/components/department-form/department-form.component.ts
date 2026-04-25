import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { DepartmentOption } from '../../models/department-option.model';
import { DepartmentPayload } from '../../models/department-payload.model';

@Component({
  selector: 'app-department-form',
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
    <form class="department-form" [formGroup]="form" (ngSubmit)="submit()">
      <div class="department-form__grid">
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

        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Departamento padre</mat-label>
          <mat-select formControlName="parentId">
            <mat-option [value]="null">Sin dependencia</mat-option>
            <mat-option *ngFor="let item of availableParents" [value]="item.id">
              {{ item.code }} · {{ item.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="form-message error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="form-actions">
        <a mat-button routerLink="/admin/departments">Cancelar</a>
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
    .department-form {
      display: grid;
      gap: 16px;
    }

    .department-form__grid {
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
      min-width: 136px;
    }

    @media (max-width: 720px) {
      .department-form__grid {
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
export class DepartmentFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  @Input() departments: DepartmentOption[] = [];
  @Input() currentDepartmentId: string | null = null;
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() validationErrors: Record<string, string> | null = null;
  @Input() submitLabel = 'Guardar departamento';

  @Output() readonly formSubmitted = new EventEmitter<DepartmentPayload>();

  protected readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    parentId: [null as string | null]
  });

  @Input() set initialValue(value: DepartmentOption | null) {
    if (!value) {
      this.form.reset({
        code: '',
        name: '',
        description: '',
        parentId: null
      });
      return;
    }

    this.form.reset({
      code: value.code,
      name: value.name,
      description: value.description ?? '',
      parentId: value.parentId
    });
  }

  protected get availableParents(): DepartmentOption[] {
    return this.departments.filter((item) => item.id !== this.currentDepartmentId);
  }

  protected fieldError(controlName: 'code' | 'name', fallback: string): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return fallback;
    }

    return this.validationErrors?.[controlName] ?? '';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.formSubmitted.emit({
      code: value.code,
      name: value.name,
      description: value.description || null,
      parentId: value.parentId || null
    });
  }
}
