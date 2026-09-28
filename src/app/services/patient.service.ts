import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreatePatientRequest, PagedResponse, Patient } from '../models/patient.model';
import { MpiLookupResult } from '../models/reception.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/patients`;

  getAll(page = 1, pageSize = 10, search?: string, sortBy?: string, descending = false): Observable<PagedResponse<Patient>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('search', search);
    if (sortBy) params = params.set('sortBy', sortBy);
    params = params.set('descending', descending.toString());

    return this.http.get<PagedResponse<Patient>>(this.apiUrl, { params });
  }

  mpiLookup(query?: string, nationalId?: string, phone?: string, firstName?: string, lastName?: string): Observable<MpiLookupResult[]> {
    let params = new HttpParams();
    if (query) params = params.set('query', query);
    if (nationalId) params = params.set('nationalId', nationalId);
    if (phone) params = params.set('phone', phone);
    if (firstName) params = params.set('firstName', firstName);
    if (lastName) params = params.set('lastName', lastName);
    return this.http.get<MpiLookupResult[]>(`${this.apiUrl}/mpi-lookup`, { params });
  }

  getById(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  getMyProfile(): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/me`);
  }

  getMyPanel(doctorId?: string): Observable<Patient[]> {
    let params = new HttpParams();
    if (doctorId) params = params.set('doctorId', doctorId);
    return this.http.get<Patient[]>(`${this.apiUrl}/my-panel`, { params });
  }

  create(request: CreatePatientRequest): Observable<Patient> {
    return this.http.post<Patient>(this.apiUrl, request);
  }

  getAppointments(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/appointments`);
  }

  getMedicalHistory(patientId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${patientId}/medical-history`);
  }

  update(id: string, request: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
