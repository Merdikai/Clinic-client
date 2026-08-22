import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { DoctorSchedule, CreateDoctorScheduleRequest } from '../models/doctor-schedule.model';

@Injectable({ providedIn: 'root' })
export class DoctorScheduleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/doctor-schedules`;

  getByDoctor(doctorId: string) {
    return this.http.get<DoctorSchedule[]>(`${this.apiUrl}/doctor/${doctorId}`);
  }

  create(request: CreateDoctorScheduleRequest) {
    return this.http.post<DoctorSchedule>(this.apiUrl, request);
  }

  toggleStatus(id: string) {
    return this.http.patch<void>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
