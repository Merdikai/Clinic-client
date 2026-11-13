import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  DailyRevenueReport,
  DoctorAppointmentCount,
  ReportService,
  TopMedicineReport
} from '../../services/report.service';
import { DashboardSummary } from '../../services/dashboard.service';
import { ReceptionService } from '../../services/reception.service';
import { FinanceService } from '../../services/finance.service';
import { LiveSyncService } from '../../services/live-sync.service';
import { DailyCashReconciliation, VisitorInquiry } from '../../models/reception.model';
import { FinanceDashboardMetrics } from '../../models/finance.model';
import { extractProblemDetailsMessage } from '../../models/api.model';
import { buildTemporalTimeframeRange, toEndOfDayOrStartIso } from '../../shared/utils/temporal.util';
import { ToastService } from '../../ui/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent, StatusTone } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly reportService = inject(ReportService);
  private readonly receptionService = inject(ReceptionService);
  private readonly financeService = inject(FinanceService);
  private readonly liveSync = inject(LiveSyncService);
  private readonly toast = inject(ToastService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly dailyRevenue = signal<DailyRevenueReport | null>(null);
  readonly financeMetrics = signal<FinanceDashboardMetrics | null>(null);
  readonly topMedicines = signal<TopMedicineReport[]>([]);
  readonly doctorAppointments = signal<DoctorAppointmentCount[]>([]);
  readonly reconciliations = signal<DailyCashReconciliation[]>([]);
  readonly inquiries = signal<VisitorInquiry[]>([]);

  readonly isLoading = signal(true);
  readonly metricsLoading = signal(true);
  readonly dailyRevenueLoading = signal(true);
  readonly doctorsLoading = signal(true);
  readonly reconciliationsLoading = signal(true);
  readonly inquiriesLoading = signal(true);

  readonly asyncJobId = signal<string | null>(null);
  readonly asyncJobStatus = signal<'idle' | 'queued' | 'ready'>('idle');
  readonly isRequestingAsync = signal(false);

  selectedDate = new Date();

  readonly showExportModal = signal(false);
  readonly exportTarget = signal<'patients' | 'invoices'>('invoices');
  readonly selectedTimeframe = signal<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('monthly');
  readonly customDate = signal<Date>(new Date());
  readonly customMonth = signal<number>(new Date().getMonth() + 1);
  readonly customYear = signal<number>(new Date().getFullYear());
  readonly isExporting = signal(false);

  readonly months = [
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

  readonly years = [2024, 2025, 2026, 2027];

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showExportModal() && !this.isExporting()) {
      this.closeExportModal();
    }
  }

  ngOnInit(): void {
    this.loadAllReports();
    this.liveSync.reportReady$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (this.asyncJobId() === event.jobId || !this.asyncJobId()) {
        this.asyncJobId.set(event.jobId);
        this.asyncJobStatus.set('ready');
      }
    });
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
    const iso = toEndOfDayOrStartIso(date);
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

  requestAsyncExecutiveSummary(): void {
    this.isRequestingAsync.set(true);
    this.asyncJobStatus.set('queued');
    this.reportService.enqueueAsyncSummary('executive-summary').subscribe({
      next: (res) => {
        this.isRequestingAsync.set(false);
        this.asyncJobId.set(res.jobId);
        this.asyncJobStatus.set('queued');
        this.toast.info(`Executive snapshot job ${res.jobId.slice(0, 8)} queued in background worker.`);
      },
      error: (err: HttpErrorResponse) => {
        this.isRequestingAsync.set(false);
        this.asyncJobStatus.set('idle');
        this.toast.error(extractProblemDetailsMessage(err.error, 'Failed to queue background report job.'));
      }
    });
  }

  downloadAsyncSnapshot(): void {
    const jobId = this.asyncJobId();
    if (!jobId) return;

    this.reportService.downloadAsyncArtifact(jobId).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;
        this.asyncJobStatus.set('ready');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MedFlow_Executive_Snapshot_${jobId.slice(0, 8)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Background executive snapshot downloaded!');
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.toast.info('Report is still being compiled by background worker. Please retry in a moment.');
        } else {
          this.toast.error(extractProblemDetailsMessage(err.error, 'Could not download background report.'));
        }
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
    const range = buildTemporalTimeframeRange(tf, this.customDate(), this.customMonth(), this.customYear());

    const obs$ =
      target === 'patients'
        ? this.reportService.exportPatientsCsv(range.startDate, range.endDate, tf)
        : this.reportService.exportInvoicesCsv(range.startDate, range.endDate, tf);

    const docName = target === 'patients' ? 'Patients' : 'Invoices_Ledger';
    this.toast.info(`Preparing ${docName} (${tf}) Excel export...`);

    obs$.subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.closeExportModal();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MedFlow_${docName}_${range.fileLabel}.csv`;
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
