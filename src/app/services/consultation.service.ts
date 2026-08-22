import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Consultation, CreateConsultationRequest } from '../models/consultation.model';

@Injectable({ providedIn: 'root' })
export class ConsultationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/consultations`;

  getByAppointment(appointmentId: string) {
    return this.http.get<Consultation>(`${this.apiUrl}/appointment/${appointmentId}`);
  }

  create(request: CreateConsultationRequest) {
    return this.http.post<Consultation>(this.apiUrl, request);
  }
}
