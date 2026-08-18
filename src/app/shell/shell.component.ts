import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../services/auth.service';
import { LiveSyncService } from '../services/live-sync.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent {
  private authService = inject(AuthService);
  liveSync = inject(LiveSyncService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  pageTitle = signal('Dashboard');

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.liveSync.connect();
    }

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updatePageTitle();
      });

    this.updatePageTitle();
  }

  private updatePageTitle() {
    const url = this.router.url;
    if (url.includes('/patients/new')) this.pageTitle.set('Register New Patient');
    else if (url.includes('/patients/')) this.pageTitle.set('Patient Profile');
    else if (url.includes('/patients')) this.pageTitle.set('Patients Directory');
    else if (url.includes('/appointments/book')) this.pageTitle.set('Book Appointment');
    else if (url.includes('/appointments')) this.pageTitle.set('Appointments Schedule');
    else if (url.includes('/pharmacy')) this.pageTitle.set('Pharmacy & Inventory');
    else if (url.includes('/billing')) this.pageTitle.set('Invoices & Billing');
    else if (url.includes('/reports')) this.pageTitle.set('Clinic Analytics');
    else this.pageTitle.set('Clinic Management');
  }

  logout() {
    this.authService.logout();
    this.liveSync.disconnect();
    this.router.navigate(['/login']);
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }
}
