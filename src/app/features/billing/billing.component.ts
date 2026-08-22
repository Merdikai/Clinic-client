import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BillingStore } from '../../store/billing.store';
import { LiveSyncService } from '../../services/live-sync.service';
import { PatientService } from '../../services/patient.service';
import { ToastService } from '../../ui/toast/toast.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent implements OnInit {
  private fb = inject(FormBuilder);
  public billingStore = inject(BillingStore);
  private liveSyncService = inject(LiveSyncService);
  private patientService = inject(PatientService);
  private toast = inject(ToastService);

  invoices = this.billingStore.invoices;
  totalRevenue = this.billingStore.totalRevenue;
  outstandingBalance = this.billingStore.outstandingBalance;
  displayedColumns = ['invoiceNumber', 'patient', 'date', 'status', 'total', 'balance', 'actions'];

  patients = signal<any[]>([]);
  showNewInvoiceModal = signal(false);
  selectedInvoiceForPay = signal<any | null>(null);
  paymentAmountInput = 0;
  paymentMethodInput = 'Cash';
  isProcessing = signal(false);

  servicePresets = [
    { label: 'General Consultation ($50.00)', desc: 'General Medical Consultation', price: 50 },
    { label: 'Comprehensive Diagnostic Lab ($120.00)', desc: 'Diagnostic Laboratory Screening', price: 120 },
    { label: 'Specialist Follow-up ($85.00)', desc: 'Physician Specialist Follow-up Consultation', price: 85 },
    { label: 'Prescription & Pharmacy Dispense ($45.00)', desc: 'Prescription Medications & Dispensing', price: 45 },
    { label: 'Custom Service / Procedure', desc: '', price: 100 }
  ];

  invoiceForm = this.fb.group({
    patientId: ['', Validators.required],
    amount: [50.0, [Validators.required, Validators.min(1)]],
    description: ['General Medical Consultation', Validators.required]
  });

  constructor() {
    this.liveSyncService.invoicePaid$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.billingStore.loadInvoices();
    });
  }

  ngOnInit() {
    this.billingStore.loadInvoices();
    this.loadPatients();
  }

  loadPatients() {
    this.patientService.getAll(1, 100).subscribe({
      next: (res: any) => {
        const list = res.items || (Array.isArray(res) ? res : []);
        this.patients.set(list);
      },
      error: () => this.patients.set([])
    });
  }

  applyPreset(preset: any) {
    if (preset.desc) {
      this.invoiceForm.patchValue({
        description: preset.desc,
        amount: preset.price
      });
    }
  }

  openPaymentDialog(invoice: any) {
    this.selectedInvoiceForPay.set(invoice);
    this.paymentAmountInput = invoice.balanceDue;
  }

  submitPayment() {
    const inv = this.selectedInvoiceForPay();
    if (!inv) return;

    this.isProcessing.set(true);
    this.billingStore.processPayment(
      inv.id,
      this.paymentAmountInput,
      this.paymentMethodInput
    );
    this.isProcessing.set(false);
    this.selectedInvoiceForPay.set(null);
  }

  submitInvoice() {
    if (this.invoiceForm.invalid) return;
    this.isProcessing.set(true);

    const val = this.invoiceForm.value;
    this.billingStore.createInvoice({
      patientId: val.patientId!,
      items: [
        { description: val.description!, quantity: 1, unitPrice: Number(val.amount!) }
      ]
    });

    this.isProcessing.set(false);
    this.showNewInvoiceModal.set(false);
    this.invoiceForm.reset({ amount: 50, description: 'General Medical Consultation' });
  }

  downloadPdf(invoiceId: string) {
    this.billingStore.downloadInvoicePdf(invoiceId);
  }
}
