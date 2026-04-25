import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { LoginCredentials } from '../models/login-credentials.model';
import { AuthSession } from '../models/auth-session.model';
import { AuthApiService } from './auth-api.service';

const AUTH_STORAGE_KEY = 'laneflow.auth.session';

@Injectable({
  providedIn: 'root'
})
export class AuthSessionService {
  private readonly authApi = inject(AuthApiService);
  private readonly sessionState = signal<AuthSession | null>(this.readStoredSession());

  readonly session = computed(() => {
    const current = this.sessionState();

    if (!current) {
      return null;
    }

    if (this.isExpired(current)) {
      this.clearSession();
      return null;
    }

    return current;
  });

  readonly isAuthenticated = computed(() => this.session() !== null);

  readonly token = computed(() => this.session()?.token ?? null);
  readonly permissions = computed(() => this.session()?.permissions ?? []);

  login(credentials: LoginCredentials): Observable<AuthSession> {
    return this.authApi.login(credentials).pipe(
      map((response) => ({
        ...response,
        loginAt: Date.now()
      })),
      tap((session) => this.persistSession(session))
    );
  }

  logout(): Observable<void> {
    return this.authApi.logout().pipe(
      catchError(() => of(void 0)),
      tap(() => this.clearSession())
    );
  }

  clearSession(): void {
    this.sessionState.set(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((permission) => this.hasPermission(permission));
  }

  private persistSession(session: AuthSession): void {
    this.sessionState.set(session);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  private readStoredSession(): AuthSession | null {
    const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!rawSession) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawSession) as AuthSession;
      return this.isExpired(parsed) ? null : parsed;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }

  private isExpired(session: AuthSession): boolean {
    return session.loginAt + session.expiresIn <= Date.now();
  }
}
