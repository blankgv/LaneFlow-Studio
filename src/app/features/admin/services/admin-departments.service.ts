import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { DepartmentOption } from '../models/department-option.model';

@Injectable({
  providedIn: 'root'
})
export class AdminDepartmentsService {
  private readonly api = inject(ApiService);

  getDepartments(): Observable<DepartmentOption[]> {
    return this.api.get<DepartmentOption[]>('/admin/departments');
  }
}
