import { Observable } from 'rxjs';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { DispenseResponse } from '../models/prescription.model';
import { Invoice } from '../models/billing.model';

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/prescriptions`;

  getAll(patientId?: string, status?: string): Observable<any[]> {
    let params = new HttpParams();
    if (patientId) params = params.set('patientId', patientId);
    if (status) params = params.set('status', status);
    return this.http.get<any[]>(this.apiUrl, { params });
  }

  getPatientPrescriptions(patientId: string): Observable<any[]> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.get<any[]>(this.apiUrl, { params });
  }

  dispense(prescriptionId: string): Observable<DispenseResponse> {
    return this.http.post<DispenseResponse>(`${this.apiUrl}/${prescriptionId}/dispense`, {});
  }

  generateInvoice(prescriptionId: string): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/${prescriptionId}/invoice`, {});
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
