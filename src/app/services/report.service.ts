import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardSummary } from './dashboard.service';

export interface DailyRevenueReport {
  readonly date: string;
  readonly totalRevenue: number;
  readonly totalAppointments: number;
  readonly totalPatients: number;
}

export interface TopMedicineReport {
  readonly medicineId?: string;
  readonly medicineName: string;
  readonly totalQuantityDispensed: number;
  readonly totalRevenue?: number;
}

export interface DoctorAppointmentCount {
  readonly doctorId: string;
  readonly doctorName: string;
  readonly appointmentCount: number;
  readonly completedCount?: number;
}

export interface AsyncReportAcceptedResponse {
  readonly jobId: string;
  readonly status: string;
  readonly message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reports`;

  getRevenueReport(startDate?: string): Observable<DailyRevenueReport> {
    let params = new HttpParams();
    if (startDate) params = params.set('date', startDate);
    return this.http.get<DailyRevenueReport>(`${this.apiUrl}/daily-revenue`, { params });
  }

  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard`);
  }

  getTopMedicines(count = 5): Observable<TopMedicineReport[]> {
    return this.http.get<TopMedicineReport[]>(`${this.apiUrl}/top-medicines?count=${count}`);
  }

  getDoctorAppointments(startDate?: string, endDate?: string): Observable<DoctorAppointmentCount[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<DoctorAppointmentCount[]>(`${this.apiUrl}/doctor-appointments`, { params });
  }

  exportPatientsCsv(startDate?: string, endDate?: string, timeframe?: string): Observable<Blob> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (timeframe) params = params.set('timeframe', timeframe);
    return this.http.get(`${this.apiUrl}/export/patients`, { params, responseType: 'blob' });
  }

  exportInvoicesCsv(startDate?: string, endDate?: string, timeframe?: string): Observable<Blob> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (timeframe) params = params.set('timeframe', timeframe);
    return this.http.get(`${this.apiUrl}/export/invoices`, { params, responseType: 'blob' });
  }

  enqueueAsyncSummary(reportType = 'executive-summary'): Observable<AsyncReportAcceptedResponse> {
    return this.http.post<AsyncReportAcceptedResponse>(`${this.apiUrl}/async-summary`, { reportType });
  }

  downloadAsyncArtifact(jobId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/download/${encodeURIComponent(jobId)}`, {
      observe: 'response',
      responseType: 'blob'
    });
  }
}
