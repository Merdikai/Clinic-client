import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LiveSyncService } from './services/live-sync.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Clinic Management System';
  authService = inject(AuthService);
  liveSyncService = inject(LiveSyncService);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.liveSyncService.connect();
      } else {
        this.liveSyncService.disconnect();
      }
    });
  }
}
