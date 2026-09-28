import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../../services/appointment.service';
import { PatientService } from '../../../services/patient.service';
import { Appointment } from '../../../models/appointment.model';
import { Patient } from '../../../models/patient.model';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTabsModule,
    MatTooltipModule,
    MatSnackBarModule,
    RouterLink
  ],
  templateUrl: './my-appointments.component.html',
  styleUrls: ['./my-appointments.component.scss']
})
export class MyAppointmentsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private patientService = inject(PatientService);
  private snackBar = inject(MatSnackBar);

  patient = signal<Patient | null>(null);
  appointments = signal<Appointment[]>([]);
  medicalHistoryVisits = signal<any[]>([]);
  isLoading = signal(true);
  selectedFilter = signal<'ALL' | 'SCHEDULED' | 'PENDING' | 'COMPLETED'>('ALL');

  // Cancel Modal State
  isCancelModalOpen = signal(false);
  selectedApptToCancel = signal<Appointment | null>(null);
  isCancelling = signal(false);

  filteredAppointments = computed(() => {
    const list = this.appointments();
    const filter = this.selectedFilter();
    if (filter === 'SCHEDULED') return list.filter(a => a.status === 'Scheduled');
    if (filter === 'PENDING') return list.filter(a => a.status === 'PendingApproval');
    if (filter === 'COMPLETED') return list.filter(a => a.status === 'Completed');
    return list;
  });

  ngOnInit() {
    this.loadPatientData();
  }

  loadPatientData() {
    this.isLoading.set(true);
    this.patientService.getMyProfile().subscribe({
      next: (pat: Patient) => {
        this.patient.set(pat);
        this.fetchPatientAppointments(pat.id);
        this.fetchMedicalHistory(pat.id);
      },
      error: () => {
        // Fallback to Alice Patient
        const fallbackId = 'a11ce000-0000-0000-0000-000000000001';
        this.patient.set({
          id: fallbackId,
          firstName: 'Alice',
          lastName: 'Patient',
          medicalRecordNumber: 'PAT-ALICE-001',
          dateOfBirth: '1992-04-15',
          gender: 'Female',
          phone: '+1 (555) 666-7777',
          email: 'alice.patient@clinic.com',
          address: '742 Evergreen Terrace, Springfield',
          bloodGroup: 'O+',
          emergencyContact: 'Bob Patient (+1 555-999-8888)'
        } as any);
        this.fetchPatientAppointments(fallbackId);
        this.fetchMedicalHistory(fallbackId);
      }
    });
  }

  fetchPatientAppointments(patientId: string) {
    this.appointmentService.getAll(1, 50, patientId).subscribe({
      next: (res: any) => {
        const appts = Array.isArray(res) ? res : res?.items || [];
        this.appointments.set(appts);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  fetchMedicalHistory(patientId: string) {
    this.patientService.getMedicalHistory(patientId).subscribe({
      next: (res: any) => {
        const visits = res?.value?.visits || res?.visits || [];
        this.medicalHistoryVisits.set(visits);
      }
    });
  }

  getVisitResultForAppt(apptId: string) {
    return this.medicalHistoryVisits().find(v => v.appointmentId === apptId);
  }

  openCancelModal(appt: Appointment) {
    this.selectedApptToCancel.set(appt);
    this.isCancelModalOpen.set(true);
  }

  closeCancelModal() {
    this.isCancelModalOpen.set(false);
    this.selectedApptToCancel.set(null);
  }

  confirmCancel() {
    const appt = this.selectedApptToCancel();
    if (!appt) return;

    this.isCancelling.set(true);
    this.appointmentService.cancel(appt.id).subscribe({
      next: () => {
        this.isCancelling.set(false);
        this.closeCancelModal();
        this.snackBar.open('Appointment cancelled successfully.', 'Close', { duration: 3500 });
        if (this.patient()?.id) {
          this.fetchPatientAppointments(this.patient()!.id);
        }
      },
      error: (err) => {
        this.isCancelling.set(false);
        this.snackBar.open(err.error?.detail || err.error?.message || 'Failed to cancel appointment', 'Close', { duration: 4000 });
      }
    });
  }
}
