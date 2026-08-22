import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardSummary } from '../../services/dashboard.service';
import { LiveSyncService } from '../../services/live-sync.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    RouterLink
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private liveSync = inject(LiveSyncService);
  public authService = inject(AuthService);

  summary = signal<DashboardSummary | null>(null);
  isLoading = signal(true);
  recentEvents = this.liveSync.globalActivities;

  userRole = computed(() => {
    const roles = this.authService.currentUser()?.roles;
    if (roles && roles.length > 0) return roles[0];
    return 'Admin';
  });

  ngOnInit() {
    this.loadData();
    this.setupRealtimeListeners();
  }

  loadData() {
    this.isLoading.set(true);
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.summary.set({
          totalPatients: 0,
          todayAppointments: 0,
          totalAppointmentsToday: 0,
          pendingAppointments: 0,
          completedAppointments: 0,
          todayRevenue: 0,
          dailyRevenue: 0,
          lowStockMedicines: 0,
          lowStockItemsCount: 0,
          outstandingPayments: 0,
          outstandingBalance: 0,
          topMedicines: []
        });
        this.isLoading.set(false);
      }
    });
  }

  private setupRealtimeListeners() {
    this.liveSync.appointmentBooked$.subscribe(() => {
      this.loadData();
    });

    this.liveSync.patientCheckedIn$.subscribe(() => {
      this.loadData();
    });

    this.liveSync.lowStockAlert$.subscribe(() => {
    });

    this.liveSync.invoicePaid$.subscribe(() => {
      this.loadData();
    });
  }
}
