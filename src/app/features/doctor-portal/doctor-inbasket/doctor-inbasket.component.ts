import { ChangeDetectionStrategy, Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LabService } from '../../../services/lab.service';
import { RadiologyService } from '../../../services/radiology.service';
import { NursingService } from '../../../services/nursing.service';
import { AppointmentService } from '../../../services/appointment.service';
import { PatientService } from '../../../services/patient.service';
import { PrescriptionService } from '../../../services/prescription.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../ui/toast/toast.service';

import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

import { LabOrder } from '../../../models/lab.model';
import { RadiologyOrder } from '../../../models/radiology.model';
import { NursingProcedure } from '../../../models/nursing.model';
import { Appointment } from '../../../models/appointment.model';
import { PagedResponse, Patient } from '../../../models/patient.model';
import { Prescription } from '../../../models/prescription.model';

@Component({
  selector: 'app-doctor-inbasket',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './doctor-inbasket.component.html',
  styleUrls: ['./doctor-inbasket.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DoctorInbasketComponent implements OnInit {
  private labService = inject(LabService);
  private radiologyService = inject(RadiologyService);
  private nursingService = inject(NursingService);
  private appointmentService = inject(AppointmentService);
  private patientService = inject(PatientService);
  private prescriptionService = inject(PrescriptionService);
  public authService = inject(AuthService);
  private toast = inject(ToastService);

  activeTab = signal<'labs' | 'radiology' | 'nursing' | 'approvals' | 'rx'>('labs');
  isLoading = signal(true);
  searchQuery = signal('');

  // Global Scope Filter: 'my' (Current Doctor's Assigned Roster) vs 'all' (Cross-Clinic Shared Records)
  scopeFilter = signal<'my' | 'all'>('my');

  labOrders = signal<LabOrder[]>([]);
  radiologyOrders = signal<RadiologyOrder[]>([]);
  nursingProcedures = signal<NursingProcedure[]>([]);
  appointments = signal<Appointment[]>([]);
  prescriptions = signal<Prescription[]>([]);
  patients = signal<Patient[]>([]);

  // Section-specific sub-categorization filters
  labStatusFilter = signal<'ALL' | 'PendingReview' | 'Completed' | 'Abnormal' | 'Stat'>('ALL');
  radModalityFilter = signal<string>('ALL');
  radStatusFilter = signal<'ALL' | 'PendingReview' | 'SignedOff' | 'Stat'>('ALL');
  nursingStatusFilter = signal<'ALL' | 'Active' | 'Completed' | 'Stat'>('ALL');
  appointmentFilter = signal<'PendingApproval' | 'Scheduled' | 'ALL'>('PendingApproval');
  rxStatusFilter = signal<'ALL' | 'Active' | 'Dispensed'>('ALL');

  // Selected Radiology Order for preview modal
  selectedRadOrder = signal<RadiologyOrder | null>(null);
  isRadModalOpen = signal(false);

  // Active Doctor Information
  currentUserId = computed(() => this.authService.currentUserId());
  currentUserName = computed(() => this.authService.currentUserName());
  isDoctor = computed(() => this.authService.isDoctor());
  isAdmin = computed(() => this.authService.isAdmin());
  canAccessRadiology = computed(() => this.authService.hasAnyRole(['Doctor', 'Radiologist', 'Nurse']));

  headerSubtitle = computed(
    () => `Attending MD: Dr. ${this.currentUserName() || 'Physician'} — Multi-disciplinary worklist review`
  );

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isRadModalOpen()) {
      this.isRadModalOpen.set(false);
    }
  }

  // Doctor Isolation Checking Helpers
  isItemOwnedByDoctor(doctorId?: string, doctorName?: string): boolean {
    if (this.isAdmin()) return true;
    const currentId = this.currentUserId();
    if (currentId && doctorId && doctorId.toLowerCase() === currentId.toLowerCase()) {
      return true;
    }
    const currentName = this.currentUserName();
    if (currentName && doctorName && doctorName.toLowerCase().includes(currentName.toLowerCase())) {
      return true;
    }
    return false;
  }

  canManageLabOrder(order: LabOrder): boolean {
    return this.isItemOwnedByDoctor(order.doctorId, order.doctorName);
  }

  isRadiologist(): boolean {
    return this.authService.isRadiologist();
  }

  canManageRadiologyOrder(order: RadiologyOrder): boolean {
    if (this.isAdmin() || this.isRadiologist()) return true;
    return this.isItemOwnedByDoctor(order.doctorId, order.doctorName);
  }

  canSignOffRadiology(order: RadiologyOrder): boolean {
    if (this.isRadiologist() && !this.isAdmin()) return false;
    return this.isItemOwnedByDoctor(order.doctorId, order.doctorName);
  }

  canReportRadiology(order: RadiologyOrder): boolean {
    return this.isRadiologist();
  }

  canManageNursingProcedure(proc: NursingProcedure): boolean {
    return this.isItemOwnedByDoctor(proc.orderedByDoctorId, proc.orderedByDoctorName);
  }

  canManageAppointment(appt: Appointment): boolean {
    return this.isItemOwnedByDoctor(appt.doctorId, appt.doctorName);
  }

  canManagePrescription(rx: Prescription): boolean {
    return this.isItemOwnedByDoctor(rx.doctorId, rx.doctorName);
  }

  // Actionable count badges (Doctor-isolated vs Total clinic)
  myUnreviewedLabsCount = computed(() => {
    return this.labOrders().filter(o => this.canManageLabOrder(o) && !o.verifiedByDoctorId && (o.status === 'Completed' || o.status === 'InProgress')).length;
  });

  totalUnreviewedLabsCount = computed(() => {
    return this.labOrders().filter(o => !o.verifiedByDoctorId && (o.status === 'Completed' || o.status === 'InProgress')).length;
  });

  myUnreviewedRadCount = computed(() => {
    if (this.isRadiologist()) {
      return this.radiologyOrders().filter(r => r.status === 'Ordered' || r.status === 'Scheduled' || r.status === 'InProgress').length;
    }
    return this.radiologyOrders().filter(r => this.canSignOffRadiology(r) && !r.doctorSignedOffAt && (r.status === 'Reported' || r.status === 'Completed')).length;
  });

  totalUnreviewedRadCount = computed(() => {
    return this.radiologyOrders().filter(r => !r.doctorSignedOffAt && (r.status === 'Reported' || r.status === 'Completed')).length;
  });

  criticalRadiologyOrders = computed(() => {
    return this.radiologyOrders().filter(r => r.isCritical && !r.criticalAlertAcknowledgedByDoctor);
  });

  myActiveNursingCount = computed(() => {
    return this.nursingProcedures().filter(p => this.canManageNursingProcedure(p) && (p.status === 'Ordered' || p.status === 'InProgress')).length;
  });

  totalActiveNursingCount = computed(() => {
    return this.nursingProcedures().filter(p => p.status === 'Ordered' || p.status === 'InProgress').length;
  });

  myPendingApprovalsCount = computed(() => {
    const list = Array.isArray(this.appointments()) ? this.appointments() : [];
    return list.filter(a => this.canManageAppointment(a) && a.status === 'PendingApproval').length;
  });

  totalPendingApprovalsCount = computed(() => {
    const list = Array.isArray(this.appointments()) ? this.appointments() : [];
    return list.filter(a => a.status === 'PendingApproval').length;
  });

  myPrescriptionsCount = computed(() => {
    return this.prescriptions().filter(rx => this.canManagePrescription(rx)).length;
  });

  totalPrescriptionsCount = computed(() => {
    return this.prescriptions().length;
  });

  // Display badge counts depending on scope
  unreviewedLabsCount = computed(() => {
    return this.scopeFilter() === 'my' ? this.myUnreviewedLabsCount() : this.totalUnreviewedLabsCount();
  });

  unreviewedRadiologyCount = computed(() => {
    return this.scopeFilter() === 'my' ? this.myUnreviewedRadCount() : this.totalUnreviewedRadCount();
  });

  activeNursingCount = computed(() => {
    return this.scopeFilter() === 'my' ? this.myActiveNursingCount() : this.totalActiveNursingCount();
  });

  pendingApprovalsCount = computed(() => {
    return this.scopeFilter() === 'my' ? this.myPendingApprovalsCount() : this.totalPendingApprovalsCount();
  });

  // Filtered Lab orders
  displayedLabs = computed(() => {
    const list = Array.isArray(this.labOrders()) ? this.labOrders() : [];
    const query = this.searchQuery().trim().toLowerCase();
    const statusFilter = this.labStatusFilter();
    const scope = this.scopeFilter();

    return list.filter(o => {
      if (scope === 'my' && !this.canManageLabOrder(o)) return false;

      if (statusFilter === 'PendingReview' && o.verifiedByDoctorId) return false;
      if (statusFilter === 'Completed' && o.status !== 'Completed') return false;
      if (statusFilter === 'Abnormal') {
        const hasAbnormal = o.items?.some(i => i.result?.hasAbnormalFlag);
        if (!hasAbnormal) return false;
      }
      if (statusFilter === 'Stat' && o.priority !== 'Stat' && o.priority !== 'Urgent') return false;

      if (query) {
        const pName = (o.patientName || '').toLowerCase();
        const pMrn = (o.patientMedicalRecordNumber || '').toLowerCase();
        const testName = ((o.items && o.items[0]?.testName) || '').toLowerCase();
        const orderNum = (o.orderNumber || '').toLowerCase();
        const docName = (o.doctorName || '').toLowerCase();
        return pName.includes(query) || pMrn.includes(query) || testName.includes(query) || orderNum.includes(query) || docName.includes(query);
      }

      return true;
    });
  });

  unreviewedLabs = computed(() => this.displayedLabs());

  // Filtered Radiology orders
  displayedRadiology = computed(() => {
    const list = Array.isArray(this.radiologyOrders()) ? this.radiologyOrders() : [];
    const query = this.searchQuery().trim().toLowerCase();
    const scope = this.scopeFilter();
    const modalityFilter = this.radModalityFilter();
    const statusFilter = this.radStatusFilter();

    return list.filter(r => {
      if (scope === 'my' && !this.canManageRadiologyOrder(r)) return false;
      if (modalityFilter !== 'ALL' && r.modality !== modalityFilter) return false;
      if (statusFilter === 'PendingReview' && (r.doctorSignedOffAt || (r.status !== 'Reported' && r.status !== 'Completed'))) return false;
      if (statusFilter === 'SignedOff' && !r.doctorSignedOffAt) return false;
      if (statusFilter === 'Stat' && r.priority !== 'Stat' && r.priority !== 'Urgent') return false;

      if (query) {
        const pName = (r.patientName || '').toLowerCase();
        const proc = (r.procedureName || '').toLowerCase();
        const modality = (r.modality || '').toLowerCase();
        const orderNum = (r.orderNumber || '').toLowerCase();
        const docName = (r.doctorName || '').toLowerCase();
        return pName.includes(query) || proc.includes(query) || modality.includes(query) || orderNum.includes(query) || docName.includes(query);
      }
      return true;
    });
  });

  // Filtered Nursing procedures
  displayedNursing = computed(() => {
    const list = Array.isArray(this.nursingProcedures()) ? this.nursingProcedures() : [];
    const query = this.searchQuery().trim().toLowerCase();
    const scope = this.scopeFilter();
    const statusFilter = this.nursingStatusFilter();

    return list.filter(p => {
      if (scope === 'my' && !this.canManageNursingProcedure(p)) return false;
      if (statusFilter === 'Active' && p.status !== 'Ordered' && p.status !== 'InProgress') return false;
      if (statusFilter === 'Completed' && p.status !== 'Completed') return false;
      if (statusFilter === 'Stat' && p.priority !== 'Stat' && p.priority !== 'Urgent') return false;

      if (query) {
        const pName = (p.patientName || '').toLowerCase();
        const type = (p.procedureType || '').toLowerCase();
        const site = (p.bodySite || '').toLowerCase();
        const docName = (p.orderedByDoctorName || '').toLowerCase();
        return pName.includes(query) || type.includes(query) || site.includes(query) || docName.includes(query);
      }
      return true;
    });
  });

  // Filtered Appointments
  displayedAppointments = computed(() => {
    const list = Array.isArray(this.appointments()) ? this.appointments() : [];
    const query = this.searchQuery().trim().toLowerCase();
    const scope = this.scopeFilter();
    const filter = this.appointmentFilter();

    return list.filter(a => {
      if (scope === 'my' && !this.canManageAppointment(a)) return false;
      if (filter !== 'ALL' && a.status !== filter) return false;

      if (query) {
        const pName = (a.patientName || '').toLowerCase();
        const docName = (a.doctorName || '').toLowerCase();
        const reason = (a.reasonForVisit || '').toLowerCase();
        return pName.includes(query) || docName.includes(query) || reason.includes(query);
      }

      return true;
    });
  });

  // Filtered Prescriptions
  displayedPrescriptions = computed(() => {
    const list = Array.isArray(this.prescriptions()) ? this.prescriptions() : [];
    const query = this.searchQuery().trim().toLowerCase();
    const scope = this.scopeFilter();
    const statusFilter = this.rxStatusFilter();

    return list.filter(rx => {
      if (scope === 'my' && !this.canManagePrescription(rx)) return false;
      if (statusFilter === 'Active' && rx.isDispensed) return false;
      if (statusFilter === 'Dispensed' && !rx.isDispensed) return false;

      if (query) {
        const pName = (rx.patientName || '').toLowerCase();
        const pMrn = (rx.patientMrn || '').toLowerCase();
        const docName = (rx.doctorName || '').toLowerCase();
        const medNames = (rx.items || []).map(i => i.medicineName?.toLowerCase() || '').join(' ');
        return pName.includes(query) || pMrn.includes(query) || medNames.includes(query) || docName.includes(query);
      }
      return true;
    });
  });

  ngOnInit() {
    if (this.authService.isRadiologist()) {
      this.activeTab.set('radiology');
    }
    this.loadInbasket();
  }

  loadInbasket() {
    this.isLoading.set(true);

    this.labService.getOrders(1, 100).subscribe({
      next: (res: PagedResponse<LabOrder> | LabOrder[]) => {
        const list = Array.isArray(res) ? res : (res?.items ?? []);
        this.labOrders.set(list);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.radiologyService.getOrders().subscribe({
      next: (orders) => this.radiologyOrders.set(orders || []),
      error: () => this.radiologyOrders.set([])
    });

    this.nursingService.getProcedures().subscribe({
      next: (procs) => this.nursingProcedures.set(procs || []),
      error: () => this.nursingProcedures.set([])
    });

    this.appointmentService.getAll(1, 100).subscribe({
      next: (res: PagedResponse<Appointment> | Appointment[]) => {
        this.appointments.set(Array.isArray(res) ? res : (res?.items ?? []));
      },
      error: () => this.appointments.set([])
    });

    this.prescriptionService.getAll().subscribe({
      next: (res: PagedResponse<Prescription> | Prescription[]) => {
        this.prescriptions.set(Array.isArray(res) ? res : (res?.items ?? []));
      },
      error: () => this.prescriptions.set([])
    });

    this.patientService.getAll(1, 100).subscribe({
      next: (res: PagedResponse<Patient> | Patient[]) => {
        this.patients.set(Array.isArray(res) ? res : (res?.items ?? []));
      },
      error: () => this.patients.set([])
    });
  }

  getPatient(patientId?: string): Patient | undefined {
    if (!patientId) return undefined;
    return this.patients().find(p => p.id?.toLowerCase() === patientId.toLowerCase());
  }

  signOffLab(order: LabOrder) {
    if (!this.canManageLabOrder(order)) {
      this.toast.error(`Doctor Isolation: Only Dr. ${order.doctorName || 'the attending physician'} can sign off on this lab result.`);
      return;
    }
    this.labService.doctorSignOff(order.id, 'Clinical review complete. Result verified and acknowledged.').subscribe({
      next: () => {
        const testName = (order.items && order.items[0]?.testName) || 'Lab Order';
        const patientName = order.patientName || 'Patient';
        this.toast.success(`Physician verification recorded for ${testName} (${patientName}).`);
        this.loadInbasket();
      },
      error: (err) => {
        this.toast.error('Failed to record sign-off: ' + (err.error?.detail || err.message));
      }
    });
  }

  openRadiologyPreview(order: RadiologyOrder) {
    this.selectedRadOrder.set(order);
    this.isRadModalOpen.set(true);
  }

  signOffRadiology(order: RadiologyOrder) {
    if (!this.canSignOffRadiology(order)) {
      this.toast.error(`Doctor Isolation: Only Dr. ${order.doctorName || 'the attending physician'} can sign off on this radiology report.`);
      return;
    }
    this.radiologyService.doctorSignOff(order.id, 'Reviewed and acknowledged by attending physician.').subscribe({
      next: () => {
        this.toast.success(`Physician clinical review signed for ${order.modality}: ${order.procedureName}.`);
        this.isRadModalOpen.set(false);
        this.loadInbasket();
      },
      error: (err) => {
        this.toast.error('Failed to sign off radiology report: ' + (err.error?.detail || err.message));
      }
    });
  }

  acknowledgeCriticalRadiology(order: RadiologyOrder) {
    this.radiologyService.acknowledgeCriticalAlert(order.id, {
      acknowledgmentNotes: 'Verbal and InBasket alert acknowledged by attending MD. Emergency clinical pathway initiated.'
    }).subscribe({
      next: () => {
        this.toast.success(`STAT Critical Finding for ${order.patientName} (${order.accessionNumber || order.orderNumber}) acknowledged.`);
        this.loadInbasket();
      },
      error: (err) => {
        this.toast.error('Failed to acknowledge critical alert: ' + (err.error?.detail || err.message));
      }
    });
  }

  approveAppointment(appt: Appointment) {
    if (!this.canManageAppointment(appt)) {
      this.toast.error(`Doctor Isolation: Only Dr. ${appt.doctorName || 'the assigned physician'} can approve this appointment.`);
      return;
    }
    this.appointmentService.approveAppointment(appt.id).subscribe({
      next: () => {
        this.toast.success(`Appointment for ${appt.patientName} approved.`);
        this.appointments.update(list => list.map(a => a.id === appt.id ? { ...a, status: 'Scheduled' } : a));
      },
      error: (err) => this.toast.error('Failed to approve appointment: ' + (err.error?.detail || err.message))
    });
  }

  rejectAppointment(appt: Appointment) {
    if (!this.canManageAppointment(appt)) {
      this.toast.error(`Doctor Isolation: Only Dr. ${appt.doctorName || 'the assigned physician'} can decline this appointment.`);
      return;
    }
    this.appointmentService.cancel(appt.id).subscribe({
      next: () => {
        this.appointments.update(list => list.map(a => a.id === appt.id ? { ...a, status: 'Cancelled' } : a));
        this.toast.info(`Appointment request for ${appt.patientName} declined.`);
      },
      error: (err) => this.toast.error('Failed to decline appointment: ' + (err.error?.detail || err.message))
    });
  }
}
