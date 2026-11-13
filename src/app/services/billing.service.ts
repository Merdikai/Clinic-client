import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Invoice, CreateInvoiceRequest, PaymentRequest } from '../models/billing.model';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/billing`;

  getInvoices(patientId?: string, department?: string): Observable<Invoice[]> {
    let params = new HttpParams();
    if (patientId) params = params.set('patientId', patientId);
    if (department) params = params.set('department', department);
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices`, { params });
  }

  getInvoice(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/invoices/${id}`);
  }

  getInvoicesByPatient(patientId: string): Observable<Invoice[]> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices`, { params });
  }

  createInvoice(request: CreateInvoiceRequest): Observable<Invoice> {
    const payload = {
      patientId: request.patientId,
      appointmentId: request.appointmentId || null,
      taxAmount: Number(request.taxAmount || 0),
      discountAmount: Number(request.discountAmount || 0),
      items: (request.items || []).map((i) => ({
        description: i.description || 'Medical Service',
        quantity: Number(i.quantity || 1),
        unitPrice: Number(i.unitPrice || 0)
      }))
    };
    return this.http.post<Invoice>(`${this.apiUrl}/invoices`, payload);
  }

  processPayment(request: PaymentRequest): Observable<Invoice> {
    const payload = {
      invoiceId: request.invoiceId,
      amountPaid: Number(request.amountPaid),
      paymentMethod: request.paymentMethod || 'Cash',
      transactionReference: request.transactionReference || `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    };
    return this.http.post<Invoice>(`${this.apiUrl}/payments`, payload);
  }

  downloadPdf(invoiceId: string, design: string = 'ExecutiveNavy'): Observable<Blob> {
    let params = new HttpParams();
    if (design) params = params.set('design', design);
    return this.http.get(`${this.apiUrl}/invoices/${invoiceId}/pdf`, {
      params,
      responseType: 'blob'
    });
  }
}
