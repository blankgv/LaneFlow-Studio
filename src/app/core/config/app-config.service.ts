import { Injectable } from '@angular/core';

import { AppConfig } from './app-config.model';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private config: AppConfig = { apiBaseUrl: '', wsBaseUrl: '' };

  load(): Promise<void> {
    return fetch('/assets/config/app-config.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load app config: ${res.status}`);
        return res.json() as Promise<AppConfig>;
      })
      .then((cfg) => {
        this.config = cfg;
      });
  }

  get apiBaseUrl(): string {
    if (!this.config.apiBaseUrl) {
      throw new Error('API_BASE_URL is not configured.');
    }
    return this.config.apiBaseUrl.replace(/\/+$/, '');
  }

  get wsBaseUrl(): string {
    return (this.config.wsBaseUrl ?? '').replace(/\/+$/, '');
  }
}
