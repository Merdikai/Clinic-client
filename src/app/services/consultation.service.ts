import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Consultation, CreateConsultationRequest } from '../models/consultation.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConsultationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/consultations`;

  getByAppointment(appointmentId: string): Observable<Consultation> {
    return this.http.get<Consultation>(`${this.apiUrl}/by-appointment/${appointmentId}`);
  }

  getById(id: string): Observable<Consultation> {
    return this.http.get<Consultation>(`${this.apiUrl}/${id}`);
  }

  getAll(doctorId?: string, patientId?: string): Observable<Consultation[]> {
    let params = new HttpParams();
    if (doctorId) params = params.set('doctorId', doctorId);
    if (patientId) params = params.set('patientId', patientId);
    return this.http.get<Consultation[]>(this.apiUrl, { params });
  }

  create(request: CreateConsultationRequest): Observable<Consultation> {
    return this.http.post<Consultation>(this.apiUrl, request);
  }
}
