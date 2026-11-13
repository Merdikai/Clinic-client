import { ChangeDetectionStrategy, Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { PrescriptionService } from '../../../services/prescription.service';
import { PatientService } from '../../../services/patient.service';
import { ToastService } from '../../../ui/toast/toast.service';
import { PagedResponse, Patient } from '../../../models/patient.model';
import { Prescription } from '../../../models/prescription.model';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-my-prescriptions',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './my-prescriptions.component.html',
  styleUrls: ['./my-prescriptions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyPrescriptionsComponent implements OnInit {
  private readonly prescriptionService = inject(PrescriptionService);
  private readonly patientService = inject(PatientService);
  private readonly toast = inject(ToastService);

  patient = signal<Patient | null>(null);
  prescriptions = signal<Prescription[]>([]);
  isLoading = signal(true);

  // Prescription Detail Modal
  isDetailModalOpen = signal(false);
  selectedPrescription = signal<Prescription | null>(null);

  pageSubtitle = computed(() => {
    const mrn = this.patient()?.medicalRecordNumber || 'Pending Verification';
    return `MRN: ${mrn} · Track prescribed medications, dosage instructions, and dispensing statuses`;
  });

  totalMedicines = computed(() => {
    return this.prescriptions().reduce((sum, rx) => sum + (rx.items?.length || 1), 0);
  });

  ngOnInit() {
    this.loadPatientData();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isDetailModalOpen()) {
      this.closeDetailModal();
    }
  }

  openDetailModal(rx: Prescription) {
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
        this.isLoading.set(false);
        this.toast.error('Unable to load your patient prescription profile.');
      }
    });
  }

  fetchPrescriptions(patientId: string) {
    this.prescriptionService.getAll(patientId).subscribe({
      next: (res: Prescription[] | PagedResponse<Prescription>) => {
        const list = Array.isArray(res) ? res : (res.items ?? []);
        this.prescriptions.set(list);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
