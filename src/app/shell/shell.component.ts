import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { StaffDutyService } from '../services/staff-duty.service';
import { LiveSyncService } from '../services/live-sync.service';
import { ThemeService } from '../services/theme.service';
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
import { of } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit {
  authService = inject(AuthService);
  permissionService = inject(PermissionService);
  dutyService = inject(StaffDutyService);
  liveSync = inject(LiveSyncService);
  themeService = inject(ThemeService);
  pharmacyService = inject(PharmacyService);
  financeService = inject(FinanceService);
  labService = inject(LabService);
  patientService = inject(PatientService);
  appointmentService = inject(AppointmentService);
  router = inject(Router);

  isCollapsed = signal<boolean>(false);
  currentUser = this.authService.currentUser;
  pharmacyMetrics = signal<PharmacyMetrics | null>(null);
  financeMetrics = signal<FinanceDashboardMetrics | null>(null);
  labMetrics = signal<LabMetrics | null>(null);

  // Role Counts & Nav Metric Signals
  totalPatientsCount = signal<number>(8);
  doctorPanelCount = signal<number>(4);
  activeAppointmentsCount = signal<number>(5);
  todayConsultationsCount = signal<number>(5);
  pendingInvoicesCount = signal<number>(7);
  inbasketPendingCount = signal<number>(3);
  labCatalogCount = signal<number>(24);
  radiologyStudiesCount = signal<number>(4);
  radiologyUnreportedCount = signal<number>(2);
  radiologyCriticalCount = signal<number>(1);
  radiologySafetyCount = signal<number>(14);
  private radiologyService = inject(RadiologyService);
  private nursingService = inject(NursingService);
  private userService = inject(UserManagementService);
  private emrAccessService = inject(EmrAccessService);
  nurseProceduresCount = signal<number>(3);

  // Admin IAM & Governance Signals
  adminStaffUsersCount = signal<number>(11);
  adminActiveDutyCount = signal<number>(3);
  adminAuditLogsCount = signal<number>(18);
  adminDelegationsCount = signal<number>(1);

  adminDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'System Administrator';
    if (user.fullName && user.fullName !== 'User') return user.fullName;
    if (user.username) return user.username;
    return 'System Administrator';
  });

  adminDepartment = computed(() => 'Enterprise Governance & IAM');

  nurseDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Nurse Sarah Jenkins, RN';
    if (user.fullName && user.fullName !== 'User') return `${user.fullName}, RN`;
    if (user.username) {
      if (user.username.toLowerCase().includes('sarah') || user.username.toLowerCase().includes('jenkins')) {
        return 'Nurse Sarah Jenkins, RN';
      }
      return `Nurse ${user.username}, RN`;
    }
    return 'Nurse Sarah Jenkins, RN';
  });

  nurseDepartment = computed(() => 'Triage & Inpatient Nursing Care');

  radiologistDisplayName = computed(() => {
    const user = this.currentUser();
    const fullName = user?.fullName || '';
    const username = user?.username || '';
    if (username.toLowerCase().includes('elena') || fullName.toLowerCase().includes('elena')) {
      return 'Dr. Elena Vance, MD (Neuroradiology)';
    }
    if (username.toLowerCase().includes('ray') || fullName.toLowerCase().includes('ray')) {
      return 'Dr. Ray Radiologist, MD, FACR';
    }
    if (fullName && fullName !== 'User') {
      return fullName.startsWith('Dr.') ? `${fullName}, MD` : `Dr. ${fullName}, MD`;
    }
    if (username) {
      return `Dr. ${username}, MD`;
    }
    return 'Attending Radiologist, MD';
  });

  doctorDisplayName = computed(() => {
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

  doctorDepartment = computed(() => {
    const name = this.doctorDisplayName();
    if (name.includes('James')) return 'Family Medicine & Pediatrics';
    return 'Cardiology & Internal Medicine';
  });

  patientDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Alice Smith (Patient)';
    if (user.fullName && user.fullName !== 'User') return user.fullName;
    if (user.username) return user.username;
    return 'Alice Smith (Patient)';
  });

  accountantDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Dave Accountant, CPA';
    if (user.fullName && user.fullName !== 'User') return `${user.fullName}, CPA`;
    if (user.username) {
      if (user.username.toLowerCase().includes('dave') || user.username.toLowerCase().includes('accountant')) {
        return 'Dave Accountant, CPA';
      }
      return `${user.username}, CPA`;
    }
    return 'Dave Accountant, CPA';
  });

  accountantDepartment = computed(() => 'Financial Control & Revenue Governance');

  allRoles = ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'LabTechnician', 'Radiologist', 'Accountant', 'Patient'];
  activeSimulatedRole = this.permissionService.activeRole;

  showDutyModal = false;
  dutyModalMode: 'clock-in' | 'clock-out' | 'info' = 'clock-in';
  dutyDepartment = 'General Practice (OPD)';
  dutyShiftType = 'Day Shift (08:00 - 16:00)';
  dutyNotes = '';
  dutyHandoverNotes = '';
  dutyLoading = false;

  ngOnInit(): void {
    this.liveSync.connect();
    if (this.authService.userRoles().length > 0) {
      const initialRole = this.authService.userRoles()[0];
      this.permissionService.setActiveRole(initialRole);
    }
    this.loadPharmacyMetrics();
    this.loadFinanceMetrics();
    this.loadLabMetrics();
    this.loadPatientCount();
    this.loadAppointmentCount();
    this.loadDoctorPanel();
    this.loadRadiologyMetrics();
    this.loadNursingProcedures();
    this.loadAdminMetrics();
    // Sync duty status with actual DB state
    this.dutyService.refreshDutyStatus().subscribe({ error: () => {} });

    this.liveSync.lowStockAlert$.subscribe(() => {
      this.loadPharmacyMetrics();
      this.loadLabMetrics();
    });
    this.liveSync.appointmentUpdated$.subscribe(() => {
      this.loadPharmacyMetrics();
      this.loadLabMetrics();
      this.loadAppointmentCount();
      this.loadPatientCount();
    });
    this.liveSync.invoicePaid$.subscribe(() => {
      this.loadPharmacyMetrics();
      this.loadFinanceMetrics();
      this.loadLabMetrics();
    });
    this.liveSync.radiologyOrderUpdated$.subscribe(() => {
      this.loadRadiologyMetrics();
    });
    this.liveSync.labOrderUpdated$.subscribe(() => {
      this.loadLabMetrics();
    });
    this.liveSync.breakGlassAlert$.subscribe(() => {
      this.loadAdminMetrics();
    });
    this.liveSync.dutyRosterChanged$.subscribe(() => {
      this.dutyService.refreshDutyStatus().subscribe({ error: () => {} });
      this.loadAdminMetrics();
    });
  }

  loadPharmacyMetrics(): void {
    const role = this.activeSimulatedRole();
    // Pharmacy metrics API requires Admin or Pharmacist role — skip for other roles
    if (role !== 'Pharmacist' && role !== 'Admin') return;
    this.pharmacyService.getMetrics().subscribe({
      next: (m) => this.pharmacyMetrics.set(m),
      error: () => {}
    });
  }

  loadFinanceMetrics(): void {
    this.financeService.getMetrics().subscribe({
      next: (m) => this.financeMetrics.set(m),
      error: () => {}
    });
  }

  loadLabMetrics(): void {
    this.labService.getMetrics().subscribe({
      next: (m) => this.labMetrics.set(m),
      error: () => {}
    });
  }

  loadPatientCount(): void {
    if (this.activeSimulatedRole() === 'Patient') {
      this.totalPatientsCount.set(1);
      return;
    }
    this.patientService.getAll(1, 1).subscribe({
      next: (res: any) => {
        const count = res?.totalCount || (Array.isArray(res?.items) ? res.items.length : 8);
        if (count) this.totalPatientsCount.set(count);
      },
      error: () => {}
    });
  }

  loadAppointmentCount(): void {
    const isDoctor = this.currentUser()?.roles?.includes('Doctor') || this.activeSimulatedRole() === 'Doctor';
    const isPatient = this.currentUser()?.roles?.includes('Patient') || this.activeSimulatedRole() === 'Patient';
    if (isDoctor || isPatient) {
      this.appointmentService.getMyAppointments().subscribe({
        next: (res: any) => {
          const list = Array.isArray(res) ? res : (res?.items || []);
          this.activeAppointmentsCount.set(list.length);
          const queue = list.filter((a: any) => a.status === 'Scheduled' || a.status === 'CheckedIn' || a.status === 'TriageComplete' || a.status === 'PendingApproval');
          this.todayConsultationsCount.set(queue.length);
        },
        error: () => {}
      });
    } else {
      this.appointmentService.getAll(1, 50).subscribe({
        next: (res: any) => {
          const list = Array.isArray(res) ? res : (res?.items || []);
          if (list.length > 0) {
            this.activeAppointmentsCount.set(list.length);
            const queue = list.filter((a: any) => a.status === 'Scheduled' || a.status === 'CheckedIn');
            if (queue.length > 0) {
              this.todayConsultationsCount.set(queue.length);
            }
          }
        },
        error: () => {}
      });
    }
  }

  loadDoctorPanel(): void {
    this.patientService.getMyPanel().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        if (list.length > 0) this.doctorPanelCount.set(list.length);
      },
      error: () => {}
    });
  }

  loadNursingProcedures(): void {
    this.nursingService.getProcedures().subscribe({
      next: (procs: any) => {
        const list = Array.isArray(procs) ? procs : (procs?.items || []);
        if (list.length > 0) {
          this.nurseProceduresCount.set(list.length);
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
    this.radiologyService.getMetrics().pipe(
      retry({ count: 2, delay: 2000 }),
      catchError(() => of(null))
    ).subscribe({
      next: (m: any) => {
        if (m) {
          this.radiologyStudiesCount.set(m.totalOrders ?? 0);
          const pending = (m.orderedCount ?? 0) + (m.inProgressCount ?? 0) + (m.scheduledCount ?? 0);
          this.radiologyUnreportedCount.set(pending);
          this.radiologyCriticalCount.set(m.criticalAlertsCount ?? 0);
        }
      },
      error: () => {}
    });

    this.radiologyService.getSafetyLogs().pipe(
      retry({ count: 2, delay: 2000 }),
      catchError(() => of([]))
    ).subscribe({
      next: (logs) => {
        if (logs && logs.length > 0) {
          this.radiologySafetyCount.set(logs.length);
        }
      },
      error: () => {}
    });
  }

  toggleSidebar(): void {
    this.isCollapsed.update(v => !v);
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
      case 'radiologist': return 'Imaging Studies & PACS Diagnostics';
      case 'nurse': return 'Triage & Vital Signs';
      case 'receptionist': return 'Front Desk & Check-in';
      case 'pharmacist': return 'Dispensary & Stock';
      case 'labtechnician': return 'Diagnostic Pathology';
      case 'accountant': return 'Revenue & Invoicing';
      case 'patient': return 'Personal Health Records';
      default: return 'System Security & Governance';
    }
  }

  hasRole(role: string): boolean {
    const simulated = this.activeSimulatedRole();
    return simulated.toLowerCase() === role.toLowerCase();
  }

  hasAnyRole(roles: string[]): boolean {
    const simulated = this.activeSimulatedRole();
    return roles.some(r => r.toLowerCase() === simulated.toLowerCase());
  }

  hasPermission(permKey: string): boolean {
    return this.permissionService.hasPermission(permKey);
  }

  hasAnyPermission(perms: string[]): boolean {
    return this.permissionService.hasAnyPermission(perms);
  }

  loadAdminMetrics(): void {
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
      next: (res: any) => {
        const count = res?.totalCount ?? (Array.isArray(res) ? res.length : 18);
        if (count !== undefined) this.adminAuditLogsCount.set(count);
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

  setRolePreview(role: string) {
    this.permissionService.setActiveRole(role);
    this.loadPatientCount();
    this.loadAppointmentCount();
    if (role === 'Admin') this.loadAdminMetrics();
  }

  logout(): void {
    this.authService.logout();
  }

  openDutyModal(mode: 'clock-in' | 'clock-out' | 'info') {
    this.dutyModalMode = mode;
    // Pre-fill department based on active role
    const role = this.activeSimulatedRole();
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

  closeDutyModal() {
    this.showDutyModal = false;
  }

  handleClockIn() {
    this.dutyLoading = true;
    this.dutyService.clockIn(this.dutyDepartment, this.dutyShiftType, this.dutyNotes).subscribe({
      next: () => {
        this.dutyLoading = false;
        this.showDutyModal = false;
      },
      error: (err: any) => {
        this.dutyLoading = false;
        alert(err.error?.detail || err.error?.message || 'Failed to clock in.');
      }
    });
  }

  handleClockOut() {
    this.dutyLoading = true;
    this.dutyService.clockOut(this.dutyHandoverNotes).subscribe({
      next: () => {
        this.dutyLoading = false;
        this.showDutyModal = false;
      },
      error: (err: any) => {
        this.dutyLoading = false;
        alert(err.error?.detail || err.error?.message || 'Failed to clock out.');
      }
    });
  }
}
