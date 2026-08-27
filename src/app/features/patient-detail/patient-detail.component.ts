import { Component, inject, signal, computed, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { BillingService } from '../../services/billing.service';
import { Invoice } from '../../models/billing.model';
import { PatientService } from '../../services/patient.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Patient } from '../../models/patient.model';
import { FileUploadResponse } from '../../models/file-upload.model';
import { ToastService } from '../../ui/toast/toast.service';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.scss']
})
export class PatientDetailComponent implements OnInit {
  id = input.required<string>();
  private patientService = inject(PatientService);
  private fileService   = inject(FileUploadService);
  private toast         = inject(ToastService);
  private billingService = inject(BillingService);

  patient   = signal<Patient | null>(null);
  history   = signal<any>(null);
  files     = signal<FileUploadResponse[]>([]);
  isLoading   = signal(false);
  isUploading = signal(false);

  // Billing / Invoice signals
  patientInvoices      = signal<Invoice[]>([]);
  selectedInvoice      = signal<Invoice | null>(null);
  paymentAmount        = signal<number>(0);
  paymentMethod        = signal<string>('Cash');
  isPaymentModalOpen   = signal(false);
  isProcessingPayment  = signal(false);

  emergencyContactName = computed(() => {
    const raw = this.patient()?.emergencyContact || (this.patient() as any)?.emergencyContactName || '';
    if (!raw) return 'Not Provided';
    const match = raw.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    return match && match[1] ? match[1].trim() : raw;
  });

  emergencyContactPhone = computed(() => {
    const raw = this.patient()?.emergencyContact || '';
    const directPhone = (this.patient() as any)?.emergencyContactPhone;
    if (directPhone) return directPhone;
    if (!raw) return 'Not Provided';
    const match = raw.match(/\((.*?)\)/);
    return match ? match[1].trim() : 'Not Provided';
  });

  ngOnInit() {
    this.isLoading.set(true);

    // Load patient profile
    this.patientService.getById(this.id()).subscribe({
      next: (data) => {
        // Unwrap Result<T> if present
        const patient = (data as any)?.isSuccess !== undefined ? (data as any).value : data;
        this.patient.set(patient);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    // Load medical history (API returns Result<T> wrapper)
    this.patientService.getMedicalHistory(this.id()).subscribe({
      next: (h: any) => {
        // Unwrap Result<T>: { isSuccess, value: { patientId, visits: [...] } }
        const data = h && h.isSuccess !== undefined ? h.value : h;
        this.history.set(data);
      },
      error: () => {}
    });

    // Load files
    this.loadFiles();

    // Load patient invoices
    this.loadInvoices();
  }

  loadFiles() {
    this.fileService.getPatientFiles(this.id()).subscribe({
      next: (files: any) => {
        // API returns an array directly (controller calls result.Value)
        const list: FileUploadResponse[] = Array.isArray(files) ? files : [];
        this.files.set(list);
      },
      error: () => {
        // Silently fail — shows empty state
        this.files.set([]);
      }
    });
  }

  loadInvoices() {
    this.billingService.getInvoicesByPatient(this.id()).subscribe({
      next: (res: any) => {
        const list: Invoice[] = Array.isArray(res) ? res : res?.items || [];
        this.patientInvoices.set(list);
      },
      error: () => this.patientInvoices.set([])
    });
  }

  copyPrescriptionId(id: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id).then(() => {
        this.toast.success('Prescription ID copied to clipboard!');
      });
    } else {
      this.toast.success('Prescription ID: ' + id);
    }
  }

  downloadFile(file: FileUploadResponse) {
    this.toast.info('Downloading ' + (file.originalFileName || file.fileName) + '...');
    this.fileService.downloadPatientFile(this.id(), file.fileName).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.originalFileName || file.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toast.success('Download complete!');
      },
      error: () => {
        this.toast.error('Failed to download file');
      }
    });
  }

  downloadInvoicePdf(invoice: Invoice) {
    this.billingService.downloadPdf(invoice.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toast.success('Invoice PDF downloaded successfully!');
      },
      error: () => {
        this.toast.error('Failed to download invoice PDF');
      }
    });
  }

  openPaymentModal(invoice: Invoice) {
    this.selectedInvoice.set(invoice);
    this.paymentAmount.set(invoice.balanceDue || invoice.totalAmount || 0);
    this.paymentMethod.set('Cash');
    this.isPaymentModalOpen.set(true);
  }

  closePaymentModal() {
    this.isPaymentModalOpen.set(false);
    this.selectedInvoice.set(null);
  }

  submitPayment() {
    const inv = this.selectedInvoice();
    if (!inv) return;

    if (this.paymentAmount() <= 0) {
      this.toast.error('Payment amount must be greater than zero');
      return;
    }

    this.isProcessingPayment.set(true);
    this.billingService.processPayment({
      invoiceId: inv.id,
      amountPaid: Number(this.paymentAmount()),
      paymentMethod: this.paymentMethod()
    }).subscribe({
      next: () => {
        this.isProcessingPayment.set(false);
        this.isPaymentModalOpen.set(false);
        this.toast.success(`Payment of ${this.paymentAmount()} processed successfully!`);
        this.loadInvoices();
      },
      error: (err: any) => {
        this.isProcessingPayment.set(false);
        const msg = err.error?.detail || err.error?.title || 'Payment processing failed';
        this.toast.error(msg);
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploading.set(true);

    this.fileService.uploadPatientFile(this.id(), file).subscribe({
      next: (res: any) => {
        const uploaded: FileUploadResponse = (res as any)?.isSuccess !== undefined ? (res as any).value : res;
        this.files.update((list) => [uploaded, ...list]);
        this.isUploading.set(false);
        input.value = '';
        this.toast.success(`File '${file.name}' uploaded successfully!`);
      },
      error: (err: any) => {
        this.isUploading.set(false);
        input.value = '';
        const msg = err.error?.detail || err.error?.title || 'File upload failed';
        this.toast.error(msg);
      }
    });
  }
}
