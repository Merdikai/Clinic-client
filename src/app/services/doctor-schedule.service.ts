import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { DoctorSchedule, CreateDoctorScheduleRequest } from '../models/doctor-schedule.model';

@Injectable({ providedIn: 'root' })
export class DoctorScheduleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/doctor-schedules`;

  getAll(doctorId?: string): Observable<DoctorSchedule[]> {
    const url = doctorId ? `${this.apiUrl}?doctorId=${doctorId}` : this.apiUrl;
    return this.http.get<any>(url).pipe(
      map(res => Array.isArray(res) ? res : (res?.data || res?.items || []))
    );
  }

  getByDoctor(doctorId: string): Observable<DoctorSchedule[]> {
    return this.http.get<any>(`${this.apiUrl}/doctor/${doctorId}`).pipe(
      map(res => Array.isArray(res) ? res : (res?.data || res?.items || []))
    );
  }

  getMySchedules(): Observable<DoctorSchedule[]> {
    return this.http.get<any>(`${this.apiUrl}/my-schedules`).pipe(
      map(res => Array.isArray(res) ? res : (res?.data || res?.items || []))
    );
  }

  create(request: CreateDoctorScheduleRequest): Observable<DoctorSchedule> {
    return this.http.post<any>(this.apiUrl, request).pipe(
      map(res => (res && res.data !== undefined ? res.data : res) as DoctorSchedule)
    );
  }

  toggleStatus(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
