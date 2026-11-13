import { ChangeDetectionStrategy, Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { AppointmentService } from '../../../services/appointment.service';
import { MedicalHistoryVisitDto, PatientMedicalHistoryDto, PatientService } from '../../../services/patient.service';
import { Appointment } from '../../../models/appointment.model';
import { PagedResponse, Patient } from '../../../models/patient.model';
import { ResultEnvelope, extractProblemDetailsMessage, unwrapResult } from '../../../models/api.model';
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
  styleUrls: ['./my-appointments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyAppointmentsComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly patientService = inject(PatientService);
  private readonly toast = inject(ToastService);

  patient = signal<Patient | null>(null);
  appointments = signal<Appointment[]>([]);
  medicalHistoryVisits = signal<readonly MedicalHistoryVisitDto[]>([]);
  isLoading = signal(true);
  selectedFilter = signal<'ALL' | 'SCHEDULED' | 'PENDING' | 'COMPLETED'>('ALL');

  // Cancel Modal State
  isCancelModalOpen = signal(false);
  selectedApptToCancel = signal<Appointment | null>(null);
  isCancelling = signal(false);

  pageSubtitle = computed(() => {
    const mrn = this.patient()?.medicalRecordNumber || 'Pending Verification';
    return `MRN: ${mrn} · View confirmed appointments, consultation results, recorded vitals, and pending visit requests`;
  });

  filteredAppointments = computed(() => {
    const list = this.appointments();
    const filter = this.selectedFilter();
    if (filter === 'SCHEDULED') return list.filter((a) => a.status === 'Scheduled');
    if (filter === 'PENDING') return list.filter((a) => a.status === 'PendingApproval');
    if (filter === 'COMPLETED') return list.filter((a) => a.status === 'Completed');
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
        this.isLoading.set(false);
        this.toast.error('Unable to load your patient profile. Please sign in with your patient account.');
      }
    });
  }

  fetchPatientAppointments(patientId: string) {
    this.appointmentService.getAll(1, 50, patientId).subscribe({
      next: (res: PagedResponse<Appointment> | Appointment[]) => {
        const appts = Array.isArray(res) ? res : (res.items ?? []);
        this.appointments.set(appts);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  fetchMedicalHistory(patientId: string) {
    this.patientService.getMedicalHistory(patientId).subscribe({
      next: (res: PatientMedicalHistoryDto | ResultEnvelope<PatientMedicalHistoryDto>) => {
        const dto = unwrapResult(res);
        this.medicalHistoryVisits.set(dto.visits ?? []);
      },
      error: () => {}
    });
  }

  getVisitResultForAppt(apptId: string): MedicalHistoryVisitDto | undefined {
    return this.medicalHistoryVisits().find((v) => v.appointmentId === apptId);
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
        const currentPat = this.patient();
        if (currentPat?.id) {
          this.fetchPatientAppointments(currentPat.id);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isCancelling.set(false);
        this.toast.error(extractProblemDetailsMessage(err.error, 'Failed to cancel appointment'));
      }
    });
  }
}
