import { ChangeDetectionStrategy, Component, HostListener, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PermissionService } from '../../services/permission.service';
import { PatientService } from '../../services/patient.service';
import { AppointmentStore } from '../../store/appointment.store';
import { LiveSyncService } from '../../services/live-sync.service';
import { VitalSignsService } from '../../services/vital-signs.service';
import { ToastService } from '../../ui/toast/toast.service';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { Appointment, VitalSignsSnapshot } from '../../models/appointment.model';
import { ResultEnvelope, extractProblemDetailsMessage, unwrapResult } from '../../models/api.model';
import {
  combineDateAndTimeToUtcIso,
  formatTimeHHmm,
  toPlainDateIso
} from '../../shared/utils/temporal.util';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent, StatusTone } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

interface RawVitalSignsRecord {
  readonly systolicBP?: number;
  readonly systolicBp?: number;
  readonly SystolicBP?: number;
  readonly diastolicBP?: number;
  readonly diastolicBp?: number;
  readonly DiastolicBP?: number;
  readonly heartRateBpm?: number;
  readonly heartRate?: number;
  readonly HeartRateBpm?: number;
  readonly temperatureC?: number;
  readonly temperature?: number;
  readonly TemperatureC?: number;
  readonly respiratoryRate?: number;
  readonly RespiratoryRate?: number;
  readonly weightKg?: number;
  readonly WeightKg?: number;
  readonly heightCm?: number;
  readonly HeightCm?: number;
  readonly oxygenSaturation?: number;
  readonly OxygenSaturation?: number;
  readonly painScore?: number;
  readonly PainScore?: number;
}

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './appointment-list.component.html',
  styleUrls: ['./appointment-list.component.scss']
})
export class AppointmentListComponent implements OnInit {
  readonly permissionService = inject(PermissionService);
  private readonly patientService = inject(PatientService);
  readonly authService = inject(AuthService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly vitalSignsService = inject(VitalSignsService);
  private readonly toast = inject(ToastService);

  readonly isPatient = computed(
    () => (this.permissionService.activeRole() || '').toLowerCase() === 'patient' || this.authService.hasRole('Patient')
  );
  readonly canConsult = computed(() => this.authService.hasRole('Doctor'));
  readonly isNurse = computed(
    () => (this.permissionService.activeRole() || '').toLowerCase() === 'nurse' || this.authService.hasRole('Nurse')
  );
  readonly isReceptionist = computed(
    () =>
      (this.permissionService.activeRole() || '').toLowerCase() === 'receptionist' ||
      this.authService.hasRole('Receptionist')
  );
  readonly isAdmin = computed(
    () => (this.permissionService.activeRole() || '').toLowerCase() === 'admin' || this.authService.hasRole('Admin')
  );
  readonly canBookAppointment = computed(() => this.isNurse() || this.isReceptionist() || this.isPatient());

  readonly showCheckInModal = signal(false);
  readonly checkInTargetAppt = signal<Appointment | null>(null);
  readonly tokenInput = signal<string>('');
  readonly visitTypeInput = signal<string>('General Consultation');
  readonly routingStation = signal<string>('Nurse Triage Station');

  readonly showRescheduleModal = signal(false);
  readonly rescheduleTargetAppt = signal<Appointment | null>(null);
  readonly rescheduleDate = signal<string>('');
  readonly rescheduleTime = signal<string>('10:00');
  readonly rescheduleReason = signal<string>('');

  readonly activePatientId = signal<string | null>(null);
  readonly doctorFilterScope = signal<'all' | 'my'>(this.authService.hasRole('Doctor') ? 'my' : 'all');
  readonly appointmentStore = inject(AppointmentStore);
  readonly apptStore = this.appointmentStore;
  private readonly router = inject(Router);
  private readonly liveSyncService = inject(LiveSyncService);
  readonly appointments = this.appointmentStore.appointments;
  readonly isLoading = this.appointmentStore.isLoading;
  readonly displayedColumns = ['date', 'patient', 'doctor', 'status', 'actions'];

  readonly selectedStatusFilter = signal<string>('ALL');

  readonly scopedAppointments = computed(() => {
    const list = this.appointments() || [];
    if (this.authService.hasRole('Doctor') && this.doctorFilterScope() === 'my') {
      const user = this.authService.currentUser();
      const currentUserName = user
        ? (user.fullName || user.username || user.email || '').trim().toLowerCase()
        : '';
      const userId = user?.id || user?.userId || '';
      return list.filter(
        (a) =>
          (currentUserName && a.doctorName && a.doctorName.toLowerCase().includes(currentUserName)) ||
          (userId && a.doctorId && a.doctorId === userId)
      );
    }
    return list;
  });

  readonly filteredAppointments = computed(() => {
    let list = this.scopedAppointments() || [];
    const filter = this.selectedStatusFilter();
    if (filter !== 'ALL') {
      list = list.filter((a) => a.status?.toLowerCase() === filter.toLowerCase());
    }
    return list;
  });

  readonly scheduledCount = computed(() => (this.appointments() || []).filter((a) => a.status === 'Scheduled').length);
  readonly checkedInCount = computed(() => (this.appointments() || []).filter((a) => a.status === 'CheckedIn').length);
  readonly completedCount = computed(() => (this.appointments() || []).filter((a) => a.status === 'Completed').length);

  readonly isVitalsModalOpen = signal(false);
  readonly vitalsHistory = signal<VitalSignsSnapshot[]>([]);
  readonly activeVitalsAppointment = signal<Appointment | null>(null);
  readonly isSubmittingVitals = signal(false);
  readonly vitalsSystolic = signal<number>(120);
  readonly vitalsDiastolic = signal<number>(80);
  readonly vitalsHeartRate = signal<number>(72);
  readonly vitalsTemp = signal<number>(36.8);
  readonly vitalsRespiratory = signal<number>(16);
  readonly vitalsWeight = signal<number>(70);
  readonly vitalsHeight = signal<number>(170);
  readonly vitalsOxygenSaturation = signal<number>(98);
  readonly vitalsPainScore = signal<number>(0);
  readonly vitalsTriageUrgency = signal<string>('Routine');
  readonly vitalsRoomAssignment = signal<string>('Exam Room 1');
  readonly vitalsTriageNotes = signal<string>('');

  readonly computedBmi = computed(() => {
    const hM = (this.vitalsHeight() || 170) / 100;
    const wKg = this.vitalsWeight() || 70;
    if (hM <= 0) return 0;
    return parseFloat((wKg / (hM * hM)).toFixed(1));
  });

  readonly bmiCategory = computed<{ label: string; tone: StatusTone }>(() => {
    const bmi = this.computedBmi();
    if (bmi < 18.5) return { label: 'Underweight', tone: 'info' };
    if (bmi < 25) return { label: 'Normal Weight', tone: 'success' };
    if (bmi < 30) return { label: 'Overweight', tone: 'warning' };
    return { label: 'Obese', tone: 'danger' };
  });

  readonly bpCategory = computed<{ label: string; tone: StatusTone }>(() => {
    const sys = this.vitalsSystolic() || 120;
    const dia = this.vitalsDiastolic() || 80;
    if (sys < 120 && dia < 80) return { label: 'Normal BP', tone: 'success' };
    if (sys <= 129 && dia < 80) return { label: 'Elevated BP', tone: 'warning' };
    if (sys <= 139 || dia <= 89) return { label: 'Stage 1 HTN', tone: 'warning' };
    return { label: 'Stage 2 HTN', tone: 'danger' };
  });

  constructor() {
    this.liveSyncService.appointmentBooked$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.appointmentStore.loadAppointments();
    });

