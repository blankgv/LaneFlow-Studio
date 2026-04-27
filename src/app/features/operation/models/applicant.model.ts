export type ApplicantType = 'NATURAL_PERSON' | 'LEGAL_ENTITY';
export type ApplicantDocumentType = 'CI' | 'NIT' | 'PASSPORT' | 'OTHER';

export interface Applicant {
  id: string;
  type?: ApplicantType;
  documentType?: ApplicantDocumentType;
  documentNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  legalRepresentative?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  active?: boolean;
}

export interface ApplicantPayload {
  type: ApplicantType;
  documentType: ApplicantDocumentType;
  documentNumber: string;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  legalRepresentative?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}
