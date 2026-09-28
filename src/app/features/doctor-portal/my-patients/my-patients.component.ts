import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { PatientService } from '../../../services/patient.service';
import { AuthService } from '../../../services/auth.service';
import { Patient } from '../../../models/patient.model';

@Component({
  selector: 'app-my-patients',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    RouterLink
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
      (`${p.firstName} ${p.lastName}`).toLowerCase().includes(q) ||
      (p.allergies || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.loadPatients();
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
        // Fallback to all patients if admin
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
