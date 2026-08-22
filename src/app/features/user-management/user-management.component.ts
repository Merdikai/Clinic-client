import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserManagementService } from '../../services/user-management.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent {
  private userManagementService = inject(UserManagementService);
  private snackBar = inject(MatSnackBar);

  users = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedRoleFilter = signal<string>('ALL');

  displayedColumns = ['avatar', 'username', 'fullName', 'roles', 'actions'];
  availableRoles = ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Accountant', 'Patient'];

  filteredUsers = computed(() => {
    let list = this.users() || [];
    const query = this.searchQuery().toLowerCase().trim();
    const roleFilter = this.selectedRoleFilter();

    if (query) {
      list = list.filter(u =>
        u.username?.toLowerCase().includes(query) ||
        u.fullName?.toLowerCase().includes(query) ||
        u.roles?.some((r: string) => r.toLowerCase().includes(query))
      );
    }

    if (roleFilter !== 'ALL') {
      list = list.filter(u => u.roles && u.roles.includes(roleFilter));
    }

    return list;
  });

  // Metric computations
  adminCount = computed(() => (this.users() || []).filter(u => u.roles?.includes('Admin')).length);
  doctorCount = computed(() => (this.users() || []).filter(u => u.roles?.includes('Doctor')).length);
  nurseCount = computed(() => (this.users() || []).filter(u => u.roles?.includes('Nurse')).length);
  pharmaCount = computed(() => (this.users() || []).filter(u => u.roles?.includes('Pharmacist')).length);
  accountantCount = computed(() => (this.users() || []).filter(u => u.roles?.includes('Accountant')).length);

  constructor() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.userManagementService.getAllUsersWithRoles().subscribe({
      next: (users) => {
        this.users.set(users || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.users.set([]);
        this.isLoading.set(false);
      }
    });
  }

  assignRole(userId: string, roleName: string) {
    if (!roleName) return;
    this.userManagementService.assignRole(userId, roleName).subscribe({
      next: () => {
        this.snackBar.open(`Role '${roleName}' granted successfully!`, 'Success', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => {
        this.snackBar.open(err.error?.detail || 'Failed to assign role', 'Close', { duration: 3000 });
      }
    });
  }

  removeRole(userId: string, roleName: string) {
    this.userManagementService.removeRole(userId, roleName).subscribe({
      next: () => {
        this.snackBar.open(`Role '${roleName}' revoked.`, 'Updated', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => {
        this.snackBar.open(err.error?.detail || 'Failed to remove role', 'Close', { duration: 3000 });
      }
    });
  }

  hasRole(user: any, role: string): boolean {
    return user.roles && user.roles.includes(role);
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  getRoleClass(role: string): string {
    switch (role?.toLowerCase()) {
      case 'admin': return 'role-admin';
      case 'doctor': return 'role-doctor';
      case 'nurse': return 'role-nurse';
      case 'pharmacist': return 'role-pharma';
      case 'accountant': return 'role-accountant';
      case 'receptionist': return 'role-reception';
      case 'patient': return 'role-patient';
      default: return 'role-default';
    }
  }
}
