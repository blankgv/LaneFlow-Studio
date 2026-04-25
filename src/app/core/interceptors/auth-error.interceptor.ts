import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthSessionService } from '../../features/auth/services/auth-session.service';

export const authErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const authSession = inject(AuthSessionService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authSession.clearSession();

        if (!router.url.startsWith('/auth')) {
          void router.navigate(['/auth/login'], {
            queryParams: {
              reason: 'session-expired'
            }
          });
        }
      }

      return throwError(() => error);
    })
  );
};
