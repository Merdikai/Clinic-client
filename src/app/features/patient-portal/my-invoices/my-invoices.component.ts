import { Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { BillingService } from '../../../services/billing.service';
import { PatientService } from '../../../services/patient.service';
import { Invoice } from '../../../models/billing.model';
import { Patient } from '../../../models/patient.model';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-my-invoices',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
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

  pageSubtitle = computed(() => {
    const mrn = this.patient()?.medicalRecordNumber || 'PAT-ALICE-001';
    return `MRN: ${mrn} · Track consultation bills, pharmacy invoices, payments made, and current balance`;
  });

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

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isDetailModalOpen()) {
      this.closeDetailModal();
    }
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
