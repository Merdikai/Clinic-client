import { Injectable, signal, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LiveSyncService {
  private hubConnection: signalR.HubConnection | null = null;
  public isConnected = signal(false);

  public appointmentUpdated$ = new Subject<any>();
  public patientRegistered$ = new Subject<any>();
  public notificationReceived$ = new Subject<any>();

  connect() {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        accessTokenFactory: () => sessionStorage.getItem('access_token') || ''
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection.on('ReceiveAppointmentStatusUpdated', (data) => {
      this.appointmentUpdated$.next(data);
    });

    this.hubConnection.on('ReceivePatientRegistered', (data) => {
      this.patientRegistered$.next(data);
    });

    this.hubConnection.on('ReceiveNotification', (data) => {
      this.notificationReceived$.next(data);
    });

    this.hubConnection.start()
      .then(() => this.isConnected.set(true))
      .catch(err => {
        console.error('SignalR Connection Error: ', err);
        this.isConnected.set(false);
      });

    this.hubConnection.onclose(() => this.isConnected.set(false));
    this.hubConnection.onreconnected(() => this.isConnected.set(true));
  }

  disconnect() {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.isConnected.set(false);
    }
  }
}
