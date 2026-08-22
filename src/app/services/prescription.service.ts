import { Observable } from 'rxjs';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { DispenseResponse } from '../models/prescription.model';
import { Invoice } from '../models/billing.model';

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/prescriptions`;

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  dispense(prescriptionId: string) {
    return this.http.post<DispenseResponse>(`${this.apiUrl}/${prescriptionId}/dispense`, {});
  }

  generateInvoice(prescriptionId: string) {
    return this.http.post<Invoice>(`${this.apiUrl}/${prescriptionId}/invoice`, {});
  }
}
