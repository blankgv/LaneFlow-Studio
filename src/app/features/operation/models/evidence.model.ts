export type EvidenceCategory =
  | 'GENERAL'
  | 'IDENTITY_DOCUMENT'
  | 'SUPPORT_DOCUMENT'
  | 'PAYMENT_RECEIPT'
  | 'PHOTO'
  | 'OTHER';

export interface Evidence {
  id: string;
  procedureId: string;
  taskId?: string | null;
  nodeId?: string | null;
  formId?: string | null;
  fieldId?: string | null;
  fieldName?: string | null;
  uploadedBy?: string | null;
  fileName: string;
  originalFileName: string;
  contentType?: string | null;
  extension?: string | null;
  sizeBytes: number;
  storageProvider?: string | null;
  bucketName?: string | null;
  storagePath?: string | null;
  mediaLink?: string | null;
  description?: string | null;
  category?: EvidenceCategory | null;
  createdAt?: string | null;
}

export interface EvidenceUpload {
  procedureId: string;
  file: File;
  description?: string;
  category?: EvidenceCategory;
  taskId?: string;
  nodeId?: string;
  fieldName?: string;
}

export interface PendingEvidence {
  file: File | null;
  description: string;
  category: EvidenceCategory;
}
