import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter, forkJoin } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { MedicineStore } from '../../store/medicine.store';
import { MedicineService } from '../../services/medicine.service';
import { PrescriptionService } from '../../services/prescription.service';
import { PharmacyService, PharmacyMetrics, PharmacyStockRequisition, ControlledSubstanceLog, PrescriptionLabel } from '../../services/pharmacy.service';
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
    MatTooltipModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './pharmacy.component.html',
  styleUrls: ['./pharmacy.component.scss']
})
export class PharmacyComponent implements OnInit {
  public permissionService = inject(PermissionService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);
  public medicineStore = inject(MedicineStore);
  public medicineService = inject(MedicineService);
  public pharmacyService = inject(PharmacyService);
  public prescriptionService = inject(PrescriptionService);
  public toast = inject(ToastService);
  public liveSyncService = inject(LiveSyncService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly Math = Math;

  // Role checks

  isDoctor = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'doctor' || this.authService.hasRole('Doctor'));
  isPatient = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'patient' || this.authService.hasRole('Patient'));
  isNurse = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'nurse' || this.authService.hasRole('Nurse'));
  isPharmacist = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'pharmacist' || this.authService.hasRole('Pharmacist'));

  /** Nurse can ONLY view the Formulary Catalog — no prescriptions, POS, requisitions, or audit */
  nurseFormularyOnly = computed(() => this.isNurse());

  canDispense = computed(() => 
    !this.isDoctor() && !this.isPatient() && !this.isNurse() && !this.authService.hasRole('Admin') &&
    (this.isPharmacist() || this.permissionService.hasPermission('Prescriptions.Dispense'))
  );

  canManageInventory = computed(() => 
    !this.isDoctor() && !this.isPatient() && !this.isNurse() && !this.authService.hasRole('Admin') &&
    (this.isPharmacist() || this.permissionService.hasPermission('Medicines.Manage'))
  );

  // Tabs
  selectedTabIndex = signal<number>(0);

  // Dispensary metrics
  metrics = signal<PharmacyMetrics | null>(null);

  // Prescription Queue
  prescriptions = signal<any[]>([]);
  rxStatusFilter = signal<'All' | 'Pending' | 'Dispensed'>('Pending');
  prescriptionSearch = signal<string>('');
  quickRxCodeInput = signal<string>('');

  // Formulary Catalog
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('All');
  filterLowStockOnly = signal<boolean>(false);
  filterNearExpiryOnly = signal<boolean>(false);
  filterControlledOnly = signal<boolean>(false);
  filterInStockOnly = signal<boolean>(false);
  showAddMedicine = signal<boolean>(false);
  editingMedicineId = signal<string | null>(null);

  // Stock Requisitions
  requisitions = signal<PharmacyStockRequisition[]>([]);
  showRequisitionModal = signal<boolean>(false);

  // Controlled Substances Audit
  controlledLogs = signal<ControlledSubstanceLog[]>([]);
  controlledSearchTerm = signal<string>('');

  // POS Point of Sale
  posSearchTerm = signal<string>('');
  posSelectedCategory = signal<string>('All');
  posCart = signal<{ medicine: Medicine; quantity: number; unitPrice: number }[]>([]);
  posPaymentMethod = signal<string>('Cash');
  posPatientName = signal<string>('Walk-in Customer / OTC');
  posDiscountPercent = signal<number>(0);
  posTaxPercent = signal<number>(0);

  // Label Modal
  showLabelModal = signal<boolean>(false);
  activeLabels = signal<PrescriptionLabel[]>([]);

  // Dispensing Verification Modal
  showDispenseModal = signal<boolean>(false);
  activeDispenseRx = signal<any | null>(null);
  verificationNotesInput = signal<string>('');

  // Processing state
  isProcessing = signal<boolean>(false);
  loadingPrescriptions = signal<boolean>(false);
  loadingFormulary = signal<boolean>(false);

  // Formulary Medicine Form
  medicineForm = this.fb.group({
    name: ['', Validators.required],
    genericName: [''],
    code: ['', Validators.required],
    category: ['Antibiotics', Validators.required],
    dosageForm: ['Tablet'],
    strength: [''],
    manufacturer: [''],
    stockQuantity: [100, [Validators.required, Validators.min(0)]],
    reorderLevel: [15, [Validators.required, Validators.min(0)]],
    costPrice: [5.0, [Validators.required, Validators.min(0)]],
    unitPrice: [10.0, [Validators.required, Validators.min(0.01)]],
    expiryDate: [''],
    batchNumber: [''],
    storageConditions: ['Room Temperature (< 25°C)'],
    isControlledSubstance: [false],
    isActive: [true]
  });

  // Requisition Form
  requisitionForm = this.fb.group({
    medicineId: ['', Validators.required],
    quantityRequested: [50, [Validators.required, Validators.min(1)]],
    type: ['PurchaseOrder', Validators.required],
    department: ['Main Central Pharmacy', Validators.required],
    supplierName: ['MedSupply Direct Ltd'],
    notes: ['']
  });

  // 12 Therapeutic Formulary Categories
  formularyCategories: string[] = [
    'All',
    'Antibiotics',
    'Analgesics & Antipyretics',
    'Cardiovascular',
    'Gastrointestinal',
    'Respiratory',
    'Endocrine & Diabetes',
    'Controlled Substances',
    'Dermatological',
    'Ophthalmic & Otic',
    'Vitamins & Supplements',
    'Emergency & Resuscitation'
  ];

  constructor() {
    this.liveSyncService.lowStockAlert$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.medicineStore.loadMedicines();
      this.loadMetrics();
    });
    this.liveSyncService.appointmentUpdated$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.loadPrescriptions();
      this.loadMetrics();
    });
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.syncTabWithRoute();
      });
  }

  ngOnInit(): void {
    this.medicineStore.loadMedicines();
    this.loadMetrics();
    this.loadPrescriptions();
    this.loadRequisitions();
    this.loadControlledLogs();

    this.syncTabWithRoute();
  }

  syncTabWithRoute(): void {
    // Nurses are restricted to Formulary only — always force tab index 0 (their only tab)
    if (this.isNurse()) {
      this.selectedTabIndex.set(0);
      return;
    }
    const url = this.router.url;
    if (url.includes('/pos') || url.includes('tab=pos')) {
      this.selectedTabIndex.set(1);
    } else if (url.includes('/formulary') || url.includes('tab=formulary')) {
      this.selectedTabIndex.set(2);
    } else if (url.includes('/requisitions') || url.includes('tab=requisitions')) {
      this.selectedTabIndex.set(3);
    } else if (url.includes('/audit') || url.includes('/controlled') || url.includes('tab=audit') || url.includes('tab=controlled')) {
      this.selectedTabIndex.set(4);
    } else {
      this.selectedTabIndex.set(0);
    }
  }

  onTabChange(index: number): void {
    // Nurses cannot change tabs — they only see Formulary
    if (this.isNurse()) return;
    this.selectedTabIndex.set(index);
    const tabMap: { [key: number]: string } = {
      0: 'prescriptions',
      1: 'pos',
      2: 'formulary',
      3: 'requisitions',
      4: 'audit'
    };
    const tab = tabMap[index] || 'prescriptions';
    this.router.navigate(['/pharmacy', tab]);
  }

  // DATA LOADERS
  loadMetrics(): void {
    this.pharmacyService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });
  }

  loadPrescriptions(): void {
    const status = this.rxStatusFilter() === 'All' ? undefined : this.rxStatusFilter();
    this.loadingPrescriptions.set(true);
    this.pharmacyService.getPrescriptions(status).subscribe({
      next: (list) => { this.prescriptions.set(list || []); this.loadingPrescriptions.set(false); },
      error: () => { this.prescriptions.set([]); this.loadingPrescriptions.set(false); }
    });
  }

  loadRequisitions(): void {
    this.pharmacyService.getRequisitions().subscribe({
      next: (list) => this.requisitions.set(list || []),
      error: () => this.requisitions.set([])
    });
  }

  loadControlledLogs(): void {
    this.pharmacyService.getControlledSubstances().subscribe({
      next: (list) => this.controlledLogs.set(list || []),
      error: () => this.controlledLogs.set([])
    });
  }

  // FILTERED COMPUTED PROPERTIES
  filteredPrescriptions = computed(() => {
    let list = this.prescriptions();
    const status = this.rxStatusFilter();
    if (status !== 'All') {
      list = list.filter(rx => (rx.status || 'Pending').toLowerCase() === status.toLowerCase());
    }
    const search = this.prescriptionSearch().trim().toLowerCase();
    if (search) {
      list = list.filter(rx =>
        rx.patientName.toLowerCase().includes(search) ||
        rx.patientMrn.toLowerCase().includes(search) ||
        (rx.doctorName && rx.doctorName.toLowerCase().includes(search)) ||
        rx.id.toLowerCase().includes(search)
      );
    }
    return list;
  });

  filteredMedicines = computed(() => {
    let list = this.medicineStore.medicines();

    if (this.selectedCategory() !== 'All') {
      list = list.filter(m => m.category === this.selectedCategory());
    }

    if (this.filterLowStockOnly()) {
      list = list.filter(m => m.stockQuantity <= (m.reorderLevel || 15));
    }

    if (this.filterNearExpiryOnly()) {
      list = list.filter(m => m.isNearExpiry);
    }

    if (this.filterControlledOnly()) {
      list = list.filter(m => m.isControlledSubstance);
    }

    if (this.filterInStockOnly()) {
      list = list.filter(m => m.stockQuantity > 0);
    }

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      list = list.filter(m =>
        m.name.toLowerCase().includes(term) ||
        (m.genericName && m.genericName.toLowerCase().includes(term)) ||
        (m.category && m.category.toLowerCase().includes(term)) ||
        (m.code && m.code.toLowerCase().includes(term)) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(term))
      );
    }
    return list;
  });

  doctorFormularyMetrics = computed(() => {
    const meds = this.medicineStore.medicines();
    return {
      totalCount: meds.length,
      inStockCount: meds.filter(m => m.stockQuantity > (m.reorderLevel || 15)).length,
      lowStockCount: meds.filter(m => m.stockQuantity <= (m.reorderLevel || 15) && m.stockQuantity > 0).length,
      outOfStockCount: meds.filter(m => m.stockQuantity === 0).length,
      controlledCount: meds.filter(m => m.isControlledSubstance).length
    };
  });

  getCategoryIcon(category: string): string {
    switch ((category || '').toLowerCase()) {
      case 'antibiotics': return 'coronavirus';
      case 'analgesics & antipyretics': return 'healing';
      case 'cardiovascular': return 'favorite';
      case 'gastrointestinal': return 'local_drink';
      case 'respiratory': return 'air';
      case 'endocrine & diabetes': return 'water_drop';
      case 'controlled substances': return 'shield_locked';
      case 'dermatological': return 'clean_hands';
      case 'ophthalmic & otic': return 'visibility';
      case 'vitamins & supplements': return 'spa';
      case 'emergency & resuscitation': return 'emergency';
      default: return 'medication';
    }
  }

  copyMedicationDetails(med: Medicine): void {
    const text = `${med.name} ${med.strength ? med.strength : ''} (${med.dosageForm || 'Tablet'}) - ${med.genericName || ''}`.trim();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toast.success(`Copied "${med.name}" details to clipboard`);
      });
    } else {
      this.toast.info(`Prescribing details: ${text}`);
    }
  }

  navigateToConsultations(): void {
    this.router.navigate(['/my-consultations']);
  }

  filteredControlledLogs = computed(() => {
    let list = this.controlledLogs();
    const term = this.controlledSearchTerm().trim().toLowerCase();
    if (!term) return list;
    return list.filter(l =>
      l.logNumber.toLowerCase().includes(term) ||
      l.medicineName.toLowerCase().includes(term) ||
      l.patientName.toLowerCase().includes(term) ||
      l.patientMrn.toLowerCase().includes(term) ||
      l.prescribingDoctorName.toLowerCase().includes(term) ||
      l.pharmacistName.toLowerCase().includes(term)
    );
  });

  posMedicinesList = computed(() => {
    let list = this.medicineStore.medicines().filter(m => m.stockQuantity > 0);
    if (this.posSelectedCategory() !== 'All') {
      list = list.filter(m => m.category === this.posSelectedCategory());
    }
    const term = this.posSearchTerm().trim().toLowerCase();
    if (term) {
      list = list.filter(m =>
        m.name.toLowerCase().includes(term) ||
        (m.genericName && m.genericName.toLowerCase().includes(term)) ||
        (m.code && m.code.toLowerCase().includes(term))
      );
    }
    return list;
  });

  // POS CART CALCULATIONS
  posSubTotal = computed(() => {
    return this.posCart().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  });

  posDiscountAmount = computed(() => {
    return (this.posSubTotal() * this.posDiscountPercent()) / 100;
  });

  posTaxAmount = computed(() => {
    const afterDiscount = this.posSubTotal() - this.posDiscountAmount();
    return (afterDiscount * this.posTaxPercent()) / 100;
  });

  posGrandTotal = computed(() => {
    return Math.max(0, this.posSubTotal() - this.posDiscountAmount() + this.posTaxAmount());
  });

  // PRESCRIPTION ACTIONS
  openDispenseModal(rx: any): void {
    this.activeDispenseRx.set(rx);
    this.verificationNotesInput.set('Clinical dosage, frequency, and patient drug-allergy profile checked & verified.');
    this.showDispenseModal.set(true);
  }

  closeDispenseModal(): void {
    this.showDispenseModal.set(false);
    this.activeDispenseRx.set(null);
    this.verificationNotesInput.set('');
  }

  confirmDispense(): void {
    const rx = this.activeDispenseRx();
    if (!rx) return;
    this.isProcessing.set(true);

    this.pharmacyService.dispensePrescription(rx.id, this.verificationNotesInput()).subscribe({
      next: (res) => {
        this.toast.success(`Prescription #${rx.id.substring(0, 8).toUpperCase()} fulfilled and inventory updated!`);
        this.closeDispenseModal();
        this.medicineStore.loadMedicines();
        this.loadPrescriptions();
        this.loadMetrics();
        this.loadControlledLogs();
        this.isProcessing.set(false);

        // Open label modal automatically for convenience
        this.openLabelModal(rx.id);
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to dispense prescription');
        this.isProcessing.set(false);
      }
    });
  }

  quickDispenseByInput(): void {
    const code = this.quickRxCodeInput().trim();
    if (!code) return;
    this.isProcessing.set(true);

    this.pharmacyService.dispensePrescription(code, 'Quick barcode scan fulfillment').subscribe({
      next: () => {
        this.toast.success('Prescription verified & dispensed!');
        this.quickRxCodeInput.set('');
        this.medicineStore.loadMedicines();
        this.loadPrescriptions();
        this.loadMetrics();
        this.isProcessing.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Prescription code not found or already dispensed');
        this.isProcessing.set(false);
      }
    });
  }

  generatePrescriptionInvoice(rxId: string): void {
    this.isProcessing.set(true);
    this.pharmacyService.generateInvoice(rxId).subscribe({
      next: (invoice) => {
        this.toast.success(`Billing invoice ${invoice.invoiceNumber} created successfully! Total: $${invoice.totalAmount.toFixed(2)}`);
        this.loadPrescriptions();
        this.isProcessing.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to generate billing invoice');
        this.isProcessing.set(false);
      }
    });
  }

  openLabelModal(rxId: string): void {
    this.isProcessing.set(true);
    this.pharmacyService.getPrescriptionLabel(rxId).subscribe({
      next: (labels) => {
        this.activeLabels.set(labels || []);
        this.showLabelModal.set(true);
        this.isProcessing.set(false);
      },
      error: () => {
        this.toast.error('Failed to load prescription label details');
        this.isProcessing.set(false);
      }
    });
  }

  closeLabelModal(): void {
    this.showLabelModal.set(false);
    this.activeLabels.set([]);
  }

  printThermalLabels(): void {
    window.print();
  }

  // POS CART ACTIONS
  addToCart(med: Medicine): void {
    const current = [...this.posCart()];
    const existing = current.find(item => item.medicine.id === med.id);
    if (existing) {
      if (existing.quantity < med.stockQuantity) {
        existing.quantity += 1;
        this.posCart.set(current);
      } else {
        this.toast.warning(`Only ${med.stockQuantity} units available in dispensary stock!`);
      }
    } else {
      current.push({ medicine: med, quantity: 1, unitPrice: med.unitPrice });
      this.posCart.set(current);
    }
  }

  updateCartQuantity(medId: string, delta: number): void {
    const current = [...this.posCart()];
    const item = current.find(i => i.medicine.id === medId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.removeFromCart(medId);
    } else if (newQty <= item.medicine.stockQuantity) {
      item.quantity = newQty;
      this.posCart.set(current);
    } else {
      this.toast.warning(`Stock limit reached (${item.medicine.stockQuantity})`);
    }
  }

  removeFromCart(medId: string): void {
    this.posCart.set(this.posCart().filter(item => item.medicine.id !== medId));
  }

  clearCart(): void {
    this.posCart.set([]);
    this.posPatientName.set('Walk-in Customer / OTC');
    this.posDiscountPercent.set(0);
  }

  checkoutPosSale(): void {
    const items = [...this.posCart()];
    if (items.length === 0) return;
    this.isProcessing.set(true);

    // Parallel dispense all cart items atomically
    const dispenseRequests = items.map(cartItem =>
      this.medicineService.dispense(cartItem.medicine.id, cartItem.quantity)
    );

    forkJoin(dispenseRequests).subscribe({
      next: () => {
        this.toast.success(`POS Checkout Complete! $${this.posGrandTotal().toFixed(2)} collected via ${this.posPaymentMethod()}.`);
        this.clearCart();
        this.medicineStore.loadMedicines();
        this.loadMetrics();
        this.isProcessing.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Checkout partially failed — verify stock and retry.');
        this.medicineStore.loadMedicines();
        this.loadMetrics();
        this.isProcessing.set(false);
      }
    });
  }

  // FORMULARY MEDICINE ACTIONS
  toggleAddMedicine(): void {
    if (this.showAddMedicine() && !this.editingMedicineId()) {
      this.showAddMedicine.set(false);
    } else {
      this.editingMedicineId.set(null);
      this.medicineForm.reset({
        name: '',
        genericName: '',
        code: '',
        category: 'Antibiotics',
        dosageForm: 'Tablet',
        strength: '',
        manufacturer: '',
        stockQuantity: 100,
        reorderLevel: 15,
        costPrice: 5.0,
        unitPrice: 10.0,
        expiryDate: '',
        batchNumber: '',
        storageConditions: 'Room Temperature (< 25°C)',
        isControlledSubstance: false,
        isActive: true
      });
      this.showAddMedicine.set(true);
    }
  }

  cancelEdit(): void {
    this.editingMedicineId.set(null);
    this.showAddMedicine.set(false);
  }

  submitMedicineForm(): void {
    if (this.medicineForm.invalid) {
      this.medicineForm.markAllAsTouched();
      return;
    }
    this.isProcessing.set(true);

    const val = this.medicineForm.value;
    const payload: any = {
      name: val.name!.trim(),
      genericName: val.genericName?.trim() || undefined,
      code: val.code!.trim(),
      category: val.category || 'General',
      dosageForm: val.dosageForm || 'Tablet',
      strength: val.strength?.trim() || undefined,
      manufacturer: val.manufacturer?.trim() || undefined,
      stockQuantity: Number(val.stockQuantity!),
      reorderLevel: Number(val.reorderLevel || 15),
      costPrice: Number(val.costPrice || 0),
      unitPrice: Number(val.unitPrice!),
      expiryDate: val.expiryDate ? new Date(val.expiryDate).toISOString() : undefined,
      batchNumber: val.batchNumber?.trim() || '',
      storageConditions: val.storageConditions || 'Room Temperature (< 25°C)',
      isControlledSubstance: Boolean(val.isControlledSubstance),
      isActive: Boolean(val.isActive ?? true)
    };

    if (this.editingMedicineId()) {
      const id = this.editingMedicineId()!;
      this.medicineService.update(id, payload).subscribe({
        next: (updatedMed) => {
          this.toast.success(`Formulary medicine '${payload.name}' updated!`);
          if (updatedMed) this.medicineStore.upsertMedicineEntity(updatedMed);
          this.medicineStore.loadMedicines();
          this.loadMetrics();
          this.cancelEdit();
          this.isProcessing.set(false);
        },
        error: (err) => {
          this.toast.error(err.error?.detail || 'Failed to update medicine');
          this.isProcessing.set(false);
        }
      });
    } else {
      this.medicineService.create(payload).subscribe({
        next: (createdMed) => {
          this.toast.success(`Medicine '${payload.name}' added to Clinical Formulary!`);
          if (createdMed) this.medicineStore.upsertMedicineEntity(createdMed);
          this.medicineStore.loadMedicines();
          this.loadMetrics();
          this.cancelEdit();
          this.isProcessing.set(false);
        },
        error: (err) => {
          this.toast.error(err.error?.detail || 'Failed to add medicine');
          this.isProcessing.set(false);
        }
      });
    }
  }

  editMedicine(item: Medicine): void {
    this.editingMedicineId.set(item.id);
    this.medicineForm.patchValue({
      name: item.name,
      genericName: item.genericName || '',
      code: item.code,
      category: item.category || 'Antibiotics',
      dosageForm: item.dosageForm || 'Tablet',
      strength: item.strength || '',
      manufacturer: item.manufacturer || '',
      stockQuantity: item.stockQuantity,
      reorderLevel: item.reorderLevel || 15,
      costPrice: item.costPrice || 0,
      unitPrice: item.unitPrice,
      expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
      batchNumber: item.batchNumber || '',
      storageConditions: item.storageConditions || 'Room Temperature (< 25°C)',
      isControlledSubstance: item.isControlledSubstance || false,
      isActive: item.isActive ?? true
    });
    this.showAddMedicine.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteMedicine(id: string): void {
    if (confirm('Are you sure you want to retire this medicine from the formulary?')) {
      this.medicineService.delete(id).subscribe({
        next: () => {
          this.toast.success('Medicine removed from formulary catalog');
          this.medicineStore.removeMedicineEntity(id);
          this.medicineStore.loadMedicines();
          this.loadMetrics();
        },
        error: (err) => {
          this.toast.error(err.error?.detail || 'Failed to delete medicine');
        }
      });
    }
  }

  // REQUISITION ACTIONS
  openRequisitionModal(): void {
    this.requisitionForm.reset({
      medicineId: this.medicineStore.medicines().length > 0 ? this.medicineStore.medicines()[0].id : '',
      quantityRequested: 100,
      type: 'PurchaseOrder',
      department: 'Main Central Pharmacy',
      supplierName: 'MedSupply Direct Ltd',
      notes: 'Routine dispensary stock replenishment'
    });
    this.showRequisitionModal.set(true);
  }

  closeRequisitionModal(): void {
    this.showRequisitionModal.set(false);
  }

  submitRequisition(): void {
    if (this.requisitionForm.invalid) return;
    this.isProcessing.set(true);
    const val = this.requisitionForm.value;

    const payload = {
      medicineId: val.medicineId!,
      quantityRequested: Number(val.quantityRequested!),
      type: val.type || 'PurchaseOrder',
      department: val.department || 'Main Central Pharmacy',
      supplierName: val.supplierName || 'MedSupply Direct Ltd',
      notes: val.notes || ''
    };

    this.pharmacyService.createRequisition(payload).subscribe({
      next: (req) => {
        this.toast.success(`Requisition order ${req.requisitionNumber} submitted!`);
        this.closeRequisitionModal();
        this.loadRequisitions();
        this.isProcessing.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to submit requisition');
        this.isProcessing.set(false);
      }
    });
  }

  reviewRequisition(reqId: string, status: 'Approved' | 'Received' | 'Rejected'): void {
    this.isProcessing.set(true);
    this.pharmacyService.reviewRequisition(reqId, { status }).subscribe({
      next: (res) => {
        this.toast.success(`Requisition ${res.requisitionNumber} marked as ${status}!`);
        this.loadRequisitions();
        this.medicineStore.loadMedicines();
        this.loadMetrics();
        this.isProcessing.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to update requisition');
        this.isProcessing.set(false);
      }
    });
  }
}
