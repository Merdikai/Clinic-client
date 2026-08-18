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
      this.appointmentBooked$.next(data);
      this.appointmentUpdated$.next(data);
    });

    this.hubConnection.on('PatientCheckedIn', (data) => {
      this.patientCheckedIn$.next(data);
      this.appointmentUpdated$.next(data);
    });

    this.hubConnection.on('AppointmentUpdated', (data) => {
      this.appointmentUpdated$.next(data);
    });

    this.hubConnection.on('PatientRegistered', (data) => {
      this.patientRegistered$.next(data);
    });

    this.hubConnection.on('LowStockAlert', (data) => {
      this.lowStockAlert$.next(data);
    });

    this.hubConnection.on('InvoicePaid', (data) => {
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
