import { Component, HostListener, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { BillingStore } from '../../store/billing.store';
import { LiveSyncService } from '../../services/live-sync.service';
import { PatientService } from '../../services/patient.service';
import { ToastService } from '../../ui/toast/toast.service';
import { FinanceService } from '../../services/finance.service';
import {
  FinanceDashboardMetrics,
  InsuranceClaim,
  BillingAdjustment,
  ExpenseTransaction,
  PettyCashVoucher,
  PayrollRecord
} from '../../models/finance.model';
import { DailyCashReconciliationResponse } from '../../models/reception.model';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent, StatusTone } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent implements OnInit {
  public permissionService = inject(PermissionService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);
  public billingStore = inject(BillingStore);
  private liveSyncService = inject(LiveSyncService);
  private patientService = inject(PatientService);
  private financeService = inject(FinanceService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isPatient = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'patient' || this.authService.hasRole('Patient'));
  isAccountant = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'accountant' || this.authService.hasRole('Accountant'));
  isReceptionist = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'receptionist' || this.authService.hasRole('Receptionist'));
  isPharmacist = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'pharmacist' || this.authService.hasRole('Pharmacist'));
  isLabTech = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'labtechnician' || this.authService.hasRole('LabTechnician'));
  canManageBilling = computed(() => this.isAccountant() || this.isReceptionist());
  canManageAccounting = computed(() => this.isAccountant());

  pageTitle = computed(() => {
    if (this.isPharmacist()) return 'Dispensary Invoices & Collections';
    if (this.isLabTech()) return 'Laboratory Invoices & Collections';
    return 'Financial Control Center';
  });

  pageSubtitle = computed(() => {
    if (this.isPharmacist()) {
      return 'Prescription dispensing invoices, OTC receipts, patient copays, and pharmacy ledger';
    }
    if (this.isLabTech()) {
      return 'Diagnostic pathology invoices, accession billing, requisition charges, and laboratory ledger';
    }
    return 'Accounts receivable, insurance claims, supplier payables, petty cash, payroll, and shift audits';
  });

  // Active Tab
  activeTab = signal<string>('invoices');

  // Invoices & Receivables
  invoices = this.billingStore.invoices;
  totalRevenue = this.billingStore.totalRevenue;
  outstandingBalance = this.billingStore.outstandingBalance;
  invoiceStatusFilter = signal<string>('All');
  invoiceDeptFilter = signal<string>('All');

  // Pharmacist Dispensary Scoped KPIs
  dispensaryRevenue = computed(() =>
    this.filteredInvoices()
      .filter(i => (i.status || '').toLowerCase() === 'paid')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
  );

  dispensaryOutstanding = computed(() =>
    this.filteredInvoices()
      .filter(i => (i.status || '').toLowerCase() === 'unpaid' || (i.status || '').toLowerCase() === 'partiallypaid')
      .reduce((sum, i) => sum + (i.balanceDue || 0), 0)
  );

  dispensaryInvoiceCount = computed(() => this.filteredInvoices().length);
  dispensaryPaidCount = computed(() =>
    this.filteredInvoices().filter(i => (i.status || '').toLowerCase() === 'paid').length
  );

  // Lab Technician Scoped KPIs
  labRevenue = computed(() =>
    this.filteredInvoices()
      .filter(i => (i.status || '').toLowerCase() === 'paid')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
  );

  labOutstanding = computed(() =>
    this.filteredInvoices()
      .filter(i => (i.status || '').toLowerCase() === 'unpaid' || (i.status || '').toLowerCase() === 'partiallypaid')
      .reduce((sum, i) => sum + (i.balanceDue || 0), 0)
  );

  labInvoiceCount = computed(() => this.filteredInvoices().length);
  labPaidCount = computed(() =>
    this.filteredInvoices().filter(i => (i.status || '').toLowerCase() === 'paid').length
  );

  // Finance signals
  metrics = signal<FinanceDashboardMetrics | null>(null);
  claims = signal<InsuranceClaim[]>([]);
  adjustments = signal<BillingAdjustment[]>([]);
  expenses = signal<ExpenseTransaction[]>([]);
  pettyCashVouchers = signal<PettyCashVoucher[]>([]);
  payrollRecords = signal<PayrollRecord[]>([]);
  dailyReconciliations = signal<DailyCashReconciliationResponse[]>([]);

  // Per-tab loading flags
  claimsLoading = signal(false);
  adjustmentsLoading = signal(false);
  expensesLoading = signal(false);
  pettyCashLoading = signal(false);
  payrollLoading = signal(false);
  reconciliationsLoading = signal(false);

  // Patients list for selects
  patients = signal<any[]>([]);

  // Filter signals
  claimStatusFilter = signal<string>('All');
  adjustmentStatusFilter = signal<string>('All');
  expenseCategoryFilter = signal<string>('All');
  expenseStatusFilter = signal<string>('All');
  reconciliationAuditFilter = signal<string>('All');

  // Processing state
  isProcessing = signal(false);

  // Modals & Drawers
  showNewInvoiceModal = signal(false);
  selectedInvoiceForPay = signal<any | null>(null);
  paymentAmountInput = 0;
  paymentMethodInput = 'Cash';
  paymentReferenceInput = '';

  // Claims Modals
  showNewClaimModal = signal(false);
  newClaimForm = this.fb.group({
    invoiceId: ['', Validators.required],
    insuranceProvider: ['BlueCross BlueShield', Validators.required],
    policyNumber: ['', Validators.required],
    groupNumber: [''],
    claimAmount: [0, [Validators.required, Validators.min(1)]],
    patientCopay: [20, [Validators.required, Validators.min(0)]],
    notes: ['']
  });
  selectedClaimForReconcile = signal<InsuranceClaim | null>(null);
  reconcileClaimForm = this.fb.group({
    status: ['Remitted', Validators.required],
    coveredAmount: [0, [Validators.required, Validators.min(0)]],
    remittanceReference: [''],
    denialReason: [''],
    notes: ['']
  });

  // Adjustments Modals
  showNewAdjustmentModal = signal(false);
  newAdjustmentForm = this.fb.group({
    invoiceId: ['', Validators.required],
    type: ['Discount', Validators.required],
    amount: [10, [Validators.required, Validators.min(1)]],
    reason: ['', Validators.required]
  });
  selectedAdjustmentForReview = signal<BillingAdjustment | null>(null);
  reviewAdjustmentNotes = '';

  // Expenses Modals
  showNewExpenseModal = signal(false);
  newExpenseForm = this.fb.group({
    category: ['PharmaceuticalSupplier', Validators.required],
    vendorName: ['', Validators.required],
    invoiceReference: ['', Validators.required],
    description: ['', Validators.required],
    amount: [100, [Validators.required, Validators.min(1)]],
    taxAmount: [0],
    dueDate: [new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], Validators.required],
    paymentMethod: ['BankTransfer', Validators.required],
    notes: ['']
  });
  selectedExpenseForSettle = signal<ExpenseTransaction | null>(null);
  settlePaymentMethod = 'BankTransfer';
  settlePaymentRef = '';
  settlePaymentNotes = '';

  // Petty Cash Modals
  showNewPettyCashModal = signal(false);
  newPettyCashForm = this.fb.group({
    type: ['Disbursement', Validators.required],
    amount: [25, [Validators.required, Validators.min(1)]],
    category: ['OfficeSupplies', Validators.required],
    payee: ['', Validators.required],
    description: ['', Validators.required],
    receiptRef: ['']
  });

  // Payroll Modals
  showGeneratePayrollModal = signal(false);
  payrollMonthInput = new Date().getMonth() + 1;
  payrollYearInput = new Date().getFullYear();
  selectedPayrollForDisburse = signal<PayrollRecord | null>(null);
  disbursePaymentRef = '';

  // Shift Reconciliation Audit Modal
  selectedReconciliationForAudit = signal<DailyCashReconciliationResponse | null>(null);
  auditStatusInput = 'VerifiedBalanced';
  auditNotesInput = '';

  // PDF Design Modal
  showPdfDesignModal = signal(false);
  activePdfInvoiceId = signal<string | null>(null);
  selectedPdfDesign = signal<'ExecutiveNavy' | 'ModernEmerald' | 'ClinicalCyan'>('ExecutiveNavy');

  servicePresets = [
    { label: 'General Consultation ($50.00)', desc: 'General Medical Consultation', price: 50 },
    { label: 'Comprehensive Diagnostic Lab ($120.00)', desc: 'Diagnostic Laboratory Screening', price: 120 },
    { label: 'Specialist Follow-up ($85.00)', desc: 'Physician Specialist Follow-up Consultation', price: 85 },
    { label: 'Prescription & Pharmacy Dispense ($45.00)', desc: 'Prescription Medications & Dispensing', price: 45 },
    { label: 'Emergency Care Intake ($100.00)', desc: 'Emergency Triage & Medical Intake', price: 100 }
  ];

  invoiceForm = this.fb.group({
    patientId: ['', Validators.required],
    amount: [50.0, [Validators.required, Validators.min(1)]],
    description: ['General Medical Consultation', Validators.required]
  });

  // Filtered lists computed
  filteredInvoices = computed(() => {
    let list = this.invoices();
    const status = this.invoiceStatusFilter();
    const dept = this.invoiceDeptFilter();

    if (this.isPharmacist() || (dept || '').toLowerCase() === 'pharmacy') {
      list = list.filter(i =>
        (i.department || '').toLowerCase() === 'pharmacy' ||
        (i.invoiceNumber || '').toUpperCase().startsWith('INV-RX')
      );
    } else if (this.isLabTech() || (dept || '').toLowerCase() === 'laboratory') {
      list = list.filter(i =>
        (i.department || '').toLowerCase() === 'laboratory' ||
        (i.invoiceNumber || '').toUpperCase().startsWith('INV-LAB')
      );
    } else if (dept !== 'All') {
      list = list.filter(i => (i.department || '').toLowerCase() === dept.toLowerCase());
    }

    if (status !== 'All') {
      list = list.filter(i => (i.status || '').toLowerCase() === status.toLowerCase());
    }
    return list;
  });

  filteredClaims = computed(() => {
    const list = this.claims();
    const status = this.claimStatusFilter();
    if (status !== 'All') {
      return list.filter(c => c.status.toLowerCase() === status.toLowerCase());
    }
    return list;
  });

  filteredAdjustments = computed(() => {
    const list = this.adjustments();
    const status = this.adjustmentStatusFilter();
    if (status !== 'All') {
      return list.filter(a => a.status.toLowerCase() === status.toLowerCase());
    }
    return list;
  });

  filteredExpenses = computed(() => {
    let list = this.expenses();
    const cat = this.expenseCategoryFilter();
    const status = this.expenseStatusFilter();

    if (cat !== 'All') {
      list = list.filter(e => e.category.toLowerCase() === cat.toLowerCase());
    }
    if (status !== 'All') {
      list = list.filter(e => e.status.toLowerCase() === status.toLowerCase());
    }
    return list;
  });

  filteredReconciliations = computed(() => {
    const list = this.dailyReconciliations();
    const filter = this.reconciliationAuditFilter();
    if (filter === 'Pending') {
      return list.filter(r => !r.auditStatus || r.auditStatus === 'Pending' || r.auditStatus === 'PendingAudit');
    } else if (filter !== 'All') {
      return list.filter(r => (r.auditStatus || '').toLowerCase() === filter.toLowerCase());
    }
    return list;
  });

  payrollTotals = computed(() => {
    const records = this.payrollRecords();
    const base = records.reduce((acc, r) => acc + (r.baseSalary || 0), 0);
    const comms = records.reduce((acc, r) => acc + (r.doctorCommissionShare || 0), 0);
    const ot = records.reduce((acc, r) => acc + (r.overtimePay || 0), 0);
    const tax = records.reduce((acc, r) => acc + (r.taxDeductions || 0), 0);
    const net = records.reduce((acc, r) => acc + (r.netSalaryPayable || 0), 0);
    return { base, comms, ot, tax, net, count: records.length };
  });

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showPdfDesignModal()) this.closePdfDesignModal();
    else if (this.selectedInvoiceForPay()) this.selectedInvoiceForPay.set(null);
    else if (this.selectedClaimForReconcile()) this.selectedClaimForReconcile.set(null);
    else if (this.selectedAdjustmentForReview()) this.selectedAdjustmentForReview.set(null);
    else if (this.selectedExpenseForSettle()) this.selectedExpenseForSettle.set(null);
    else if (this.selectedReconciliationForAudit()) this.selectedReconciliationForAudit.set(null);
    else if (this.showNewPettyCashModal()) this.showNewPettyCashModal.set(false);
    else if (this.showNewExpenseModal()) this.showNewExpenseModal.set(false);
    else if (this.showGeneratePayrollModal()) this.showGeneratePayrollModal.set(false);
    else if (this.selectedPayrollForDisburse()) this.selectedPayrollForDisburse.set(null);
    else if (this.showNewClaimModal()) this.showNewClaimModal.set(false);
    else if (this.showNewAdjustmentModal()) this.showNewAdjustmentModal.set(false);
    else if (this.showNewInvoiceModal()) this.showNewInvoiceModal.set(false);
  }

  constructor() {
    this.liveSyncService.invoicePaid$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.billingStore.loadInvoices();
      if (!this.isPharmacist() && !this.isLabTech()) {
        this.loadFinanceMetrics();
        this.loadClaims();
        this.loadAdjustments();
      }
    });
  }

  ngOnInit(): void {
    this.billingStore.loadInvoices();
    this.loadPatients();

    this.route.queryParams.subscribe(params => {
      const dept = params['dept'];
      if (dept === 'Pharmacy' || this.isPharmacist()) {
        this.invoiceDeptFilter.set('Pharmacy');
        this.activeTab.set('invoices');
      } else if (dept === 'Laboratory' || this.isLabTech()) {
        this.invoiceDeptFilter.set('Laboratory');
        this.activeTab.set('invoices');
      } else {
        const tab = params['tab'];
        if (tab && ['invoices', 'claims', 'adjustments', 'expenses', 'petty-cash', 'payroll', 'reconciliation'].includes(tab)) {
          this.activeTab.set(tab);
          this.loadTabData(tab);
        } else {
          this.activeTab.set('invoices');
        }
      }
    });

    if (!this.isPharmacist() && !this.isLabTech()) {
      this.loadFinanceMetrics();
      this.loadClaims();
      this.loadAdjustments();
      this.loadExpenses();
      this.loadPettyCash();
      this.loadPayroll();
      this.loadReconciliations();
    }
  }

  getStatusTone(status?: string | null): StatusTone {
    const normalized = (status || '').toLowerCase();
    if (['paid', 'approved', 'remitted', 'balanced', 'verifiedbalanced', 'disbursed', 'replenishment'].includes(normalized)) {
      return 'success';
    }
    if (['unpaid', 'denied', 'rejected', 'disputed', 'baddebtwriteoff'].includes(normalized)) {
      return 'danger';
    }
    if (['partiallypaid', 'inreview', 'pendingapproval', 'discrepancy', 'discrepancyapproved', 'pending', 'pendingaudit', 'draft'].includes(normalized)) {
      return 'warning';
    }
    if (['submitted', 'discount', 'pharmacy'].includes(normalized)) {
      return 'info';
    }
    return 'neutral';
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
    this.loadTabData(tab);
  }

  loadTabData(tab: string): void {
    switch (tab) {
      case 'invoices':
        this.billingStore.loadInvoices();
        break;
      case 'claims':
        this.loadClaims();
        break;
      case 'adjustments':
        this.loadAdjustments();
        break;
      case 'expenses':
        this.loadExpenses();
        break;
      case 'petty-cash':
        this.loadPettyCash();
        break;
      case 'payroll':
        this.loadPayroll();
        break;
      case 'reconciliation':
        this.loadReconciliations();
        break;
    }
  }

  loadPatients(): void {
    this.patientService.getAll(1, 100).subscribe({
      next: (res: any) => {
        const list = res.items || (Array.isArray(res) ? res : []);
        this.patients.set(list);
      },
      error: () => this.patients.set([])
    });
  }

  loadFinanceMetrics(): void {
    this.financeService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });
  }

  loadClaims(): void {
    this.claimsLoading.set(true);
    this.financeService.getClaims().subscribe({
      next: (c) => {
        this.claims.set(c);
        this.claimsLoading.set(false);
      },
      error: () => this.claimsLoading.set(false)
    });
  }

  loadAdjustments(): void {
    this.adjustmentsLoading.set(true);
    this.financeService.getAdjustments().subscribe({
      next: (a) => {
        this.adjustments.set(a);
        this.adjustmentsLoading.set(false);
      },
      error: () => this.adjustmentsLoading.set(false)
    });
  }

  loadExpenses(): void {
    this.expensesLoading.set(true);
    this.financeService.getExpenses().subscribe({
      next: (e) => {
        this.expenses.set(e);
        this.expensesLoading.set(false);
      },
      error: () => this.expensesLoading.set(false)
    });
  }

  loadPettyCash(): void {
    this.pettyCashLoading.set(true);
    this.financeService.getPettyCash().subscribe({
      next: (v) => {
        this.pettyCashVouchers.set(v);
        this.pettyCashLoading.set(false);
      },
      error: () => this.pettyCashLoading.set(false)
    });
  }

  loadPayroll(): void {
    this.payrollLoading.set(true);
    this.financeService.getPayroll(this.payrollMonthInput, this.payrollYearInput).subscribe({
      next: (p) => {
        this.payrollRecords.set(p);
        this.payrollLoading.set(false);
      },
      error: () => this.payrollLoading.set(false)
    });
  }

  loadReconciliations(): void {
    this.reconciliationsLoading.set(true);
    this.financeService.getDailyReconciliations().subscribe({
      next: (r) => {
        this.dailyReconciliations.set(r);
        this.reconciliationsLoading.set(false);
      },
      error: () => this.reconciliationsLoading.set(false)
    });
  }

  // Invoice Operations
  applyPreset(preset: any): void {
    if (preset.desc) {
      this.invoiceForm.patchValue({
        description: preset.desc,
        amount: preset.price
      });
    }
  }

  openPaymentDialog(invoice: any): void {
    this.selectedInvoiceForPay.set(invoice);
    this.paymentAmountInput = invoice.balanceDue;
    this.paymentMethodInput = 'Cash';
    this.paymentReferenceInput = '';
  }

  submitPayment(): void {
    const inv = this.selectedInvoiceForPay();
    if (!inv) return;

    this.isProcessing.set(true);
    this.billingStore.processPayment(
      inv.id,
      this.paymentAmountInput,
      this.paymentMethodInput,
      this.paymentReferenceInput
    );
    this.isProcessing.set(false);
    this.selectedInvoiceForPay.set(null);
    this.loadFinanceMetrics();
  }

  submitInvoice(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      return;
    }
    this.isProcessing.set(true);

    const val = this.invoiceForm.value;
    this.billingStore.createInvoice({
      patientId: val.patientId!,
      taxAmount: 0,
      discountAmount: 0,
      items: [
        { description: val.description!, quantity: 1, unitPrice: Number(val.amount!) }
      ]
    });

    this.isProcessing.set(false);
    this.showNewInvoiceModal.set(false);
    this.invoiceForm.reset({ amount: 50, description: 'General Medical Consultation' });
    this.billingStore.loadInvoices();
    this.loadFinanceMetrics();
  }

  openPdfDesignModal(invoiceId: string): void {
    this.activePdfInvoiceId.set(invoiceId);
    this.showPdfDesignModal.set(true);
  }

  closePdfDesignModal(): void {
    this.showPdfDesignModal.set(false);
    this.activePdfInvoiceId.set(null);
  }

  selectPdfDesign(design: 'ExecutiveNavy' | 'ModernEmerald' | 'ClinicalCyan'): void {
    this.selectedPdfDesign.set(design);
  }

  confirmDownloadPdf(): void {
    const id = this.activePdfInvoiceId();
    if (!id) return;
    this.billingStore.downloadInvoicePdf(id, this.selectedPdfDesign());
    this.closePdfDesignModal();
  }

  downloadPdf(invoiceId: string): void {
    this.openPdfDesignModal(invoiceId);
  }

  // Claims Operations
  openNewClaimModal(invoice?: any): void {
    if (invoice) {
      this.newClaimForm.patchValue({
        invoiceId: invoice.id,
        claimAmount: invoice.totalAmount,
        patientCopay: 20
      });
    }
    this.showNewClaimModal.set(true);
  }

  submitClaim(): void {
    if (this.newClaimForm.invalid) {
      this.newClaimForm.markAllAsTouched();
      return;
    }
    this.isProcessing.set(true);
    const val = this.newClaimForm.value;
    this.financeService.createClaim({
      invoiceId: val.invoiceId!,
      insuranceProvider: val.insuranceProvider!,
      policyNumber: val.policyNumber!,
      groupNumber: val.groupNumber || undefined,
      claimAmount: Number(val.claimAmount),
      patientCopay: Number(val.patientCopay),
      notes: val.notes || undefined
    }).subscribe({
      next: () => {
        this.toast.success('Insurance claim submitted successfully');
        this.isProcessing.set(false);
        this.showNewClaimModal.set(false);
        this.newClaimForm.reset({ insuranceProvider: 'BlueCross BlueShield', patientCopay: 20 });
        this.loadClaims();
        this.loadFinanceMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Failed to submit insurance claim');
        this.isProcessing.set(false);
      }
    });
  }

  openReconcileClaimModal(claim: InsuranceClaim): void {
    this.selectedClaimForReconcile.set(claim);
    this.reconcileClaimForm.patchValue({
      status: 'Remitted',
      coveredAmount: claim.claimAmount - claim.patientCopay,
      remittanceReference: `EFT-REM-${Date.now().toString().slice(-6)}`,
      denialReason: '',
      notes: ''
    });
  }

  submitReconcileClaim(): void {
    const claim = this.selectedClaimForReconcile();
    if (!claim || this.reconcileClaimForm.invalid) return;

    this.isProcessing.set(true);
    const val = this.reconcileClaimForm.value;
    this.financeService.reconcileClaim(claim.id, {
      status: val.status!,
      coveredAmount: Number(val.coveredAmount),
      remittanceReference: val.remittanceReference || undefined,
      denialReason: val.denialReason || undefined,
      notes: val.notes || undefined
    }).subscribe({
      next: () => {
        this.toast.success(`Claim ${claim.claimNumber} reconciled as ${val.status}`);
        this.isProcessing.set(false);
        this.selectedClaimForReconcile.set(null);
        this.loadClaims();
        this.billingStore.loadInvoices();
        this.loadFinanceMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Failed to reconcile claim');
        this.isProcessing.set(false);
      }
    });
  }

  // Adjustments Operations
  openNewAdjustmentModal(invoice?: any): void {
    if (invoice) {
      this.newAdjustmentForm.patchValue({
        invoiceId: invoice.id,
        type: 'Discount',
        amount: Math.round(invoice.totalAmount * 0.1) || 10
      });
    }
    this.showNewAdjustmentModal.set(true);
  }

  submitAdjustment(): void {
    if (this.newAdjustmentForm.invalid) {
      this.newAdjustmentForm.markAllAsTouched();
      return;
    }
    this.isProcessing.set(true);
    const val = this.newAdjustmentForm.value;
    this.financeService.createAdjustment({
      invoiceId: val.invoiceId!,
      type: val.type!,
      amount: Number(val.amount),
      reason: val.reason!
    }).subscribe({
      next: () => {
        this.toast.success('Billing adjustment requested for review');
        this.isProcessing.set(false);
        this.showNewAdjustmentModal.set(false);
        this.newAdjustmentForm.reset({ type: 'Discount', amount: 10 });
        this.loadAdjustments();
        this.loadFinanceMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Failed to request adjustment');
        this.isProcessing.set(false);
      }
    });
  }

  openReviewAdjustmentModal(adj: BillingAdjustment): void {
    this.selectedAdjustmentForReview.set(adj);
    this.reviewAdjustmentNotes = '';
  }

  submitReviewAdjustment(decision: 'Approved' | 'Rejected'): void {
    const adj = this.selectedAdjustmentForReview();
    if (!adj) return;

    this.isProcessing.set(true);
    this.financeService.reviewAdjustment(adj.id, {
      status: decision,
      notes: this.reviewAdjustmentNotes
    }).subscribe({
      next: () => {
        this.toast.success(`Adjustment ${adj.adjustmentNumber} ${decision.toLowerCase()}`);
        this.isProcessing.set(false);
        this.selectedAdjustmentForReview.set(null);
        this.loadAdjustments();
        this.billingStore.loadInvoices();
        this.loadFinanceMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Failed to review adjustment');
        this.isProcessing.set(false);
      }
    });
  }

  // Expenses Operations
  submitExpense(): void {
    if (this.newExpenseForm.invalid) {
      this.newExpenseForm.markAllAsTouched();
      return;
    }
    this.isProcessing.set(true);
    const val = this.newExpenseForm.value;
    this.financeService.createExpense({
      category: val.category!,
      vendorName: val.vendorName!,
      invoiceReference: val.invoiceReference!,
      description: val.description!,
      amount: Number(val.amount),
      taxAmount: Number(val.taxAmount || 0),
      dueDate: val.dueDate!,
      paymentMethod: val.paymentMethod!,
      notes: val.notes || undefined
    }).subscribe({
      next: () => {
        this.toast.success('Supplier invoice recorded in AP ledger');
        this.isProcessing.set(false);
        this.showNewExpenseModal.set(false);
        this.newExpenseForm.reset({ category: 'PharmaceuticalSupplier', paymentMethod: 'BankTransfer' });
        this.loadExpenses();
        this.loadFinanceMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Failed to record expense');
        this.isProcessing.set(false);
      }
    });
  }

  openSettleExpenseModal(exp: ExpenseTransaction): void {
    this.selectedExpenseForSettle.set(exp);
    this.settlePaymentMethod = exp.paymentMethod || 'BankTransfer';
    this.settlePaymentRef = `PAY-VND-${Date.now().toString().slice(-6)}`;
    this.settlePaymentNotes = '';
  }

  submitSettleExpense(): void {
    const exp = this.selectedExpenseForSettle();
    if (!exp) return;

    this.isProcessing.set(true);
    this.financeService.settleExpense(exp.id, {
      paymentMethod: this.settlePaymentMethod,
      paymentReference: this.settlePaymentRef,
      notes: this.settlePaymentNotes
    }).subscribe({
      next: () => {
        this.toast.success(`Expense ${exp.expenseNumber} settled and marked Paid`);
        this.isProcessing.set(false);
        this.selectedExpenseForSettle.set(null);
        this.loadExpenses();
        this.loadFinanceMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Failed to settle expense');
        this.isProcessing.set(false);
      }
    });
  }

  // Petty Cash Operations
  submitPettyCash(): void {
    if (this.newPettyCashForm.invalid) {
      this.newPettyCashForm.markAllAsTouched();
      return;
    }
    this.isProcessing.set(true);
    const val = this.newPettyCashForm.value;
    this.financeService.createPettyCashVoucher({
      type: val.type!,
      amount: Number(val.amount),
      category: val.category!,
      payee: val.payee!,
      description: val.description!,
      receiptRef: val.receiptRef || undefined
    }).subscribe({
      next: () => {
        this.toast.success('Petty cash transaction recorded');
        this.isProcessing.set(false);
        this.showNewPettyCashModal.set(false);
        this.newPettyCashForm.reset({ type: 'Disbursement', category: 'OfficeSupplies', amount: 25 });
        this.loadPettyCash();
        this.loadFinanceMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Failed to record petty cash voucher');
        this.isProcessing.set(false);
      }
    });
  }

  // Payroll Operations
  submitGeneratePayroll(): void {
    this.isProcessing.set(true);
    this.financeService.generatePayroll({
      periodMonth: Number(this.payrollMonthInput),
      periodYear: Number(this.payrollYearInput)
    }).subscribe({
      next: (records) => {
        this.toast.success(`Generated payroll batch for ${records.length} staff members with doctor commissions`);
        this.isProcessing.set(false);
        this.showGeneratePayrollModal.set(false);
        this.loadPayroll();
        this.loadFinanceMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Payroll batch generation failed');
        this.isProcessing.set(false);
      }
    });
  }

  openDisbursePayrollModal(record: PayrollRecord): void {
    this.selectedPayrollForDisburse.set(record);
    this.disbursePaymentRef = `ACH-PR-${record.periodYear}${record.periodMonth.toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
  }

  submitDisbursePayroll(): void {
    const record = this.selectedPayrollForDisburse();
    if (!record) return;

    this.isProcessing.set(true);
    this.financeService.disbursePayroll(record.id, {
      paymentReference: this.disbursePaymentRef
    }).subscribe({
      next: () => {
        this.toast.success(`Salary disbursed to ${record.staffName} (${record.payrollNumber})`);
        this.isProcessing.set(false);
        this.selectedPayrollForDisburse.set(null);
        this.loadPayroll();
        this.loadFinanceMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Failed to disburse salary');
        this.isProcessing.set(false);
      }
    });
  }

  // Receptionist Drawer Reconciliation Audit
  openAuditDrawerModal(recon: DailyCashReconciliationResponse): void {
    this.selectedReconciliationForAudit.set(recon);
    this.auditStatusInput = recon.discrepancyAmount === 0 ? 'VerifiedBalanced' : 'DiscrepancyApproved';
    this.auditNotesInput = recon.auditNotes || '';
  }

  submitAuditDrawer(): void {
    const recon = this.selectedReconciliationForAudit();
    if (!recon) return;

    this.isProcessing.set(true);
    this.financeService.auditDailyReconciliation(recon.id, {
      auditStatus: this.auditStatusInput,
      auditNotes: this.auditNotesInput
    }).subscribe({
      next: () => {
        this.toast.success(`Shift drawer closing report for ${recon.receptionistName} marked ${this.auditStatusInput}`);
        this.isProcessing.set(false);
        this.selectedReconciliationForAudit.set(null);
        this.loadReconciliations();
        this.loadFinanceMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Failed to audit cash reconciliation');
        this.isProcessing.set(false);
      }
    });
  }
}
