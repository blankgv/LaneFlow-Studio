import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { appRoutes } from './app.routes';
import { AppConfigService } from './core/config/app-config.service';
import { apiBaseUrlInterceptor } from './core/interceptors/api-base-url.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideAnimations(),
    provideHttpClient(withInterceptors([
      apiBaseUrlInterceptor,
      authTokenInterceptor,
      authErrorInterceptor
    ])),
    {
      provide: APP_INITIALIZER,
      useFactory: (config: AppConfigService) => () => config.load(),
      deps: [AppConfigService],
      multi: true
    }
  ]
};
