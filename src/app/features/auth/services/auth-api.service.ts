import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { LoginCredentials } from '../models/login-credentials.model';
import { LoginResponse } from '../models/login-response.model';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly api = inject(ApiService);

  login(payload: LoginCredentials): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/auth/login', payload);
  }

  logout(): Observable<void> {
    return this.api.post<void>('/auth/logout', {});
  }
}
