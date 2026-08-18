import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Appointment, CreateAppointmentRequest } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  getAll(page = 1, pageSize = 10) {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<any>(this.apiUrl, { params });
  }

  create(request: CreateAppointmentRequest) {
    return this.http.post<Appointment>(this.apiUrl, request);
  }

  getById(id: string) {
    return this.http.get<Appointment>(`${this.apiUrl}/${id}`);
  }

  getByDoctor(doctorId: string, date?: string) {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<Appointment[]>(`${this.apiUrl}/doctor/${doctorId}`, { params });
  }

  checkIn(id: string) {
    return this.http.patch(`${this.apiUrl}/${id}/checkin`, {});
  }

  cancel(id: string) {
    return this.http.patch(`${this.apiUrl}/${id}/cancel`, {});
  }
}
