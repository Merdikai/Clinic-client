import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { LabStore } from '../../store/lab.store';
import { LabService } from '../../services/lab.service';
import { PatientService } from '../../services/patient.service';
import { ToastService } from '../../ui/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent, StatusTone } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PagedResponse, Patient } from '../../models/patient.model';
import {
  CreateLabEquipmentLogRequest,
  CreateLabOrderRequest,
  CreateLabReagentRequest,
  CreateLabRequisitionRequest,
  CreateLabTestTemplateRequest,
  LabEquipmentLog,
  LabOrder,
  LabOrderItem,
  LabParameterResult,
  LabParameterTemplate,
  LabReagent,
  LabResultFlag,
  LabStockRequisition,
  LabTestTemplate,
  RecordLabResultRequest,
  ReviewLabRequisitionRequest,
  SpecimenIntakeRequest,
  SpecimenRejectRequest,
  UpdateLabTestTemplateRequest,
  UpdateReagentStockRequest
} from '../../models/lab.model';

interface ResultParameterEntry {
  name: string;
  unit: string;
  minRef?: number;
  maxRef?: number;
  normalText?: string;
  value: string | number;
  flag: LabResultFlag;
}

@Component({
  selector: 'app-laboratory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './laboratory.component.html',
  styleUrls: ['./laboratory.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LaboratoryComponent implements OnInit {
  authService = inject(AuthService);
  permissionService = inject(PermissionService);
  labStore = inject(LabStore);
  private labService = inject(LabService);
  private patientService = inject(PatientService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly Math = Math;

  // User and role checks
  isDoctor = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'doctor' || this.authService.hasRole('Doctor'));
  isNurse = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'nurse' || this.authService.hasRole('Nurse'));
  isLabTech = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'labtechnician' || this.authService.hasRole('LabTechnician'));
  canCollectSample = computed(() => this.isLabTech() || this.isNurse() || this.permissionService.hasPermission('Lab.Collect'));
  canOrderLab = computed(() => this.isDoctor() || this.isLabTech());

  pageTitle = computed(() => {
    if (this.isDoctor()) return 'Diagnostic Requisitions & Pathology Reports';
    if (this.isNurse()) return 'Laboratory Specimen Orders & Phlebotomy';
    return 'Laboratory Information Management System (LIMS)';
  });

  pageSubtitle = computed(() => {
    if (this.isDoctor()) {
      return 'Electronic laboratory order entry, specimen tracking status, and verified pathology reports';
    }
    if (this.isNurse()) {
      return 'Collect patient specimens, track phlebotomy orders, and inspect diagnostic requisitions';
    }
    return 'Diagnostic bench execution, specimen accession barcoding, multi-parameter test runs, reagent inventory, and analyzer QC';
  });

  // Active Tab
  selectedTab = signal<number>(0);

  // Entities & Data Signals
  patients = signal<Patient[]>([]);
  reagents = signal<LabReagent[]>([]);
  requisitions = signal<LabStockRequisition[]>([]);
  equipmentLogs = signal<LabEquipmentLog[]>([]);

  loadingReagents = signal<boolean>(true);
  loadingRequisitions = signal<boolean>(true);
  loadingEquipmentLogs = signal<boolean>(true);

  reagentSearchQuery = signal<string>('');
  requisitionSearchQuery = signal<string>('');

  // Modals Visibility
  isCreatingOrder = signal<boolean>(false);
  isEnteringResults = signal<boolean>(false);
  isViewingReport = signal<boolean>(false);
  isAccessionModal = signal<boolean>(false);
  isRejectModal = signal<boolean>(false);
  isReagentModal = signal<boolean>(false);
  isAdjustStockModal = signal<boolean>(false);
  isRequisitionModal = signal<boolean>(false);
  isReviewRequisitionModal = signal<boolean>(false);
  isEquipmentLogModal = signal<boolean>(false);
  isEditTestModal = signal<boolean>(false);
  isCreatingTest = signal<boolean>(false);
  editingTestId = signal<string | null>(null);
  isDeleteConfirmModal = signal<boolean>(false);
  testToDelete = signal<LabTestTemplate | null>(null);
  orderModalSearchQuery = signal<string>('');
  orderModalCategoryFilter = signal<string>('ALL');
  isSubmitting = signal<boolean>(false);

  // Selections
  selectedOrder = signal<LabOrder | null>(null);
  selectedOrderItem = signal<LabOrderItem | null>(null);
  selectedReagent = signal<LabReagent | null>(null);
  selectedRequisition = signal<LabStockRequisition | null>(null);

  // Forms
  orderForm: FormGroup = this.fb.group({
    patientId: ['', Validators.required],
    priority: ['Routine', Validators.required],
    clinicalNotes: [''],
    selectedTests: [[], Validators.required]
  });

  accessionForm: FormGroup = this.fb.group({
    specimenType: ['Whole Blood', Validators.required],
    tubeType: ['EDTA Lavender Top', Validators.required],
    sampleCondition: ['Viable', Validators.required],
    collectionVolumeMl: [4.0, [Validators.required, Validators.min(0.1)]],
    technicianNotes: ['']
  });

  rejectForm: FormGroup = this.fb.group({
    rejectionReason: ['Severe Hemolysis', Validators.required],
    requiresRecollection: [true],
    notes: ['']
  });

  reagentForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    catalogCode: ['', Validators.required],
    category: ['Hematology', Validators.required],
    lotNumber: ['', Validators.required],
    currentStock: [10, [Validators.required, Validators.min(0)]],
    minimumThreshold: [10, [Validators.required, Validators.min(1)]],
    unitOfMeasure: ['Kits', Validators.required],
    expiryDate: ['', Validators.required],
    storageCondition: ['15-25°C Room Temp', Validators.required],
    manufacturer: [''],
    unitCost: [50.0, [Validators.required, Validators.min(0)]],
    notes: ['']
  });

  stockAdjustmentForm: FormGroup = this.fb.group({
    adjustmentQuantity: [1, [Validators.required]],
    adjustmentType: ['restock', Validators.required],
    reason: ['Routine Restock Delivery', Validators.required]
  });

  requisitionForm: FormGroup = this.fb.group({
    labReagentId: [''],
    itemName: ['', Validators.required],
    category: ['Hematology', Validators.required],
    quantityRequested: [5, [Validators.required, Validators.min(1)]],
    unitOfMeasure: ['Kits', Validators.required],
    estimatedUnitCost: [50.0, [Validators.required, Validators.min(0)]],
    urgency: ['Routine', Validators.required],
    reason: ['', Validators.required]
  });

  reviewRequisitionForm: FormGroup = this.fb.group({
    status: ['Approved', Validators.required],
    reviewNotes: ['']
  });

  equipmentLogForm: FormGroup = this.fb.group({
    equipmentName: ['Sysmex XN-550 Automated Hematology Analyzer', Validators.required],
    equipmentModel: ['XN-550', Validators.required],
    serialNumber: ['SYX-550-99824', Validators.required],
    location: ['Main Hematology Bench A', Validators.required],
    logType: ['DailyCalibration', Validators.required],
    controlLotNumber: ['E-CHECK-901B'],
    standardDeviationScore: [0.25],
    status: ['Passed', Validators.required],
    findings: ['Control runs within acceptable 1SD range.', Validators.required],
    correctiveAction: [''],
    nextMaintenanceDueDate: ['']
  });

  testTemplateForm: FormGroup = this.fb.group({
    testCode: ['', [Validators.required, Validators.maxLength(20)]],
    testName: ['', [Validators.required, Validators.maxLength(100)]],
    category: ['Hematology', Validators.required],
    sampleType: ['Whole Blood (EDTA)', Validators.required],
    turnaroundTimeHours: [6, [Validators.required, Validators.min(1)]],
    price: [35.0, [Validators.required, Validators.min(0)]],
    description: [''],
    isActive: [true],
    parametersJson: ['[\n  {\n    "name": "Parameter Name",\n    "unit": "mg/dL",\n    "minRef": 0,\n    "maxRef": 100,\n    "normalText": "Normal"\n  }\n]']
  });

  // Result entry parameters
  resultParameters = signal<ResultParameterEntry[]>([]);
  resultRemarks = signal<string>('');

  // Catalog Filter State
  catalogCategoryFilter = signal<string>('ALL');
  catalogSearchQuery = signal<string>('');

  // Reagent Filter State
  reagentCategoryFilter = signal<string>('ALL');
  reagentLowStockOnly = signal<boolean>(false);

  // Computed data
  catalogCategories = computed(() => {
    const list = this.labStore.templates();
    const categories = Array.from(new Set(list.map(t => t.category).filter(Boolean)));
    return ['ALL', ...categories];
  });

  filteredCatalogTemplates = computed(() => {
    let list = this.labStore.templates();
    const cat = this.catalogCategoryFilter();
    const q = this.catalogSearchQuery().toLowerCase().trim();

    if (cat !== 'ALL') {
      list = list.filter(t => t.category === cat);
    }
    if (q) {
      list = list.filter(t =>
        t.testName.toLowerCase().includes(q) ||
        t.testCode.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return list;
  });

  filteredReagents = computed(() => {
    let list = this.reagents();
    const q = this.reagentSearchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.catalogCode.toLowerCase().includes(q) ||
        r.lotNumber.toLowerCase().includes(q)
      );
    }
    return list;
  });

  filteredRequisitions = computed(() => {
    let list = this.requisitions();
    const q = this.requisitionSearchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(r =>
        r.requisitionNumber.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    return list;
  });

  selectedPatient = computed(() => {
    const pid = this.orderForm.get('patientId')?.value;
    return this.patients().find(p => p.id === pid) || null;
  });

  orderModalCategories = computed(() => {
    const list = this.labStore.templates();
    const categories = Array.from(new Set(list.map(t => t.category).filter(Boolean)));
    return ['ALL', ...categories];
  });

  orderModalFilteredTemplates = computed(() => {
    let list = this.labStore.templates();
    const cat = this.orderModalCategoryFilter();
    const q = this.orderModalSearchQuery().toLowerCase().trim();

    if (cat !== 'ALL') {
      list = list.filter(t => t.category === cat);
    }
    if (q) {
      list = list.filter(t =>
        t.testName.toLowerCase().includes(q) ||
        t.testCode.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return list;
  });

  pendingAccessionOrders = computed(() => {
    return this.labStore.entities().filter(o => o.status === 'Ordered' || o.requiresRecollection);
  });

  readyForAnalyzerOrders = computed(() => {
    const orders = this.labStore.entities().filter(o => o.status === 'SampleCollected' || o.status === 'InProgress');
    const items: Array<{ order: LabOrder; item: LabOrderItem }> = [];
    for (const o of orders) {
      for (const i of o.items) {
        if (i.status !== 'Completed' && !i.isRejected) {
          items.push({ order: o, item: i });
        }
      }
    }
    return items;
  });

  ngOnInit() {
    this.labStore.loadOrders();
    this.labStore.loadTemplates();
    this.labStore.loadMetrics();
    this.loadPatients();
    this.loadReagents();
    this.loadRequisitions();
    this.loadEquipmentLogs();

    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (this.isDoctor()) {
        if (tab === 'catalog') this.selectedTab.set(1);
        else this.selectedTab.set(0);
      } else if (this.isNurse()) {
        if (tab === 'accession') this.selectedTab.set(1);
        else this.selectedTab.set(0);
      } else {
        if (tab === 'worklist') this.selectedTab.set(0);
        else if (tab === 'accession') this.selectedTab.set(1);
        else if (tab === 'execution') this.selectedTab.set(2);
        else if (tab === 'reagents') this.selectedTab.set(3);
        else if (tab === 'requisitions') this.selectedTab.set(4);
        else if (tab === 'qc') this.selectedTab.set(5);
        else if (tab === 'catalog') this.selectedTab.set(6);
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isSubmitting()) return;
    if (this.isDeleteConfirmModal()) this.cancelDeleteTest();
    else if (this.isEditTestModal()) this.closeEditTestModal();
    else if (this.isEquipmentLogModal()) this.closeEquipmentLogModal();
    else if (this.isReviewRequisitionModal()) this.closeReviewRequisitionModal();
    else if (this.isRequisitionModal()) this.closeRequisitionModal();
    else if (this.isAdjustStockModal()) this.closeAdjustStockModal();
    else if (this.isReagentModal()) this.closeReagentModal();
    else if (this.isViewingReport()) this.closeReportModal();
    else if (this.isEnteringResults()) this.closeResultModal();
    else if (this.isRejectModal()) this.closeRejectModal();
    else if (this.isAccessionModal()) this.closeAccessionModal();
    else if (this.isCreatingOrder()) this.closeCreateOrderModal();
  }

  onTabChanged(index: number) {
    this.selectedTab.set(index);
    if (this.isDoctor()) {
      const doctorTabMap = ['worklist', 'catalog'];
      const tabName = doctorTabMap[index] || 'worklist';
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: tabName },
        queryParamsHandling: 'merge'
      });
      return;
    }
    if (this.isNurse()) {
      const nurseTabMap = ['worklist', 'accession'];
      const safeIndex = index > 1 ? 0 : index;
      this.selectedTab.set(safeIndex);
      const tabName = nurseTabMap[safeIndex] || 'worklist';
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: tabName },
        queryParamsHandling: 'merge'
      });
      return;
    }
    const tabMap = ['worklist', 'accession', 'execution', 'reagents', 'requisitions', 'qc', 'catalog'];
    const tabName = tabMap[index] || 'worklist';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabName },
      queryParamsHandling: 'merge'
    });
  }

  loadPatients() {
    this.patientService.getAll(1, 100).subscribe({
      next: (res: PagedResponse<Patient> | Patient[]) => {
        this.patients.set(Array.isArray(res) ? res : (res.items ?? []));
      },
      error: () => {}
    });
  }

  loadReagents() {
    this.loadingReagents.set(true);
    const cat = this.reagentCategoryFilter();
    const low = this.reagentLowStockOnly();
    this.labService.getReagents(cat, undefined, low).subscribe({
      next: (data) => {
        this.reagents.set(data || []);
        this.loadingReagents.set(false);
      },
      error: () => {
        this.loadingReagents.set(false);
      }
    });
  }

  loadRequisitions() {
    this.loadingRequisitions.set(true);
    this.labService.getRequisitions().subscribe({
      next: (data) => {
        this.requisitions.set(data || []);
        this.loadingRequisitions.set(false);
      },
      error: () => {
        this.loadingRequisitions.set(false);
      }
    });
  }

  loadEquipmentLogs() {
    this.loadingEquipmentLogs.set(true);
    this.labService.getEquipmentLogs().subscribe({
      next: (data) => {
        this.equipmentLogs.set(data || []);
        this.loadingEquipmentLogs.set(false);
      },
      error: () => {
        this.loadingEquipmentLogs.set(false);
      }
    });
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.labStore.setSearchFilter(value);
  }

  onStatusFilter(status: string) {
    this.labStore.setStatusFilter(status);
  }

  onPriorityFilter(priority: string) {
    this.labStore.setPriorityFilter(priority);
  }

  // --- Order Placement ---
  openCreateOrderModal(preselectedTestId?: string) {
    this.orderForm.reset({
      patientId: '',
      priority: 'Routine',
      clinicalNotes: '',
      selectedTests: preselectedTestId ? [preselectedTestId] : []
    });
    this.isCreatingOrder.set(true);
  }

  closeCreateOrderModal() {
    this.isCreatingOrder.set(false);
  }

  isTestSelected(templateId: string): boolean {
    const selected: string[] = this.orderForm.get('selectedTests')?.value || [];
    return selected.includes(templateId);
  }

  toggleTestSelection(templateId: string) {
    const selected: string[] = [...(this.orderForm.get('selectedTests')?.value || [])];
    const index = selected.indexOf(templateId);
    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(templateId);
    }
    this.orderForm.patchValue({ selectedTests: selected });
  }

  calculateOrderTotal(): number {
    const selected: string[] = this.orderForm.get('selectedTests')?.value || [];
    const templates = this.labStore.templates();
    return templates
      .filter(t => selected.includes(t.id))
      .reduce((sum, t) => sum + t.price, 0);
  }

  submitOrder() {
    if (this.orderForm.invalid) return;
    const formVal = this.orderForm.value;
    if (!formVal.selectedTests || formVal.selectedTests.length === 0) {
      this.toast.error('Please select at least one laboratory test.');
      return;
    }

    this.isSubmitting.set(true);
    const req: CreateLabOrderRequest = {
      patientId: formVal.patientId,
      priority: formVal.priority,
      clinicalNotes: formVal.clinicalNotes,
      testTemplateIds: formVal.selectedTests
    };

    this.labService.createOrder(req).subscribe({
      next: (created) => {
        this.toast.success(`Lab order ${created.orderNumber} placed.`);
        this.isSubmitting.set(false);
        this.closeCreateOrderModal();
        this.labStore.loadOrders();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || err.message || 'Failed to place lab order');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Specimen Accession & Intake Modal ---
  openAccessionModal(order: LabOrder) {
    this.selectedOrder.set(order);
    const firstItem = order.items?.[0];
    let defaultTube = 'EDTA Lavender Top';
    const defaultSpecimen = firstItem?.sampleType || 'Whole Blood';

    if (defaultSpecimen.toLowerCase().includes('serum')) {
      defaultTube = 'SST Gold Top Gel Separator';
    } else if (defaultSpecimen.toLowerCase().includes('plasma') || defaultSpecimen.toLowerCase().includes('glucose')) {
      defaultTube = 'Sodium Fluoride Grey Top';
    } else if (defaultSpecimen.toLowerCase().includes('urine')) {
      defaultTube = 'Sterile Urine Container';
    }

    this.accessionForm.reset({
      specimenType: defaultSpecimen,
      tubeType: defaultTube,
      sampleCondition: 'Viable',
      collectionVolumeMl: 4.0,
      technicianNotes: ''
    });
    this.isAccessionModal.set(true);
  }

  closeAccessionModal() {
    this.isAccessionModal.set(false);
    this.selectedOrder.set(null);
  }

  submitAccession() {
    const order = this.selectedOrder();
    if (!order || this.accessionForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.accessionForm.value;
    const req: SpecimenIntakeRequest = {
      labOrderId: order.id,
      specimenType: val.specimenType,
      tubeType: val.tubeType,
      sampleCondition: val.sampleCondition,
      collectionVolumeMl: val.collectionVolumeMl,
      technicianNotes: val.technicianNotes
    };

    this.labService.specimenIntake(order.id, req).subscribe({
      next: (updated) => {
        this.toast.success(`Specimen accessioned: Barcode ${updated.specimenBarcode} assigned.`);
        this.isSubmitting.set(false);
        this.closeAccessionModal();
        this.labStore.loadOrders();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to intake specimen');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Specimen Rejection Modal ---
  openRejectModal(order: LabOrder, item?: LabOrderItem) {
    this.selectedOrder.set(order);
    this.selectedOrderItem.set(item || null);
    this.rejectForm.reset({
      rejectionReason: 'Severe Hemolysis',
      requiresRecollection: true,
      notes: ''
    });
    this.isRejectModal.set(true);
  }

  closeRejectModal() {
    this.isRejectModal.set(false);
    this.selectedOrder.set(null);
    this.selectedOrderItem.set(null);
  }

  submitRejection() {
    const order = this.selectedOrder();
    if (!order || this.rejectForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.rejectForm.value;
    const item = this.selectedOrderItem();

    const req: SpecimenRejectRequest = {
      labOrderId: order.id,
      orderItemId: item?.id,
      rejectionReason: val.rejectionReason,
      requiresRecollection: val.requiresRecollection,
      notes: val.notes
    };

    this.labService.specimenReject(order.id, req).subscribe({
      next: () => {
        this.toast.warning(`Specimen for ${order.orderNumber} rejected (${val.rejectionReason}).`);
        this.isSubmitting.set(false);
        this.closeRejectModal();
        this.labStore.loadOrders();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to reject specimen');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Result Entry Modal ---
  openResultModal(order: LabOrder, item: LabOrderItem) {
    this.selectedOrder.set(order);
    this.selectedOrderItem.set(item);
    this.resultRemarks.set(item.result?.remarks || '');

    const template = this.labStore.templates().find(t => t.id === item.labTestTemplateId);
    let params: LabParameterTemplate[] = [];
    if (template && template.parametersJson) {
      try {
        const parsed: unknown = JSON.parse(template.parametersJson);
        if (Array.isArray(parsed)) {
          params = parsed as LabParameterTemplate[];
        }
      } catch {
        params = [];
      }
    }

    let existingResults: LabParameterResult[] = [];
    if (item.result && item.result.parameterResultsJson) {
      try {
        existingResults = JSON.parse(item.result.parameterResultsJson);
      } catch {
        existingResults = [];
      }
    }

    const parameterList = params.map(p => {
      const existing = existingResults.find(e => e.parameterName === p.name);
      return {
        name: p.name,
        unit: p.unit || '',
        minRef: p.minRef,
        maxRef: p.maxRef,
        normalText: p.normalText || '',
        value: existing ? existing.value : '',
        flag: (existing ? existing.flag : 'Normal') as LabResultFlag
      };
    });

    this.resultParameters.set(parameterList);
    this.isEnteringResults.set(true);
  }

  closeResultModal() {
    this.isEnteringResults.set(false);
    this.selectedOrder.set(null);
    this.selectedOrderItem.set(null);
    this.resultParameters.set([]);
  }

  evaluateParamFlag(param: ResultParameterEntry) {
    const val = parseFloat(String(param.value));
    if (isNaN(val)) {
      param.flag = 'Normal';
      return;
    }
    if (param.minRef !== undefined && val < param.minRef) {
      param.flag = 'Low';
    } else if (param.maxRef !== undefined && val > param.maxRef) {
      param.flag = 'High';
    } else {
      param.flag = 'Normal';
    }
  }

  submitResults() {
    const item = this.selectedOrderItem();
    if (!item) return;

    const params = this.resultParameters();
    const hasAbnormal = params.some(p => p.flag === 'Low' || p.flag === 'High' || p.flag === 'Critical');

    this.isSubmitting.set(true);
    const req: RecordLabResultRequest = {
      labOrderItemId: item.id,
      parameterResultsJson: JSON.stringify(params),
      remarks: this.resultRemarks(),
      hasAbnormalFlag: hasAbnormal
    };

    this.labService.recordResult(req).subscribe({
      next: () => {
        this.toast.success(`Lab results recorded for ${item.testName}.`);
        this.isSubmitting.set(false);
        this.closeResultModal();
        this.labStore.loadOrders();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to record results');
        this.isSubmitting.set(false);
      }
    });
  }

  verifyItemResult(item: LabOrderItem) {
    this.labService.verifyResult(item.id).subscribe({
      next: () => {
        this.toast.success(`Test result verified and signed off for ${item.testName}.`);
        this.labStore.loadOrders();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to verify result');
      }
    });
  }

  // --- Report Viewer Modal ---
  openReportModal(order: LabOrder) {
    this.selectedOrder.set(order);
    this.isViewingReport.set(true);
  }

  closeReportModal() {
    this.isViewingReport.set(false);
    this.selectedOrder.set(null);
  }

  printReport() {
    window.print();
  }

  billOrder(order: LabOrder) {
    if (order.isBilled) {
      this.toast.info(`Invoice already issued for Order ${order.orderNumber}.`);
      this.router.navigate(['/billing'], { queryParams: { dept: 'Laboratory' } });
      return;
    }

    this.isSubmitting.set(true);
    this.labService.generateInvoice(order.id).subscribe({
      next: (invoice) => {
        this.isSubmitting.set(false);
        this.toast.success(`Diagnostic invoice ${invoice.invoiceNumber} generated for ${order.patientName}.`);
        this.labStore.loadOrders();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err.error?.detail || err.error?.title || 'Failed to generate diagnostic invoice');
      }
    });
  }

  // --- Reagents Modal ---
  openReagentModal() {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 9);
    const dateStr = futureDate.toISOString().split('T')[0];

    this.reagentForm.reset({
      name: '',
      catalogCode: '',
      category: 'Hematology',
      lotNumber: '',
      currentStock: 20,
      minimumThreshold: 10,
      unitOfMeasure: 'Tests',
      expiryDate: dateStr,
      storageCondition: '15-25°C Room Temp',
      manufacturer: '',
      unitCost: 45.0,
      notes: ''
    });
    this.isReagentModal.set(true);
  }

  closeReagentModal() {
    this.isReagentModal.set(false);
  }

  submitReagent() {
    if (this.reagentForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.reagentForm.value;
    const req: CreateLabReagentRequest = {
      name: val.name,
      catalogCode: val.catalogCode,
      category: val.category,
      lotNumber: val.lotNumber,
      currentStock: val.currentStock,
      minimumThreshold: val.minimumThreshold,
      unitOfMeasure: val.unitOfMeasure,
      expiryDate: new Date(val.expiryDate).toISOString(),
      storageCondition: val.storageCondition,
      manufacturer: val.manufacturer,
      unitCost: val.unitCost,
      notes: val.notes
    };

    this.labService.createReagent(req).subscribe({
      next: (created) => {
        this.toast.success(`Reagent ${created.name} added to inventory.`);
        this.isSubmitting.set(false);
        this.closeReagentModal();
        this.loadReagents();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to register reagent');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Reagent Stock Adjustment Modal ---
  openAdjustStockModal(reagent: LabReagent) {
    this.selectedReagent.set(reagent);
    this.stockAdjustmentForm.reset({
      adjustmentQuantity: 5,
      adjustmentType: 'restock',
      reason: 'Routine Stock Restock'
    });
    this.isAdjustStockModal.set(true);
  }

  closeAdjustStockModal() {
    this.isAdjustStockModal.set(false);
    this.selectedReagent.set(null);
  }

  submitStockAdjustment() {
    const reagent = this.selectedReagent();
    if (!reagent || this.stockAdjustmentForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.stockAdjustmentForm.value;
    const qty = Math.abs(val.adjustmentQuantity);
    const finalQty = val.adjustmentType === 'consumption' ? -qty : qty;

    const req: UpdateReagentStockRequest = {
      adjustmentQuantity: finalQty,
      reason: val.reason
    };

    this.labService.adjustReagentStock(reagent.id, req).subscribe({
      next: (updated) => {
        this.toast.success(`Stock for ${updated.name} updated: ${updated.currentStock} ${updated.unitOfMeasure}.`);
        this.isSubmitting.set(false);
        this.closeAdjustStockModal();
        this.loadReagents();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to adjust stock');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Supply Requisitions Modal ---
  openRequisitionModal(preselectedReagent?: LabReagent) {
    this.requisitionForm.reset({
      labReagentId: preselectedReagent?.id || '',
      itemName: preselectedReagent?.name || '',
      category: preselectedReagent?.category || 'Hematology',
      quantityRequested: 10,
      unitOfMeasure: preselectedReagent?.unitOfMeasure || 'Kits',
      estimatedUnitCost: preselectedReagent?.unitCost || 50.0,
      urgency: preselectedReagent && preselectedReagent.currentStock <= preselectedReagent.minimumThreshold ? 'Urgent' : 'Routine',
      reason: preselectedReagent
        ? `Reagent stock (${preselectedReagent.currentStock}) is at/below threshold (${preselectedReagent.minimumThreshold})`
        : ''
    });
    this.isRequisitionModal.set(true);
  }

  closeRequisitionModal() {
    this.isRequisitionModal.set(false);
  }

  onReagentSelectedForReq(reagentId: string) {
    const reagent = this.reagents().find(r => r.id === reagentId);
    if (reagent) {
      this.requisitionForm.patchValue({
        itemName: reagent.name,
        category: reagent.category,
        unitOfMeasure: reagent.unitOfMeasure,
        estimatedUnitCost: reagent.unitCost,
        reason: `Replenishment for ${reagent.name} (Lot: ${reagent.lotNumber}). Current stock: ${reagent.currentStock}`
      });
    }
  }

  submitRequisition() {
    if (this.requisitionForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.requisitionForm.value;
    const req: CreateLabRequisitionRequest = {
      labReagentId: val.labReagentId || undefined,
      itemName: val.itemName,
      category: val.category,
      quantityRequested: val.quantityRequested,
      unitOfMeasure: val.unitOfMeasure,
      estimatedUnitCost: val.estimatedUnitCost,
      urgency: val.urgency,
      reason: val.reason
    };

    this.labService.createRequisition(req).subscribe({
      next: (created) => {
        this.toast.success(`Requisition ${created.requisitionNumber} submitted.`);
        this.isSubmitting.set(false);
        this.closeRequisitionModal();
        this.loadRequisitions();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to submit requisition');
        this.isSubmitting.set(false);
      }
    });
  }

  openReviewRequisitionModal(req: LabStockRequisition) {
    this.selectedRequisition.set(req);
    this.reviewRequisitionForm.reset({
      status: req.status === 'Pending' ? 'Approved' : 'Fulfilled',
      reviewNotes: ''
    });
    this.isReviewRequisitionModal.set(true);
  }

  closeReviewRequisitionModal() {
    this.isReviewRequisitionModal.set(false);
    this.selectedRequisition.set(null);
  }

  submitRequisitionReview() {
    const req = this.selectedRequisition();
    if (!req || this.reviewRequisitionForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.reviewRequisitionForm.value;
    const reviewReq: ReviewLabRequisitionRequest = {
      status: val.status,
      reviewNotes: val.reviewNotes
    };

    this.labService.reviewRequisition(req.id, reviewReq).subscribe({
      next: (updated) => {
        this.toast.success(`Requisition ${updated.requisitionNumber} marked as ${updated.status}.`);
        this.isSubmitting.set(false);
        this.closeReviewRequisitionModal();
        this.loadRequisitions();
        this.loadReagents();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to review requisition');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Equipment & QC Modal ---
  openEquipmentLogModal() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextDueStr = nextWeek.toISOString().split('T')[0];

    this.equipmentLogForm.reset({
      equipmentName: 'Sysmex XN-550 Automated Hematology Analyzer',
      equipmentModel: 'XN-550',
      serialNumber: 'SYX-550-99824',
      location: 'Main Hematology Bench A',
      logType: 'DailyCalibration',
      controlLotNumber: 'E-CHECK-901B',
      standardDeviationScore: 0.25,
      status: 'Passed',
      findings: 'Tri-level whole blood controls run. Optics and laser apertures clean.',
      correctiveAction: '',
      nextMaintenanceDueDate: nextDueStr
    });
    this.isEquipmentLogModal.set(true);
  }

  closeEquipmentLogModal() {
    this.isEquipmentLogModal.set(false);
  }

  submitEquipmentLog() {
    if (this.equipmentLogForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.equipmentLogForm.value;
    const req: CreateLabEquipmentLogRequest = {
      equipmentName: val.equipmentName,
      equipmentModel: val.equipmentModel,
      serialNumber: val.serialNumber,
      location: val.location,
      logType: val.logType,
      controlLotNumber: val.controlLotNumber || undefined,
      standardDeviationScore: val.standardDeviationScore !== null ? Number(val.standardDeviationScore) : undefined,
      status: val.status,
      findings: val.findings,
      correctiveAction: val.correctiveAction || undefined,
      nextMaintenanceDueDate: val.nextMaintenanceDueDate ? new Date(val.nextMaintenanceDueDate).toISOString() : undefined
    };

    this.labService.createEquipmentLog(req).subscribe({
      next: (created) => {
        this.toast.success(`QC log recorded for ${created.equipmentName}.`);
        this.isSubmitting.set(false);
        this.closeEquipmentLogModal();
        this.loadEquipmentLogs();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to save equipment log');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Helper Formatting ---
  getParsedParameters(json: string): LabParameterTemplate[] {
    try {
      const parsed: unknown = JSON.parse(json);
      return Array.isArray(parsed) ? (parsed as LabParameterTemplate[]) : [];
    } catch {
      return [];
    }
  }

  getParsedResultParameters(json: string): LabParameterResult[] {
    try {
      const parsed: unknown = JSON.parse(json);
      return Array.isArray(parsed) ? (parsed as LabParameterResult[]) : [];
    } catch {
      return [];
    }
  }

  getDoctorStatusLabel(status: string): string {
    switch (status) {
      case 'SampleCollected': return 'Sample in Lab';
      case 'Ordered': return 'Awaiting Phlebotomy';
      case 'InProgress': return 'In Analysis';
      default: return status;
    }
  }

  getPriorityTone(priority: string): StatusTone {
    switch ((priority || '').toLowerCase()) {
      case 'stat': return 'danger';
      case 'urgent':
      case 'high': return 'warning';
      default: return 'neutral';
    }
  }

  getFlagTone(flag: string): StatusTone {
    switch ((flag || '').toLowerCase()) {
      case 'critical':
      case 'high': return 'danger';
      case 'low': return 'warning';
      default: return 'success';
    }
  }

  getQcTone(status: string): StatusTone {
    switch ((status || '').toLowerCase()) {
      case 'passed': return 'success';
      case 'warning': return 'warning';
      case 'failed': return 'danger';
      default: return 'neutral';
    }
  }

  getCategoryCount(category: string): number {
    if (category === 'ALL') return this.labStore.templates().length;
    return this.labStore.templates().filter(t => t.category === category).length;
  }

  // --- Diagnostic Catalog Panel Management ---
  openCreateTestModal() {
    this.isCreatingTest.set(true);
    this.editingTestId.set(null);
    this.testTemplateForm.reset({
      testCode: '',
      testName: '',
      category: 'Hematology',
      sampleType: 'Whole Blood (EDTA)',
      turnaroundTimeHours: 6,
      price: 35.0,
      description: '',
      isActive: true,
      parametersJson: '[\n  {\n    "name": "Parameter Name",\n    "unit": "mg/dL",\n    "minRef": 0,\n    "maxRef": 100,\n    "normalText": "Normal"\n  }\n]'
    });
    this.isEditTestModal.set(true);
  }

  openEditTestModal(test: LabTestTemplate) {
    this.isCreatingTest.set(false);
    this.editingTestId.set(test.id);
    let formattedParams = test.parametersJson;
    try {
      formattedParams = JSON.stringify(JSON.parse(test.parametersJson), null, 2);
    } catch {}
    this.testTemplateForm.reset({
      testCode: test.testCode,
      testName: test.testName,
      category: test.category,
      sampleType: test.sampleType,
      turnaroundTimeHours: test.turnaroundTimeHours,
      price: test.price,
      description: test.description || '',
      isActive: test.isActive,
      parametersJson: formattedParams
    });
    this.isEditTestModal.set(true);
  }

  closeEditTestModal() {
    this.isEditTestModal.set(false);
    this.editingTestId.set(null);
  }

  submitTestTemplate() {
    if (this.testTemplateForm.invalid) return;
    const val = this.testTemplateForm.value;

    if (val.parametersJson) {
      try {
        JSON.parse(val.parametersJson);
      } catch {
        this.toast.error('Parameters Reference Intervals must be valid JSON.');
        return;
      }
    }

    this.isSubmitting.set(true);
    if (this.isCreatingTest()) {
      const req: CreateLabTestTemplateRequest = {
        testCode: (val.testCode || '').trim().toUpperCase(),
        testName: (val.testName || '').trim(),
        category: val.category,
        description: val.description || undefined,
        sampleType: val.sampleType,
        turnaroundTimeHours: Number(val.turnaroundTimeHours),
        price: Number(val.price),
        parametersJson: val.parametersJson || '[]'
      };

      this.labService.createTemplate(req).subscribe({
        next: (created) => {
          this.toast.success(`Diagnostic Panel "${created.testName}" (${created.testCode}) created.`);
          this.labStore.addTemplate(created);
          this.isSubmitting.set(false);
          this.closeEditTestModal();
        },
        error: (err) => {
          this.toast.error(err.error?.detail || err.message || 'Failed to create diagnostic test panel');
          this.isSubmitting.set(false);
        }
      });
    } else {
      const id = this.editingTestId();
      if (!id) return;
      const req: UpdateLabTestTemplateRequest = {
        testCode: (val.testCode || '').trim().toUpperCase(),
        testName: (val.testName || '').trim(),
        category: val.category,
        description: val.description || undefined,
        sampleType: val.sampleType,
        turnaroundTimeHours: Number(val.turnaroundTimeHours),
        price: Number(val.price),
        isActive: val.isActive !== false,
        parametersJson: val.parametersJson || '[]'
      };

      this.labService.updateTemplate(id, req).subscribe({
        next: (updated) => {
          this.toast.success(`Diagnostic Panel "${updated.testName}" updated.`);
          this.labStore.updateTemplateInStore(updated);
          this.isSubmitting.set(false);
          this.closeEditTestModal();
        },
        error: (err) => {
          this.toast.error(err.error?.detail || err.message || 'Failed to update diagnostic test panel');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  confirmDeleteTest(test: LabTestTemplate) {
    this.testToDelete.set(test);
    this.isDeleteConfirmModal.set(true);
  }

  cancelDeleteTest() {
    this.isDeleteConfirmModal.set(false);
    this.testToDelete.set(null);
  }

  executeDeleteTest() {
    const test = this.testToDelete();
    if (!test) return;

    this.isSubmitting.set(true);
    this.labService.deleteTemplate(test.id).subscribe({
      next: () => {
        this.toast.success(`Diagnostic Panel "${test.testName}" removed.`);
        this.labStore.removeTemplateFromStore(test.id);
        this.isSubmitting.set(false);
        this.cancelDeleteTest();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || err.message || 'Failed to delete test panel');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Order placement helpers ---
  setOrderPriority(priority: string) {
    this.orderForm.patchValue({ priority });
  }

  getSelectedTestsCount(): number {
    return (this.orderForm.get('selectedTests')?.value || []).length;
  }

  clearSelectedTests() {
    this.orderForm.patchValue({ selectedTests: [] });
  }

  getSelectedTemplateItems(): LabTestTemplate[] {
    const selected: string[] = this.orderForm.get('selectedTests')?.value || [];
    return this.labStore.templates().filter(t => selected.includes(t.id));
  }
}
