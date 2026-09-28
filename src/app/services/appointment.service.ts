import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Appointment, CreateAppointmentRequest, UpdateAppointmentTriageRequest, UpdateAppointmentStatusRequest } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  getAll(page = 1, pageSize = 50, patientId?: string, status?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (patientId) params = params.set('patientId', patientId);
    if (status) params = params.set('status', status);

    return this.http.get<any>(this.apiUrl, { params });
  }

  getPatientAppointments(patientId: string): Observable<any> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.get<any>(this.apiUrl, { params });
  }

  create(request: CreateAppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, request);
  }

  getById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/${id}`);
  }

  getMyAppointments(date?: string, patientId?: string): Observable<Appointment[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (patientId) params = params.set('patientId', patientId);
    return this.http.get<Appointment[]>(`${this.apiUrl}/my-appointments`, { params });
  }

  getByDoctor(doctorId: string, date?: string): Observable<Appointment[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<Appointment[]>(`${this.apiUrl}/doctor/${doctorId}`, { params });
  }

  approveAppointment(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/approve`, {});
  }

  checkIn(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/checkin`, {});
  }

  checkInWithDetails(id: string, tokenNumber?: string, visitType?: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/checkin`, { tokenNumber, visitType });
  }

  reschedule(id: string, newScheduledDateTime: string, reason?: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/reschedule`, { newScheduledDateTime, reason });
  }

  markNoShow(id: string, notes?: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/no-show`, { notes: notes || null });
  }

  cancel(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/cancel`, {});
  }

  updateTriage(id: string, request: UpdateAppointmentTriageRequest): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/triage`, request);
  }

  updateStatus(id: string, request: UpdateAppointmentStatusRequest): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/status`, request);
  }
}
