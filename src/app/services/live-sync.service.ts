import { Injectable, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LiveSyncService {
  private authService = inject(AuthService);
  private hubConnection: signalR.HubConnection | null = null;

  connectionState = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');
  isConnected = signal(false);

  // Event subjects
  appointmentBooked$ = new Subject<any>();
  patientCheckedIn$ = new Subject<any>();
  appointmentUpdated$ = new Subject<any>();
  patientRegistered$ = new Subject<any>();
  lowStockAlert$ = new Subject<any>();
  invoicePaid$ = new Subject<any>();

  globalActivities = signal<Array<{ icon: string; title: string; time: string; type: string }>>([]);

  constructor() {
    this.loadActivitiesFromStorage();
  }

  private loadActivitiesFromStorage() {
    try {
      const cached = localStorage.getItem('global_activities');
      if (cached) {
        this.globalActivities.set(JSON.parse(cached));
      }
    } catch (e) {}
  }

  private addGlobalActivity(icon: string, title: string, subtitle: string, type: string) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.globalActivities.update((events) => {
      const newEvents = [
        { icon, title: `${title}: ${subtitle}`, time, type },
        ...events.slice(0, 9)
      ];
      localStorage.setItem('global_activities', JSON.stringify(newEvents));
      return newEvents;
    });
  }

  connect() {
    if (this.hubConnection) return;

    this.connectionState.set('connecting');

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        accessTokenFactory: () => this.authService.accessToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    // Listen for server events
    this.hubConnection.on('AppointmentBooked', (data) => {
      this.addGlobalActivity('event', 'New Appointment Booked', data?.patientName || 'Patient', 'info');
      this.appointmentBooked$.next(data);
      this.appointmentUpdated$.next(data);
    });

    this.hubConnection.on('PatientCheckedIn', (data) => {
      this.addGlobalActivity('how_to_reg', 'Patient Checked In', data?.patientName || 'Patient', 'success');
      this.patientCheckedIn$.next(data);
      this.appointmentUpdated$.next(data);
    });

    this.hubConnection.on('AppointmentUpdated', (data) => {
      this.appointmentUpdated$.next(data);
    });

    this.hubConnection.on('PatientRegistered', (data) => {
      this.addGlobalActivity('person_add', 'New Patient Registered', data?.name || 'Patient', 'primary');
      this.patientRegistered$.next(data);
    });

    this.hubConnection.on('LowStockAlert', (data) => {
      this.addGlobalActivity('warning', 'Low Stock Alert', data?.medicineName || 'Medicine', 'warning');
      this.lowStockAlert$.next(data);
    });

    this.hubConnection.on('InvoicePaid', (data) => {
      this.addGlobalActivity('payments', 'Invoice Paid', `Amount: $${data?.amountPaid || 0}`, 'success');
      this.invoicePaid$.next(data);
    });

    this.hubConnection.onclose(() => {
      this.connectionState.set('disconnected');
      this.isConnected.set(false);
    });

    this.hubConnection.onreconnecting(() => {
      this.connectionState.set('connecting');
      this.isConnected.set(false);
    });

    this.hubConnection.onreconnected(() => {
      this.connectionState.set('connected');
      this.isConnected.set(true);
    });

    this.hubConnection
      .start()
      .then(() => {
        this.connectionState.set('connected');
        this.isConnected.set(true);
      })
      .catch(() => {
        this.connectionState.set('disconnected');
        this.isConnected.set(false);
      });
  }

  disconnect() {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.hubConnection = null;
      this.connectionState.set('disconnected');
      this.isConnected.set(false);
    }
  }
}
