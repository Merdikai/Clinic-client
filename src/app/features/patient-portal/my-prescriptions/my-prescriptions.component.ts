import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { PrescriptionService } from '../../../services/prescription.service';
import { PatientService } from '../../../services/patient.service';
import { Patient } from '../../../models/patient.model';

@Component({
  selector: 'app-my-prescriptions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    RouterLink
  ],
  templateUrl: './my-prescriptions.component.html',
  styleUrls: ['./my-prescriptions.component.scss']
})
export class MyPrescriptionsComponent implements OnInit {
  private prescriptionService = inject(PrescriptionService);
  private patientService = inject(PatientService);

  patient = signal<Patient | null>(null);
  prescriptions = signal<any[]>([]);
  isLoading = signal(true);

  // Prescription Detail Modal
  isDetailModalOpen = signal(false);
  selectedPrescription = signal<any | null>(null);

  totalMedicines = computed(() => {
    return this.prescriptions().reduce((sum, rx) => sum + (rx.items?.length || 1), 0);
  });

  ngOnInit() {
    this.loadPatientData();
  }

  openDetailModal(rx: any) {
    this.selectedPrescription.set(rx);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal() {
    this.isDetailModalOpen.set(false);
    this.selectedPrescription.set(null);
  }

  loadPatientData() {
    this.isLoading.set(true);
    this.patientService.getMyProfile().subscribe({
      next: (pat: Patient) => {
        this.patient.set(pat);
        this.fetchPrescriptions(pat.id);
      },
      error: () => {
        const fallbackId = 'a11ce000-0000-0000-0000-000000000001';
        this.patient.set({
          id: fallbackId,
          firstName: 'Alice',
          lastName: 'Patient',
          medicalRecordNumber: 'PAT-ALICE-001'
        } as any);
        this.fetchPrescriptions(fallbackId);
      }
    });
  }

  fetchPrescriptions(patientId: string) {
    this.prescriptionService.getAll(patientId).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.items || [];
        this.prescriptions.set(list);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
