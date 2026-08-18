import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  getDashboardSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`);
  }

  getDailyRevenue(date: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/daily-revenue?date=${date}`);
  }

  getTopMedicines(count = 5): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/top-medicines?count=${count}`);
  }

  exportPatients(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/patients`, { responseType: 'blob' });
  }

  exportInvoices(startDate?: string, endDate?: string): Observable<Blob> {
    let url = `${this.apiUrl}/export/invoices`;
    if (startDate) url += `?startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return this.http.get(url, { responseType: 'blob' });
  }
}
