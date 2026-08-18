import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AppointmentStore } from '../../store/appointment.store';
import { LiveSyncService } from '../../services/live-sync.service';

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './appointment-list.component.html',
  styleUrls: ['./appointment-list.component.scss']
})
export class AppointmentListComponent implements OnInit {
  apptStore = inject(AppointmentStore);
  private liveSync = inject(LiveSyncService);

  appointments = this.apptStore.appointments;
  isLoading = this.apptStore.isLoading;
  displayedColumns = ['patient', 'doctor', 'dateTime', 'reason', 'status', 'actions'];

  ngOnInit() {
    this.apptStore.loadAppointments();

    this.liveSync.appointmentBooked$.subscribe(() => {
      this.apptStore.loadAppointments();
    });

    this.liveSync.patientCheckedIn$.subscribe(() => {
      this.apptStore.loadAppointments();
    });
  }
}
