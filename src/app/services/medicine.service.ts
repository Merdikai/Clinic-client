import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CreateMedicineRequest, Medicine } from '../models/medicine.model';

@Injectable({ providedIn: 'root' })
export class MedicineService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/medicines`;

  getAll(page = 1, pageSize = 10, search?: string) {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('search', search);

    return this.http.get<any>(this.apiUrl, { params });
  }

  create(request: CreateMedicineRequest) {
    return this.http.post<Medicine>(this.apiUrl, request);
  }

  dispense(id: string, quantity: number) {
    return this.http.patch(`${this.apiUrl}/${id}/dispense`, { quantity });
  }
}
