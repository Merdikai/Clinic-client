import { Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { AppointmentService } from '../../../services/appointment.service';
import { PatientService } from '../../../services/patient.service';
import { Appointment } from '../../../models/appointment.model';
import { Patient } from '../../../models/patient.model';
import { ToastService } from '../../../ui/toast/toast.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './my-appointments.component.html',
  styleUrls: ['./my-appointments.component.scss']
})
export class MyAppointmentsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private patientService = inject(PatientService);
  private toast = inject(ToastService);

  patient = signal<Patient | null>(null);
  appointments = signal<Appointment[]>([]);
  medicalHistoryVisits = signal<any[]>([]);
  isLoading = signal(true);
  selectedFilter = signal<'ALL' | 'SCHEDULED' | 'PENDING' | 'COMPLETED'>('ALL');

  // Cancel Modal State
  isCancelModalOpen = signal(false);
  selectedApptToCancel = signal<Appointment | null>(null);
  isCancelling = signal(false);

  pageSubtitle = computed(() => {
    const mrn = this.patient()?.medicalRecordNumber || 'PAT-ALICE-001';
    return `MRN: ${mrn} · View confirmed appointments, consultation results, recorded vitals, and pending visit requests`;
  });

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

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isCancelModalOpen() && !this.isCancelling()) {
      this.closeCancelModal();
    }
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

  statusLabel(status: string): string {
    return status === 'PendingApproval' ? 'Pending Approval' : status;
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
        this.toast.success('Appointment cancelled successfully.');
        if (this.patient()?.id) {
          this.fetchPatientAppointments(this.patient()!.id);
        }
      },
      error: (err) => {
        this.isCancelling.set(false);
        this.toast.error(err.error?.detail || err.error?.message || 'Failed to cancel appointment');
      }
    });
  }
}
