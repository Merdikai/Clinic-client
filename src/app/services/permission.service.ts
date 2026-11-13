import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface RolePermissionMatrixDto {
  roleName: string;
  grantedPermissions: string[];
  allAvailablePermissions?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private baseUrl = environment.apiUrl;

  // Default fallback permissions if offline or before initial load (Real-world clinical role standards)
  private readonly defaultRolePermissions: Record<string, string[]> = {
    'Admin': [
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
      'Patients.View', 'Patients.Create', 'Patients.Edit',
      'Consultations.View',
      'Appointments.View', 'Appointments.Book', 'Appointments.CheckIn', 'Appointments.Triage',
      'Prescriptions.View',
      'LabOrders.View', 'LabOrders.Process', 'Lab.Collect',
      'Radiology.View',
      'VitalSigns.Record', 'VitalSigns.View',
      'NursingProcedures.Perform', 'NursingProcedures.View',
      'ShiftHandover.Create', 'ShiftHandover.View',
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

  // Live permissions cache across all roles
  permissionsMap = signal<Record<string, string[]>>({ ...this.defaultRolePermissions });
  activeRole = signal<string>(this.getInitialRole());

  // Computed live permissions array for active role
  activePermissions = computed<string[]>(() => {
    const role = this.activeRole();
    const map = this.permissionsMap();
    return map[role] || this.defaultRolePermissions[role] || [];
  });

  private getInitialRole(): string {
    const stored = localStorage.getItem('clinic_active_role');
    if (stored) return stored;
    try {
      const userStr = localStorage.getItem('clinic_user_info');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.roles && user.roles.length > 0) {
          return user.roles[0];
        }
      }
    } catch {}
    return 'Nurse';
  }

  constructor() {
    if (this.authService.isAuthenticated() && this.authService.isAdmin()) {
      this.loadAllPermissions();
    }
  }

  loadAllPermissions(): void {
    if (!this.authService.isAuthenticated() || !this.authService.isAdmin()) {
      return;
    }
    this.http.get<RolePermissionMatrixDto[]>(`${this.baseUrl}/permissions`).pipe(
      tap(matrix => {
        if (matrix && matrix.length > 0) {
          const map: Record<string, string[]> = { ...this.defaultRolePermissions };
          for (const item of matrix) {
            map[item.roleName] = item.grantedPermissions || [];
          }
          this.permissionsMap.set(map);
        }
      }),
      catchError(() => of([]))
    ).subscribe();
  }

  setActiveRole(role: string): void {
    if (!role) return;
    this.activeRole.set(role);
    try {
      localStorage.setItem('clinic_active_role', role);
    } catch {}
  }

  hasPermission(permKey: string): boolean {
    const current = this.activePermissions();
    if (current.includes(permKey)) return true;

    // Canonical alias mappings between backend DB permissions and frontend UI checks
    const aliasMap: Record<string, string[]> = {
      'Patients.View': ['Emr.View', 'Patients.View'],
      'Appointments.View': ['Appointments.View', 'Appointments.Manage'],
      'Consultations.View': ['Emr.View', 'Consultations.View'],
      'Consultations.Create': ['Consultations.Create'],
      'Consultations.Sign': ['Consultations.Sign'],
      'LabOrders.View': ['Lab.Order', 'Lab.Analyze', 'Lab.VerifyResults', 'LabOrders.View'],
      'LabOrders.Create': ['Lab.Order', 'LabOrders.Create'],
      'LabOrders.Process': ['Lab.Analyze', 'Lab.Collect', 'LabOrders.Process'],
      'LabOrders.Verify': ['Lab.VerifyResults', 'LabOrders.Verify'],
      'Prescriptions.View': ['Prescriptions.View'],
      'Prescriptions.Create': ['Prescriptions.Issue', 'Prescriptions.Create'],
      'Prescriptions.Dispense': ['Prescriptions.Dispense'],
      'Pharmacy.ManageInventory': ['Medicines.Manage', 'Medicines.View', 'Pharmacy.ManageInventory'],
      'Billing.View': ['Billing.View'],
      'Billing.CreateInvoice': ['Billing.CollectPayment', 'Billing.CreateInvoice', 'Billing.ApplyDiscount'],
      'Billing.ProcessPayment': ['Billing.CollectPayment', 'Billing.ProcessPayment'],
      'Billing.Reports': ['Billing.Claims', 'Billing.Reconciliation', 'Billing.Reports'],
      'UserManagement.View': ['Users.Manage', 'UserManagement.View'],
      'UserManagement.ManageRoles': ['Users.Manage', 'UserManagement.ManageRoles'],
      'UserManagement.AuditLogs': ['Audit.View', 'UserManagement.AuditLogs'],
      'StaffDuty.ClockInOut': ['StaffDuty.ClockInOut'],
      'ClinicalGovernance.BreakGlass': ['Emr.BreakGlass', 'Governance.BreakGlass', 'ClinicalGovernance.BreakGlass'],
      'ClinicalGovernance.DelegateAuthority': ['Governance.DelegateAuthority', 'ClinicalGovernance.DelegateAuthority'],
      'Radiology.View': ['Radiology.View'],
      'Radiology.Order': ['Radiology.Order'],
      'Radiology.Report': ['Radiology.Report', 'Radiology.ExecuteScan'],
      'Radiology.SignOff': ['Radiology.SignOff', 'Radiology.AcknowledgeAlert'],
      'Radiology.SafetyDose': ['Radiology.SafetyDose'],
      'Radiology.Suites': ['Radiology.Suites']
    };

    const aliases = aliasMap[permKey];
    if (aliases && aliases.some(alias => current.includes(alias))) {
      return true;
    }
    return false;
  }

  hasAnyPermission(perms: string[]): boolean {
    return perms.some(p => this.hasPermission(p));
  }

  getRolePermissions(roleName?: string): Observable<RolePermissionMatrixDto[]> {
    const url = roleName 
      ? `${this.baseUrl}/permissions?roleName=${encodeURIComponent(roleName)}`
      : `${this.baseUrl}/permissions`;
    return this.http.get<RolePermissionMatrixDto[]>(url).pipe(
      tap((res) => {
        if (Array.isArray(res)) {
          const updated = { ...this.permissionsMap() };
          for (const item of res) {
            if (item.roleName) {
              updated[item.roleName] = item.grantedPermissions || [];
            }
          }
          this.permissionsMap.set(updated);
        }
      })
    );
  }

  updateRolePermissions(roleName: string, permissions: string[]): Observable<boolean> {
    return this.http.put<boolean>(`${this.baseUrl}/permissions`, {
      roleName,
      permissions
    }).pipe(
      tap(() => {
        const current = { ...this.permissionsMap() };
        current[roleName] = [...permissions];
        this.permissionsMap.set(current);
      })
    );
  }
}
