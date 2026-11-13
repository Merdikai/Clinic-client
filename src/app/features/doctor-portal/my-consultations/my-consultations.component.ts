import { ChangeDetectionStrategy, Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AppointmentService } from '../../../services/appointment.service';
import { ConsultationService } from '../../../services/consultation.service';
import { VitalSignsService } from '../../../services/vital-signs.service';
import { PatientService } from '../../../services/patient.service';
import { MedicineService } from '../../../services/medicine.service';
import { LabService } from '../../../services/lab.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../ui/toast/toast.service';

import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

import { HttpErrorResponse } from '@angular/common/http';
import { Appointment } from '../../../models/appointment.model';
import { PagedResponse, Patient } from '../../../models/patient.model';
import { extractProblemDetailsMessage } from '../../../models/api.model';
import { CreateConsultationRequest } from '../../../models/consultation.model';
import { Medicine } from '../../../models/medicine.model';
import { LabTestTemplate } from '../../../models/lab.model';
import { VitalSign } from '../../../models/vital-signs.model';
import { RadiologyModality, RadiologyPriority } from '../../../models/radiology.model';

interface RadiologyOrderDraft {
  modality: RadiologyModality;
  procedureName: string;
  bodyPart: string;
  clinicalIndication: string;
  priority: RadiologyPriority;
  price: number;
}

interface NursingProcedureDraft {
  procedureType: string;
  bodySite: string;
  notes: string;
  priority: 'Routine' | 'Urgent' | 'Stat';
  price: number;
}

