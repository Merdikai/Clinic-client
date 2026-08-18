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
  private apiUrl = `${environment.apiUrl}/invoices`;

  getInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(this.apiUrl);
  }

  getInvoice(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/${id}`);
  }

  createInvoice(request: CreateInvoiceRequest): Observable<Invoice> {
    return this.http.post<Invoice>(this.apiUrl, request);
  }

  processPayment(request: PaymentRequest): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/${request.invoiceId}/payments`, request);
  }

  downloadPdf(invoiceId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${invoiceId}/pdf`, {
      responseType: 'blob'
    });
  }
}
