import { ChangeDetectionStrategy, Component, HostListener, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UserManagementService, UserDto, CreateUserDto } from '../../services/user-management.service';
import { PermissionService, RolePermissionMatrixDto } from '../../services/permission.service';
import { EmrAccessService, EmrAccessAuditLog, PagedResponse } from '../../services/emr-access.service';
import { StaffDutyService, StaffDutyShift, DoctorDelegation } from '../../services/staff-duty.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../ui/toast/toast.service';
import { extractProblemDetailsMessage } from '../../models/api.model';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent, StatusTone } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

export interface PermissionItem {
  key: string;
  name: string;
  description: string;
  module: 'Clinical' | 'Pharmacy' | 'Laboratory' | 'Billing' | 'Appointments' | 'Radiology' | 'StaffDuty' | 'Governance' | 'Security';
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ScrollingModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  private userService = inject(UserManagementService);
  private permissionService = inject(PermissionService);
  private emrAccessService = inject(EmrAccessService);
  public dutyService = inject(StaffDutyService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public authService = inject(AuthService);

  activeTab = signal<'directory' | 'pbac' | 'audit' | 'roster'>('directory');
  availableRoles: string[] = ['Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Accountant', 'LabTechnician', 'Radiologist', 'Admin', 'Patient'];
  availableModules: string[] = ['Clinical', 'Appointments', 'Pharmacy', 'Laboratory', 'Radiology', 'Billing', 'Governance', 'Security'];

  // --- TAB 1: USERS DIRECTORY ---
  users = signal<UserDto[]>([]);
  loadingUsers = signal<boolean>(false);
  userSearch = signal<string>('');
  selectedRoleFilter = signal<string>('ALL');
  selectedStatusFilter = signal<string>('ALL');
  showCreateModal = signal<boolean>(false);

  showRoleModal = signal<boolean>(false);
  selectedUserForRole = signal<UserDto | null>(null);
  newRoleToAssign = signal<string>('Doctor');

  // Reset Password modal
  showResetPasswordModal = signal<boolean>(false);
  selectedUserForReset = signal<UserDto | null>(null);
  newPasswordValue = signal<string>('');
  confirmPasswordValue = signal<string>('');
  isResettingPassword = signal<boolean>(false);

  newUser: CreateUserDto = {
    userName: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'Doctor',
    phoneNumber: ''
  };

  filteredUsers = computed(() => {
    let list = this.users() || [];
    const search = this.userSearch().toLowerCase().trim();
    const roleFilter = this.selectedRoleFilter();
    const statusFilter = this.selectedStatusFilter();

    if (search) {
      list = list.filter(u =>
        (u.userName && u.userName.toLowerCase().includes(search)) ||
        (u.username && u.username.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.firstName && u.firstName.toLowerCase().includes(search)) ||
        (u.lastName && u.lastName.toLowerCase().includes(search)) ||
        (u.fullName && u.fullName.toLowerCase().includes(search))
      );
    }

    if (roleFilter !== 'ALL') {
      list = list.filter(u => {
        const roles = u.roles || (u.role ? [u.role] : []);
        return roles.some(r => r.toLowerCase() === roleFilter.toLowerCase());
      });
    }

    if (statusFilter === 'ACTIVE') {
      list = list.filter(u => u.isActive === true);
    } else if (statusFilter === 'INACTIVE') {
      list = list.filter(u => u.isActive === false);
    }

    return list;
  });

  activeUserCount = computed(() => this.users().filter(u => u.isActive).length);
  inactiveUserCount = computed(() => this.users().filter(u => !u.isActive).length);

  // --- TAB 2: PBAC MATRIX ---
  selectedMatrixRole = signal<string>('Doctor');
  loadingMatrix = signal<boolean>(false);
  matrixPermissions = signal<string[]>([]);
  matrixSearch = signal<string>('');
  selectedModuleFilter = signal<string>('ALL');
  isSavingMatrix = signal<boolean>(false);

  allAvailablePermissions: PermissionItem[] = [
    // Clinical & EMR
    { key: 'Patients.View', name: 'View Patient Records', description: 'Search and view medical record summaries & demographics', module: 'Clinical' },
    { key: 'Patients.Create', name: 'Register New Patient', description: 'Create and onboard new clinical patient charts', module: 'Clinical' },
    { key: 'Patients.Edit', name: 'Modify Patient Demographics', description: 'Update patient personal details and contact info', module: 'Clinical' },
    { key: 'Patients.Export', name: 'Export Medical Charts', description: 'Generate certified PDF exports of patient EMR history', module: 'Clinical' },
    { key: 'Consultations.View', name: 'View Clinical Consultations', description: 'Access clinical notes, vitals history, and SOAP diagnosis', module: 'Clinical' },
    { key: 'Consultations.Create', name: 'Record Clinical Consultation', description: 'Enter clinical findings, symptoms, and medical notes', module: 'Clinical' },
    { key: 'Consultations.Edit', name: 'Amend Consultation Notes', description: 'Update preliminary clinical assessment before sign-off', module: 'Clinical' },
    { key: 'Consultations.Sign', name: 'Sign & Finalize Medical Records', description: 'Legally sign and lock clinical encounter documentation', module: 'Clinical' },

    // Appointments & Queue
    { key: 'Appointments.View', name: 'View Appointments Roster', description: 'Access daily clinical schedule and appointment lists', module: 'Appointments' },
    { key: 'Appointments.Book', name: 'Schedule Appointments', description: 'Book new clinical and specialist consultation slots', module: 'Appointments' },
    { key: 'Appointments.Cancel', name: 'Cancel / Reschedule Appointments', description: 'Reschedule or revoke existing patient bookings', module: 'Appointments' },
    { key: 'Appointments.CheckIn', name: 'Queue Check-In & Triage Dispatch', description: 'Process patient arrival and dispatch to waiting queue', module: 'Appointments' },

    // Pharmacy & Prescriptions
    { key: 'Prescriptions.View', name: 'View Prescriptions Queue', description: 'Inspect ordered medications, dosages, and instructions', module: 'Pharmacy' },
    { key: 'Prescriptions.Create', name: 'Issue Medical Prescriptions', description: 'Author physician prescription orders for dispensary', module: 'Pharmacy' },
    { key: 'Prescriptions.Dispense', name: 'Dispense & Fulfill Medication', description: 'Dispense pharmacy stock, log batch numbers, and deduct inventory', module: 'Pharmacy' },
    { key: 'Pharmacy.ManageInventory', name: 'Manage Pharmacy Inventory', description: 'Add medication stock, update prices, and track expiry dates', module: 'Pharmacy' },

    // Laboratory & Diagnostics
    { key: 'LabOrders.View', name: 'View Lab Test Orders', description: 'Review ordered diagnostic tests, panels, and status', module: 'Laboratory' },
    { key: 'LabOrders.Create', name: 'Order Diagnostic Lab Panels', description: 'Request pathology, biochemistry, or hematology tests', module: 'Laboratory' },
    { key: 'LabOrders.Process', name: 'Sample Accession & Processing', description: 'Collect specimens, enter quantitative test result values', module: 'Laboratory' },
    { key: 'LabOrders.Verify', name: 'Pathologist Verification & Sign-off', description: 'Authorize, verify, and release clinical diagnostic reports', module: 'Laboratory' },

    // Radiology & PACS
    { key: 'Radiology.View', name: 'View Radiology Orders & Studies', description: 'Access RIS worklist, imaging studies, and PACS preview', module: 'Radiology' },
    { key: 'Radiology.Order', name: 'Place Radiology Imaging Orders', description: 'Request CT, MRI, X-Ray, Ultrasound, and PET studies', module: 'Radiology' },
    { key: 'Radiology.Report', name: 'Author Diagnostic Radiology Report', description: 'Write and submit structured diagnostic impression and findings', module: 'Radiology' },
    { key: 'Radiology.SignOff', name: 'Physician Sign-Off on Imaging', description: 'Attending physician acknowledgment of completed radiology studies', module: 'Radiology' },
    { key: 'Radiology.SafetyDose', name: 'Radiation Safety & Dosimetry Logs', description: 'Record DLP/DAP contrast media and radiation dose audit entries', module: 'Radiology' },
    { key: 'Radiology.Suites', name: 'Modality Suite Management', description: 'Manage CT/MRI/X-Ray/US equipment suites and room readiness', module: 'Radiology' },

    // Billing & Finance
    { key: 'Billing.View', name: 'View Invoices & Billing Ledger', description: 'Access itemized invoices, receipts, and claim records', module: 'Billing' },
    { key: 'Billing.CreateInvoice', name: 'Generate Patient Invoices', description: 'Create itemized bills for consultations, lab, and medications', module: 'Billing' },
    { key: 'Billing.ProcessPayment', name: 'Process & Settle Payments', description: 'Collect cash, credit card, and insurance co-payments', module: 'Billing' },
    { key: 'Billing.Reports', name: 'Financial & Revenue Reporting', description: 'Generate revenue breakdown, daily reconciliation, and AR reports', module: 'Billing' },

    // Staff Duty & Governance
    { key: 'StaffDuty.ClockInOut', name: 'Staff Duty Clock-In / Out', description: 'Register active duty shifts and clinical presence', module: 'StaffDuty' },
    { key: 'ClinicalGovernance.BreakGlass', name: 'Emergency Break-Glass Override', description: 'Access restricted patient EMR with mandatory emergency audit logging', module: 'Governance' },
    { key: 'ClinicalGovernance.DelegateAuthority', name: 'Delegate Physician Coverage', description: 'Authorize coverage delegations to peer attending physicians', module: 'Governance' },

    // Security & User Management
    { key: 'UserManagement.View', name: 'View Staff Accounts', description: 'Access staff directory and account status', module: 'Security' },
    { key: 'UserManagement.ManageRoles', name: 'Manage Roles & PBAC Policies', description: 'Configure granular permission matrix and user roles', module: 'Security' },
    { key: 'UserManagement.AuditLogs', name: 'HIPAA Security Audit Logs', description: 'Inspect immutable HIPAA EMR access trails and compliance logs', module: 'Security' }
  ];

  defaultRolePermissionsMap: Record<string, string[]> = {
    'Admin': [
      'Patients.View',
      'Patients.Export',
      'Billing.Reports',
      'StaffDuty.ClockInOut',
      'ClinicalGovernance.DelegateAuthority',
      'UserManagement.View',
      'UserManagement.ManageRoles',
      'UserManagement.AuditLogs'
    ],
    'Doctor': [
      'Patients.View', 'Patients.Edit', 'Patients.Export',
      'Consultations.View', 'Consultations.Create', 'Consultations.Edit', 'Consultations.Sign',
      'Appointments.View', 'Appointments.Book',
      'Prescriptions.View', 'Prescriptions.Create',
      'LabOrders.View', 'LabOrders.Create',
      'Radiology.View', 'Radiology.Order', 'Radiology.SignOff',
      'StaffDuty.ClockInOut', 'ClinicalGovernance.BreakGlass', 'ClinicalGovernance.DelegateAuthority'
    ],
    'Nurse': [
      'Patients.View',
      'Consultations.View',
      'Appointments.View', 'Appointments.CheckIn',
      'Prescriptions.View',
      'LabOrders.View', 'LabOrders.Process',
      'Radiology.View',
      'StaffDuty.ClockInOut', 'ClinicalGovernance.BreakGlass'
    ],
    'Receptionist': [
      'Patients.View', 'Patients.Create', 'Patients.Edit',
      'Appointments.View', 'Appointments.Book', 'Appointments.Cancel', 'Appointments.CheckIn',
      'Billing.View', 'Billing.CreateInvoice', 'Billing.ProcessPayment',
      'StaffDuty.ClockInOut'
    ],
    'Pharmacist': [
      'Patients.View',
      'Prescriptions.View', 'Prescriptions.Dispense', 'Pharmacy.ManageInventory',
      'Billing.View',
      'StaffDuty.ClockInOut'
    ],
    'LabTechnician': [
      'Patients.View',
      'LabOrders.View', 'LabOrders.Process', 'LabOrders.Verify',
      'StaffDuty.ClockInOut'
    ],
    'Radiologist': [
      'Patients.View',
      'Radiology.View', 'Radiology.Report', 'Radiology.SignOff', 'Radiology.SafetyDose', 'Radiology.Suites',
      'StaffDuty.ClockInOut'
    ],
    'Accountant': [
      'Billing.View', 'Billing.CreateInvoice', 'Billing.ProcessPayment', 'Billing.Reports',
      'StaffDuty.ClockInOut'
    ],
    'Patient': [
      'Appointments.View', 'Appointments.Book', 'Appointments.Cancel',
      'Consultations.View',
      'Prescriptions.View',
      'LabOrders.View',
      'Radiology.View',
      'Billing.View'
    ]
  };

  // Reverse alias map to convert any backend legacy permissions into canonical 36 keys
  private readonly legacyToCanonicalMap: Record<string, string[]> = {
    'Emr.View': ['Patients.View', 'Consultations.View'],
    'Emr.BreakGlass': ['ClinicalGovernance.BreakGlass'],
    'Governance.BreakGlass': ['ClinicalGovernance.BreakGlass'],
    'Governance.DelegateAuthority': ['ClinicalGovernance.DelegateAuthority'],
    'Appointments.Manage': ['Appointments.Book', 'Appointments.Cancel'],
    'Prescriptions.Issue': ['Prescriptions.Create'],
    'Medicines.Manage': ['Pharmacy.ManageInventory'],
    'Medicines.View': ['Pharmacy.ManageInventory'],
    'Pharmacy.Audit': ['Pharmacy.ManageInventory'],
    'Pharmacy.Requisitions': ['Pharmacy.ManageInventory'],
    'Lab.Order': ['LabOrders.Create'],
    'Lab.Collect': ['LabOrders.Process'],
    'Lab.Analyze': ['LabOrders.Process'],
    'Lab.VerifyResults': ['LabOrders.Verify'],
    'Lab.Inventory': ['LabOrders.Process'],
    'Lab.Equipment': ['LabOrders.Process'],
    'Lab.Requisitions': ['LabOrders.Process'],
    'Radiology.ExecuteScan': ['Radiology.Report'],
    'Radiology.AcknowledgeAlert': ['Radiology.SignOff'],
    'Billing.CollectPayment': ['Billing.ProcessPayment'],
    'Billing.Claims': ['Billing.Reports'],
    'Billing.Reconciliation': ['Billing.Reports'],
    'Billing.ApplyDiscount': ['Billing.CreateInvoice'],
    'Billing.Adjustments': ['Billing.Reports'],
    'Billing.Expenses': ['Billing.Reports'],
    'Billing.PettyCash': ['Billing.Reports'],
    'Billing.Payroll': ['Billing.Reports'],
    'Users.Manage': ['UserManagement.ManageRoles'],
    'Audit.View': ['UserManagement.AuditLogs']
  };

  // Forward expansion map when saving to backend, ensuring legacy endpoints also grant access
  private readonly canonicalToBackendAliases: Record<string, string[]> = {
    'Patients.View': ['Emr.View'],
    'Consultations.View': ['Emr.View'],
    'Consultations.Create': ['Emr.View'],
    'Appointments.Book': ['Appointments.Manage'],
    'Appointments.Cancel': ['Appointments.Manage'],
    'Prescriptions.Create': ['Prescriptions.Issue'],
    'Pharmacy.ManageInventory': ['Medicines.Manage', 'Medicines.View'],
    'LabOrders.Create': ['Lab.Order'],
    'LabOrders.Process': ['Lab.Analyze', 'Lab.Collect'],
    'LabOrders.Verify': ['Lab.VerifyResults'],
    'Radiology.Report': ['Radiology.ExecuteScan'],
    'Radiology.SignOff': ['Radiology.AcknowledgeAlert'],
    'Billing.CreateInvoice': ['Billing.ApplyDiscount'],
    'Billing.ProcessPayment': ['Billing.CollectPayment'],
    'Billing.Reports': ['Billing.Claims', 'Billing.Reconciliation'],
    'ClinicalGovernance.BreakGlass': ['Emr.BreakGlass', 'Governance.BreakGlass'],
    'ClinicalGovernance.DelegateAuthority': ['Governance.DelegateAuthority'],
    'UserManagement.ManageRoles': ['Users.Manage'],
    'UserManagement.AuditLogs': ['Audit.View']
  };

  filteredPermissions = computed(() => {
    let list = this.allAvailablePermissions;
    const search = this.matrixSearch().toLowerCase().trim();
    const mod = this.selectedModuleFilter();

    if (mod !== 'ALL') {
      list = list.filter(p => p.module === mod);
    }
    if (search) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.key.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
      );
    }
    return list;
  });

  grantedPermissionsCount = computed(() =>
    this.filteredPermissions().filter(p => this.isPermissionChecked(p.key)).length
  );

  // --- TAB 3: HIPAA EMR AUDIT TRAIL ---
  auditLogs = signal<EmrAccessAuditLog[]>([]);
  loadingAudit = signal<boolean>(false);
  auditSearch = signal<string>('');
  emergencyOnlyFilter = signal<boolean>(false);
  selectedAuditRecord = signal<EmrAccessAuditLog | null>(null);
  showAuditDetailModal = signal<boolean>(false);

  filteredAuditLogs = computed(() => {
    let list = this.auditLogs() || [];
    const search = this.auditSearch().toLowerCase().trim();
    const emergencyOnly = this.emergencyOnlyFilter();

    if (emergencyOnly) {
      list = list.filter(a => a.isEmergencyOverride === true);
    }
    if (search) {
      list = list.filter(a =>
        (a.patientName && a.patientName.toLowerCase().includes(search)) ||
        (a.accessedByUserName && a.accessedByUserName.toLowerCase().includes(search)) ||
        (a.accessedByRole && a.accessedByRole.toLowerCase().includes(search)) ||
        (a.accessType && a.accessType.toLowerCase().includes(search)) ||
        (a.actionDetail && a.actionDetail.toLowerCase().includes(search)) ||
        (a.breakGlassRationale && a.breakGlassRationale.toLowerCase().includes(search))
      );
    }
    return list;
  });

  totalAuditEvents = computed(() => this.auditLogs().length);
  breakGlassCount = computed(() => this.auditLogs().filter(a => a.isEmergencyOverride).length);
  standardViewCount = computed(() => this.auditLogs().filter(a => !a.isEmergencyOverride).length);

  // --- TAB 4: ACTIVE DUTY & DELEGATIONS ---
  activeStaffList = signal<StaffDutyShift[]>([]);
  activeDelegationsList = signal<DoctorDelegation[]>([]);
  loadingRoster = signal<boolean>(false);
  showDelegationModal = signal<boolean>(false);

  newDelegation = {
    delegatingDoctorName: 'Dr. John Smith',
    coveringDoctorName: '',
    startDateUtc: new Date().toISOString().slice(0, 16),
    endDateUtc: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
    reason: 'Clinical Coverage / On-Call Rotation',
    notes: ''
  };

  delegationReasons: string[] = [
    'Clinical Coverage / On-Call Rotation',
    'Maternity / Paternity Leave',
    'Medical Leave of Absence',
    'Conference / CME Training',
    'Emergency Coverage'
  ];

  availableDoctors = computed(() =>
    this.users().filter(u => {
      const roles = u.roles || (u.role ? [u.role] : []);
      return roles.some(r => r.toLowerCase() === 'doctor');
    })
  );

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.syncTabWithRoute();
      });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showCreateModal()) this.closeCreateUserModal();
    else if (this.showRoleModal()) this.closeRoleModal();
    else if (this.showResetPasswordModal() && !this.isResettingPassword()) this.closeResetPasswordModal();
    else if (this.showAuditDetailModal()) this.closeAuditDetailModal();
    else if (this.showDelegationModal()) this.closeDelegationModal();
  }

  ngOnInit(): void {
    this.syncTabWithRoute();
  }

  syncTabWithRoute(): void {
    const url = this.router.url;
    let targetTab: 'directory' | 'pbac' | 'audit' | 'roster' = 'directory';
    if (url.includes('/users/pbac') || url.includes('tab=pbac')) {
      targetTab = 'pbac';
    } else if (url.includes('/users/audit') || url.includes('tab=audit')) {
      targetTab = 'audit';
    } else if (url.includes('/users/roster') || url.includes('tab=roster')) {
      targetTab = 'roster';
    } else {
      targetTab = 'directory';
    }
    this.activeTab.set(targetTab);
    this.loadTabData(targetTab);
  }

  loadTabData(tab: 'directory' | 'pbac' | 'audit' | 'roster'): void {
    if (tab === 'directory') this.loadUsers();
    else if (tab === 'pbac') this.loadMatrixPermissions(this.selectedMatrixRole());
    else if (tab === 'audit') this.loadAuditLogs();
    else if (tab === 'roster') this.loadDutyRoster();
  }

  setTab(tab: 'directory' | 'pbac' | 'audit' | 'roster'): void {
    this.activeTab.set(tab);
    this.router.navigate(['/users', tab]);
    this.loadTabData(tab);
  }

  // --- TAB 1 METHODS ---
  loadUsers(): void {
    this.loadingUsers.set(true);
    this.userService.getUsers().subscribe({
      next: (res: UserDto[] | { data?: UserDto[]; items?: UserDto[] }) => {
        let list: (UserDto & { createdDate?: string })[] = [];
        if (Array.isArray(res)) list = res;
        else if (res && Array.isArray(res.data)) list = res.data;
        else if (res && Array.isArray(res.items)) list = res.items;

        const mapped: UserDto[] = list.map((u) => ({
          id: u.id || u.userId || '',
          userName: u.userName || u.username || '',
          email: u.email || '',
          roles: Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []),
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          fullName: u.fullName || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.userName || u.username)),
          phoneNumber: u.phoneNumber || '',
          isActive: u.isActive !== undefined ? u.isActive : true,
          createdAt: u.createdAt || u.createdDate
        }));

        this.users.set(mapped);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.toast.error('Failed to load users directory.');
        this.loadingUsers.set(false);
      }
    });
  }

  openCreateUserModal(): void {
    this.newUser = {
      userName: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'Doctor',
      phoneNumber: ''
    };
    this.showCreateModal.set(true);
  }

  closeCreateUserModal(): void {
    this.showCreateModal.set(false);
  }

  submitCreateUser(): void {
    if (!this.newUser.userName || !this.newUser.email || !this.newUser.password) {
      this.toast.warning('Please fill out all required fields.');
      return;
    }

    this.userService.createUser(this.newUser).subscribe({
      next: () => {
        this.toast.success(`Staff member '${this.newUser.userName}' provisioned with role '${this.newUser.role}'.`);
        this.showCreateModal.set(false);
        this.loadUsers();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || 'Failed to create staff member.';
        this.toast.error(msg);
      }
    });
  }

  openRoleModal(user: UserDto): void {
    this.selectedUserForRole.set(user);
    this.newRoleToAssign.set('Doctor');
    this.showRoleModal.set(true);
  }

  closeRoleModal(): void {
    this.showRoleModal.set(false);
    this.selectedUserForRole.set(null);
  }

  assignRoleToUser(): void {
    const user = this.selectedUserForRole();
    if (!user) return;

    this.userService.assignRole(user.id || '', this.newRoleToAssign()).subscribe({
      next: () => {
        this.toast.success(`Role '${this.newRoleToAssign()}' assigned to ${user.userName}.`);
        this.closeRoleModal();
        this.loadUsers();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to assign role.');
      }
    });
  }

  removeRoleFromUser(user: UserDto, roleName: string): void {
    if (!confirm(`Remove role '${roleName}' from ${user.userName || user.firstName}?`)) return;
    this.userService.removeRole(user.id || '', roleName).subscribe({
      next: () => {
        this.toast.success(`Role '${roleName}' removed.`);
        this.loadUsers();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to remove role.');
      }
    });
  }

  toggleUserActive(user: UserDto): void {
    this.userService.toggleUserStatus(user.id || '').subscribe({
      next: () => {
        user.isActive = !user.isActive;
        this.toast.info(`User ${user.userName} is now ${user.isActive ? 'Active' : 'Deactivated'}.`);
      },
      error: () => {
        this.toast.error('Failed to update user status.');
      }
    });
  }

  // --- RESET PASSWORD MODAL ---
  openResetPasswordModal(user: UserDto): void {
    this.selectedUserForReset.set(user);
    this.newPasswordValue.set('');
    this.confirmPasswordValue.set('');
    this.showResetPasswordModal.set(true);
  }

  closeResetPasswordModal(): void {
    this.showResetPasswordModal.set(false);
    this.selectedUserForReset.set(null);
    this.newPasswordValue.set('');
    this.confirmPasswordValue.set('');
  }

  submitResetPassword(): void {
    const user = this.selectedUserForReset();
    if (!user) return;
    const pwd = this.newPasswordValue();
    const confirm = this.confirmPasswordValue();

    if (!pwd || pwd.length < 8) {
      this.toast.warning('Password must be at least 8 characters.');
      return;
    }
    if (pwd !== confirm) {
      this.toast.warning('Passwords do not match.');
      return;
    }

    this.isResettingPassword.set(true);
    this.userService.resetPassword(user.id || '', pwd).subscribe({
      next: () => {
        this.toast.success(`Password for ${user.userName} has been reset successfully.`);
        this.isResettingPassword.set(false);
        this.closeResetPasswordModal();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to reset password.');
        this.isResettingPassword.set(false);
      }
    });
  }

  // --- TAB 2 PBAC METHODS ---
  onMatrixRoleChange(role: string): void {
    this.selectedMatrixRole.set(role);
    this.loadMatrixPermissions(role);
  }

  loadMatrixPermissions(role: string): void {
    this.loadingMatrix.set(true);
    this.permissionService.getRolePermissions(role).subscribe({
      next: (res: RolePermissionMatrixDto[] | (RolePermissionMatrixDto & { role?: string; permissions?: string[] })) => {
        let rawPerms: string[] = [];
        if (Array.isArray(res)) {
          const item = res.find((r) => (r.roleName || '').toLowerCase() === role.toLowerCase());
          rawPerms = item?.grantedPermissions ?? [];
        } else if (res) {
          rawPerms = res.grantedPermissions || res.permissions || [];
        }

        const validCanonicalKeys = new Set(this.allAvailablePermissions.map(p => p.key));
        const canonicalSet = new Set<string>();

        if (rawPerms.length === 0 && this.defaultRolePermissionsMap[role]) {
          this.defaultRolePermissionsMap[role].forEach(p => canonicalSet.add(p));
        } else {
          for (const perm of rawPerms) {
            if (validCanonicalKeys.has(perm)) {
              canonicalSet.add(perm);
            } else if (this.legacyToCanonicalMap[perm]) {
              for (const canonicalKey of this.legacyToCanonicalMap[perm]) {
                canonicalSet.add(canonicalKey);
              }
            }
          }
        }

        this.matrixPermissions.set(Array.from(canonicalSet));
        this.loadingMatrix.set(false);
      },
      error: () => {
        const defaults = this.defaultRolePermissionsMap[role] || [];
        this.matrixPermissions.set([...defaults]);
        this.loadingMatrix.set(false);
      }
    });
  }

  applyStandardDefaults(): void {
    const role = this.selectedMatrixRole();
    const defaults = this.defaultRolePermissionsMap[role] || [];
    this.matrixPermissions.set([...defaults]);
    this.toast.info(`Applied standard clinical permissions preset for '${role}'. Click 'Save Policy Matrix' to commit changes.`);
  }

  isPermissionChecked(permKey: string): boolean {
    return this.matrixPermissions().includes(permKey);
  }

  togglePermission(permKey: string): void {
    const permsSet = new Set(this.matrixPermissions());
    if (permsSet.has(permKey)) {
      permsSet.delete(permKey);
    } else {
      permsSet.add(permKey);
    }
    this.matrixPermissions.set(Array.from(permsSet));
  }

  saveRolePermissions(): void {
    this.isSavingMatrix.set(true);
    const role = this.selectedMatrixRole();
    const canonicalPerms = this.matrixPermissions();

    const toSaveSet = new Set<string>(canonicalPerms);
    for (const perm of canonicalPerms) {
      const aliases = this.canonicalToBackendAliases[perm];
      if (aliases) {
        aliases.forEach(a => toSaveSet.add(a));
      }
    }
    const permissionsToSave = Array.from(toSaveSet);

    this.permissionService.updateRolePermissions(role, permissionsToSave).subscribe({
      next: () => {
        this.toast.success(`PBAC permission matrix for '${role}' saved successfully.`);
        this.isSavingMatrix.set(false);
        this.permissionService.loadAllPermissions();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(extractProblemDetailsMessage(err.error, 'Failed to update role permissions.'));
        this.isSavingMatrix.set(false);
      }
    });
  }

  // --- TAB 3 HIPAA AUDIT METHODS ---
  loadAuditLogs(): void {
    this.loadingAudit.set(true);
    this.emrAccessService.getAuditLogs(1, 50, undefined, this.emergencyOnlyFilter()).subscribe({
      next: (res: PagedResponse<EmrAccessAuditLog> | EmrAccessAuditLog[] | { data?: EmrAccessAuditLog[] }) => {
        let list: EmrAccessAuditLog[] = [];
        if (Array.isArray(res)) list = res;
        else if ('items' in res && Array.isArray(res.items)) list = res.items;
        else if ('data' in res && Array.isArray(res.data)) list = res.data;

        this.auditLogs.set(list);
        this.loadingAudit.set(false);
      },
      error: () => {
        this.auditLogs.set([]);
        this.loadingAudit.set(false);
      }
    });
  }

  toggleEmergencyFilter(): void {
    this.emergencyOnlyFilter.set(!this.emergencyOnlyFilter());
    this.loadAuditLogs();
  }

  viewAuditDetail(record: EmrAccessAuditLog): void {
    this.selectedAuditRecord.set(record);
    this.showAuditDetailModal.set(true);
  }

  closeAuditDetailModal(): void {
    this.showAuditDetailModal.set(false);
    this.selectedAuditRecord.set(null);
  }

  exportAuditCsv(): void {
    const logs = this.filteredAuditLogs();
    if (!logs.length) {
      this.toast.warning('No audit records to export.');
      return;
    }

    const headers = ['Timestamp', 'Clinician', 'Role', 'Patient', 'Access Type', 'Break-Glass', 'Rationale', 'Details'];
    const rows = logs.map(a => [
      a.accessedAtUtc ? new Date(a.accessedAtUtc).toISOString() : '',
      a.accessedByUserName || '',
      a.accessedByRole || '',
      a.patientName || '',
      a.accessType || '',
      a.isEmergencyOverride ? 'YES' : 'NO',
      (a.breakGlassRationale || '').replace(/,/g, ';'),
      (a.actionDetail || '').replace(/,/g, ';')
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HIPAA_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toast.success(`Exported ${logs.length} audit records to CSV.`);
  }

  // --- TAB 4 ROSTER & DELEGATIONS METHODS ---
  loadDutyRoster(): void {
    this.loadingRoster.set(true);

    let staffDone = false;
    let delsDone = false;
    const checkDone = () => { if (staffDone && delsDone) this.loadingRoster.set(false); };

    this.dutyService.getActiveStaff().subscribe({
      next: (staff) => { this.activeStaffList.set(staff || []); staffDone = true; checkDone(); },
      error: () => { this.activeStaffList.set([]); staffDone = true; checkDone(); }
    });

    this.dutyService.getActiveDelegations().subscribe({
      next: (dels) => { this.activeDelegationsList.set(dels || []); delsDone = true; checkDone(); },
      error: () => { this.activeDelegationsList.set([]); delsDone = true; checkDone(); }
    });
  }

  openDelegationModal(): void {
    if (this.users().length === 0) {
      this.loadUsers();
    }

    const currentUser = this.authService.currentUserValue;
    const isDoc = (currentUser?.roles || []).includes('Doctor');
    const defaultDelegator = isDoc
      ? (currentUser?.fullName ? `Dr. ${currentUser.fullName}` : `Dr. ${currentUser?.username}`)
      : 'Dr. John Smith';

    this.newDelegation = {
      delegatingDoctorName: defaultDelegator,
      coveringDoctorName: 'Dr. Sarah James',
      startDateUtc: new Date().toISOString().slice(0, 16),
      endDateUtc: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
      reason: 'Clinical Coverage / On-Call Rotation',
      notes: ''
    };
    this.showDelegationModal.set(true);
  }

  closeDelegationModal(): void {
    this.showDelegationModal.set(false);
  }

  submitDelegation(): void {
    if (!this.newDelegation.coveringDoctorName || !this.newDelegation.reason) {
      this.toast.warning('Covering doctor and reason are required.');
      return;
    }

    const delSearch = (this.newDelegation.delegatingDoctorName || '').replace(/^dr\.?\s*/i, '').trim().toLowerCase();
    const covSearch = (this.newDelegation.coveringDoctorName || '').replace(/^dr\.?\s*/i, '').trim().toLowerCase();

    const delegatingDoc = this.users().find(u => {
      const full = (u.fullName || '').toLowerCase();
      const user = (u.userName || u.username || '').toLowerCase();
      return (delSearch && (full.includes(delSearch) || user.includes(delSearch))) ||
        (full && delSearch.includes(full));
    });

    const coveringDoc = this.users().find(u => {
      const full = (u.fullName || '').toLowerCase();
      const user = (u.userName || u.username || '').toLowerCase();
      return (covSearch && (full.includes(covSearch) || user.includes(covSearch))) ||
        (full && covSearch.includes(full));
    });

    let startDateIso: string;
    let endDateIso: string;
    try {
      startDateIso = this.newDelegation.startDateUtc
        ? new Date(this.newDelegation.startDateUtc).toISOString()
        : new Date().toISOString();
    } catch {
      startDateIso = new Date().toISOString();
    }

    try {
      endDateIso = this.newDelegation.endDateUtc
        ? new Date(this.newDelegation.endDateUtc).toISOString()
        : new Date(Date.now() + 86400000 * 3).toISOString();
    } catch {
      endDateIso = new Date(Date.now() + 86400000 * 3).toISOString();
    }

    this.dutyService.createDelegation({
      originalDoctorId: delegatingDoc?.id,
      delegatingDoctorName: this.newDelegation.delegatingDoctorName,
      coveringDoctorId: coveringDoc?.id,
      coveringDoctorName: this.newDelegation.coveringDoctorName,
      startDateUtc: startDateIso,
      endDateUtc: endDateIso,
      reason: this.newDelegation.reason,
      notes: this.newDelegation.notes
    }).subscribe({
      next: () => {
        this.toast.success('Doctor coverage delegation authorized.');
        this.showDelegationModal.set(false);
        this.loadDutyRoster();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || err.error?.message || 'Failed to create delegation.');
      }
    });
  }

  revokeDelegation(id: string): void {
    if (confirm('Revoke this doctor coverage delegation?')) {
      this.dutyService.revokeDelegation(id).subscribe({
        next: () => {
          this.toast.success('Delegation revoked.');
          this.loadDutyRoster();
        },
        error: () => this.toast.error('Failed to revoke.')
      });
    }
  }

  // --- SEMANTIC HELPERS ---
  formatAccessType(accessType: string): string {
    const map: Record<string, string> = {
      'BreakGlassEmergencyOverride': 'Break-Glass Override',
      'BREAKGLASSEMERGENCYOVERRIDE': 'Break-Glass Override',
      'ViewChart': 'View Chart',
      'VIEWCHART': 'View Chart',
      'ViewProfile': 'View Profile',
      'VIEWPROFILE': 'View Profile',
      'ViewVitals': 'View Vitals',
      'VIEWVITALS': 'View Vitals',
      'ViewConsultations': 'View Consultations',
      'ViewLabResults': 'View Lab Results',
      'EMR Chart View': 'View Chart',
      'Vitals Entry': 'Vitals Entry',
      'Emergency Override': 'Emergency Override',
      'Prescription Verification': 'Rx Verification'
    };
    return map[accessType] || accessType;
  }

  trackByAuditId = (_index: number, item: EmrAccessAuditLog): string =>
    item.id || item.accessedAtUtc;

  getUserInitials(user: UserDto): string {
    const f = user.firstName?.[0] ?? '';
    const l = user.lastName?.[0] ?? '';
    if (f && l) return (f + l).toUpperCase();
    if (f) return f.toUpperCase();
    if (user.userName?.[0]) return user.userName[0].toUpperCase();
    return 'U';
  }

  getPrimaryRole(user: UserDto): string {
    const roles = user.roles || (user.role ? [user.role] : []);
    return roles[0] || 'No Role';
  }

  getRoleTone(role?: string): StatusTone {
    const normalized = (role || '').trim().toLowerCase();
    if (normalized === 'admin') return 'info';
    if (normalized === 'doctor') return 'success';
    if (normalized === 'accountant') return 'warning';
    return 'neutral';
  }

  getSecurityTone(isEmergency?: boolean): StatusTone {
    return isEmergency ? 'danger' : 'success';
  }

  getPasswordStrength(length: number): { label: string; tone: StatusTone } {
    if (length < 8) return { label: 'Too short (minimum 8 characters)', tone: 'danger' };
    if (length < 12) return { label: 'Acceptable strength', tone: 'warning' };
    return { label: 'Strong password', tone: 'success' };
  }
}
