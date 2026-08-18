import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppointmentStore } from '../../store/appointment.store';
import { LiveSyncService } from '../../services/live-sync.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './appointment-list.component.html',
  styleUrls: ['./appointment-list.component.scss']
})
export class AppointmentListComponent implements OnInit {
  appointmentStore = inject(AppointmentStore);
  apptStore = this.appointmentStore;
  private liveSyncService = inject(LiveSyncService);

  appointments = this.appointmentStore.appointments;
  isLoading = this.appointmentStore.isLoading;
  displayedColumns = ['date', 'patient', 'doctor', 'status', 'actions'];

  constructor() {
    this.liveSyncService.appointmentBooked$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.appointmentStore.loadAppointments();
    });

    this.liveSyncService.patientCheckedIn$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.appointmentStore.loadAppointments();
    });
  }

  ngOnInit() {
    this.appointmentStore.loadAppointments();
  }

  onDateChange(date: Date | null) {
    this.appointmentStore.setSelectedDate(date);
    this.appointmentStore.loadAppointments();
  }

  checkIn(appointmentId: string) {
    this.appointmentStore.checkIn(appointmentId);
  }

  cancel(appointmentId: string) {
    this.appointmentStore.cancel(appointmentId);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Scheduled': return 'primary';
      case 'CheckedIn': return 'accent';
      case 'InConsultation': return 'warn';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'primary';
    }
  }
}
