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

  createInvoice(request: any): Observable<Invoice> {
    const payload = {
      patientId: request.patientId,
      appointmentId: request.appointmentId || null,
      taxAmount: Number(request.taxAmount || 0),
      discountAmount: Number(request.discountAmount || 0),
      items: (request.items || []).map((i: any) => ({
        description: i.description || 'Medical Service',
        quantity: Number(i.quantity || 1),
        unitPrice: Number(i.unitPrice || 0)
      }))
    };
    return this.http.post<Invoice>(`${this.apiUrl}/invoices`, payload);
  }

  processPayment(request: PaymentRequest): Observable<any> {
    const payload = {
      invoiceId: request.invoiceId,
      amountPaid: Number(request.amountPaid),
      paymentMethod: request.paymentMethod || 'Cash',
      transactionReference: request.transactionReference || `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    };
    return this.http.post<any>(`${this.apiUrl}/payments`, payload);
  }

  downloadPdf(invoiceId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/invoices/${invoiceId}/pdf`, {
      responseType: 'blob'
    });
  }
}
