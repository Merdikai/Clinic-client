import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CreatePatientRequest, PagedResponse, Patient } from '../models/patient.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/patients`;

  getAll(page = 1, pageSize = 10, search?: string, sortBy?: string, descending = false) {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('search', search);
    if (sortBy) params = params.set('sortBy', sortBy);
    params = params.set('descending', descending.toString());

    return this.http.get<PagedResponse<Patient>>(this.apiUrl, { params });
  }

  getById(id: string) {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  create(request: CreatePatientRequest) {
    return this.http.post<Patient>(this.apiUrl, request);
  }

  getAppointments(patientId: string) {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/appointments`);
  }

  getMedicalHistory(patientId: string) {
    return this.http.get<any>(`${this.apiUrl}/${patientId}/medical-history`);
  }
}
