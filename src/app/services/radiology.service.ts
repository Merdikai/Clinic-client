import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  RadiologyOrder,
  CreateRadiologyOrderDto,
  ReportRadiologyOrderDto,
  ScheduleRadiologyOrderDto,
  AcknowledgeCriticalAlertDto,
  RadiologyMetrics,
  RadiologySafetyLog
} from '../models/radiology.model';

export interface CreateRadiologySafetyLogDto {
  readonly orderId?: string;
  readonly accessionNumber?: string;
  readonly patientName?: string;
  readonly modality?: string;
  readonly procedureName?: string;
  readonly performedByTechnicianName?: string;
  readonly radiationDoseDlp?: number;
  readonly radiationDoseDap?: number;
  readonly exposureParameters?: string;
  readonly contrastUsed?: boolean;
  readonly contrastAgentName?: string;
  readonly contrastVolumeMl?: number;
  readonly contrastLotNumber?: string;
  readonly contrastRoute?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RadiologyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/radiology`;

  getOrders(
    patientId?: string,
    doctorId?: string,
    modality?: string,
    status?: string,
    priority?: string,
    radiologistName?: string
  ): Observable<RadiologyOrder[]> {
    let params = new HttpParams();
    if (patientId) params = params.set('patientId', patientId);
    if (doctorId) params = params.set('doctorId', doctorId);
    if (modality && modality !== 'ALL') params = params.set('modality', modality);
    if (status && status !== 'ALL') params = params.set('status', status);
    if (priority && priority !== 'ALL') params = params.set('priority', priority);
    if (radiologistName) params = params.set('radiologistName', radiologistName);

    return this.http.get<RadiologyOrder[]>(`${this.apiUrl}/orders`, { params });
  }

  getOrderById(id: string): Observable<RadiologyOrder> {
    return this.http.get<RadiologyOrder>(`${this.apiUrl}/orders/${id}`);
  }

  createOrder(dto: CreateRadiologyOrderDto): Observable<RadiologyOrder> {
    return this.http.post<RadiologyOrder>(`${this.apiUrl}/orders`, dto);
  }

  scheduleOrder(id: string, dto: ScheduleRadiologyOrderDto): Observable<RadiologyOrder> {
    return this.http.patch<RadiologyOrder>(`${this.apiUrl}/orders/${id}/schedule`, dto);
  }

  reportOrder(id: string, dto: ReportRadiologyOrderDto): Observable<RadiologyOrder> {
    return this.http.post<RadiologyOrder>(`${this.apiUrl}/orders/${id}/report`, dto);
  }

  acknowledgeCriticalAlert(id: string, notesOrDto?: string | AcknowledgeCriticalAlertDto): Observable<RadiologyOrder> {
    const payload: AcknowledgeCriticalAlertDto = typeof notesOrDto === 'string'
      ? { acknowledgmentNotes: notesOrDto }
      : (notesOrDto || {});
    return this.http.patch<RadiologyOrder>(`${this.apiUrl}/orders/${id}/critical-ack`, payload);
  }

  doctorSignOff(id: string, notes?: string): Observable<RadiologyOrder> {
    return this.http.post<RadiologyOrder>(`${this.apiUrl}/orders/${id}/doctor-signoff`, { notes });
  }

  getMetrics(doctorId?: string, radiologistName?: string): Observable<RadiologyMetrics> {
    let params = new HttpParams();
    if (doctorId) params = params.set('doctorId', doctorId);
    if (radiologistName) params = params.set('radiologistName', radiologistName);
    return this.http.get<RadiologyMetrics>(`${this.apiUrl}/metrics`, { params });
  }

  getSafetyLogs(modality?: string): Observable<RadiologySafetyLog[]> {
    let params = new HttpParams();
    if (modality && modality !== 'ALL') params = params.set('modality', modality);
    return this.http.get<RadiologySafetyLog[]>(`${this.apiUrl}/safety-logs`, { params });
  }

  createSafetyLog(dto: CreateRadiologySafetyLogDto): Observable<RadiologySafetyLog> {
    return this.http.post<RadiologySafetyLog>(`${this.apiUrl}/safety-logs`, dto);
  }

  billOrder(id: string): Observable<RadiologyOrder> {
    return this.http.patch<RadiologyOrder>(`${this.apiUrl}/orders/${id}/bill`, {});
  }

  updateStatus(id: string, status: string, notes?: string): Observable<RadiologyOrder> {
    return this.http.patch<RadiologyOrder>(`${this.apiUrl}/orders/${id}/status`, { status, notes });
  }
}

