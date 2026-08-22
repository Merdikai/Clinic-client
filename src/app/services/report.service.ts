import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  getRevenueReport(startDate?: string, endDate?: string): Observable<any> {
    const params: any = {};
    if (startDate) params.date = startDate;
    return this.http.get<any>(`${this.apiUrl}/daily-revenue`, { params });
  }

  getDashboardSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`);
  }

  getTopMedicines(count = 5): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/top-medicines?count=${count}`);
  }

  getDoctorAppointments(startDate?: string, endDate?: string): Observable<any> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http.get<any>(`${this.apiUrl}/doctor-appointments`, { params });
  }

  exportPatientsCsv(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/patients`, { responseType: 'blob' });
  }

  exportInvoicesCsv(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/invoices`, { responseType: 'blob' });
  }
}
