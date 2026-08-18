import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { UserManagementService } from '../../services/user-management.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent {
  private userManagementService = inject(UserManagementService);

  users = signal<any[]>([]);
  displayedColumns = ['username', 'fullName', 'roles', 'actions'];
  availableRoles = ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Accountant', 'Patient'];

  constructor() {
    this.loadUsers();
  }

  loadUsers() {
    this.userManagementService.getAllUsersWithRoles().subscribe({
      next: (users) => this.users.set(users || []),
      error: () => this.users.set([])
    });
  }

  assignRole(userId: string, roleName: string) {
    if (!roleName) return;
    this.userManagementService.assignRole(userId, roleName).subscribe({
      next: () => this.loadUsers()
    });
  }

  removeRole(userId: string, roleName: string) {
    this.userManagementService.removeRole(userId, roleName).subscribe({
      next: () => this.loadUsers()
    });
  }

  hasRole(user: any, role: string): boolean {
    return user.roles && user.roles.includes(role);
  }
}
