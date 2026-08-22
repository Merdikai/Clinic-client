import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReportService } from '../../services/report.service';
import { ToastService } from '../../ui/toast/toast.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  private reportService = inject(ReportService);
  private toast = inject(ToastService);

  summary = signal<any>(null);
  dailyRevenue = signal<any>(null);
  topMedicines = signal<any[]>([]);
  doctorAppointments = signal<any[]>([]);
  isLoading = signal(true);
  selectedDate = new Date();

  ngOnInit() {
    this.loadAllReports();
  }

  loadAllReports() {
    this.isLoading.set(true);

    this.reportService.getDashboardSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.loadRevenueForDate(this.selectedDate);

    this.reportService.getTopMedicines(5).subscribe({
      next: (meds) => this.topMedicines.set(meds || []),
      error: () => this.topMedicines.set([])
    });

    this.reportService.getDoctorAppointments().subscribe({
      next: (docs) => this.doctorAppointments.set(docs || []),
      error: () => this.doctorAppointments.set([])
    });
  }

  onDateChange(newDate: Date) {
    if (newDate) {
      this.selectedDate = newDate;
      this.loadRevenueForDate(newDate);
    }
  }

  loadRevenueForDate(date: Date) {
    const iso = date.toISOString();
    this.reportService.getRevenueReport(iso).subscribe({
      next: (rev) => this.dailyRevenue.set(rev),
      error: () => this.dailyRevenue.set(null)
    });
  }

  exportPatientsCsv() {
    this.toast.info('Generating Patients CSV export...');
    this.reportService.exportPatientsCsv().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patients-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Patients CSV downloaded successfully');
      },
      error: () => this.toast.error('Failed to export patients CSV')
    });
  }

  exportInvoicesCsv() {
    this.toast.info('Generating Financial Invoices CSV export...');
    this.reportService.exportInvoicesCsv().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Invoices CSV downloaded successfully');
      },
      error: () => this.toast.error('Failed to export invoices CSV')
    });
  }
}
