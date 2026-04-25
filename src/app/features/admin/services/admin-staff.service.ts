import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { Staff } from '../models/staff.model';
import { StaffPayload } from '../models/staff-payload.model';

@Injectable({
  providedIn: 'root'
})
export class AdminStaffService {
  private readonly api = inject(ApiService);

  getStaff(): Observable<Staff[]> {
    return this.api.get<Staff[]>('/admin/staff');
  }

  getStaffById(id: string): Observable<Staff> {
    return this.api.get<Staff>(`/admin/staff/${id}`);
  }

  createStaff(payload: StaffPayload): Observable<Staff> {
    return this.api.post<Staff>('/admin/staff', payload);
  }

  updateStaff(id: string, payload: StaffPayload): Observable<Staff> {
    return this.api.put<Staff>(`/admin/staff/${id}`, payload);
  }

  deleteStaff(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/staff/${id}`);
  }
}
