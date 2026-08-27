import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  LabOrder,
  LabTestTemplate,
  CreateLabOrderRequest,
  RecordLabResultRequest,
  LabResult,
  LabMetrics
} from '../models/lab.model';

@Injectable({
  providedIn: 'root'
})
export class LabService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  getTemplates(category?: string): Observable<LabTestTemplate[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<LabTestTemplate[]>(`${this.apiUrl}/lab-tests`, { params });
  }

  getOrders(page = 1, pageSize = 10, search = '', status = '', priority = '', patientId = ''): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('search', search);
    if (status && status !== 'ALL') params = params.set('status', status);
    if (priority && priority !== 'ALL') params = params.set('priority', priority);
    if (patientId) params = params.set('patientId', patientId);

    return this.http.get<any>(`${this.apiUrl}/lab-orders`, { params });
  }

  getOrdersByPatient(patientId: string): Observable<LabOrder[]> {
    return this.http.get<LabOrder[]>(`${this.apiUrl}/lab-orders/patient/${patientId}`);
  }

  getMetrics(): Observable<LabMetrics> {
    return this.http.get<LabMetrics>(`${this.apiUrl}/lab-orders/metrics`);
  }

  createOrder(request: CreateLabOrderRequest): Observable<LabOrder> {
    return this.http.post<LabOrder>(`${this.apiUrl}/lab-orders`, request);
  }

  updateOrderStatus(orderId: string, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/lab-orders/${orderId}/status`, JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  recordResult(request: RecordLabResultRequest): Observable<LabResult> {
    return this.http.post<LabResult>(`${this.apiUrl}/lab-orders/results`, request);
  }
}
