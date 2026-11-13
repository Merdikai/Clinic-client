import { Injectable, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, auditTime, takeUntil } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ToastService } from '../ui/toast/toast.service';

export interface ActivityFeedItem {
  readonly icon: string;
  readonly title: string;
  readonly time: string;
  readonly type: 'info' | 'success' | 'warning' | 'primary';
}

export interface AppointmentSyncEvent {
  readonly appointmentId?: string;
  readonly patientName?: string;
  readonly message?: string;
  readonly status?: string;
}

export interface PatientRegisteredEvent {
  readonly patientId?: string;
  readonly name?: string;
}

export interface LowStockEvent {
  readonly medicineId?: string;
  readonly medicineName?: string;
  readonly currentStock?: number;
}

export interface InvoicePaidEvent {
  readonly invoiceId?: string;
  readonly amountPaid?: number;
}

export interface RadiologyOrderSyncEvent {
  readonly orderId?: string;
  readonly message?: string;
}

export interface LabOrderSyncEvent {
  readonly orderNumber?: string;
  readonly message?: string;
  readonly hasCriticalFlag?: boolean;
}

export interface BreakGlassAlertEvent {
  readonly patientId?: string;
  readonly message?: string;
}

export interface DutyRosterEvent {
  readonly userId?: string;
  readonly message?: string;
}

export interface ReportReadyEvent {
  readonly jobId: string;
  readonly reportName?: string;
  readonly reportType?: string;
  readonly rowCount?: number;
  readonly downloadUrl: string;
  readonly completedAtUtc?: string;
  readonly message?: string;
}

@Injectable({ providedIn: 'root' })
export class LiveSyncService {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private hubConnection: signalR.HubConnection | null = null;
  private disconnectedAtMs: number | null = null;
  private readonly subscribedPatientIds = new Set<string>();
  private readonly destroyHub$ = new Subject<void>();

  readonly connectionState = signal<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  readonly isConnected = signal(false);

  // Raw incoming streams
  private readonly appointmentBookedRaw$ = new Subject<AppointmentSyncEvent>();
  private readonly patientCheckedInRaw$ = new Subject<AppointmentSyncEvent>();
  private readonly appointmentUpdatedRaw$ = new Subject<AppointmentSyncEvent>();
  private readonly patientRegisteredRaw$ = new Subject<PatientRegisteredEvent>();
  private readonly lowStockAlertRaw$ = new Subject<LowStockEvent>();
  private readonly invoicePaidRaw$ = new Subject<InvoicePaidEvent>();
  private readonly radiologyOrderUpdatedRaw$ = new Subject<RadiologyOrderSyncEvent>();
  private readonly labOrderUpdatedRaw$ = new Subject<LabOrderSyncEvent>();
  private readonly breakGlassAlertRaw$ = new Subject<BreakGlassAlertEvent>();
  private readonly dutyRosterChangedRaw$ = new Subject<DutyRosterEvent>();

  // Throttled (auditTime(100)) public event streams for UI listeners & SignalStores
  readonly appointmentBooked$ = this.appointmentBookedRaw$.pipe(auditTime(100));
  readonly patientCheckedIn$ = this.patientCheckedInRaw$.pipe(auditTime(100));
  readonly appointmentUpdated$ = this.appointmentUpdatedRaw$.pipe(auditTime(100));
  readonly patientRegistered$ = this.patientRegisteredRaw$.pipe(auditTime(100));
  readonly lowStockAlert$ = this.lowStockAlertRaw$.pipe(auditTime(100));
  readonly invoicePaid$ = this.invoicePaidRaw$.pipe(auditTime(100));
  readonly radiologyOrderUpdated$ = this.radiologyOrderUpdatedRaw$.pipe(auditTime(100));
  readonly labOrderUpdated$ = this.labOrderUpdatedRaw$.pipe(auditTime(100));
  readonly breakGlassAlert$ = this.breakGlassAlertRaw$.pipe(auditTime(100));
  readonly dutyRosterChanged$ = this.dutyRosterChangedRaw$.pipe(auditTime(100));

  readonly reportReady$ = new Subject<ReportReadyEvent>();
  readonly reconnected$ = new Subject<{ readonly prolonged: boolean }>();
  readonly globalActivities = signal<ActivityFeedItem[]>([]);

  constructor() {
    this.loadActivitiesFromStorage();
  }

  private loadActivitiesFromStorage(): void {
    try {
      const cached = localStorage.getItem('global_activities');
      if (cached) {
        this.globalActivities.set(JSON.parse(cached) as ActivityFeedItem[]);
      }
    } catch {}
  }

  private addGlobalActivity(
    icon: string,
    title: string,
    subtitle: string,
    type: ActivityFeedItem['type']
  ): void {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.globalActivities.update((events) => {
      const newEvents: ActivityFeedItem[] = [
        { icon, title: `${title}: ${subtitle}`, time, type },
        ...events.slice(0, 9)
      ];
      try {
        localStorage.setItem('global_activities', JSON.stringify(newEvents));
      } catch {}
      return newEvents;
    });
  }

