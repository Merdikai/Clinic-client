import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { NursingService } from '../../services/nursing.service';
import { PatientService } from '../../services/patient.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../ui/toast/toast.service';
import { NursingProcedure, CreateNursingProcedureRequest } from '../../models/nursing.model';

@Component({
  selector: 'app-nursing-procedures',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './nursing-procedures.component.html',
  styleUrls: ['./nursing-procedures.component.scss']
})
export class NursingProceduresComponent implements OnInit {
  private nursingService = inject(NursingService);
  private patientService = inject(PatientService);
  public authService = inject(AuthService);
  private toast = inject(ToastService);

  procedures = signal<NursingProcedure[]>([]);
  patients = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isModalOpen = signal<boolean>(false);

  // Completion Modal
  isCompleteModalOpen = signal<boolean>(false);
  selectedProcedureForCompletion = signal<NursingProcedure | null>(null);
  completeTolerance = signal<string>('Well Tolerated');
  completeSupplies = signal<string>('');
  completeNotes = signal<string>('');

  // Filters
  filterType = signal<string>('ALL');
  filterStatus = signal<string>('ALL');
  searchQuery = signal<string>('');

  // Form Fields
  formPatientId = signal<string>('');
  formProcedureType = signal<string>('Wound Dressing & Care');
  formBodySite = signal<string>('');
  formPatientTolerance = signal<string>('Well Tolerated');
  formSuppliesUsed = signal<string>('');
  formNotes = signal<string>('');

  procedureTypesList = [
    'Wound Dressing & Care',
    'Suture Removal',
    'Vaccine Administration',
    'IV Cannulation / Line Care',
    'IM / SC Injection',
    'Nebulizer Therapy',
    'Foley Catheter Care',
    'Blood Glucose / Ketone Check',
    'ECG / EKG Acquisition',
    'Ear Lavage / Irrigation',
    'Other Clinical Procedure'
  ];

  toleranceOptions = [
    'Well Tolerated',
    'Mild Discomfort',
    'Moderate Pain',
    'Patient Anxious',
    'Vasovagal / Dizziness',
    'Complication Noted'
  ];

  displayedColumns = ['status', 'performedAt', 'patient', 'procedureType', 'bodySite', 'tolerance', 'nurse', 'notes', 'actions'];

  filteredProcedures = computed(() => {
    let list = this.procedures();
    const type = this.filterType();
    const status = this.filterStatus();
    const q = this.searchQuery().toLowerCase().trim();

    if (type !== 'ALL') {
      list = list.filter(p => p.procedureType === type);
    }

    if (status !== 'ALL') {
      list = list.filter(p => p.status === status);
    }

    if (q) {
      list = list.filter(p =>
        (p.patientName && p.patientName.toLowerCase().includes(q)) ||
        (p.procedureType && p.procedureType.toLowerCase().includes(q)) ||
        (p.bodySite && p.bodySite.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        (p.orderedByDoctorName && p.orderedByDoctorName.toLowerCase().includes(q))
      );
    }

    return list;
  });

  // KPIs
  totalProceduresCount = computed(() => this.procedures().length);
  orderedCount = computed(() => this.procedures().filter(p => p.status === 'Ordered').length);
  completedCount = computed(() => this.procedures().filter(p => p.status === 'Completed').length);
  woundCareCount = computed(() => this.procedures().filter(p => p.procedureType.includes('Wound')).length);
  injectionsCount = computed(() => this.procedures().filter(p => p.procedureType.includes('Injection') || p.procedureType.includes('Vaccine')).length);
  ivCount = computed(() => this.procedures().filter(p => p.procedureType.includes('IV')).length);

  ngOnInit() {
    this.loadProcedures();
    this.loadPatients();
  }

  loadProcedures() {
    this.isLoading.set(true);
    this.nursingService.getProcedures().subscribe({
      next: (data) => {
        this.procedures.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error('Failed to load nursing procedures.');
      }
    });
  }

  loadPatients() {
    this.patientService.getAll(1, 200).subscribe({
      next: (res: any) => {
        const list = res.items || res.data || (Array.isArray(res) ? res : []);
        this.patients.set(list);
      },
      error: () => {}
    });
  }

  openNewProcedureModal(patientId?: string) {
    this.formPatientId.set(patientId || (this.patients().length > 0 ? this.patients()[0].id : ''));
    this.formProcedureType.set('Wound Dressing & Care');
    this.formBodySite.set('');
    this.formPatientTolerance.set('Well Tolerated');
    this.formSuppliesUsed.set('');
    this.formNotes.set('');
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  saveProcedure() {
    if (!this.formPatientId()) {
      this.toast.error('Please select a patient.');
      return;
    }

    if (!this.formProcedureType()) {
      this.toast.error('Please select procedure type.');
      return;
    }

    this.isSubmitting.set(true);
    const request: CreateNursingProcedureRequest = {
      patientId: this.formPatientId(),
      procedureType: this.formProcedureType(),
      bodySite: this.formBodySite(),
      patientTolerance: this.formPatientTolerance(),
      suppliesUsed: this.formSuppliesUsed(),
      notes: this.formNotes(),
      performedAt: new Date().toISOString()
    };

    this.nursingService.createProcedure(request).subscribe({
      next: (newProc) => {
        this.isSubmitting.set(false);
        this.toast.success('Nursing procedure documented successfully.');
        this.closeModal();
        this.loadProcedures();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err.error?.detail || err.error?.title || 'Failed to document procedure.');
      }
    });
  }

  openCompleteModal(proc: NursingProcedure) {
    this.selectedProcedureForCompletion.set(proc);
    this.completeTolerance.set('Well Tolerated');
    this.completeSupplies.set('');
    this.completeNotes.set('');
    this.isCompleteModalOpen.set(true);
  }

  closeCompleteModal() {
    this.isCompleteModalOpen.set(false);
    this.selectedProcedureForCompletion.set(null);
  }

  submitCompleteProcedure() {
    const proc = this.selectedProcedureForCompletion();
    if (!proc) return;

    this.isSubmitting.set(true);
    this.nursingService.completeProcedure(proc.id, {
      patientTolerance: this.completeTolerance(),
      suppliesUsed: this.completeSupplies(),
      notes: this.completeNotes()
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success(`Procedure for ${proc.patientName} marked as completed!`);
        this.closeCompleteModal();
        this.loadProcedures();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err.error?.detail || err.error?.title || 'Failed to complete nursing procedure.');
      }
    });
  }
}

