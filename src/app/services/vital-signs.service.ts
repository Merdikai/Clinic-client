import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { VitalSign, RecordVitalsRequest } from '../models/vital-signs.model';

@Injectable({ providedIn: 'root' })
export class VitalSignsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/vital-signs`;

  getByAppointment(appointmentId: string) {
    return this.http.get<VitalSign>(`${this.apiUrl}/appointment/${appointmentId}`);
  }

  record(request: RecordVitalsRequest, nurseId?: string) {
    const url = nurseId ? `${this.apiUrl}?nurseId=${nurseId}` : this.apiUrl;
    return this.http.post<VitalSign>(url, request);
  }
}
