import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SessionOverviewComponent } from '../components/session-overview/session-overview.component';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-session-page',
  standalone: true,
  imports: [SessionOverviewComponent],
  template: `
    <app-session-overview
      [session]="authSession.session()!"
      (logoutRequested)="onLogout()"
    />
  `
})
export class SessionPageComponent {
  protected readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected onLogout(): void {
    this.authSession.logout().subscribe(() => {
      void this.router.navigate(['/auth/login']);
    });
  }
}
