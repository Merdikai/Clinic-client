import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { DoctorSchedule, CreateDoctorScheduleRequest } from '../models/doctor-schedule.model';

interface ScheduleEnvelope {
  readonly data?: DoctorSchedule[] | DoctorSchedule;
  readonly items?: DoctorSchedule[];
}

function extractScheduleList(res: DoctorSchedule[] | ScheduleEnvelope | null | undefined): DoctorSchedule[] {
  if (Array.isArray(res)) {
    return res;
  }
  if (res && Array.isArray(res.data)) {
    return res.data;
  }
  if (res && Array.isArray(res.items)) {
    return res.items;
  }
  return [];
}

@Injectable({ providedIn: 'root' })
export class DoctorScheduleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/doctor-schedules`;

  getAll(doctorId?: string): Observable<DoctorSchedule[]> {
    const url = doctorId ? `${this.apiUrl}?doctorId=${doctorId}` : this.apiUrl;
    return this.http.get<DoctorSchedule[] | ScheduleEnvelope>(url).pipe(
      map(extractScheduleList)
    );
  }

  getByDoctor(doctorId: string): Observable<DoctorSchedule[]> {
    return this.http.get<DoctorSchedule[] | ScheduleEnvelope>(`${this.apiUrl}/doctor/${doctorId}`).pipe(
      map(extractScheduleList)
    );
  }

  getMySchedules(): Observable<DoctorSchedule[]> {
    return this.http.get<DoctorSchedule[] | ScheduleEnvelope>(`${this.apiUrl}/my-schedules`).pipe(
      map(extractScheduleList)
    );
  }

  create(request: CreateDoctorScheduleRequest): Observable<DoctorSchedule> {
    return this.http.post<DoctorSchedule | { data: DoctorSchedule }>(this.apiUrl, request).pipe(
      map(res => ('data' in res && res.data !== undefined ? res.data : res) as DoctorSchedule)
    );
  }

  toggleStatus(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
