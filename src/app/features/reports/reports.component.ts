import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReportService } from '../../services/report.service';
import { ReceptionService } from '../../services/reception.service';
import { FinanceService } from '../../services/finance.service';
import { DailyCashReconciliation, VisitorInquiry } from '../../models/reception.model';
import { FinanceDashboardMetrics } from '../../models/finance.model';
import { ToastService } from '../../ui/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent, StatusTone } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  private reportService = inject(ReportService);
  private receptionService = inject(ReceptionService);
  private financeService = inject(FinanceService);
  private toast = inject(ToastService);

  summary = signal<any>(null);
  dailyRevenue = signal<any>(null);
  financeMetrics = signal<FinanceDashboardMetrics | null>(null);
  topMedicines = signal<any[]>([]);
  doctorAppointments = signal<any[]>([]);
  reconciliations = signal<DailyCashReconciliation[]>([]);
  inquiries = signal<VisitorInquiry[]>([]);

  isLoading = signal(true);
  metricsLoading = signal(true);
  dailyRevenueLoading = signal(true);
  doctorsLoading = signal(true);
  reconciliationsLoading = signal(true);
  inquiriesLoading = signal(true);

  selectedDate = new Date();

  // Timeframe Export Modal State
  showExportModal = signal(false);
  exportTarget = signal<'patients' | 'invoices'>('invoices');
  selectedTimeframe = signal<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('monthly');
  customDate = signal<Date>(new Date());
  customMonth = signal<number>(new Date().getMonth() + 1);
  customYear = signal<number>(new Date().getFullYear());
  isExporting = signal(false);

  months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  years = [2024, 2025, 2026, 2027];

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showExportModal() && !this.isExporting()) {
      this.closeExportModal();
    }
  }

  ngOnInit(): void {
    this.loadAllReports();
  }

  loadAllReports(): void {
    this.isLoading.set(true);
    this.metricsLoading.set(true);
    this.doctorsLoading.set(true);
    this.reconciliationsLoading.set(true);
    this.inquiriesLoading.set(true);

    this.reportService.getDashboardSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.financeService.getMetrics().subscribe({
      next: (m) => {
        this.financeMetrics.set(m);
        this.metricsLoading.set(false);
      },
      error: () => {
        this.metricsLoading.set(false);
      }
    });

    this.loadRevenueForDate(this.selectedDate);

    this.reportService.getTopMedicines(5).subscribe({
      next: (meds) => this.topMedicines.set(meds || []),
      error: () => this.topMedicines.set([])
    });

    this.reportService.getDoctorAppointments().subscribe({
      next: (docs) => {
        this.doctorAppointments.set(docs || []);
        this.doctorsLoading.set(false);
      },
      error: () => {
        this.doctorAppointments.set([]);
        this.doctorsLoading.set(false);
      }
    });

    this.receptionService.getReconciliations(50).subscribe({
      next: (items) => {
        this.reconciliations.set(items || []);
        this.reconciliationsLoading.set(false);
      },
      error: () => {
        this.reconciliations.set([]);
        this.reconciliationsLoading.set(false);
      }
    });

    this.receptionService.getInquiries().subscribe({
      next: (items) => {
        this.inquiries.set(items || []);
        this.inquiriesLoading.set(false);
      },
      error: () => {
        this.inquiries.set([]);
        this.inquiriesLoading.set(false);
      }
    });
  }

  onDateChange(newDate: Date): void {
    if (newDate) {
      this.selectedDate = newDate;
      this.loadRevenueForDate(newDate);
    }
  }

  loadRevenueForDate(date: Date): void {
    this.dailyRevenueLoading.set(true);
    const iso = date.toISOString();
    this.reportService.getRevenueReport(iso).subscribe({
      next: (rev) => {
        this.dailyRevenue.set(rev);
        this.dailyRevenueLoading.set(false);
      },
      error: () => {
        this.dailyRevenue.set(null);
        this.dailyRevenueLoading.set(false);
      }
    });
  }

  openExportModal(target: 'patients' | 'invoices'): void {
    this.exportTarget.set(target);
    this.showExportModal.set(true);
  }

  closeExportModal(): void {
    this.showExportModal.set(false);
  }

  setTimeframe(tf: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'): void {
    this.selectedTimeframe.set(tf);
  }

  getDepartmentKey(department: string): string {
    return (department || '').trim().toLowerCase();
  }

  getVarianceTone(amount: number): StatusTone {
    if (amount === 0) return 'success';
    return amount < 0 ? 'danger' : 'info';
  }

  getVarianceLabel(amount: number): string {
    if (amount === 0) return 'Exact $0.00';
    const formatted = Math.abs(amount).toFixed(2);
    return amount < 0 ? `-$${formatted} Short` : `+$${formatted} Over`;
  }

  getAuditStatusTone(status?: string): StatusTone {
    const normalized = (status || '').trim().toLowerCase();
    if (normalized === 'verifiedbalanced' || normalized === 'balanced') return 'success';
    if (normalized === 'discrepancyapproved') return 'warning';
    if (normalized === 'disputed') return 'danger';
    return 'neutral';
  }

  getTicketStatusTone(status?: string): StatusTone {
    const normalized = (status || '').trim().toLowerCase();
    if (normalized === 'resolved') return 'success';
    if (normalized === 'inprogress') return 'warning';
    return 'info';
  }

  executeExport(): void {
    this.isExporting.set(true);
    const target = this.exportTarget();
    const tf = this.selectedTimeframe();
    let startDate: string | undefined;
    let endDate: string | undefined;
    let fileLabel: string = tf;

    const now = new Date();

    if (tf === 'daily') {
      const d = this.customDate();
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      startDate = start.toISOString();
      endDate = end.toISOString();
      fileLabel = `daily-${d.toISOString().slice(0, 10)}`;
    } else if (tf === 'weekly') {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      startDate = start.toISOString();
      endDate = end.toISOString();
      fileLabel = `weekly-${now.toISOString().slice(0, 10)}`;
    } else if (tf === 'monthly') {
      const m = this.customMonth();
      const y = this.customYear();
      const start = new Date(y, m - 1, 1, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59);
      startDate = start.toISOString();
      endDate = end.toISOString();
      fileLabel = `monthly-${y}-${String(m).padStart(2, '0')}`;
    } else if (tf === 'yearly') {
      const y = this.customYear();
      const start = new Date(y, 0, 1, 0, 0, 0);
      const end = new Date(y, 11, 31, 23, 59, 59);
      startDate = start.toISOString();
      endDate = end.toISOString();
      fileLabel = `yearly-${y}`;
    } else {
      fileLabel = `all-records-${now.toISOString().slice(0, 10)}`;
    }

    const obs$ = target === 'patients'
      ? this.reportService.exportPatientsCsv(startDate, endDate, tf)
      : this.reportService.exportInvoicesCsv(startDate, endDate, tf);

    const docName = target === 'patients' ? 'Patients' : 'Invoices_Ledger';
    this.toast.info(`Preparing ${docName} (${tf}) Excel export...`);

    obs$.subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.closeExportModal();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MedFlow_${docName}_${fileLabel}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success(`${docName} Excel spreadsheet downloaded successfully!`);
      },
      error: () => {
        this.isExporting.set(false);
        this.toast.error(`Failed to export ${docName}`);
      }
    });
  }
}
