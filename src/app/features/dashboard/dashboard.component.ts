import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardSummary } from '../../services/dashboard.service';
import { LabStore } from '../../store/lab.store';
import { LiveSyncService } from '../../services/live-sync.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ToastService } from '../../ui/toast/toast.service';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    RouterLink
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private liveSync = inject(LiveSyncService);
  public authService = inject(AuthService);
  public labStore = inject(LabStore);

  summary = signal<DashboardSummary | null>(null);
  isLoading = signal(true);
  recentEvents = this.liveSync.globalActivities;

  userRole = computed(() => {
    const roles = this.authService.currentUser()?.roles;
    if (roles && roles.length > 0) return roles[0];
    return 'Admin';
  });

  
  private notifService = inject(NotificationService);
  private toast = inject(ToastService);

  isAlertModalOpen = signal(false);
  isSendingAlert = signal(false);
  alertMessage = signal('All medical personnel please be advised: Routine server sync scheduled for tonight.');

  openBroadcastModal() {
    this.isAlertModalOpen.set(true);
  }

  closeBroadcastModal() {
    this.isAlertModalOpen.set(false);
  }

  sendBroadcastAlert() {
    const msg = this.alertMessage().trim();
    if (!msg) return;

    this.isSendingAlert.set(true);
    this.notifService.sendTestNotification(msg).subscribe({
      next: () => {
        this.isSendingAlert.set(false);
        this.isAlertModalOpen.set(false);
        this.toast.success('Announcement broadcast to all staff: ' + msg);
      },
      error: () => {
        this.isSendingAlert.set(false);
        this.toast.error('Failed to broadcast alert notification');
      }
    });
  }

  ngOnInit() {
    this.loadData();
    this.labStore.loadMetrics();
    this.labStore.loadOrders();
    this.labStore.loadTemplates();
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
