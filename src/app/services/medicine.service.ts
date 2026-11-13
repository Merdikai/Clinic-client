import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CreateMedicineRequest, Medicine } from '../models/medicine.model';
import { PagedResponse } from '../models/patient.model';

@Injectable({ providedIn: 'root' })
export class MedicineService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/medicines`;

  getAll(page = 1, pageSize = 10, search?: string) {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('search', search);

    return this.http.get<PagedResponse<Medicine>>(this.apiUrl, { params });
  }

  create(request: CreateMedicineRequest) {
    return this.http.post<Medicine>(this.apiUrl, request);
  }

  dispense(id: string, quantity: number) {
    return this.http.post<Medicine>(`${this.apiUrl}/${id}/dispense`, { quantity });
  }

  getById(id: string) {
    return this.http.get<Medicine>(`${this.apiUrl}/${id}`);
  }

  update(id: string, request: Partial<CreateMedicineRequest>) {
    return this.http.put<Medicine>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
