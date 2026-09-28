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
  LabMetrics,
  SpecimenIntakeRequest,
  SpecimenRejectRequest,
  LabReagent,
  CreateLabReagentRequest,
  UpdateReagentStockRequest,
  LabStockRequisition,
  CreateLabRequisitionRequest,
  ReviewLabRequisitionRequest,
  LabEquipmentLog,
  CreateLabEquipmentLogRequest,
  CreateLabTestTemplateRequest,
  UpdateLabTestTemplateRequest
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

  createTemplate(request: CreateLabTestTemplateRequest): Observable<LabTestTemplate> {
    return this.http.post<LabTestTemplate>(`${this.apiUrl}/lab-tests`, request);
  }

  updateTemplate(id: string, request: UpdateLabTestTemplateRequest): Observable<LabTestTemplate> {
    return this.http.put<LabTestTemplate>(`${this.apiUrl}/lab-tests/${id}`, request);
  }

  deleteTemplate(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/lab-tests/${id}`);
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

  specimenIntake(orderId: string, request: SpecimenIntakeRequest): Observable<LabOrder> {
    return this.http.post<LabOrder>(`${this.apiUrl}/lab-orders/${orderId}/specimen-intake`, request);
  }

  specimenReject(orderId: string, request: SpecimenRejectRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/lab-orders/${orderId}/specimen-reject`, request);
  }

  recordResult(request: RecordLabResultRequest): Observable<LabResult> {
    return this.http.post<LabResult>(`${this.apiUrl}/lab-orders/results`, request);
  }

  verifyResult(orderItemId: string): Observable<LabResult> {
    return this.http.post<LabResult>(`${this.apiUrl}/lab-orders/items/${orderItemId}/verify`, {});
  }

  // Inventory & Reagents
  getReagents(category?: string, status?: string, lowStockOnly = false): Observable<LabReagent[]> {
    let params = new HttpParams();
    if (category && category !== 'ALL') params = params.set('category', category);
    if (status && status !== 'ALL') params = params.set('status', status);
    if (lowStockOnly) params = params.set('lowStockOnly', 'true');
    return this.http.get<LabReagent[]>(`${this.apiUrl}/lab-inventory/reagents`, { params });
  }

  createReagent(request: CreateLabReagentRequest): Observable<LabReagent> {
    return this.http.post<LabReagent>(`${this.apiUrl}/lab-inventory/reagents`, request);
  }

  adjustReagentStock(id: string, request: UpdateReagentStockRequest): Observable<LabReagent> {
    return this.http.post<LabReagent>(`${this.apiUrl}/lab-inventory/reagents/${id}/adjust`, request);
  }

  // Requisitions
  getRequisitions(status?: string, urgency?: string): Observable<LabStockRequisition[]> {
    let params = new HttpParams();
    if (status && status !== 'ALL') params = params.set('status', status);
    if (urgency && urgency !== 'ALL') params = params.set('urgency', urgency);
    return this.http.get<LabStockRequisition[]>(`${this.apiUrl}/lab-inventory/requisitions`, { params });
  }

  createRequisition(request: CreateLabRequisitionRequest): Observable<LabStockRequisition> {
    return this.http.post<LabStockRequisition>(`${this.apiUrl}/lab-inventory/requisitions`, request);
  }

  reviewRequisition(id: string, request: ReviewLabRequisitionRequest): Observable<LabStockRequisition> {
    return this.http.put<LabStockRequisition>(`${this.apiUrl}/lab-inventory/requisitions/${id}/review`, request);
  }

  // Equipment & QC
  getEquipmentLogs(equipmentName?: string, logType?: string): Observable<LabEquipmentLog[]> {
    let params = new HttpParams();
    if (equipmentName) params = params.set('equipmentName', equipmentName);
    if (logType && logType !== 'ALL') params = params.set('logType', logType);
    return this.http.get<LabEquipmentLog[]>(`${this.apiUrl}/lab-equipment/logs`, { params });
  }

  createEquipmentLog(request: CreateLabEquipmentLogRequest): Observable<LabEquipmentLog> {
    return this.http.post<LabEquipmentLog>(`${this.apiUrl}/lab-equipment/logs`, request);
  }

  doctorSignOff(orderId: string, notes?: string): Observable<LabOrder> {
    return this.http.post<LabOrder>(`${this.apiUrl}/lab-orders/${orderId}/doctor-signoff`, { notes });
  }

  generateInvoice(orderId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/lab-orders/${orderId}/invoice`, {});
  }
}

