import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { UserPayload } from '../models/user-payload.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private readonly api = inject(ApiService);

  getUsers(): Observable<User[]> {
    return this.api.get<User[]>('/admin/users');
  }

  getUserById(id: string): Observable<User> {
    return this.api.get<User>(`/admin/users/${id}`);
  }

  createUser(payload: UserPayload): Observable<User> {
    return this.api.post<User>('/admin/users', payload);
  }

  updateUser(id: string, payload: UserPayload): Observable<User> {
    return this.api.put<User>(`/admin/users/${id}`, payload);
  }

  deleteUser(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/users/${id}`);
  }
}
