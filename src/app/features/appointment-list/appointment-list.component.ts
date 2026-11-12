import { Component, HostListener, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent, StatusTone } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-appointment-list',
  standalone: true,
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
  public permissionService = inject(PermissionService);
  private patientService = inject(PatientService);
  public authService = inject(AuthService);
  private appointmentService = inject(AppointmentService);
  private vitalSignsService = inject(VitalSignsService);
  private toast = inject(ToastService);

  isPatient = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'patient' || this.authService.hasRole('Patient'));
  canConsult = computed(() => this.authService.hasRole('Doctor'));
  isNurse = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'nurse' || this.authService.hasRole('Nurse'));
  isReceptionist = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'receptionist' || this.authService.hasRole('Receptionist'));
  isAdmin = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'admin' || this.authService.hasRole('Admin'));
  canBookAppointment = computed(() => this.isNurse() || this.isReceptionist() || this.isPatient());

  showCheckInModal = signal(false);
  checkInTargetAppt = signal<any>(null);
  tokenInput = signal<string>('');
  visitTypeInput = signal<string>('General Consultation');
  routingStation = signal<string>('Nurse Triage Station');

  showRescheduleModal = signal(false);
  rescheduleTargetAppt = signal<any>(null);
  rescheduleDate = signal<string>('');
  rescheduleTime = signal<string>('10:00');
  rescheduleReason = signal<string>('');

  activePatientId = signal<string | null>(null);
  doctorFilterScope = signal<'all' | 'my'>(this.authService.hasRole('Doctor') ? 'my' : 'all');
  appointmentStore = inject(AppointmentStore);
  apptStore = this.appointmentStore;
  private router = inject(Router);
  private liveSyncService = inject(LiveSyncService);
  appointments = this.appointmentStore.appointments;
  isLoading = this.appointmentStore.isLoading;
  displayedColumns = ['date', 'patient', 'doctor', 'status', 'actions'];

  selectedStatusFilter = signal<string>('ALL');

  scopedAppointments = computed(() => {
    const list = this.appointments() || [];
    if (this.authService.hasRole('Doctor') && this.doctorFilterScope() === 'my') {
      const user: any = this.authService.currentUser();
      const currentUserName = user ? ((user.fullName || user.name || user.username || user.email || '') as string).trim().toLowerCase() : '';
      const userId = user?.id || user?.userId || '';
      return list.filter(a =>
        (currentUserName && a.doctorName && a.doctorName.toLowerCase().includes(currentUserName)) ||
        (userId && a.doctorId && a.doctorId === userId)
      );
    }
    return list;
  });

  filteredAppointments = computed(() => {
    let list = this.scopedAppointments() || [];
    const filter = this.selectedStatusFilter();
    if (filter !== 'ALL') {
      list = list.filter(a => a.status?.toLowerCase() === filter.toLowerCase());
    }
    return list;
  });

  scheduledCount = computed(() => (this.appointments() || []).filter(a => a.status === 'Scheduled').length);
  checkedInCount = computed(() => (this.appointments() || []).filter(a => a.status === 'CheckedIn').length);
  completedCount = computed(() => (this.appointments() || []).filter(a => a.status === 'Completed').length);

  isVitalsModalOpen = signal(false);
  vitalsHistory = signal<any[]>([]);
  activeVitalsAppointment = signal<any>(null);
  isSubmittingVitals = signal(false);
  vitalsSystolic = signal<number>(120);
  vitalsDiastolic = signal<number>(80);
  vitalsHeartRate = signal<number>(72);
  vitalsTemp = signal<number>(36.8);
  vitalsRespiratory = signal<number>(16);
  vitalsWeight = signal<number>(70);
  vitalsHeight = signal<number>(170);
  vitalsOxygenSaturation = signal<number>(98);
  vitalsPainScore = signal<number>(0);
  vitalsTriageUrgency = signal<string>('Routine');
  vitalsRoomAssignment = signal<string>('Exam Room 1');
  vitalsTriageNotes = signal<string>('');

  computedBmi = computed(() => {
    const hM = (this.vitalsHeight() || 170) / 100;
    const wKg = this.vitalsWeight() || 70;
    if (hM <= 0) return 0;
    return parseFloat((wKg / (hM * hM)).toFixed(1));
  });

  bmiCategory = computed<{ label: string; tone: StatusTone }>(() => {
    const bmi = this.computedBmi();
    if (bmi < 18.5) return { label: 'Underweight', tone: 'info' };
    if (bmi < 25) return { label: 'Normal Weight', tone: 'success' };
    if (bmi < 30) return { label: 'Overweight', tone: 'warning' };
    return { label: 'Obese', tone: 'danger' };
  });

  bpCategory = computed<{ label: string; tone: StatusTone }>(() => {
    const sys = this.vitalsSystolic() || 120;
    const dia = this.vitalsDiastolic() || 80;
    if (sys < 120 && dia < 80) return { label: 'Normal BP', tone: 'success' };
    if (sys <= 129 && dia < 80) return { label: 'Elevated BP', tone: 'warning' };
    if (sys <= 139 || dia <= 89) return { label: 'Stage 1 HTN', tone: 'warning' };
    return { label: 'Stage 2 HTN', tone: 'danger' };
  });

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

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isVitalsModalOpen()) {
      this.closeVitalsModal();
    } else if (this.showCheckInModal()) {
      this.closeReceptionCheckInModal();
    } else if (this.showRescheduleModal()) {
      this.closeRescheduleModal();
    }
  }

  ngOnInit() {
    if (this.authService.isDoctor()) {
      this.router.navigate(['/my-consultations']);
      return;
    }

    this.patientService.getAll(1, 1).subscribe({
      next: (res: any) => {
        if (res.items && res.items.length > 0) {
          this.activePatientId.set(res.items[0].id);
        }
      }
    });
    this.appointmentStore.loadAppointments();
  }

  onDateChange(date: Date | null) {
    this.appointmentStore.setSelectedDate(date);
    this.appointmentStore.loadAppointments();
  }

  checkIn(appointmentId: string) {
    this.appointmentStore.checkIn(appointmentId);
    this.toast.success('Patient checked in and added to queue.');
  }

  openReceptionCheckInModal(appt: any) {
    this.checkInTargetAppt.set(appt);
    const existingToken = appt.tokenNumber || `Q-${Math.floor(100 + Math.random() * 900)}`;
    this.tokenInput.set(existingToken);
    this.visitTypeInput.set(appt.visitType || 'General Consultation');
    this.routingStation.set('Nurse Triage Station');
    this.showCheckInModal.set(true);
  }

  closeReceptionCheckInModal() {
    this.showCheckInModal.set(false);
    this.checkInTargetAppt.set(null);
  }

  confirmReceptionCheckIn() {
    const appt = this.checkInTargetAppt();
    if (!appt) return;

    this.appointmentService.checkInWithDetails(appt.id, this.tokenInput(), this.visitTypeInput()).subscribe({
      next: () => {
        this.toast.success(`Checked in with Token ${this.tokenInput()} and routed to ${this.routingStation()}.`);
        this.appointmentStore.loadAppointments();
        this.closeReceptionCheckInModal();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || err.error?.title || 'Check-in failed');
      }
    });
  }

  openRescheduleModal(appt: any) {
    this.rescheduleTargetAppt.set(appt);
    const curr = appt.scheduledDateTime ? new Date(appt.scheduledDateTime) : new Date();
    this.rescheduleDate.set(curr.toISOString().split('T')[0]);
    this.rescheduleTime.set(`${String(curr.getHours()).padStart(2, '0')}:${String(curr.getMinutes()).padStart(2, '0')}`);
    this.rescheduleReason.set('');
    this.showRescheduleModal.set(true);
  }

  closeRescheduleModal() {
    this.showRescheduleModal.set(false);
    this.rescheduleTargetAppt.set(null);
  }

  confirmReschedule() {
    const appt = this.rescheduleTargetAppt();
    if (!appt || !this.rescheduleDate()) {
      this.toast.warning('Please pick a valid reschedule date');
      return;
    }

    const [hours, minutes] = (this.rescheduleTime() || '09:00').split(':').map(Number);
    const dateObj = new Date(this.rescheduleDate());
    dateObj.setHours(hours || 9, minutes || 0, 0, 0);

    this.appointmentService.reschedule(appt.id, dateObj.toISOString(), this.rescheduleReason()).subscribe({
      next: () => {
        this.toast.success(`Appointment rescheduled to ${dateObj.toLocaleDateString()} at ${this.rescheduleTime()}`);
        this.appointmentStore.loadAppointments();
        this.closeRescheduleModal();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || err.error?.title || 'Rescheduling failed');
      }
    });
  }

  markNoShow(appt: any) {
    if (!confirm(`Mark appointment for ${appt.patientName || 'patient'} as No-Show?`)) return;

    this.appointmentService.markNoShow(appt.id, 'No-show flagged by Front Desk Reception').subscribe({
      next: () => {
        this.toast.info(`Appointment marked as No-Show for ${appt.patientName || 'patient'}.`);
        this.appointmentStore.loadAppointments();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || err.error?.title || 'Failed to update No-Show status');
      }
    });
  }

  canConsultFor(appointment: any): boolean {
    if (!this.canConsult()) return false;
    const currentId = this.authService.currentUserId();
    if (!appointment?.doctorId || !currentId) return true;
    return appointment.doctorId.toLowerCase() === currentId.toLowerCase();
  }

  cancel(appointmentId: string) {
    this.appointmentStore.cancel(appointmentId);
    this.toast.info('Appointment cancelled.');
  }

  openVitalsModal(appointment: any) {
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
      next: (res: any) => {
        const v = res?.value || res;
        if (v && (v.systolicBP != null || v.systolicBp != null || v.SystolicBP != null)) {
          const sys = v.systolicBP ?? v.systolicBp ?? v.SystolicBP;
          const dia = v.diastolicBP ?? v.diastolicBp ?? v.DiastolicBP;
          const hr = v.heartRateBpm ?? v.heartRate ?? v.HeartRateBpm;
          const temp = v.temperatureC ?? v.temperature ?? v.TemperatureC;
          const resp = v.respiratoryRate ?? v.RespiratoryRate;
          const wt = v.weightKg ?? v.WeightKg;
          const ht = v.heightCm ?? v.HeightCm;
          const spo2 = v.oxygenSaturation ?? v.OxygenSaturation;
          const pain = v.painScore ?? v.PainScore;

          const freshVitals = {
            ...v,
            systolicBP: Number(sys),
            diastolicBP: Number(dia),
            heartRateBpm: Number(hr),
            temperatureC: Number(temp),
            respiratoryRate: Number(resp),
            weightKg: Number(wt),
            heightCm: Number(ht),
            oxygenSaturation: spo2 != null ? Number(spo2) : undefined,
            painScore: pain != null ? Number(pain) : undefined
          };

          appointment.vitalSigns = freshVitals;
          this.activeVitalsAppointment.set({ ...appointment });
          this.populateVitals(freshVitals);
          this.vitalsHistory.set([freshVitals]);
          this.appointmentStore.updateAppointmentVitals(appointment.id, freshVitals);
        }
      },
      error: () => { }
    });

    this.isVitalsModalOpen.set(true);
  }

  private populateVitals(v: any) {
    if (!v) return;
    const sys = v.systolicBP ?? v.systolicBp ?? v.SystolicBP;
    const dia = v.diastolicBP ?? v.diastolicBp ?? v.DiastolicBP;
    const hr = v.heartRateBpm ?? v.heartRate ?? v.HeartRateBpm;
    const temp = v.temperatureC ?? v.temperature ?? v.TemperatureC;
    const resp = v.respiratoryRate ?? v.RespiratoryRate;
    const wt = v.weightKg ?? v.WeightKg;
    const ht = v.heightCm ?? v.HeightCm;
    const spo2 = v.oxygenSaturation ?? v.OxygenSaturation;
    const pain = v.painScore ?? v.PainScore;

    if (sys != null && !isNaN(Number(sys))) this.vitalsSystolic.set(Number(sys));
    if (dia != null && !isNaN(Number(dia))) this.vitalsDiastolic.set(Number(dia));
    if (hr != null && !isNaN(Number(hr))) this.vitalsHeartRate.set(Number(hr));
    if (temp != null && !isNaN(Number(temp))) this.vitalsTemp.set(Number(temp));
    if (resp != null && !isNaN(Number(resp))) this.vitalsRespiratory.set(Number(resp));
    if (wt != null && !isNaN(Number(wt))) this.vitalsWeight.set(Number(wt));
    if (ht != null && !isNaN(Number(ht))) this.vitalsHeight.set(Number(ht));
    if (spo2 != null && !isNaN(Number(spo2))) this.vitalsOxygenSaturation.set(Number(spo2));
    if (pain != null && !isNaN(Number(pain))) this.vitalsPainScore.set(Number(pain));
  }

  private resetVitalsToDefault() {
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

  closeVitalsModal() {
    this.isVitalsModalOpen.set(false);
    this.activeVitalsAppointment.set(null);
  }

  submitVitals() {
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
    const staffId = currentUser?.id || (appt.doctorId !== '00000000-0000-0000-0000-000000000000' ? appt.doctorId : undefined);
    this.vitalSignsService.record(payload, staffId).subscribe({
      next: (res: any) => {
        const savedData = res?.value || res || payload;
        const freshVitals = {
          ...savedData,
          systolicBP: payload.systolicBP,
          diastolicBP: payload.diastolicBP,
          heartRateBpm: payload.heartRateBpm,
          temperatureC: payload.temperatureC,
          respiratoryRate: payload.respiratoryRate,
          weightKg: payload.weightKg,
          heightCm: payload.heightCm,
          oxygenSaturation: payload.oxygenSaturation,
          painScore: payload.painScore
        };

        appt.vitalSigns = freshVitals;
        this.activeVitalsAppointment.set({ ...appt });
        this.appointmentStore.updateAppointmentVitals(appt.id, freshVitals);

        this.appointmentService.updateTriage(appt.id, {
          triageUrgency: this.vitalsTriageUrgency(),
          roomAssignment: this.vitalsRoomAssignment(),
          triageNotes: this.vitalsTriageNotes(),
          status: (appt.status === 'CheckedIn' || appt.status === 'Scheduled') ? 'TriageComplete' : undefined
        }).subscribe({
          next: () => this.appointmentStore.loadAppointments(),
          error: () => { }
        });

        this.isSubmittingVitals.set(false);
        this.isVitalsModalOpen.set(false);
        this.toast.success(`Vital signs and triage saved for ${appt.patientName || 'patient'}.`);
        this.appointmentStore.loadAppointments();
      },
      error: (err: any) => {
        this.isSubmittingVitals.set(false);
        this.toast.error(err.error?.detail || err.error?.title || 'Failed to record vital signs');
      }
    });
  }

  dischargePatient(appointmentId: string) {
    this.appointmentService.updateStatus(appointmentId, { status: 'Completed' }).subscribe({
      next: () => {
        this.toast.success('Patient discharged and appointment completed.');
        this.appointmentStore.loadAppointments();
      },
      error: (err: any) => {
        this.toast.error(err.error?.detail || 'Failed to discharge patient');
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
}