    this.liveSyncService.patientCheckedIn$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.appointmentStore.loadAppointments();
    });

    this.liveSyncService.reconnected$.pipe(takeUntilDestroyed()).subscribe(({ prolonged }) => {
      if (prolonged) {
        this.appointmentStore.loadAppointments();
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isVitalsModalOpen()) {
      this.closeVitalsModal();
    } else if (this.showCheckInModal()) {
      this.closeReceptionCheckInModal();
    } else if (this.showRescheduleModal()) {
      this.closeRescheduleModal();
    }
  }

  ngOnInit(): void {
    if (this.authService.isDoctor()) {
      void this.router.navigate(['/my-consultations']);
      return;
    }

    if (!this.isPatient()) {
      this.patientService.getAll(1, 1).subscribe({
        next: (res) => {
          const first = res.items?.[0];
          if (first) {
            this.activePatientId.set(first.id);
          }
        }
      });
    }
    this.appointmentStore.loadAppointments();
  }

  onDateChange(date: Date | null): void {
    this.appointmentStore.setSelectedDate(date);
    this.appointmentStore.loadAppointments();
  }

  checkIn(appointmentId: string): void {
    this.appointmentStore.checkIn(appointmentId);
  }

  openReceptionCheckInModal(appt: Appointment): void {
    this.checkInTargetAppt.set(appt);
    const existingToken = appt.tokenNumber || `Q-${Math.floor(100 + Math.random() * 900)}`;
    this.tokenInput.set(existingToken);
    this.visitTypeInput.set(appt.visitType || 'General Consultation');
    this.routingStation.set('Nurse Triage Station');
    this.showCheckInModal.set(true);
  }

  closeReceptionCheckInModal(): void {
    this.showCheckInModal.set(false);
    this.checkInTargetAppt.set(null);
  }

  confirmReceptionCheckIn(): void {
    const appt = this.checkInTargetAppt();
    if (!appt) return;

    this.appointmentService.checkInWithDetails(appt.id, this.tokenInput(), this.visitTypeInput()).subscribe({
      next: () => {
        this.toast.success(`Checked in with Token ${this.tokenInput()} and routed to ${this.routingStation()}.`);
        this.appointmentStore.loadAppointments();
        this.closeReceptionCheckInModal();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(extractProblemDetailsMessage(err.error, 'Check-in failed'));
      }
    });
  }

  openRescheduleModal(appt: Appointment): void {
    this.rescheduleTargetAppt.set(appt);
    this.rescheduleDate.set(toPlainDateIso(appt.scheduledDateTime || new Date()));
    this.rescheduleTime.set(formatTimeHHmm(appt.scheduledDateTime || new Date()));
    this.rescheduleReason.set('');
    this.showRescheduleModal.set(true);
  }

  closeRescheduleModal(): void {
    this.showRescheduleModal.set(false);
    this.rescheduleTargetAppt.set(null);
  }

  confirmReschedule(): void {
    const appt = this.rescheduleTargetAppt();
    if (!appt || !this.rescheduleDate()) {
      this.toast.warning('Please pick a valid reschedule date');
      return;
    }

    const scheduledIso = combineDateAndTimeToUtcIso(this.rescheduleDate(), this.rescheduleTime() || '09:00');

    this.appointmentService.reschedule(appt.id, scheduledIso, this.rescheduleReason()).subscribe({
      next: () => {
        this.toast.success(`Appointment rescheduled to ${this.rescheduleDate()} at ${this.rescheduleTime()}`);
        this.appointmentStore.loadAppointments();
        this.closeRescheduleModal();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(extractProblemDetailsMessage(err.error, 'Rescheduling failed'));
      }
    });
  }

  markNoShow(appt: Appointment): void {
    if (!confirm(`Mark appointment for ${appt.patientName || 'patient'} as No-Show?`)) return;

    this.appointmentService.markNoShow(appt.id, 'No-show flagged by Front Desk Reception').subscribe({
      next: () => {
        this.toast.info(`Appointment marked as No-Show for ${appt.patientName || 'patient'}.`);
        this.appointmentStore.loadAppointments();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(extractProblemDetailsMessage(err.error, 'Failed to update No-Show status'));
      }
    });
  }

  canConsultFor(appointment: Appointment | null | undefined): boolean {
    if (!this.canConsult()) return false;
    const currentId = this.authService.currentUserId();
    if (!appointment?.doctorId || !currentId) return true;
    return appointment.doctorId.toLowerCase() === currentId.toLowerCase();
  }

  cancel(appointmentId: string): void {
    this.appointmentStore.cancel(appointmentId);
  }

  openVitalsModal(appointment: Appointment): void {
    this.activeVitalsAppointment.set(appointment);
    this.vitalsTriageUrgency.set(appointment.triageUrgency || 'Routine');
    this.vitalsRoomAssignment.set(appointment.roomAssignment || 'Exam Room 1');
    this.vitalsTriageNotes.set(appointment.triageNotes || '');

    this.vitalsHistory.set(appointment.vitalSigns ? [appointment.vitalSigns] : []);
    if (appointment.vitalSigns) {
      this.populateVitals(appointment.vitalSigns);
    } else {
      this.resetVitalsToDefault();
    }

    this.vitalSignsService.getByAppointment(appointment.id).subscribe({
      next: (res: RawVitalSignsRecord | ResultEnvelope<RawVitalSignsRecord>) => {
        const v = unwrapResult(res);
        if (v && (v.systolicBP != null || v.systolicBp != null || v.SystolicBP != null)) {
          const freshVitals: VitalSignsSnapshot = {
            systolicBP: Number(v.systolicBP ?? v.systolicBp ?? v.SystolicBP),
            diastolicBP: Number(v.diastolicBP ?? v.diastolicBp ?? v.DiastolicBP),
            heartRateBpm: Number(v.heartRateBpm ?? v.heartRate ?? v.HeartRateBpm),
            temperatureC: Number(v.temperatureC ?? v.temperature ?? v.TemperatureC),
            respiratoryRate: Number(v.respiratoryRate ?? v.RespiratoryRate),
            weightKg: Number(v.weightKg ?? v.WeightKg),
            heightCm: Number(v.heightCm ?? v.HeightCm),
            oxygenSaturation:
              (v.oxygenSaturation ?? v.OxygenSaturation) != null
                ? Number(v.oxygenSaturation ?? v.OxygenSaturation)
                : undefined,
            painScore: (v.painScore ?? v.PainScore) != null ? Number(v.painScore ?? v.PainScore) : undefined
          };

          const updatedAppt: Appointment = { ...appointment, vitalSigns: freshVitals };
          this.activeVitalsAppointment.set(updatedAppt);
          this.populateVitals(freshVitals);
          this.vitalsHistory.set([freshVitals]);
          this.appointmentStore.updateAppointmentVitals(appointment.id, freshVitals);
        }
      },
      error: () => {}
    });

    this.isVitalsModalOpen.set(true);
  }

  private populateVitals(v: VitalSignsSnapshot | RawVitalSignsRecord | null | undefined): void {
    if (!v) return;
    const raw = v as RawVitalSignsRecord;
    const sys = raw.systolicBP ?? raw.systolicBp ?? raw.SystolicBP;
    const dia = raw.diastolicBP ?? raw.diastolicBp ?? raw.DiastolicBP;
    const hr = raw.heartRateBpm ?? raw.heartRate ?? raw.HeartRateBpm;
    const temp = raw.temperatureC ?? raw.temperature ?? raw.TemperatureC;
    const resp = raw.respiratoryRate ?? raw.RespiratoryRate;
    const wt = raw.weightKg ?? raw.WeightKg;
    const ht = raw.heightCm ?? raw.HeightCm;
    const spo2 = raw.oxygenSaturation ?? raw.OxygenSaturation;
    const pain = raw.painScore ?? raw.PainScore;

    if (sys != null && !Number.isNaN(Number(sys))) this.vitalsSystolic.set(Number(sys));
    if (dia != null && !Number.isNaN(Number(dia))) this.vitalsDiastolic.set(Number(dia));
    if (hr != null && !Number.isNaN(Number(hr))) this.vitalsHeartRate.set(Number(hr));
    if (temp != null && !Number.isNaN(Number(temp))) this.vitalsTemp.set(Number(temp));
    if (resp != null && !Number.isNaN(Number(resp))) this.vitalsRespiratory.set(Number(resp));
    if (wt != null && !Number.isNaN(Number(wt))) this.vitalsWeight.set(Number(wt));
    if (ht != null && !Number.isNaN(Number(ht))) this.vitalsHeight.set(Number(ht));
    if (spo2 != null && !Number.isNaN(Number(spo2))) this.vitalsOxygenSaturation.set(Number(spo2));
    if (pain != null && !Number.isNaN(Number(pain))) this.vitalsPainScore.set(Number(pain));
  }

  private resetVitalsToDefault(): void {
    this.vitalsSystolic.set(120);
    this.vitalsDiastolic.set(80);
    this.vitalsHeartRate.set(72);
    this.vitalsTemp.set(36.8);
    this.vitalsRespiratory.set(16);
    this.vitalsWeight.set(70);
    this.vitalsHeight.set(170);
    this.vitalsOxygenSaturation.set(98);
    this.vitalsPainScore.set(0);
    this.vitalsTriageUrgency.set('Routine');
    this.vitalsRoomAssignment.set('Exam Room 1');
    this.vitalsTriageNotes.set('');
  }

  closeVitalsModal(): void {
    this.isVitalsModalOpen.set(false);
    this.activeVitalsAppointment.set(null);
  }

  submitVitals(): void {
    const appt = this.activeVitalsAppointment();
    if (!appt) return;

    this.isSubmittingVitals.set(true);
    const payload = {
      appointmentId: appt.id,
      systolicBP: Number(this.vitalsSystolic()),
      diastolicBP: Number(this.vitalsDiastolic()),
      heartRateBpm: Number(this.vitalsHeartRate()),
      temperatureC: Number(this.vitalsTemp()),
      respiratoryRate: Number(this.vitalsRespiratory()),
      weightKg: Number(this.vitalsWeight()),
      heightCm: Number(this.vitalsHeight()),
      oxygenSaturation: Number(this.vitalsOxygenSaturation()),
      painScore: Number(this.vitalsPainScore())
    };

    const currentUser = this.authService.currentUser();
    const staffId =
      currentUser?.id || (appt.doctorId !== '00000000-0000-0000-0000-000000000000' ? appt.doctorId : undefined);
    this.vitalSignsService.record(payload, staffId).subscribe({
      next: () => {
        const freshVitals: VitalSignsSnapshot = { ...payload };
        this.activeVitalsAppointment.set({ ...appt, vitalSigns: freshVitals });
        this.appointmentStore.updateAppointmentVitals(appt.id, freshVitals);

        this.appointmentService
          .updateTriage(appt.id, {
            triageUrgency: this.vitalsTriageUrgency(),
            roomAssignment: this.vitalsRoomAssignment(),
            triageNotes: this.vitalsTriageNotes(),
            status: appt.status === 'CheckedIn' || appt.status === 'Scheduled' ? 'TriageComplete' : undefined
          })
          .subscribe({
            next: () => this.appointmentStore.loadAppointments(),
            error: () => {}
          });

        this.isSubmittingVitals.set(false);
        this.isVitalsModalOpen.set(false);
        this.toast.success(`Vital signs and triage saved for ${appt.patientName || 'patient'}.`);
        this.appointmentStore.loadAppointments();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmittingVitals.set(false);
        this.toast.error(extractProblemDetailsMessage(err.error, 'Failed to record vital signs'));
      }
    });
  }

  dischargePatient(appointmentId: string): void {
    this.appointmentService.updateStatus(appointmentId, { status: 'Completed' }).subscribe({
      next: () => {
        this.toast.success('Patient discharged and appointment completed.');
        this.appointmentStore.loadAppointments();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(extractProblemDetailsMessage(err.error, 'Failed to discharge patient'));
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'PT';
    const parts = name.trim().split(' ').filter((p) => p.length > 0);
    if (parts.length >= 2 && parts[0]?.[0] && parts[1]?.[0]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
