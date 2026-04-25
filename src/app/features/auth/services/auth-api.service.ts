import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { LoginCredentials } from '../models/login-credentials.model';
import { LoginResponse } from '../models/login-response.model';
import { RecoverAccessRequest } from '../models/recover-access-request.model';
import { ResetPasswordRequest } from '../models/reset-password-request.model';

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

  recover(payload: RecoverAccessRequest): Observable<void> {
    return this.api.post<void>('/auth/recover', payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<void> {
    return this.api.post<void>('/auth/reset-password', payload);
  }
}
