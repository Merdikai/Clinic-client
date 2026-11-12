import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PatientStore } from '../../store/patient.store';
import { PatientService } from '../../services/patient.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { ToastService } from '../../ui/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatTooltipModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss']
})
export class PatientListComponent implements OnInit {
  patientStore = inject(PatientStore);
  patientService = inject(PatientService);
  public authService = inject(AuthService);
  public permissionService = inject(PermissionService);
  toast = inject(ToastService);
  router = inject(Router);

  patients = this.patientStore.patients;
  isLoading = this.patientStore.isLoading;
  totalCount = this.patientStore.totalCount;
  selectedGender = signal<string>('ALL');
  searchQuery = signal<string>('');

  isDoctor = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'doctor' || this.authService.isDoctor();
  });
  isAdmin = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'admin' || this.authService.isAdmin();
  });
  isNurse = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'nurse' || this.authService.hasRole('Nurse');
  });
  isReceptionist = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'receptionist' || this.authService.hasRole('Receptionist');
  });
  isRadiologist = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'radiologist' || this.authService.hasRole('Radiologist');
  });
  canManagePatients = computed(() => {
    return this.isAdmin() || this.isDoctor() || this.isNurse() || this.isReceptionist();
  });
  canCreateAppointment = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return (role === 'receptionist' || role === 'admin' || role === 'nurse' || role === 'patient') && !this.isDoctor() && !this.isRadiologist();
  });

  displayedColumns = ['patientId', 'name', 'gender', 'phone', 'bloodGroup', 'actions'];

  filteredPatients = computed(() => {
    let list = this.patients() || [];
    const gender = this.selectedGender();
    if (gender !== 'ALL') {
      list = list.filter(p => p.gender?.toLowerCase() === gender.toLowerCase());
    }
    return list;
  });

  maleCount = computed(() => (this.patients() || []).filter(p => p.gender?.toLowerCase() === 'male').length);
  femaleCount = computed(() => (this.patients() || []).filter(p => p.gender?.toLowerCase() === 'female').length);

  ngOnInit() {
    this.patientStore.loadPatients();
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.patientStore.setSearchTerm(value);
    this.patientStore.loadPatients();
  }

  setGenderFilter(gender: string) {
    this.selectedGender.set(gender);
  }

  clearFilters() {
    this.selectedGender.set('ALL');
    this.searchQuery.set('');
    this.patientStore.setSearchTerm('');
    this.patientStore.loadPatients();
  }

  onPageChange(event: PageEvent) {
    this.patientStore.setPageSize(event.pageSize);
    this.patientStore.setPage(event.pageIndex + 1);
    this.patientStore.loadPatients();
  }

  getInitials(name: string): string {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  editPatient(patient: any) {
    this.router.navigate(['/patients/edit', patient.id]);
  }

  deletePatient(id: string) {
    if (confirm('Are you sure you want to delete this patient record completely? This action cannot be undone.')) {
      this.patientService.delete(id).subscribe({
        next: () => {
          this.toast.success('Patient deleted successfully');
          this.patientStore.loadPatients();
        },
        error: () => this.toast.error('Error deleting patient')
      });
    }
  }
}
