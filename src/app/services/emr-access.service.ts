import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmrAccessAuditLog {
  id: string;
  patientId: string;
  patientName: string;
  accessedByUserId: string;
  accessedByUserName: string;
  accessedByRole: string;
  accessType: string;
  actionDetail?: string;
  isEmergencyOverride: boolean;
  breakGlassRationale?: string;
  accessedAtUtc: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EmrAccessService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/emr-access`;

  logAccess(patientId: string, accessType: string = 'ViewChart', actionDetail?: string): Observable<{ id: string; message: string }> {
    return this.http.post<{ id: string; message: string }>(`${this.baseUrl}/log`, {
      patientId,
      accessType,
      actionDetail: actionDetail || 'Routine clinical chart review'
    });
  }

  breakGlass(patientId: string, rationale: string): Observable<{ id: string; message: string }> {
    return this.http.post<{ id: string; message: string }>(`${this.baseUrl}/break-glass`, {
      patientId,
      rationale
    });
  }

  executeBreakGlass(patientId: string, rationale: string): Observable<{ id: string; message: string }> {
    return this.breakGlass(patientId, rationale);
  }

  getAuditLogs(page: number = 1, pageSize: number = 20, patientId?: string, emergencyOnly?: boolean): Observable<PagedResponse<EmrAccessAuditLog>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (patientId) {
      params = params.set('patientId', patientId);
    }
    if (emergencyOnly !== undefined && emergencyOnly !== null) {
      params = params.set('emergencyOnly', emergencyOnly.toString());
    }

    return this.http.get<PagedResponse<EmrAccessAuditLog>>(`${this.baseUrl}/audit-logs`, { params });
  }
}
