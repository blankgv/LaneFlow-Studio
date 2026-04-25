import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(path);
  }

  post<T>(path: string, payload: unknown): Observable<T> {
    return this.http.post<T>(path, payload);
  }

  put<T>(path: string, payload: unknown): Observable<T> {
    return this.http.put<T>(path, payload);
  }

  patch<T>(path: string, payload: unknown): Observable<T> {
    return this.http.patch<T>(path, payload);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(path);
  }
}
