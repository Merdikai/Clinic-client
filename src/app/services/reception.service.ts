import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DailyCashSummary,
  CreateDailyCashReconciliation,
  DailyCashReconciliation,
  VisitorInquiry,
  CreateVisitorInquiry
} from '../models/reception.model';

@Injectable({ providedIn: 'root' })
export class ReceptionService {
  private http = inject(HttpClient);
  private reconciliationUrl = `${environment.apiUrl}/daily-reconciliations`;
  private inquiriesUrl = `${environment.apiUrl}/visitor-inquiries`;

  getTodayCashSummary(): Observable<DailyCashSummary> {
    return this.http.get<DailyCashSummary>(`${this.reconciliationUrl}/today-summary`);
  }

  submitReconciliation(data: CreateDailyCashReconciliation): Observable<DailyCashReconciliation> {
    return this.http.post<DailyCashReconciliation>(this.reconciliationUrl, data);
  }

  getReconciliations(limit = 30): Observable<DailyCashReconciliation[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<DailyCashReconciliation[]>(this.reconciliationUrl, { params });
  }

  getInquiries(status?: string): Observable<VisitorInquiry[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<VisitorInquiry[]>(this.inquiriesUrl, { params });
  }

  createInquiry(data: CreateVisitorInquiry): Observable<VisitorInquiry> {
    return this.http.post<VisitorInquiry>(this.inquiriesUrl, data);
  }

  resolveInquiry(id: string, resolutionNotes?: string): Observable<VisitorInquiry> {
    return this.http.patch<VisitorInquiry>(`${this.inquiriesUrl}/${id}/resolve`, { resolutionNotes });
  }
}
