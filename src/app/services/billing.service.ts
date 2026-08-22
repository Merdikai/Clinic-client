import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Invoice, CreateInvoiceRequest, PaymentRequest } from '../models/billing.model';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/billing`;

  getInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices`);
  }

  getInvoice(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/invoices/${id}`);
  }

  getInvoicesByPatient(patientId: string): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices/patient/${patientId}`);
  }

  createInvoice(request: CreateInvoiceRequest): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/invoices`, request);
  }

  processPayment(request: PaymentRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payments`, request);
  }

  downloadPdf(invoiceId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/invoices/${invoiceId}/pdf`, {
      responseType: 'blob'
    });
  }
}
