import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import {
  ProcedureHistory,
  ProcedureInstance,
  ProcedureResolveObservationPayload,
  ProcedureStartPayload,
  ProcedureStatusInfo
} from '../models/procedure.model';

@Injectable({ providedIn: 'root' })
export class ProceduresApiService {
  private readonly api = inject(ApiService);

  startProcedure(payload: ProcedureStartPayload): Observable<ProcedureInstance> {
    return this.api.post<ProcedureInstance>('/procedures/start', payload);
  }

  getProcedures(): Observable<ProcedureInstance[]> {
    return this.api.get<ProcedureInstance[]>('/procedures');
  }

  getProcedure(id: string): Observable<ProcedureInstance> {
    return this.api.get<ProcedureInstance>(`/procedures/${id}`);
  }

  resolveObservation(id: string, payload: ProcedureResolveObservationPayload): Observable<ProcedureInstance> {
    return this.api.post<ProcedureInstance>(`/procedures/${id}/resolve-observation`, payload);
  }

  getStatus(id: string): Observable<ProcedureStatusInfo> {
    return this.api.get<ProcedureStatusInfo>(`/tracking/procedures/${id}/status`);
  }

  getHistory(id: string): Observable<ProcedureHistory> {
    return this.api.get<ProcedureHistory>(`/tracking/procedures/${id}/history`);
  }
}
