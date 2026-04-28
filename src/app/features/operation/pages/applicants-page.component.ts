import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  Applicant,
  ApplicantDocumentType,
  ApplicantPayload,
  ApplicantType
} from '../models/applicant.model';
import { ApplicantsApiService } from '../services/applicants-api.service';

interface ApplicantForm {
  type: ApplicantType;
  documentType: ApplicantDocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  businessName: string;
  legalRepresentative: string;
  email: string;
  phone: string;
  address: string;
}

@Component({
  selector: 'app-applicants-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  template: `
    <section class="applicants-page">
      <header class="page-header">
        <div>
          <h1>Solicitantes</h1>
          <p>Registra personas naturales o juridicas para iniciar tramites.</p>
        </div>
        <button mat-stroked-button type="button" (click)="reload()">
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
      </header>

      <div class="alert alert--error" *ngIf="error()">
        <mat-icon>error_outline</mat-icon>
        {{ error() }}
      </div>
      <div class="alert alert--success" *ngIf="success()">
        <mat-icon>check_circle</mat-icon>
        {{ success() }}
      </div>

      <div class="credentials-banner" *ngIf="newCredentials()">
        <div class="credentials-banner__header">
          <mat-icon>key</mat-icon>
          <strong>Credenciales de acceso generadas</strong>
          <button type="button" class="credentials-banner__close" (click)="newCredentials.set(null)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <p class="credentials-banner__note">
          Comparte estas credenciales con el solicitante. La contraseña solo se muestra una vez.
        </p>
        <div class="credentials-banner__fields">
          <div class="credentials-banner__field">
            <span>Usuario</span>
            <code>{{ newCredentials()!.username }}</code>
          </div>
          <div class="credentials-banner__field">
            <span>Contraseña inicial</span>
            <code>{{ newCredentials()!.password }}</code>
          </div>
        </div>
      </div>

      <div class="applicants-grid">
        <form class="panel" (ngSubmit)="createApplicant()">
          <h2>Nuevo solicitante</h2>

          <div class="segmented" role="group" aria-label="Tipo de solicitante">
            <button
              type="button"
              [class.is-active]="form.type === 'NATURAL_PERSON'"
              (click)="setType('NATURAL_PERSON')"
            >
              Persona natural
            </button>
            <button
              type="button"
              [class.is-active]="form.type === 'LEGAL_ENTITY'"
              (click)="setType('LEGAL_ENTITY')"
            >
              Persona juridica
            </button>
          </div>

          <div class="form-row">
            <label class="field">
              <span>Tipo de documento</span>
              <select [(ngModel)]="form.documentType" name="documentType" required>
                <option value="CI">CI</option>
                <option value="NIT">NIT</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="OTHER">Otro</option>
              </select>
            </label>

            <label class="field">
              <span>Numero de documento *</span>
              <input [(ngModel)]="form.documentNumber" name="documentNumber" required />
            </label>
          </div>

          <ng-container *ngIf="form.type === 'NATURAL_PERSON'; else legalEntityTpl">
            <div class="form-row">
              <label class="field">
                <span>Nombres *</span>
                <input [(ngModel)]="form.firstName" name="firstName" required />
              </label>
              <label class="field">
                <span>Apellidos *</span>
                <input [(ngModel)]="form.lastName" name="lastName" required />
              </label>
            </div>
          </ng-container>

          <ng-template #legalEntityTpl>
            <label class="field">
              <span>Razon social *</span>
              <input [(ngModel)]="form.businessName" name="businessName" required />
            </label>
            <label class="field">
              <span>Representante legal</span>
              <input [(ngModel)]="form.legalRepresentative" name="legalRepresentative" />
            </label>
          </ng-template>

          <div class="form-row">
            <label class="field">
              <span>Email</span>
              <input type="email" [(ngModel)]="form.email" name="email" />
            </label>
            <label class="field">
              <span>Telefono</span>
              <input [(ngModel)]="form.phone" name="phone" />
            </label>
          </div>

          <label class="field">
            <span>Direccion</span>
            <input [(ngModel)]="form.address" name="address" />
          </label>

          <div class="actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
              <mat-icon>person_add</mat-icon>
              {{ saving() ? 'Creando...' : 'Crear solicitante' }}
            </button>
          </div>
        </form>

        <section class="panel">
          <h2>Solicitantes activos</h2>

          <div class="empty" *ngIf="loading()">
            <mat-icon>hourglass_empty</mat-icon>
            <span>Cargando solicitantes...</span>
          </div>

          <div class="empty" *ngIf="!loading() && applicants().length === 0">
            <mat-icon>person_search</mat-icon>
            <span>No hay solicitantes registrados.</span>
          </div>

          <div class="applicant-list" *ngIf="!loading() && applicants().length > 0">
            <article class="applicant-card" *ngFor="let applicant of applicants()">
              <div>
                <strong>{{ applicantLabel(applicant) }}</strong>
                <span>{{ applicant.type === 'LEGAL_ENTITY' ? 'Persona juridica' : 'Persona natural' }}</span>
              </div>
              <small>
                {{ applicant.documentType || 'DOC' }} {{ applicant.documentNumber || '' }}
              </small>
            </article>
          </div>
        </section>
      </div>
    </section>
  `,
  styles: [`
    .applicants-page {
      max-width: 1120px;
      padding: 28px 32px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }

    .page-header h1 {
      margin: 0;
      color: var(--text);
      font-size: 1.35rem;
    }

    .page-header p {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 0.86rem;
    }

    .applicants-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
      gap: 16px;
      align-items: start;
    }

    .panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }

    .panel h2 {
      margin: 0;
      color: var(--text);
      font-size: 0.98rem;
    }

    .segmented {
      display: inline-grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      padding: 4px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
    }

    .segmented button {
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted);
      padding: 8px 10px;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }

    .segmented button.is-active {
      background: var(--surface);
      color: var(--accent-strong);
      box-shadow: var(--shadow-sm);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--text);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .field input,
    .field select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      color: var(--text);
      padding: 9px 12px;
      font: inherit;
      font-weight: 400;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 14px;
      border-top: 1px solid var(--border);
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      margin-bottom: 14px;
      font-size: 0.84rem;
    }

    .alert--error {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .alert--success {
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .empty {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      color: var(--text-muted);
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      font-size: 0.84rem;
    }

    .applicant-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .applicant-card {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
    }

    .applicant-card div {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .applicant-card strong {
      color: var(--text);
      font-size: 0.9rem;
    }

    .applicant-card span,
    .applicant-card small {
      color: var(--text-muted);
      font-size: 0.76rem;
    }

    .credentials-banner {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 18px;
      margin-bottom: 16px;
      border: 1.5px solid var(--accent);
      border-radius: var(--radius);
      background: var(--accent-soft);
    }

    .credentials-banner__header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--accent-strong);
    }

    .credentials-banner__header mat-icon:first-child {
      font-size: 1.2rem;
    }

    .credentials-banner__header strong {
      flex: 1;
      font-size: 0.9rem;
    }

    .credentials-banner__close {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 0;
      background: transparent;
      cursor: pointer;
      color: var(--text-muted);
      padding: 0;
    }

    .credentials-banner__note {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .credentials-banner__fields {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .credentials-banner__field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .credentials-banner__field code {
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 0.88rem;
      letter-spacing: 0.04em;
      font-weight: 700;
      font-family: monospace;
    }

    @media (max-width: 900px) {
      .applicants-grid,
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ApplicantsPageComponent implements OnInit {
  private readonly applicantsApi = inject(ApplicantsApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly applicants = signal<Applicant[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly newCredentials = signal<{ username: string; password: string } | null>(null);

  protected form: ApplicantForm = this.emptyForm();

  ngOnInit(): void {
    this.loadApplicants();
  }

  protected reload(): void {
    this.loadApplicants();
  }

  protected setType(type: ApplicantType): void {
    this.form.type = type;
    this.error.set('');
    if (type === 'NATURAL_PERSON') {
      this.form.businessName = '';
      this.form.legalRepresentative = '';
      this.form.documentType = this.form.documentType === 'NIT' ? 'CI' : this.form.documentType;
      return;
    }
    this.form.firstName = '';
    this.form.lastName = '';
    this.form.documentType = 'NIT';
  }

  protected createApplicant(): void {
    const payload = this.buildPayload();
    if (!payload || this.saving()) return;

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.applicantsApi.createApplicant(payload).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (applicant) => {
        this.applicants.update((list) => [applicant, ...list]);
        this.success.set('Solicitante creado correctamente.');
        if (applicant.initialPassword && applicant.username) {
          this.newCredentials.set({ username: applicant.username, password: applicant.initialPassword });
        }
        this.form = this.emptyForm();
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible crear el solicitante.');
        this.saving.set(false);
      }
    });
  }

  protected applicantLabel(applicant: Applicant): string {
    return applicant.name
      ?? applicant.businessName
      ?? [applicant.firstName, applicant.lastName].filter(Boolean).join(' ')
      ?? 'Solicitante';
  }

  private loadApplicants(): void {
    this.loading.set(true);
    this.error.set('');
    this.applicantsApi.getApplicants().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (applicants) => {
        this.applicants.set(applicants.filter((item) => item.active !== false));
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible cargar los solicitantes.');
        this.loading.set(false);
      }
    });
  }

  private buildPayload(): ApplicantPayload | null {
    const documentNumber = this.normalize(this.form.documentNumber).toUpperCase();
    if (!documentNumber) {
      this.error.set('El numero de documento es obligatorio.');
      return null;
    }

    const email = this.normalize(this.form.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error.set('El email no tiene un formato valido.');
      return null;
    }

    const payload: ApplicantPayload = {
      type: this.form.type,
      documentType: this.form.documentType,
      documentNumber
    };

    if (this.form.type === 'NATURAL_PERSON') {
      const firstName = this.normalize(this.form.firstName);
      const lastName = this.normalize(this.form.lastName);
      if (!firstName || !lastName) {
        this.error.set('Nombres y apellidos son obligatorios para persona natural.');
        return null;
      }
      payload.firstName = firstName;
      payload.lastName = lastName;
    } else {
      const businessName = this.normalize(this.form.businessName);
      if (!businessName) {
        this.error.set('La razon social es obligatoria para persona juridica.');
        return null;
      }
      payload.businessName = businessName;
      this.assignOptional(payload, 'legalRepresentative', this.form.legalRepresentative);
    }

    this.assignOptional(payload, 'email', email);
    this.assignOptional(payload, 'phone', this.form.phone);
    this.assignOptional(payload, 'address', this.form.address);

    return payload;
  }

  private assignOptional<K extends keyof ApplicantPayload>(
    payload: ApplicantPayload,
    key: K,
    value: string
  ): void {
    const normalized = this.normalize(value);
    if (normalized) {
      payload[key] = normalized as ApplicantPayload[K];
    }
  }

  private normalize(value: string): string {
    return value.trim();
  }

  private emptyForm(): ApplicantForm {
    return {
      type: 'NATURAL_PERSON',
      documentType: 'CI',
      documentNumber: '',
      firstName: '',
      lastName: '',
      businessName: '',
      legalRepresentative: '',
      email: '',
      phone: '',
      address: ''
    };
  }
}
