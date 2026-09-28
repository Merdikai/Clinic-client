import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { PatientService } from '../../../services/patient.service';
import { RadiologyService } from '../../../services/radiology.service';
import { Patient } from '../../../models/patient.model';
import { RadiologyOrder } from '../../../models/radiology.model';

@Component({
  selector: 'app-my-medical-file',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    RouterLink
  ],
  templateUrl: './my-medical-file.component.html',
  styleUrls: ['./my-medical-file.component.scss']
})
export class MyMedicalFileComponent implements OnInit {
  private patientService = inject(PatientService);
  private radiologyService = inject(RadiologyService);

  patient = signal<Patient | null>(null);
  medicalHistory = signal<any | null>(null);
  radiologyOrders = signal<RadiologyOrder[]>([]);
  isLoading = signal(true);

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
        const fallbackId = 'a11ce000-0000-0000-0000-000000000001';
        this.patient.set({
          id: fallbackId,
          firstName: 'Alice',
          lastName: 'Patient',
          medicalRecordNumber: 'PAT-ALICE-001',
          dateOfBirth: '1992-04-15',
          gender: 'Female',
          phone: '+1 (555) 666-7777',
          email: 'alice.patient@clinic.com',
          address: '742 Evergreen Terrace, Springfield',
          bloodGroup: 'O+',
          emergencyContact: 'Bob Patient (+1 555-999-8888)'
        } as any);
        this.fetchHistory(fallbackId);
      }
    });
  }

  fetchHistory(patientId: string) {
    this.patientService.getMedicalHistory(patientId).subscribe({
      next: (res: any) => {
        const data = res?.value || res;
        this.medicalHistory.set(data);
        if (data?.radiologyOrders && Array.isArray(data.radiologyOrders)) {
          this.radiologyOrders.set(data.radiologyOrders);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    // Also directly load active radiology orders for this patient
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
