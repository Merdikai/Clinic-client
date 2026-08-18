import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AppointmentService } from '../../services/appointment.service';
import { LiveSyncService } from '../../services/live-sync.service';
import { Appointment } from '../../models/appointment.model';

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
  private apptService = inject(AppointmentService);
  private liveSync = inject(LiveSyncService);

  appointments = signal<Appointment[]>([]);
  isLoading = signal(false);
  displayedColumns = ['patient', 'doctor', 'dateTime', 'reason', 'status', 'actions'];

  ngOnInit() {
    this.loadAppointments();
    this.liveSync.appointmentUpdated$.subscribe(() => {
      this.loadAppointments();
    });
  }

  loadAppointments() {
    this.isLoading.set(true);
    this.apptService.getAll().subscribe({
      next: (res) => {
        this.appointments.set(res.items || res || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onCheckIn(id: string) {
    this.apptService.checkIn(id).subscribe({
      next: () => this.loadAppointments()
    });
  }
}
