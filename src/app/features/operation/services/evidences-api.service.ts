import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { Evidence, EvidenceCategory, EvidenceUpload } from '../models/evidence.model';

@Injectable({ providedIn: 'root' })
export class EvidencesApiService {
  private readonly api = inject(ApiService);

  getProcedureEvidences(procedureId: string): Observable<Evidence[]> {
    return this.api.get<Evidence[]>(`/evidences?procedureId=${encodeURIComponent(procedureId)}`);
  }

  uploadProcedureEvidence(upload: EvidenceUpload): Observable<Evidence> {
    return this.api.post<Evidence>('/evidences/upload', this.toFormData(upload));
  }

  uploadTaskEvidence(upload: EvidenceUpload): Observable<Evidence> {
    return this.api.post<Evidence>('/evidences/upload', this.toFormData(upload));
  }

  deleteEvidence(id: string): Observable<void> {
    return this.api.delete<void>(`/evidences/${id}`);
  }

  private toFormData(upload: EvidenceUpload): FormData {
    const formData = new FormData();
    formData.append('procedureId', upload.procedureId);
    formData.append('file', upload.file);
    this.appendOptional(formData, 'description', upload.description);
    this.appendOptional(formData, 'category', this.toBackendCategory(upload.category));
    this.appendOptional(formData, 'taskId', upload.taskId);
    this.appendOptional(formData, 'nodeId', upload.nodeId);
    this.appendOptional(formData, 'fieldName', upload.fieldName);
    return formData;
  }

  private appendOptional(formData: FormData, key: string, value: string | undefined): void {
    const normalized = value?.trim();
    if (normalized) formData.append(key, normalized);
  }

  private toBackendCategory(category: EvidenceCategory | string | undefined): EvidenceCategory | undefined {
    if (!category) return undefined;
    const normalized = category.trim().toUpperCase();
    const map: Record<string, EvidenceCategory> = {
      GENERAL: 'GENERAL',
      'DOCUMENTO DE IDENTIDAD': 'IDENTITY_DOCUMENT',
      IDENTITY_DOCUMENT: 'IDENTITY_DOCUMENT',
      'DOCUMENTO DE RESPALDO': 'SUPPORT_DOCUMENT',
      SUPPORT_DOCUMENT: 'SUPPORT_DOCUMENT',
      'COMPROBANTE DE PAGO': 'PAYMENT_RECEIPT',
      PAYMENT_RECEIPT: 'PAYMENT_RECEIPT',
      FOTO: 'PHOTO',
      PHOTO: 'PHOTO',
      OTRO: 'OTHER',
      OTHER: 'OTHER'
    };
    return map[normalized];
  }
}
