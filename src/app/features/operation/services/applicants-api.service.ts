import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { Applicant, ApplicantPayload } from '../models/applicant.model';

@Injectable({ providedIn: 'root' })
export class ApplicantsApiService {
  private readonly api = inject(ApiService);

  getApplicants(): Observable<Applicant[]> {
    return this.api.get<Applicant[]>('/applicants');
  }

  createApplicant(payload: ApplicantPayload): Observable<Applicant> {
    return this.api.post<Applicant>('/applicants', payload);
  }
}
