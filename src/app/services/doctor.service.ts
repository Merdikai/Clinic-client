import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface DoctorDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization?: string;
}

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/doctors`;

  getAllDoctors(): Observable<DoctorDto[]> {
    return this.http.get<DoctorDto[]>(this.apiUrl);
  }
}
