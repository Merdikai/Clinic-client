import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { PatientMedicalHistoryDto, PatientService } from '../../../services/patient.service';
import { RadiologyService } from '../../../services/radiology.service';
import { ToastService } from '../../../ui/toast/toast.service';
import { Patient } from '../../../models/patient.model';
import { RadiologyOrder } from '../../../models/radiology.model';
import { ResultEnvelope, unwrapResult } from '../../../models/api.model';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-my-medical-file',
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
  templateUrl: './my-medical-file.component.html',
  styleUrls: ['./my-medical-file.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyMedicalFileComponent implements OnInit {
  private readonly patientService = inject(PatientService);
  private readonly radiologyService = inject(RadiologyService);
  private readonly toast = inject(ToastService);

  patient = signal<Patient | null>(null);
  medicalHistory = signal<PatientMedicalHistoryDto | null>(null);
  radiologyOrders = signal<readonly RadiologyOrder[]>([]);
  isLoading = signal(true);

  pageSubtitle = computed(() => {
    const mrn = this.patient()?.medicalRecordNumber || 'Pending Verification';
    return `Confidential EHR · MRN: ${mrn} · Official health chart, recorded vitals, and diagnostic findings`;
  });

  ngOnInit() {
    this.loadPatientMedicalFile();
  }

  loadPatientMedicalFile() {
    this.isLoading.set(true);
    this.patientService.getMyProfile().subscribe({
      next: (pat: Patient) => {
        this.patient.set(pat);
        this.fetchHistory(pat.id);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Unable to load your medical chart profile.');
      }
    });
  }

  fetchHistory(patientId: string) {
    this.patientService.getMedicalHistory(patientId).subscribe({
      next: (res: PatientMedicalHistoryDto | ResultEnvelope<PatientMedicalHistoryDto>) => {
        const data = unwrapResult(res);
        this.medicalHistory.set(data);
        if (data?.radiologyOrders && Array.isArray(data.radiologyOrders)) {
          this.radiologyOrders.set(data.radiologyOrders);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.radiologyService.getOrders(patientId).subscribe({
      next: (orders) => {
        if (orders && orders.length > 0) {
          this.radiologyOrders.set(orders);
        }
      },
      error: () => {}
    });
  }
}