  connect(): void {
    if (this.hubConnection || !this.authService.isAuthenticated()) {
      return;
    }

    this.connectionState.set('connecting');

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        accessTokenFactory: () => this.authService.accessToken() ?? ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    this.hubConnection.on('AppointmentBooked', (data: AppointmentSyncEvent) => {
      const msg = data?.patientName || data?.message || 'Patient';
      const isBroadcast =
        msg.includes('alert') ||
        msg.includes('Broadcast') ||
        msg.includes('staff') ||
        msg.includes('All staff') ||
        msg.includes('meeting') ||
        msg.length > 25;
      if (isBroadcast) {
        this.addGlobalActivity('campaign', 'Staff Broadcast Announcement', msg, 'warning');
        this.toast.warning(String(msg));
      } else {
        this.addGlobalActivity('event', 'New Appointment Booked', msg, 'info');
      }
      this.appointmentBookedRaw$.next(data ?? {});
      this.appointmentUpdatedRaw$.next(data ?? {});
    });

    this.hubConnection.on('PatientCheckedIn', (data: AppointmentSyncEvent) => {
      this.addGlobalActivity('how_to_reg', 'Patient Checked In', data?.patientName || 'Patient', 'success');
      this.patientCheckedInRaw$.next(data ?? {});
      this.appointmentUpdatedRaw$.next(data ?? {});
    });

    this.hubConnection.on('AppointmentUpdated', (data: AppointmentSyncEvent) => {
      this.appointmentUpdatedRaw$.next(data ?? {});
    });

    this.hubConnection.on('PatientRegistered', (data: PatientRegisteredEvent) => {
      this.addGlobalActivity('person_add', 'New Patient Registered', data?.name || 'Patient', 'primary');
      this.patientRegisteredRaw$.next(data ?? {});
    });

    this.hubConnection.on('LowStockAlert', (data: LowStockEvent) => {
      this.addGlobalActivity('warning', 'Low Stock Alert', data?.medicineName || 'Medicine', 'warning');
      this.lowStockAlertRaw$.next(data ?? {});
    });

    this.hubConnection.on('InvoicePaid', (data: InvoicePaidEvent) => {
      this.addGlobalActivity('payments', 'Invoice Paid', `Amount: $${data?.amountPaid ?? 0}`, 'success');
      this.invoicePaidRaw$.next(data ?? {});
    });

    this.hubConnection.on('RadiologyOrderUpdated', (data: RadiologyOrderSyncEvent) => {
      const msg = data?.message || `Radiology order ${data?.orderId ?? ''} updated`;
      this.addGlobalActivity('image', 'Radiology Study Updated', msg, 'info');
      this.radiologyOrderUpdatedRaw$.next(data ?? {});
    });

    this.hubConnection.on('LabOrderUpdated', (data: LabOrderSyncEvent) => {
      const isCritical = Boolean(data?.hasCriticalFlag);
      const msg = data?.message || `Lab order ${data?.orderNumber ?? ''} updated`;
      this.addGlobalActivity(
        'biotech',
        isCritical ? 'Critical Lab Alert' : 'Laboratory Order Updated',
        msg,
        isCritical ? 'warning' : 'info'
      );
      if (isCritical) {
        this.toast.error(msg);
      }
      this.labOrderUpdatedRaw$.next(data ?? {});
    });

    this.hubConnection.on('BreakGlassAlert', (data: BreakGlassAlertEvent) => {
      const msg = data?.message || 'Emergency record access logged';
      this.addGlobalActivity('security', 'Break-Glass Emergency Access', msg, 'warning');
      this.toast.warning(msg);
      this.breakGlassAlertRaw$.next(data ?? {});
    });

    this.hubConnection.on('DutyRosterChanged', (data: DutyRosterEvent) => {
      const msg = data?.message || 'Staff duty status updated';
      this.addGlobalActivity('badge', 'Duty Roster Changed', msg, 'primary');
      this.dutyRosterChangedRaw$.next(data ?? {});
    });

    this.hubConnection.on('ReportReady', (data: ReportReadyEvent) => {
      if (!data) return;
      const reportTitle = data.reportName || data.reportType || 'Background Report';
      this.addGlobalActivity('summarize', 'Report Ready', reportTitle, 'success');
      this.toast.success(`${reportTitle} (${data.jobId}) is ready for download.`);
      this.reportReady$.next(data);
    });

    this.hubConnection.onclose(() => {
      this.disconnectedAtMs = Date.now();
      this.connectionState.set('disconnected');
      this.isConnected.set(false);
    });

    this.hubConnection.onreconnecting(() => {
      if (this.disconnectedAtMs === null) {
        this.disconnectedAtMs = Date.now();
      }
      this.connectionState.set('reconnecting');
      this.isConnected.set(false);
    });

    this.hubConnection.onreconnected(() => {
      const elapsed = this.disconnectedAtMs ? Date.now() - this.disconnectedAtMs : 0;
      this.disconnectedAtMs = null;
      this.connectionState.set('connected');
      this.isConnected.set(true);

      // Rejoin any patient chart groups monitored prior to disconnect
      void this.rejoinPatientGroups();
      this.reconnected$.next({ prolonged: elapsed > 15_000 });
    });

    this.hubConnection
      .start()
      .then(() => {
        this.disconnectedAtMs = null;
        this.connectionState.set('connected');
        this.isConnected.set(true);
        void this.rejoinPatientGroups();
      })
      .catch(() => {
        this.connectionState.set('disconnected');
        this.isConnected.set(false);
      });

    void takeUntil;
    void this.destroyHub$;
  }

  async subscribeToPatient(patientId: string): Promise<void> {
    if (!patientId) return;
    this.subscribedPatientIds.add(patientId);
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('SubscribeToPatient', patientId);
      } catch {}
    }
  }

  async unsubscribeFromPatient(patientId: string): Promise<void> {
    if (!patientId) return;
    this.subscribedPatientIds.delete(patientId);
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('UnsubscribeFromPatient', patientId);
      } catch {}
    }
  }

  private async rejoinPatientGroups(): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      return;
    }
    for (const patientId of this.subscribedPatientIds) {
      try {
        await this.hubConnection.invoke('SubscribeToPatient', patientId);
      } catch {}
    }
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  disconnect(): void {
    if (this.hubConnection) {
      void this.hubConnection.stop();
      this.hubConnection = null;
      this.connectionState.set('disconnected');
      this.isConnected.set(false);
    }
  }
}
