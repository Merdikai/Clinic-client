import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StaffDutyShift {
  id: string;
  userId: string;
  userName: string;
  role: string;
  department: string;
  shiftType: string;
  clockInTimeUtc: string;
  clockOutTimeUtc?: string;
  isActive: boolean;
  notes?: string;
  handoverNotes?: string;
}

export interface DoctorDelegation {
  id: string;
  originalDoctorId: string;
  delegatingDoctorName: string;
  coveringDoctorId: string;
  coveringDoctorName: string;
  startDateUtc: string;
  endDateUtc: string;
  reason: string;
  notes?: string;
  isActive: boolean;
  createdAtUtc: string;
}

@Injectable({
  providedIn: 'root'
})
export class StaffDutyService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  private currentDutySubject = new BehaviorSubject<StaffDutyShift | null>(null);
  public currentDuty$ = this.currentDutySubject.asObservable();

  constructor() {
    // Hydrate from localStorage first for instant UI
    try {
      const saved = localStorage.getItem('clinic_active_shift');
      if (saved) {
        const parsed = JSON.parse(saved) as StaffDutyShift;
        if (parsed?.isActive) {
          this.currentDutySubject.next(parsed);
        }
      }
    } catch (_) {}

    // Then sync with actual server state
    this.refreshDutyStatus().pipe(catchError(() => of(null))).subscribe();
  }

  public get isOnDuty(): boolean {
    return !!this.currentDutySubject.value?.isActive;
  }

  public get activeShift(): StaffDutyShift | null {
    return this.currentDutySubject.value;
  }

  refreshDutyStatus(): Observable<StaffDutyShift | null> {
    return this.http.get<any>(`${this.baseUrl}/staff-duty/my-status`).pipe(
      map(res => {
        const shift = (res && res.data !== undefined ? res.data : res) as StaffDutyShift | null;
        // Treat null/empty or inactive shift as off-duty
        return (shift && shift.id && shift.isActive) ? shift : null;
      }),
      tap(shift => {
        this.currentDutySubject.next(shift);
        if (shift) {
          localStorage.setItem('clinic_active_shift', JSON.stringify(shift));
        } else {
          localStorage.removeItem('clinic_active_shift');
        }
      })
    );
  }

  clockIn(department: string, shiftType: string, notes?: string): Observable<StaffDutyShift> {
    return this.http.post<any>(`${this.baseUrl}/staff-duty/clock-in`, {
      department,
      shiftType,
      notes
    }).pipe(
      map(res => (res && res.data !== undefined ? res.data : res) as StaffDutyShift),
      tap(shift => {
        this.currentDutySubject.next(shift);
        if (shift) {
          localStorage.setItem('clinic_active_shift', JSON.stringify(shift));
        }
      })
    );
  }

  clockOut(handoverNotes?: string): Observable<StaffDutyShift | null> {
    return this.http.post<any>(`${this.baseUrl}/staff-duty/clock-out`, {
      handoverNotes
    }).pipe(
      map(res => (res && res.data !== undefined ? res.data : res) as StaffDutyShift | null),
      tap(() => {
        this.currentDutySubject.next(null);
        localStorage.removeItem('clinic_active_shift');
      })
    );
  }

  getActiveStaff(): Observable<StaffDutyShift[]> {
    return this.http.get<any>(`${this.baseUrl}/staff-duty/active-staff`).pipe(
      map(res => {
        const list: any[] = Array.isArray(res) ? res : (res?.data || res?.items || []);
        return list as StaffDutyShift[];
      })
    );
  }

  getActiveDelegations(): Observable<DoctorDelegation[]> {
    return this.http.get<any>(`${this.baseUrl}/doctor-delegations/active`).pipe(
      map(res => {
        const list: any[] = Array.isArray(res) ? res : (res?.data || res?.items || []);
        return list as DoctorDelegation[];
      })
    );
  }

  getMyDelegations(): Observable<DoctorDelegation[]> {
    return this.http.get<any>(`${this.baseUrl}/doctor-delegations/my-delegations`).pipe(
      map(res => {
        const list: any[] = Array.isArray(res) ? res : (res?.data || res?.items || []);
        return list as DoctorDelegation[];
      })
    );
  }

  createDelegation(payload: {
    originalDoctorId?: string;
    delegatingDoctorName?: string;
    coveringDoctorId?: string;
    coveringDoctorName: string;
    startDateUtc: string;
    endDateUtc: string;
    reason?: string;
    notes?: string;
  }): Observable<DoctorDelegation> {
    const body = {
      originalDoctorId: payload.originalDoctorId ?? null,
      delegatingDoctorName: payload.delegatingDoctorName ?? null,
      coveringDoctorId: payload.coveringDoctorId ?? null,
      coveringDoctorName: payload.coveringDoctorName,
      startDateUtc: payload.startDateUtc,
      endDateUtc: payload.endDateUtc,
      reason: payload.reason ?? 'Clinical Coverage / On-Call Rotation',
      notes: payload.notes ?? null,
    };
    return this.http.post<any>(`${this.baseUrl}/doctor-delegations`, body).pipe(
      map(res => (res && res.data !== undefined ? res.data : res) as DoctorDelegation)
    );
  }

  revokeDelegation(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/doctor-delegations/${id}/revoke`, {});
  }
}
