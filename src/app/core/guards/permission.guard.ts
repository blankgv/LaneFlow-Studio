import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthSessionService } from '../../features/auth/services/auth-session.service';

function requiredPermissions(route: ActivatedRouteSnapshot): string[] {
  const permissions = route.data['permissions'];

  if (Array.isArray(permissions)) {
    return permissions.filter((item): item is string => typeof item === 'string');
  }

  if (typeof permissions === 'string') {
    return [permissions];
  }

  return [];
}

export const permissionGuard: CanActivateFn = (route) => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);
  const permissions = requiredPermissions(route);

  if (permissions.length === 0 || authSession.hasAllPermissions(permissions)) {
    return true;
  }

  return router.createUrlTree(['/auth/session'], {
    queryParams: {
      reason: 'forbidden'
    }
  });
};
