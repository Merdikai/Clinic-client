import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MedicineStore } from '../../store/medicine.store';
import { MedicineService } from '../../services/medicine.service';
import { PrescriptionService } from '../../services/prescription.service';
import { ToastService } from '../../ui/toast/toast.service';
import { LiveSyncService } from '../../services/live-sync.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Medicine } from '../../models/medicine.model';

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './pharmacy.component.html',
  styleUrls: ['./pharmacy.component.scss']
})
export class PharmacyComponent implements OnInit {
  private fb = inject(FormBuilder);
  medicineStore = inject(MedicineStore);
  medicineService = inject(MedicineService);
  prescriptionService = inject(PrescriptionService);
  toast = inject(ToastService);
  liveSyncService = inject(LiveSyncService);

  constructor() {
    this.liveSyncService.lowStockAlert$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.medicineStore.loadMedicines();
    });
    this.liveSyncService.appointmentUpdated$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.loadPrescriptions();
    });
    this.liveSyncService.patientRegistered$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.loadPrescriptions();
    });
  }

  prescriptionIdInput = '';
  searchTerm = '';
  isProcessing = false;
  showAddMedicine = signal(false);
  editingMedicineId = signal<string | null>(null);
  prescriptions = signal<any[]>([]);

  medicineForm = this.fb.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    category: ['General', Validators.required],
    stockQuantity: [100, [Validators.required, Validators.min(0)]],
    unitPrice: [10.0, [Validators.required, Validators.min(0.01)]],
    batchNumber: ['']
  });

  filteredMedicines = computed(() => {
    const list = this.medicineStore.medicines();
    if (!this.searchTerm.trim()) return list;
    const term = this.searchTerm.toLowerCase();
    return list.filter(m => 
      m.name.toLowerCase().includes(term) || 
      (m.category && m.category.toLowerCase().includes(term)) ||
      (m.code && m.code.toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.medicineStore.loadMedicines();
    this.loadPrescriptions();
  }

  toggleAddMedicine(): void {
    if (this.showAddMedicine() && !this.editingMedicineId()) {
      this.showAddMedicine.set(false);
    } else {
      this.editingMedicineId.set(null);
      this.medicineForm.reset({
        name: '',
        code: '',
        category: 'General',
        stockQuantity: 100,
        unitPrice: 10.0,
        batchNumber: ''
      });
      this.showAddMedicine.set(true);
    }
  }

  cancelEdit(): void {
    this.editingMedicineId.set(null);
    this.showAddMedicine.set(false);
    this.medicineForm.reset({
      name: '',
      code: '',
      category: 'General',
      stockQuantity: 100,
      unitPrice: 10.0,
      batchNumber: ''
    });
  }

  submitMedicineForm(): void {
    if (this.medicineForm.invalid) {
      this.medicineForm.markAllAsTouched();
      return;
    }
    this.isProcessing = true;

    const val = this.medicineForm.value;
    const payload = {
      name: val.name!.trim(),
      code: val.code!.trim(),
      category: val.category || 'General',
      stockQuantity: Number(val.stockQuantity!),
      unitPrice: Number(val.unitPrice!),
      batchNumber: (val.batchNumber || '').trim()
    };

    if (this.editingMedicineId()) {
      const id = this.editingMedicineId()!;
      this.medicineService.update(id, payload).subscribe({
        next: (updatedMed: any) => {
          this.toast.success(`Medicine '${payload.name}' updated successfully!`);
          if (updatedMed) {
            this.medicineStore.upsertMedicineEntity(updatedMed);
          }
          this.medicineStore.loadMedicines();
          this.isProcessing = false;
          this.cancelEdit();
        },
        error: (err: any) => {
          this.toast.error(err.error?.detail || err.error?.title || 'Failed to update medicine');
          this.isProcessing = false;
        }
      });
    } else {
      this.medicineService.create(payload).subscribe({
        next: (createdMed: any) => {
          this.toast.success(`Medicine '${payload.name}' added to catalog!`);
          if (createdMed) {
            this.medicineStore.upsertMedicineEntity(createdMed);
          }
          this.medicineStore.loadMedicines();
          this.isProcessing = false;
          this.cancelEdit();
        },
        error: (err: any) => {
          this.toast.error(err.error?.detail || err.error?.title || 'Failed to create medicine');
          this.isProcessing = false;
        }
      });
    }
  }

  editMedicine(item: Medicine): void {
    this.editingMedicineId.set(item.id);
    this.medicineForm.patchValue({
      name: item.name,
      code: item.code,
      category: item.category || 'General',
      stockQuantity: item.stockQuantity,
      unitPrice: item.unitPrice,
      batchNumber: (item as any).batchNumber || ''
    });
    this.showAddMedicine.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteMedicine(id: string): void {
    if (confirm('Are you sure you want to delete this medicine from the catalog? This action cannot be undone.')) {
      this.medicineService.delete(id).subscribe({
        next: () => {
          this.toast.success('Medicine deleted from catalog successfully');
          this.medicineStore.removeMedicineEntity(id);
          this.medicineStore.loadMedicines();
        },
        error: (err: any) => {
          this.toast.error(err.error?.detail || 'Failed to delete medicine');
        }
      });
    }
  }

  dispensePrescription(): void {
    if (!this.prescriptionIdInput.trim()) return;
    this.isProcessing = true;
    this.prescriptionService.dispense(this.prescriptionIdInput.trim()).subscribe({
      next: () => {
        this.toast.success('Prescription medicines successfully dispensed!');
        this.medicineStore.loadMedicines();
        this.loadPrescriptions();
        this.isProcessing = false;
      },
      error: () => {
        this.toast.error('Failed to dispense prescription');
        this.isProcessing = false;
      }
    });
  }

  generatePrescriptionInvoice(): void {
    if (!this.prescriptionIdInput.trim()) return;
    this.isProcessing = true;
    this.prescriptionService.generateInvoice(this.prescriptionIdInput.trim()).subscribe({
      next: () => {
        this.toast.success('Invoice generated automatically for prescription!');
        this.isProcessing = false;
      },
      error: () => {
        this.toast.error('Failed to generate invoice for prescription');
        this.isProcessing = false;
      }
    });
  }

  dispensePrescriptionById(id: string): void {
    this.isProcessing = true;
    this.prescriptionService.dispense(id).subscribe({
      next: () => {
        this.toast.success('Prescription medicines successfully dispensed!');
        this.medicineStore.loadMedicines();
        this.loadPrescriptions();
        this.isProcessing = false;
      },
      error: () => {
        this.toast.error('Failed to dispense prescription');
        this.isProcessing = false;
      }
    });
  }

  generatePrescriptionInvoiceById(id: string): void {
    this.isProcessing = true;
    this.prescriptionService.generateInvoice(id).subscribe({
      next: () => {
        this.toast.success('Invoice generated automatically for prescription!');
        this.isProcessing = false;
      },
      error: () => {
        this.toast.error('Failed to generate invoice for prescription');
        this.isProcessing = false;
      }
    });
  }

  loadPrescriptions(): void {
    this.prescriptionService.getAll().subscribe({
      next: (list: any[]) => this.prescriptions.set(list || []),
      error: () => this.prescriptions.set([])
    });
  }

  quickDispense(item: Medicine): void {
    this.medicineStore.dispenseMedicine(item.id, 1);
  }
}
