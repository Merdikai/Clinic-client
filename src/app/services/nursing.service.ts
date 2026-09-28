import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  NursingProcedure,
  CreateNursingProcedureRequest,
  OrderNursingProcedureRequest,
  CompleteNursingProcedureRequest,
  ShiftHandover,
  CreateShiftHandoverRequest
} from '../models/nursing.model';

@Injectable({ providedIn: 'root' })
export class NursingService {
  private http = inject(HttpClient);
  private proceduresUrl = `${environment.apiUrl}/nursing-procedures`;
  private handoversUrl = `${environment.apiUrl}/shift-handovers`;

  // Procedures
  getProcedures(patientId?: string, appointmentId?: string, date?: string, status?: string): Observable<NursingProcedure[]> {
    let params = new HttpParams();
    if (patientId) params = params.set('patientId', patientId);
    if (appointmentId) params = params.set('appointmentId', appointmentId);
    if (date) params = params.set('date', date);
    if (status && status !== 'ALL') params = params.set('status', status);
    return this.http.get<NursingProcedure[]>(this.proceduresUrl, { params });
  }

  getProcedureById(id: string): Observable<NursingProcedure> {
    return this.http.get<NursingProcedure>(`${this.proceduresUrl}/${id}`);
  }

  createProcedure(request: CreateNursingProcedureRequest): Observable<NursingProcedure> {
    return this.http.post<NursingProcedure>(this.proceduresUrl, request);
  }

  orderProcedure(request: OrderNursingProcedureRequest): Observable<NursingProcedure> {
    return this.http.post<NursingProcedure>(`${this.proceduresUrl}/orders`, request);
  }

  completeProcedure(id: string, request: CompleteNursingProcedureRequest): Observable<NursingProcedure> {
    return this.http.post<NursingProcedure>(`${this.proceduresUrl}/${id}/complete`, request);
  }

  // Shift Handovers
  getShiftHandovers(date?: string, shiftType?: string): Observable<ShiftHandover[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (shiftType) params = params.set('shiftType', shiftType);
    return this.http.get<ShiftHandover[]>(this.handoversUrl, { params });
  }

  getLatestHandover(): Observable<ShiftHandover | null> {
    return this.http.get<ShiftHandover | null>(`${this.handoversUrl}/latest`);
  }

  createShiftHandover(request: CreateShiftHandoverRequest): Observable<ShiftHandover> {
    return this.http.post<ShiftHandover>(this.handoversUrl, request);
  }
}
