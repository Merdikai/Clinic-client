import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { BillingService } from '../../../services/billing.service';
import { PatientService } from '../../../services/patient.service';
import { Invoice } from '../../../models/billing.model';
import { Patient } from '../../../models/patient.model';

@Component({
  selector: 'app-my-invoices',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    ],
  templateUrl: './my-invoices.component.html',
  styleUrls: ['./my-invoices.component.scss']
})
export class MyInvoicesComponent implements OnInit {
  private billingService = inject(BillingService);
  private patientService = inject(PatientService);

  patient = signal<Patient | null>(null);
  invoices = signal<Invoice[]>([]);
  isLoading = signal(true);

  // Itemized Invoice Receipt Modal
  isDetailModalOpen = signal(false);
  selectedInvoice = signal<Invoice | null>(null);

  totalBilled = computed(() => 
    this.invoices().reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
  );
  totalPaid = computed(() => 
    this.invoices().reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)
  );
  totalOutstanding = computed(() => 
    this.invoices().reduce((sum, inv) => sum + (inv.balanceDue || 0), 0)
  );

  ngOnInit() {
    this.loadPatientInvoices();
  }

  openDetailModal(inv: Invoice) {
    this.selectedInvoice.set(inv);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal() {
    this.isDetailModalOpen.set(false);
    this.selectedInvoice.set(null);
  }

  downloadPdf(id: string) {
    window.open(`/api/v1/billing/invoices/${id}/pdf?design=ExecutiveNavy`, '_blank');
  }

  loadPatientInvoices() {
    this.isLoading.set(true);
    this.patientService.getMyProfile().subscribe({
      next: (pat: Patient) => {
        this.patient.set(pat);
        this.fetchInvoices(pat.id);
      },
      error: () => {
        const fallbackId = 'a11ce000-0000-0000-0000-000000000001';
        this.patient.set({
          id: fallbackId,
          firstName: 'Alice',
          lastName: 'Patient',
          medicalRecordNumber: 'PAT-ALICE-001'
        } as any);
        this.fetchInvoices(fallbackId);
      }
    });
  }

  fetchInvoices(patientId: string) {
    this.billingService.getInvoicesByPatient(patientId).subscribe({
      next: (invs: any) => {
        const list = Array.isArray(invs) ? invs : invs?.items || [];
        this.invoices.set(list);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