@Component({
  selector: 'app-my-consultations',
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
  templateUrl: './my-consultations.component.html',
  styleUrls: ['./my-consultations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyAppointmentsConsultationsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private consultationService = inject(ConsultationService);
  private vitalSignsService = inject(VitalSignsService);
  private patientService = inject(PatientService);
  private medicineService = inject(MedicineService);
  private labService = inject(LabService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  appointments = signal<Appointment[]>([]);
  patients = signal<Patient[]>([]);
  medicines = signal<Medicine[]>([]);
  labTemplates = signal<LabTestTemplate[]>([]);
  isLoading = signal(true);
  activeTab = signal<'today' | 'all' | 'scheduled' | 'pending' | 'completed'>('today');
  searchQuery = signal('');

  // Selected encounter
  activeEncounterAppt = signal<Appointment | null>(null);
  activePatient = signal<Patient | null>(null);
  triageVitals = signal<VitalSign | null>(null);
  isEncounterModalOpen = signal(false);
  isSubmittingEncounter = signal(false);

  // SOAP Encounter Form Fields
  symptoms = signal('');
  findings = signal('');
  diagnosis = signal('');
  clinicalNotes = signal('');
  prescriptionNotes = signal('');

  // E-Prescriptions
  prescriptionItems = signal<{ medicineId: string; quantity: number; dosageInstructions: string }[]>([]);

  // Multi-order: Lab catalog templates
  selectedLabTemplateIds = signal<string[]>([]);

  // Multi-order: Radiology orders
  radiologyOrders = signal<RadiologyOrderDraft[]>([]);

  // Multi-order: Nursing in-clinic procedures
  nursingProcedureOrders = signal<NursingProcedureDraft[]>([]);

  // Intra-consultation vitals recording
  isRecordingVitals = signal(false);
  bpSystolic = signal<number | null>(null);
  bpDiastolic = signal<number | null>(null);
  pulse = signal<number | null>(null);
  temperature = signal<number | null>(null);
  respiratoryRate = signal<number | null>(null);
  weight = signal<number | null>(null);
  height = signal<number | null>(null);

  // Quick symptom macros
  commonSymptoms = [
    'Fever & Chills',
    'Productive Cough',
    'Chest Tightness & Dyspnea',
    'Throat Soreness & Odynophagia',
    'Persistent Cephalea / Headache',
    'Abdominal Cramping & Nausea',
    'Joint Pain & Malaise'
  ];

  // Quick physical examination macros
  commonFindings = [
    'General: Alert, oriented x3, in no acute respiratory distress.',
    'HEENT: Normocephalic, oropharynx clear without erythema or tonsillar exudates.',
    'Lungs: Clear to auscultation bilaterally, vesicular breath sounds, no wheezes or crackles.',
    'CVS: Regular rate and rhythm, normal S1/S2, no murmurs, gallops, or friction rubs.',
    'Abdomen: Soft, non-tender, non-distended, normoactive bowel sounds.',
    'Neuro: Cranial nerves II-XII intact, symmetric 5/5 motor strength, normal gait.'
  ];

  // ICD-10 diagnosis presets
  diagnosisPresets = [
    { code: 'J20.9', name: 'Acute Bronchitis, unspecified' },
    { code: 'I10', name: 'Essential (Primary) Hypertension' },
    { code: 'E11.9', name: 'Type 2 Diabetes Mellitus without complications' },
    { code: 'J02.9', name: 'Acute Pharyngitis, unspecified' },
    { code: 'K21.9', name: 'Gastro-esophageal Reflux Disease (GERD)' },
    { code: 'M54.5', name: 'Low Back Pain, Lumbar Strain' },
    { code: 'N39.0', name: 'Urinary Tract Infection (UTI), site not specified' }
  ];

  todayQueueCount = computed(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return this.appointments().filter(
      a => (a.scheduledDateTime || '').substring(0, 10) === todayStr || a.status === 'Scheduled'
    ).length;
  });

  scheduledCount = computed(() => this.appointments().filter(a => a.status === 'Scheduled').length);
  pendingCount = computed(() => this.appointments().filter(a => a.status === 'PendingApproval').length);
  completedCount = computed(() => this.appointments().filter(a => a.status === 'Completed').length);

  filteredAppointments = computed(() => {
    let list = this.appointments();
    const tab = this.activeTab();
    const query = this.searchQuery().toLowerCase().trim();

    if (tab === 'today') {
      const todayStr = new Date().toISOString().substring(0, 10);
      list = list.filter(a => (a.scheduledDateTime || '').substring(0, 10) === todayStr || a.status === 'Scheduled');
    } else if (tab === 'scheduled') {
      list = list.filter(a => a.status === 'Scheduled');
    } else if (tab === 'pending') {
      list = list.filter(a => a.status === 'PendingApproval');
    } else if (tab === 'completed') {
      list = list.filter(a => a.status === 'Completed');
    }

    if (query) {
      list = list.filter(a =>
        (a.patientName || '').toLowerCase().includes(query) ||
        (a.reasonForVisit || '').toLowerCase().includes(query) ||
        (a.id || '').toLowerCase().includes(query)
      );
    }

    return list;
  });

  // Triage vitals clinical alert flags
  vitalsAlerts = computed(() => {
    const v = this.triageVitals();
    if (!v) return [];
    const alerts: { level: 'critical' | 'warning' | 'info'; text: string }[] = [];

    if (v.systolicBP >= 140 || v.diastolicBP >= 90) {
      alerts.push({ level: 'critical', text: `Hypertension Alert: BP ${v.systolicBP}/${v.diastolicBP} mmHg` });
    } else if (v.systolicBP < 90) {
      alerts.push({ level: 'critical', text: `Hypotension Alert: Systolic BP ${v.systolicBP} mmHg` });
    }

    if (v.heartRateBpm > 100) {
      alerts.push({ level: 'warning', text: `Tachycardia: ${v.heartRateBpm} bpm` });
    } else if (v.heartRateBpm < 55) {
      alerts.push({ level: 'warning', text: `Bradycardia: ${v.heartRateBpm} bpm` });
    }

    if (v.temperatureC >= 38.0) {
      alerts.push({ level: 'critical', text: `Pyrexia / Fever: ${v.temperatureC}°C` });
    }

    if (v.oxygenSaturation && v.oxygenSaturation < 94) {
      alerts.push({ level: 'critical', text: `Hypoxia Alert: SpO2 ${v.oxygenSaturation}%` });
    }

    return alerts;
  });

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isEncounterModalOpen() && !this.isSubmittingEncounter()) {
      this.closeEncounter();
    }
  }

  ngOnInit() {
    this.loadData();
  }

  isMyAppointment(appt: Appointment): boolean {
    const currentId = this.authService.currentUserId();
    if (this.authService.isAdmin()) return true;
    if (!appt.doctorId || !currentId) return true;
    return appt.doctorId.toLowerCase() === currentId.toLowerCase();
  }

  hasKnownAllergy(patient: Patient | null | undefined): boolean {
    return !!(patient?.allergies && patient.allergies !== 'None');
  }

  loadData() {
    this.isLoading.set(true);
    this.appointmentService.getMyAppointments().subscribe({
      next: (res: Appointment[] | PagedResponse<Appointment>) => {
        const list = Array.isArray(res) ? res : (res?.items ?? []);
        this.appointments.set(list);
        this.isLoading.set(false);
        this.checkRouteAppointment(list);
      },
      error: () => {
        this.appointmentService.getAll(1, 100).subscribe({
          next: (allRes: PagedResponse<Appointment> | Appointment[]) => {
            const list = Array.isArray(allRes) ? allRes : (allRes?.items ?? []);
            this.appointments.set(list);
            this.isLoading.set(false);
            this.checkRouteAppointment(list);
          },
          error: () => this.isLoading.set(false)
        });
      }
    });

    this.patientService.getAll(1, 100).subscribe({
      next: (res: PagedResponse<Patient> | Patient[]) => {
        this.patients.set(Array.isArray(res) ? res : (res?.items ?? []));
      }
    });

    this.medicineService.getAll(1, 100).subscribe({
      next: (res: PagedResponse<Medicine> | Medicine[]) => {
        this.medicines.set(Array.isArray(res) ? res : (res?.items ?? []));
      }
    });

    this.labService.getTemplates().subscribe({
      next: (templates) => this.labTemplates.set(templates || [])
    });
  }

  private checkRouteAppointment(list: Appointment[]) {
    const targetApptId = this.route.snapshot.queryParams['appointmentId'] as string | undefined;
    if (targetApptId) {
      const target = list.find((a: Appointment) => a.id?.toLowerCase() === targetApptId.toLowerCase());
      if (target) {
        this.openEncounter(target);
      } else {
        this.appointmentService.getById(targetApptId).subscribe({
          next: (appt: Appointment) => {
            if (appt) {
              this.openEncounter(appt);
            }
          },
          error: () => { }
        });
      }
    }
  }

  getPatient(patientId: string): Patient | undefined {
    return this.patients().find(p => p.id === patientId);
  }

  getMedicine(medicineId: string): Medicine | undefined {
    return this.medicines().find(m => m.id === medicineId);
  }

  approveAppointment(appt: Appointment) {
    this.appointmentService.approveAppointment(appt.id).subscribe({
      next: () => {
        this.toast.success(`Appointment for ${appt.patientName} approved and scheduled.`);
        this.loadData();
      },
      error: (err: HttpErrorResponse) =>
        this.toast.error('Failed to approve appointment: ' + extractProblemDetailsMessage(err.error, err.message))
    });
  }

  openEncounter(appt: Appointment) {
    if (!this.isMyAppointment(appt)) {
      this.toast.error(`Account Isolation: This patient is assigned to Dr. ${appt.doctorName || 'another physician'}. You have read-only chart access.`);
      return;
    }

    this.activeEncounterAppt.set(appt);
    const patient = this.getPatient(appt.patientId);
    this.activePatient.set(patient || null);

    // Prefill form
    this.symptoms.set(appt.reasonForVisit ? `Chief Complaint: ${appt.reasonForVisit}` : '');
    this.findings.set('');
    this.diagnosis.set('');
    this.clinicalNotes.set('');
    this.prescriptionNotes.set('');
    this.prescriptionItems.set([]);
    this.selectedLabTemplateIds.set([]);
    this.radiologyOrders.set([]);
    this.nursingProcedureOrders.set([]);
    this.isRecordingVitals.set(false);

    // Fetch triage vitals
    this.triageVitals.set(null);
    this.vitalSignsService.getByAppointment(appt.id).subscribe({
      next: (v) => {
        this.triageVitals.set(v);
      },
      error: () => {
        this.triageVitals.set(null);
      }
    });

    this.isEncounterModalOpen.set(true);
  }

  closeEncounter() {
    this.isEncounterModalOpen.set(false);
    this.activeEncounterAppt.set(null);
    this.activePatient.set(null);
    this.triageVitals.set(null);
  }

  addSymptomChip(chip: string) {
    const cur = this.symptoms();
    this.symptoms.set(cur ? `${cur}\n- ${chip}` : `- ${chip}`);
  }

  addFindingChip(chip: string) {
    const cur = this.findings();
    this.findings.set(cur ? `${cur}\n${chip}` : chip);
  }

  setDiagnosisPreset(code: string, name: string) {
    this.diagnosis.set(`[${code}] ${name}`);
  }

  // Prescription Management
  addPrescriptionRow() {
    const firstMed = this.medicines()[0];
    this.prescriptionItems.update(items => [
      ...items,
      {
        medicineId: firstMed?.id || '',
        quantity: 1,
        dosageInstructions: 'Take 1 tablet daily after meals'
      }
    ]);
  }

  removePrescriptionRow(index: number) {
    this.prescriptionItems.update(items => items.filter((_, i) => i !== index));
  }

  // Lab Template Selection
  toggleLabTemplate(templateId: string) {
    const cur = this.selectedLabTemplateIds();
    if (cur.includes(templateId)) {
      this.selectedLabTemplateIds.set(cur.filter(id => id !== templateId));
    } else {
      this.selectedLabTemplateIds.set([...cur, templateId]);
    }
  }

  isLabTemplateSelected(templateId: string): boolean {
    return this.selectedLabTemplateIds().includes(templateId);
  }

  // Radiology Orders
  addRadiologyOrder(modality: RadiologyModality, procedureName: string, bodyPart: string, price: number) {
    const draft: RadiologyOrderDraft = {
      modality,
      procedureName,
      bodyPart,
      clinicalIndication: this.symptoms() || 'Diagnostic imaging workup as indicated during consultation',
      priority: 'Routine',
      price
    };
    this.radiologyOrders.update(orders => [...orders, draft]);
  }

  removeRadiologyOrder(index: number) {
    this.radiologyOrders.update(orders => orders.filter((_, i) => i !== index));
  }

  // Nursing Procedures
  addNursingProcedure(procedureType: string, bodySite: string, price: number) {
    const draft: NursingProcedureDraft = {
      procedureType,
      bodySite,
      notes: 'Administer per standard in-clinic procedure protocol.',
      priority: 'Routine',
      price
    };
    this.nursingProcedureOrders.update(procs => [...procs, draft]);
  }

  removeNursingProcedure(index: number) {
    this.nursingProcedureOrders.update(procs => procs.filter((_, i) => i !== index));
  }

  // Intra-consultation vitals recording
  recordVitalsProgression() {
    const appt = this.activeEncounterAppt();
    if (!appt || !this.bpSystolic() || !this.bpDiastolic()) {
      this.toast.error('Please enter systolic and diastolic blood pressure.');
      return;
    }

    const user = this.authService.currentUser();
    const payload = {
      appointmentId: appt.id,
      consultationId: appt.id,
      systolicBP: this.bpSystolic()!,
      diastolicBP: this.bpDiastolic()!,
      heartRateBpm: this.pulse() || 72,
      respiratoryRate: this.respiratoryRate() || 16,
      temperatureC: this.temperature() || 37.0,
      weightKg: this.weight() || 70,
      heightCm: this.height() || 170
    };

    this.vitalSignsService.record(payload, user?.id).subscribe({
      next: (v) => {
        this.triageVitals.set(v);
        this.toast.success('Consultation vital signs recorded successfully.');
        this.isRecordingVitals.set(false);
      },
      error: (err) => this.toast.error('Failed to record vitals: ' + (err.error?.detail || err.message))
    });
  }

  // Finalize and sign SOAP encounter
  submitEncounter() {
    const appt = this.activeEncounterAppt();
    if (!appt) return;

    if (!this.diagnosis().trim()) {
      this.toast.error('Please specify a primary diagnosis before finalizing the encounter.');
      return;
    }

    this.isSubmittingEncounter.set(true);

    const consultationPayload: CreateConsultationRequest = {
      appointmentId: appt.id,
      symptoms: this.symptoms().trim() || 'Routine Consultation',
      findings: this.findings().trim() || 'Physical examination within normal clinical limits.',
      diagnosis: this.diagnosis().trim(),
      clinicalNotes: this.clinicalNotes().trim() || 'Patient educated on care management, precautions, and compliance.',
      prescriptionNotes: this.prescriptionNotes().trim() || undefined,
      prescriptionItems: this.prescriptionItems().length > 0 ? this.prescriptionItems() : undefined,
      labTestTemplateIds: this.selectedLabTemplateIds().length > 0 ? this.selectedLabTemplateIds() : undefined,
      radiologyOrders: this.radiologyOrders().length > 0 ? this.radiologyOrders() : undefined,
      nursingProcedureOrders: this.nursingProcedureOrders().length > 0 ? this.nursingProcedureOrders() : undefined
    };

    this.consultationService.create(consultationPayload).subscribe({
      next: () => {
        this.toast.success(`Clinical encounter signed. Orders dispatched for ${appt.patientName}.`);
        this.isSubmittingEncounter.set(false);
        this.closeEncounter();
        this.loadData();
      },
      error: (err) => {
        this.isSubmittingEncounter.set(false);
        this.toast.error('Failed to finalize consultation: ' + (err.error?.detail || err.message));
      }
    });
  }
}

export { MyAppointmentsConsultationsComponent as MyConsultationsComponent };
