import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Invoice } from '../models/billing.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/billing`;

  getUnpaidInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices/unpaid`);
  }

  getInvoice(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/invoices/${id}`);
  }

  createInvoice(request: any): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/invoices`, request);
  }

  processPayment(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/payments`, request);
  }

  downloadPdf(invoiceId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/invoices/${invoiceId}/pdf`, {
      responseType: 'blob'
    });
  }
}
