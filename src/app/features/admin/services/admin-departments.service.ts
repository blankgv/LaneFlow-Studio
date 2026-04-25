import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { DepartmentOption } from '../models/department-option.model';
import { DepartmentPayload } from '../models/department-payload.model';

@Injectable({
  providedIn: 'root'
})
export class AdminDepartmentsService {
  private readonly api = inject(ApiService);

  getDepartments(): Observable<DepartmentOption[]> {
    return this.api.get<DepartmentOption[]>('/admin/departments');
  }

  getDepartmentById(id: string): Observable<DepartmentOption> {
    return this.api.get<DepartmentOption>(`/admin/departments/${id}`);
  }

  createDepartment(payload: DepartmentPayload): Observable<DepartmentOption> {
    return this.api.post<DepartmentOption>('/admin/departments', payload);
  }

  updateDepartment(id: string, payload: DepartmentPayload): Observable<DepartmentOption> {
    return this.api.put<DepartmentOption>(`/admin/departments/${id}`, payload);
  }

  deleteDepartment(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/departments/${id}`);
  }
}
