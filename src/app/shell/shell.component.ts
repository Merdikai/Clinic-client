import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { of } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { StaffDutyService } from '../services/staff-duty.service';
import { LiveSyncService } from '../services/live-sync.service';
import { ThemeService } from '../services/theme.service';
import { ToastService } from '../ui/toast/toast.service';
import { PharmacyService, PharmacyMetrics } from '../services/pharmacy.service';
import { FinanceService } from '../services/finance.service';
import { FinanceDashboardMetrics } from '../models/finance.model';
import { LabService } from '../services/lab.service';
import { LabMetrics } from '../models/lab.model';
import { PatientService } from '../services/patient.service';
import { AppointmentService } from '../services/appointment.service';
import { RadiologyService } from '../services/radiology.service';
import { NursingService } from '../services/nursing.service';
import { UserManagementService } from '../services/user-management.service';
import { EmrAccessService } from '../services/emr-access.service';
import { Appointment } from '../models/appointment.model';
import { PagedResponse, Patient } from '../models/patient.model';
import { extractProblemDetailsMessage } from '../models/api.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  host: {
    '(document:keydown.escape)': 'onEscapeKey()'
  },
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);
  readonly permissionService = inject(PermissionService);
  readonly dutyService = inject(StaffDutyService);
  readonly liveSync = inject(LiveSyncService);
  readonly themeService = inject(ThemeService);
  readonly toast = inject(ToastService);
  readonly pharmacyService = inject(PharmacyService);
  readonly financeService = inject(FinanceService);
  readonly labService = inject(LabService);
  readonly patientService = inject(PatientService);
  readonly appointmentService = inject(AppointmentService);
  readonly router = inject(Router);
  private readonly radiologyService = inject(RadiologyService);
  private readonly nursingService = inject(NursingService);
  private readonly userService = inject(UserManagementService);
  private readonly emrAccessService = inject(EmrAccessService);

  private readonly devAccountPresets: Readonly<Record<string, { readonly username: string; readonly password: string }>> = {
    Admin: { username: 'admin', password: 'Admin@123456!' },
    Doctor: { username: 'dr.smith', password: 'Doctor@12345!' },
    Nurse: { username: 'nurse.joy', password: 'Nurse@123456!' },
    Receptionist: { username: 'receptionist.clara', password: 'Receptionist@12!' },
    Pharmacist: { username: 'pharmacist.sam', password: 'Pharmacist@1!' },
    LabTechnician: { username: 'lab.tech', password: 'LabTech@123!' },
    Radiologist: { username: 'radiologist.ray', password: 'Radiology@123!' },
    Accountant: { username: 'accountant.dave', password: 'Accountant@1!' },
    Patient: { username: 'patient.alice', password: 'Patient@1234!' }
  };

  readonly isCollapsed = signal<boolean>(false);
  readonly isSwitchingAccount = signal<boolean>(false);
  readonly currentUser = this.authService.currentUser;
  readonly pharmacyMetrics = signal<PharmacyMetrics | null>(null);
  readonly financeMetrics = signal<FinanceDashboardMetrics | null>(null);
  readonly labMetrics = signal<LabMetrics | null>(null);

  readonly isDevMode = !environment.production;

  readonly totalPatientsCount = signal<number>(0);
  readonly doctorPanelCount = signal<number>(0);
  readonly activeAppointmentsCount = signal<number>(0);
  readonly todayConsultationsCount = signal<number>(0);
  readonly pendingInvoicesCount = signal<number>(0);
  readonly inbasketPendingCount = signal<number>(0);
  readonly labCatalogCount = signal<number>(0);
  readonly radiologyStudiesCount = signal<number>(0);
  readonly radiologyUnreportedCount = signal<number>(0);
  readonly radiologyCriticalCount = signal<number>(0);
  readonly radiologySafetyCount = signal<number>(0);
  readonly nurseProceduresCount = signal<number>(0);

  readonly adminStaffUsersCount = signal<number>(0);
  readonly adminActiveDutyCount = signal<number>(0);
  readonly adminAuditLogsCount = signal<number>(0);
  readonly adminDelegationsCount = signal<number>(0);

  readonly adminDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'System Administrator';
    if (user.fullName && user.fullName !== 'User') return user.fullName;
    if (user.username) return user.username;
    return 'System Administrator';
  });

  readonly adminDepartment = computed(() => 'Enterprise Governance & IAM');

  readonly nurseDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Staff Nurse, RN';
    if (user.fullName && user.fullName !== 'User') return `${user.fullName}, RN`;
    if (user.username) return `Nurse ${user.username}, RN`;
    return 'Staff Nurse, RN';
  });

  readonly nurseDepartment = computed(() => 'Triage & Inpatient Nursing Care');

  readonly radiologistDisplayName = computed(() => {
    const user = this.currentUser();
    const fullName = user?.fullName || '';
    const username = user?.username || '';
    if (username.toLowerCase().includes('elena') || fullName.toLowerCase().includes('elena')) {
      return 'Dr. Elena Vance, MD';
    }
    if (username.toLowerCase().includes('ray') || fullName.toLowerCase().includes('ray')) {
      return 'Dr. Ray Radiologist, MD';
    }
    if (fullName && fullName !== 'User') {
      return fullName.startsWith('Dr.') ? `${fullName}, MD` : `Dr. ${fullName}, MD`;
    }
    if (username) return `Dr. ${username}, MD`;
    return 'Attending Radiologist, MD';
  });

  readonly doctorDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Dr. John Smith';
    if (user.fullName) return user.fullName.startsWith('Dr.') ? user.fullName : `Dr. ${user.fullName}`;
    if (user.username) {
      if (user.username.includes('james')) return 'Dr. Sarah James';
      if (user.username.includes('smith')) return 'Dr. John Smith';
      return `Dr. ${user.username}`;
    }
    return 'Dr. John Smith';
  });

  readonly doctorDepartment = computed(() => {
    const name = this.doctorDisplayName();
    if (name.includes('James')) return 'Family Medicine & Pediatrics';
    return 'Cardiology & Internal Medicine';
  });

  readonly patientDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Patient';
    if (user.fullName && user.fullName !== 'User') return user.fullName;
    if (user.username) return user.username;
    return 'Patient';
  });

  readonly accountantDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Financial Controller';
    if (user.fullName && user.fullName !== 'User') return `${user.fullName}, CPA`;
    if (user.username) return `${user.username}, CPA`;
    return 'Financial Controller';
  });

  readonly accountantDepartment = computed(() => 'Financial Control & Revenue Governance');

  readonly userDisplayName = computed(() => {
    const user = this.currentUser();
    return user?.fullName || user?.username || 'Clinic Staff';
  });

  readonly userInitial = computed(() => {
    const label = this.userDisplayName().trim();
    return (label || 'U').slice(0, 1).toUpperCase();
  });

  readonly allRoles = ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'LabTechnician', 'Radiologist', 'Accountant', 'Patient'];
  readonly availableRoles = computed(() =>
    !environment.production
      ? this.allRoles
      : this.authService.userRoles().length > 0
        ? this.authService.userRoles()
        : ['Patient']
  );

  // Reflects the primary verified JWT role (in prod) or selected role view synced via real login in dev
  readonly activeSimulatedRole = this.permissionService.activeRole;

  showDutyModal = false;
  dutyModalMode: 'clock-in' | 'clock-out' | 'info' = 'clock-in';
  dutyDepartment = 'General Practice (OPD)';
  dutyShiftType = 'Day Shift (08:00 - 16:00)';
  dutyNotes = '';
  dutyHandoverNotes = '';
  dutyLoading = false;

  ngOnInit(): void {
    this.themeService.setTheme('light');
    this.liveSync.connect();
    this.permissionService.loadAllPermissions();

    const verifiedRoles = this.authService.userRoles();
    if (verifiedRoles.length > 0 && verifiedRoles[0]) {
      this.permissionService.setActiveRole(verifiedRoles[0]);
    }

    this.loadRoleScopedMetrics();

    this.liveSync.lowStockAlert$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.hasAnyRole(['Pharmacist', 'Admin'])) this.loadPharmacyMetrics();
      if (this.hasAnyRole(['LabTechnician', 'Admin', 'Doctor'])) this.loadLabMetrics();
    });

    this.liveSync.appointmentUpdated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.hasAnyRole(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Patient'])) {
        this.loadAppointmentCount();
      }
      if (this.hasAnyRole(['Admin', 'Doctor', 'Nurse', 'Receptionist'])) {
        this.loadPatientCount();
      }
    });

    this.liveSync.invoicePaid$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.hasAnyRole(['Accountant', 'Admin'])) this.loadFinanceMetrics();
      if (this.hasAnyRole(['Pharmacist', 'Admin'])) this.loadPharmacyMetrics();
    });

    this.liveSync.radiologyOrderUpdated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.hasAnyRole(['Radiologist', 'Doctor', 'Nurse', 'Admin'])) this.loadRadiologyMetrics();
    });

    this.liveSync.labOrderUpdated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.hasAnyRole(['LabTechnician', 'Doctor', 'Nurse', 'Admin'])) this.loadLabMetrics();
    });

    this.liveSync.breakGlassAlert$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.hasRole('Admin')) this.loadAdminMetrics();
    });

    this.liveSync.dutyRosterChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.hasRole('Patient')) {
        this.dutyService.refreshDutyStatus().subscribe({ error: () => {} });
      }
      if (this.hasRole('Admin')) this.loadAdminMetrics();
    });

    this.liveSync.reconnected$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ prolonged }) => {
      if (prolonged) {
        this.loadRoleScopedMetrics();
      }
    });
  }

  private loadRoleScopedMetrics(): void {
    const role = this.activeRoleResolved();

    if (role !== 'Patient') {
      this.dutyService.refreshDutyStatus().subscribe({ error: () => {} });
    }

    switch (role.toLowerCase()) {
      case 'admin':
        this.loadAdminMetrics();
        this.loadPatientCount();
        this.loadAppointmentCount();
        this.loadFinanceMetrics();
        break;
      case 'doctor':
        this.loadPatientCount();
        this.loadAppointmentCount();
        this.loadDoctorPanel();
        break;
      case 'nurse':
        this.loadPatientCount();
        this.loadAppointmentCount();
        this.loadNursingProcedures();
        break;
      case 'receptionist':
        this.loadPatientCount();
        this.loadAppointmentCount();
        break;
      case 'pharmacist':
        this.loadPharmacyMetrics();
        break;
      case 'labtechnician':
        this.loadLabMetrics();
        break;
      case 'radiologist':
        this.loadRadiologyMetrics();
        break;
      case 'accountant':
        this.loadFinanceMetrics();
        break;
      case 'patient':
        this.loadPatientCount();
        this.loadAppointmentCount();
        break;
      default:
        break;
    }
  }

  private activeRoleResolved(): string {
    const jwtRole = this.authService.userRoles()[0];
    if (jwtRole) {
      return jwtRole;
    }
    return this.activeSimulatedRole();
  }

  onEscapeKey(): void {
    if (this.showDutyModal) {
      this.closeDutyModal();
    }
  }

  loadPharmacyMetrics(): void {
    if (!this.hasAnyRole(['Pharmacist', 'Admin'])) return;
    this.pharmacyService.getMetrics().subscribe({
      next: (m) => this.pharmacyMetrics.set(m),
      error: () => {}
    });
  }

  loadFinanceMetrics(): void {
    if (!this.hasAnyRole(['Accountant', 'Admin'])) return;
    this.financeService.getMetrics().subscribe({
      next: (m) => this.financeMetrics.set(m),
      error: () => {}
    });
  }

  loadLabMetrics(): void {
    if (!this.hasAnyRole(['LabTechnician', 'Doctor', 'Nurse', 'Radiologist', 'Admin'])) return;
    this.labService.getMetrics().subscribe({
      next: (m) => this.labMetrics.set(m),
      error: () => {}
    });
  }

  loadPatientCount(): void {
    if (this.activeRoleResolved() === 'Patient') {
      this.totalPatientsCount.set(1);
      return;
    }
    this.patientService.getAll(1, 1).subscribe({
      next: (res: PagedResponse<Patient>) => {
        const count = res.totalCount || (Array.isArray(res.items) ? res.items.length : 0);
        if (count) this.totalPatientsCount.set(count);
      },
      error: () => {}
    });
  }

  loadAppointmentCount(): void {
    const isDoctor = this.authService.hasRole('Doctor');
    const isPatient = this.authService.hasRole('Patient');

    if (isDoctor || isPatient) {
      this.appointmentService.getMyAppointments().subscribe({
        next: (res: Appointment[] | PagedResponse<Appointment>) => {
          const list = Array.isArray(res) ? res : res?.items ?? [];
          this.activeAppointmentsCount.set(list.length);
          const queue = list.filter(
            (a) =>
              a.status === 'Scheduled' ||
              a.status === 'CheckedIn' ||
              a.status === 'TriageComplete' ||
              a.status === 'PendingApproval'
          );
          this.todayConsultationsCount.set(queue.length);
        },
        error: () => {}
      });
    } else if (this.hasAnyRole(['Admin', 'Nurse', 'Receptionist'])) {
      this.appointmentService.getAll(1, 50).subscribe({
        next: (res: Appointment[] | PagedResponse<Appointment>) => {
          const list = Array.isArray(res) ? res : res?.items ?? [];
          this.activeAppointmentsCount.set(list.length);
          const queue = list.filter((a) => a.status === 'Scheduled' || a.status === 'CheckedIn');
          this.todayConsultationsCount.set(queue.length);
        },
        error: () => {}
      });
    }
  }

  loadDoctorPanel(): void {
    if (!this.hasAnyRole(['Doctor', 'Admin'])) return;
    this.patientService.getMyPanel().subscribe({
      next: (res: Patient[]) => {
        if (Array.isArray(res) && res.length > 0) this.doctorPanelCount.set(res.length);
      },
      error: () => {}
    });
  }

  loadNursingProcedures(): void {
    if (!this.hasAnyRole(['Nurse', 'Admin'])) return;
    this.nursingService.getProcedures().subscribe({
      next: (procs) => {
        if (Array.isArray(procs)) {
          this.nurseProceduresCount.set(procs.length);
        }
      },
      error: () => {}
    });
  }

  isPharmacyTabActive(tabName: string): boolean {
    const url = this.router.url;
    if (!url.startsWith('/pharmacy')) return false;
    if (tabName === 'prescriptions') {
      return url.includes('/pharmacy/prescriptions') || url.includes('tab=prescriptions') || url === '/pharmacy';
    }
    return url.includes(`/pharmacy/${tabName}`) || url.includes(`tab=${tabName}`);
  }

  isLabTabActive(tabName: string): boolean {
    const url = this.router.url;
    if (!url.startsWith('/laboratory')) return false;
    if (tabName === 'worklist') {
      return url.includes('tab=worklist') || url === '/laboratory';
    }
    return url.includes(`tab=${tabName}`);
  }

  isRadiologyTabActive(tabName: string): boolean {
    const url = this.router.url;
    if (!url.startsWith('/radiology')) return false;
    const hasTabParam = url.includes('tab=');
    if (!hasTabParam) {
      return tabName === 'overview';
    }
    return url.includes(`tab=${tabName}`);
  }

  isBillingTabActive(tabName: string): boolean {
    const url = this.router.url;
    if (!url.startsWith('/billing')) return false;
    const hasTabParam = url.includes('tab=');
    if (!hasTabParam) {
      return tabName === 'invoices';
    }
    return url.includes(`tab=${tabName}`);
  }

  isBillingDeptActive(deptName: string): boolean {
    const url = this.router.url;
    if (!url.startsWith('/billing')) return false;
    return url.toLowerCase().includes(`dept=${deptName.toLowerCase()}`);
  }

  loadRadiologyMetrics(): void {
    if (!this.hasAnyRole(['Radiologist', 'Doctor', 'Nurse', 'Admin'])) return;
    this.radiologyService
      .getMetrics()
      .pipe(
        retry({ count: 1, delay: 1000 }),
        catchError(() => of(null))
      )
      .subscribe({
        next: (m) => {
          if (m) {
            this.radiologyStudiesCount.set(m.totalOrders ?? 0);
            const pending = (m.orderedCount ?? 0) + (m.inProgressCount ?? 0) + (m.scheduledCount ?? 0);
            this.radiologyUnreportedCount.set(pending);
            this.radiologyCriticalCount.set(m.criticalAlertsCount ?? 0);
          }
        },
        error: () => {}
      });

    if (this.hasAnyRole(['Radiologist', 'Admin'])) {
      this.radiologyService
        .getSafetyLogs()
        .pipe(
          retry({ count: 1, delay: 1000 }),
          catchError(() => of([]))
        )
        .subscribe({
          next: (logs) => {
            if (logs && logs.length > 0) {
              this.radiologySafetyCount.set(logs.length);
            }
          },
          error: () => {}
        });
    }
  }

  toggleSidebar(): void {
    this.isCollapsed.update((v) => !v);
  }

  getRoleIcon(role: string): string {
    switch (role?.toLowerCase()) {
      case 'doctor': return 'medical_services';
      case 'radiologist': return 'camera';
      case 'nurse': return 'local_hospital';
      case 'receptionist': return 'support_agent';
      case 'pharmacist': return 'medication';
      case 'labtechnician': return 'biotech';
      case 'accountant': return 'account_balance';
      case 'patient': return 'person';
      default: return 'admin_panel_settings';
    }
  }

  getRoleSubtitle(role: string): string {
    switch (role?.toLowerCase()) {
      case 'doctor': return 'Clinical Attending & EMR';
      case 'radiologist': return 'Imaging Studies & PACS';
      case 'nurse': return 'Triage & Vital Signs';
      case 'receptionist': return 'Front Desk & Check-in';
      case 'pharmacist': return 'Dispensary & Stock';
      case 'labtechnician': return 'Diagnostic Pathology';
      case 'accountant': return 'Revenue & Invoicing';
      case 'patient': return 'Personal Health Records';
      default: return 'System Governance';
    }
  }

  hasRole(role: string): boolean {
    if (environment.production) {
      return this.authService.hasRole(role);
    }
    return this.authService.hasRole(role) || this.activeSimulatedRole().toLowerCase() === role.toLowerCase();
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((r) => this.hasRole(r));
  }

  hasPermission(permKey: string): boolean {
    return this.permissionService.hasPermission(permKey);
  }

  hasAnyPermission(perms: string[]): boolean {
    return this.permissionService.hasAnyPermission(perms);
  }

  loadAdminMetrics(): void {
    if (!this.hasRole('Admin')) return;

    this.userService.getUsers().subscribe({
      next: (users) => {
        if (users && users.length > 0) this.adminStaffUsersCount.set(users.length);
      },
      error: () => {}
    });

    this.dutyService.getActiveStaff().subscribe({
      next: (staff) => {
        if (staff) this.adminActiveDutyCount.set(staff.length);
      },
      error: () => {}
    });

    this.emrAccessService.getAuditLogs(1, 1).subscribe({
      next: (res) => {
        const count = res?.totalCount ?? (Array.isArray(res) ? res.length : 0);
        this.adminAuditLogsCount.set(count);
      },
      error: () => {}
    });

    this.dutyService.getActiveDelegations().subscribe({
      next: (dels) => {
        if (dels) this.adminDelegationsCount.set(dels.length);
      },
      error: () => {}
    });
  }

  setRolePreview(role: string): void {
    if (this.authService.hasRole(role)) {
      this.permissionService.setActiveRole(role);
      this.loadRoleScopedMetrics();
      return;
    }

    if (environment.production) {
      return;
    }

    const preset = this.devAccountPresets[role];
    if (!preset) {
      return;
    }

    // Authenticate with the real seeded account for this role so JWT claims match the UI view end-to-end
    this.isSwitchingAccount.set(true);
    this.authService.login(preset).subscribe({
      next: (res) => {
        this.isSwitchingAccount.set(false);
        this.permissionService.setActiveRole(res.roles?.[0] ?? role);
        this.permissionService.loadAllPermissions();
        this.liveSync.reconnect();
        this.loadRoleScopedMetrics();
        this.toast.success(`Switched session to ${res.fullName || preset.username} (${role})`);
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err: HttpErrorResponse) => {
        this.isSwitchingAccount.set(false);
        this.toast.error(extractProblemDetailsMessage(err.error, `Could not switch to ${role} account.`));
      }
    });
  }

  logout(): void {
    this.liveSync.disconnect();
    this.authService.logout();
  }

  openDutyModal(mode: 'clock-in' | 'clock-out' | 'info'): void {
    this.dutyModalMode = mode;
    const role = this.activeRoleResolved();
    this.dutyDepartment = this.getRoleDepartment(role);
    this.dutyShiftType = 'Day Shift (08:00 - 16:00)';
    this.dutyNotes = '';
    this.dutyHandoverNotes = '';
    this.showDutyModal = true;
  }

  getRoleDepartment(role: string): string {
    switch (role?.toLowerCase()) {
      case 'doctor': return 'General Practice (OPD)';
      case 'nurse': return 'General Practice (OPD)';
      case 'receptionist': return 'Billing & Reception';
      case 'pharmacist': return 'Pharmacy Dispensary';
      case 'labtechnician': return 'Laboratory & Diagnostics';
      case 'radiologist': return 'Radiology & Imaging';
      case 'accountant': return 'Billing & Reception';
      case 'admin': return 'Administration';
      default: return 'General Practice (OPD)';
    }
  }

  closeDutyModal(): void {
    this.showDutyModal = false;
  }

  handleClockIn(): void {
    this.dutyLoading = true;
    this.dutyService.clockIn(this.dutyDepartment, this.dutyShiftType, this.dutyNotes).subscribe({
      next: () => {
        this.dutyLoading = false;
        this.showDutyModal = false;
        this.toast.success('Clocked in to active clinical roster.');
      },
      error: (err: HttpErrorResponse) => {
        this.dutyLoading = false;
        this.toast.error(extractProblemDetailsMessage(err.error, 'Failed to clock in.'));
      }
    });
  }

  handleClockOut(): void {
    this.dutyLoading = true;
    this.dutyService.clockOut(this.dutyHandoverNotes).subscribe({
      next: () => {
        this.dutyLoading = false;
        this.showDutyModal = false;
        this.toast.info('Shift completed and clocked out.');
      },
      error: (err: HttpErrorResponse) => {
        this.dutyLoading = false;
        this.toast.error(extractProblemDetailsMessage(err.error, 'Failed to clock out.'));
      }
    });
  }
}
