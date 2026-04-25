import { Injectable } from '@angular/core';

import { AppConfig } from './app-config.model';
import { GENERATED_RUNTIME_CONFIG } from './generated-runtime-config';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private readonly config: AppConfig = GENERATED_RUNTIME_CONFIG;

  load(): Promise<void> {
    return Promise.resolve();
  }

  get apiBaseUrl(): string {
    if (!this.config.apiBaseUrl || this.config.apiBaseUrl === '__API_BASE_URL__') {
      throw new Error('API_BASE_URL is not configured.');
    }

    return this.config.apiBaseUrl.replace(/\/+$/, '');
  }
}
