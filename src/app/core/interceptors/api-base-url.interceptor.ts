import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AppConfigService } from '../config/app-config.service';

export const apiBaseUrlInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(AppConfigService);

  if (/^https?:\/\//i.test(request.url)) {
    return next(request);
  }

  const normalizedPath = request.url.startsWith('/') ? request.url : `/${request.url}`;
  const apiRequest = request.clone({
    url: `${config.apiBaseUrl}${normalizedPath}`
  });

  return next(apiRequest);
};
