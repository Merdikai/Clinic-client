import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { PatientService } from '../../../services/patient.service';
import { AuthService } from '../../../services/auth.service';
import { Patient } from '../../../models/patient.model';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-my-patients',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './my-patients.component.html',
  styleUrls: ['./my-patients.component.scss']
})
export class MyPatientsComponent implements OnInit {
  private patientService = inject(PatientService);
  private authService = inject(AuthService);

  patients = signal<Patient[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');

  doctorName = computed(() => this.authService.currentUserName() || 'Attending Physician');

  filteredPatients = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.patients();
    return this.patients().filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.allergies || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.loadPatients();
  }

  hasKnownAllergy(patient: Patient): boolean {
    return !!(patient.allergies && patient.allergies !== 'None');
  }

  loadPatients() {
    this.isLoading.set(true);
    this.patientService.getMyPanel().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        this.patients.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.patientService.getAll(1, 100).subscribe({
          next: (allRes: any) => {
            this.patients.set(allRes?.items || allRes || []);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false)
        });
      }
    });
  }
}
