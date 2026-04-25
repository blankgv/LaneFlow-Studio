import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { appRoutes } from './app.routes';
import { apiBaseUrlInterceptor } from './core/interceptors/api-base-url.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([apiBaseUrlInterceptor]))
  ]
};
