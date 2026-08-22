import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppointmentStore } from '../../store/appointment.store';
import { LiveSyncService } from '../../services/live-sync.service';
import { ConsultationService } from '../../services/consultation.service';
import { MedicineService } from '../../services/medicine.service';
import { Medicine } from '../../models/medicine.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface RxItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  dosageInstructions: string;
  unitPrice: number;
}

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './appointment-list.component.html',
  styleUrls: ['./appointment-list.component.scss']
})
export class AppointmentListComponent implements OnInit {
  appointmentStore = inject(AppointmentStore);
  apptStore = this.appointmentStore;
  private liveSyncService = inject(LiveSyncService);
  private consultationService = inject(ConsultationService);
  private medicineService = inject(MedicineService);
  private snackBar = inject(MatSnackBar);

  appointments = this.appointmentStore.appointments;
  isLoading = this.appointmentStore.isLoading;
  displayedColumns = ['date', 'patient', 'doctor', 'status', 'actions'];

  // Status Filter
  selectedStatusFilter = signal<string>('ALL');

  filteredAppointments = computed(() => {
    let list = this.appointments() || [];
    const filter = this.selectedStatusFilter();
    if (filter !== 'ALL') {
      list = list.filter(a => a.status?.toLowerCase() === filter.toLowerCase());
    }
    return list;
  });

  // Metrics
  scheduledCount = computed(() => (this.appointments() || []).filter(a => a.status === 'Scheduled').length);
  checkedInCount = computed(() => (this.appointments() || []).filter(a => a.status === 'CheckedIn').length);
  completedCount = computed(() => (this.appointments() || []).filter(a => a.status === 'Completed').length);

  // Consultation Modal State
  isConsultationModalOpen = signal(false);
  activeAppointment = signal<any>(null);
  isSubmitting = signal(false);

  // Consultation Form Fields
  symptoms = signal('');
  diagnosis = signal('');
  clinicalNotes = signal('');
  prescriptionNotes = signal('');

  // Pre-set symptoms chips
  symptomChips = ['Fever (>38°C)', 'Dry Cough', 'Sore Throat', 'Headache', 'Chest Pain', 'Shortness of Breath', 'Fatigue', 'Nausea / Vomiting', 'Body Ache'];

  // Available medicines for prescription
  availableMedicines = signal<Medicine[]>([]);
  selectedMedicineId = signal('');
  prescribeQuantity = signal<number>(1);
  dosageInstructions = signal('1 tablet twice daily after meals for 7 days');
  prescriptionItems = signal<RxItem[]>([]);

  // Running total calculation
  rxTotalEstimatedCost = computed(() => {
    return this.prescriptionItems().reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  });

  constructor() {
    this.liveSyncService.appointmentBooked$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.appointmentStore.loadAppointments();
    });

    this.liveSyncService.patientCheckedIn$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.appointmentStore.loadAppointments();
    });
  }

  ngOnInit() {
    this.appointmentStore.loadAppointments();
    this.loadMedicines();
  }

  loadMedicines() {
    this.medicineService.getAll().subscribe({
      next: (res) => this.availableMedicines.set(res.items ? res.items : res),
      error: () => {}
    });
  }

  onDateChange(date: Date | null) {
    this.appointmentStore.setSelectedDate(date);
    this.appointmentStore.loadAppointments();
  }

  checkIn(appointmentId: string) {
    this.appointmentStore.checkIn(appointmentId);
    this.snackBar.open('Patient checked in and added to Doctor Queue', 'Success', { duration: 3000 });
  }

  cancel(appointmentId: string) {
    this.appointmentStore.cancel(appointmentId);
    this.snackBar.open('Appointment cancelled.', 'Close', { duration: 3000 });
  }

  openConsultationModal(appointment: any) {
    this.activeAppointment.set(appointment);
    this.symptoms.set('');
    this.diagnosis.set('');
    this.clinicalNotes.set('');
    this.prescriptionNotes.set('');
    this.prescriptionItems.set([]);
    this.selectedMedicineId.set('');
    this.prescribeQuantity.set(1);
    this.dosageInstructions.set('1 tablet twice daily after meals for 7 days');
    this.isConsultationModalOpen.set(true);
  }

  closeConsultationModal() {
    this.isConsultationModalOpen.set(false);
    this.activeAppointment.set(null);
  }

  appendSymptom(chip: string) {
    const current = this.symptoms();
    if (!current) {
      this.symptoms.set(chip);
    } else if (!current.includes(chip)) {
      this.symptoms.set(current + ', ' + chip);
    }
  }

  addMedicineToPrescription() {
    const medId = this.selectedMedicineId();
    if (!medId) {
      this.snackBar.open('Please select a medicine from catalog', 'Close', { duration: 3000 });
      return;
    }

    const med = this.availableMedicines().find(m => m.id === medId);
    if (!med) return;

    const newItem: RxItem = {
      medicineId: med.id,
      medicineName: med.name,
      quantity: this.prescribeQuantity() || 1,
      dosageInstructions: this.dosageInstructions() || 'Take as prescribed',
      unitPrice: med.unitPrice
    };

    this.prescriptionItems.update(items => [...items, newItem]);
    this.selectedMedicineId.set('');
    this.dosageInstructions.set('1 tablet twice daily after meals for 7 days');
    this.prescribeQuantity.set(1);
    this.snackBar.open(`Added ${med.name} to prescription`, 'Close', { duration: 2000 });
  }

  removePrescriptionItem(index: number) {
    this.prescriptionItems.update(items => items.filter((_, i) => i !== index));
  }

  submitConsultation() {
    const appt = this.activeAppointment();
    if (!appt) return;

    if (!this.diagnosis().trim()) {
      this.snackBar.open('Please provide a primary diagnosis', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);
    const payload = {
      appointmentId: appt.id,
      symptoms: this.symptoms(),
      diagnosis: this.diagnosis(),
      clinicalNotes: this.clinicalNotes(),
      prescriptionNotes: this.prescriptionNotes(),
      prescriptionItems: this.prescriptionItems().map(item => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        dosageInstructions: item.dosageInstructions
      }))
    };

    this.consultationService.create(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isConsultationModalOpen.set(false);
        this.snackBar.open('Consultation recorded & Prescription successfully sent to Pharmacy Queue!', 'Success', { duration: 5000 });
        this.appointmentStore.loadAppointments();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.snackBar.open(err.error?.detail || 'Failed to submit consultation', 'Close', { duration: 4000 });
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
}
