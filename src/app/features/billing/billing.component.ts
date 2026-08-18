import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BillingStore } from '../../store/billing.store';
import { LiveSyncService } from '../../services/live-sync.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent implements OnInit {
  private billingStore = inject(BillingStore);
  private liveSyncService = inject(LiveSyncService);

  invoices = this.billingStore.invoices;
  totalRevenue = this.billingStore.totalRevenue;
  outstandingBalance = this.billingStore.outstandingBalance;
  displayedColumns = ['invoiceNumber', 'patient', 'date', 'status', 'total', 'balance', 'actions'];

  constructor() {
    this.liveSyncService.invoicePaid$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.billingStore.loadInvoices();
    });
  }

  ngOnInit() {
    this.billingStore.loadInvoices();
  }

  downloadPdf(invoiceId: string) {
    this.billingStore.downloadInvoicePdf(invoiceId);
  }
}
