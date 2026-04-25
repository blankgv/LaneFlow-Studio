import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { RolePayload } from '../models/role-payload.model';
import { Role } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class AdminRolesService {
  private readonly api = inject(ApiService);

  getRoles(): Observable<Role[]> {
    return this.api.get<Role[]>('/admin/roles');
  }

  getRoleById(id: string): Observable<Role> {
    return this.api.get<Role>(`/admin/roles/${id}`);
  }

  createRole(payload: RolePayload): Observable<Role> {
    return this.api.post<Role>('/admin/roles', payload);
  }

  updateRole(id: string, payload: RolePayload): Observable<Role> {
    return this.api.put<Role>(`/admin/roles/${id}`, payload);
  }

  deleteRole(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/roles/${id}`);
  }
}
