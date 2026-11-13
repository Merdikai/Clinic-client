import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

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

type ApiDataWrapper<T> = T | { readonly data?: T; readonly items?: T };

function unwrapData<T>(res: ApiDataWrapper<T> | null | undefined): T | null {
  if (res && typeof res === 'object' && 'data' in res && res.data !== undefined) {
    return res.data;
  }
  return (res as T) ?? null;
}

function unwrapList<T>(res: T[] | { readonly data?: T[]; readonly items?: T[] } | null | undefined): T[] {
  if (Array.isArray(res)) {
    return res;
  }
  if (res && typeof res === 'object') {
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.items)) return res.items;
  }
  return [];
}

@Injectable({
  providedIn: 'root'
})
export class StaffDutyService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.apiUrl;

  private readonly currentDutySubject = new BehaviorSubject<StaffDutyShift | null>(null);
  readonly currentDuty$ = this.currentDutySubject.asObservable();

  constructor() {
    if (!this.authService.isAuthenticated() || this.authService.isPatient()) {
      return;
    }

    try {
      const saved = localStorage.getItem('clinic_active_shift');
      if (saved) {
        const parsed = JSON.parse(saved) as StaffDutyShift;
        if (parsed?.isActive) {
          this.currentDutySubject.next(parsed);
        }
      }
    } catch {}

    this.refreshDutyStatus().pipe(catchError(() => of(null))).subscribe();
  }

  get isOnDuty(): boolean {
    return !!this.currentDutySubject.value?.isActive;
  }

  get activeShift(): StaffDutyShift | null {
    return this.currentDutySubject.value;
  }

  refreshDutyStatus(): Observable<StaffDutyShift | null> {
    if (!this.authService.isAuthenticated() || this.authService.isPatient()) {
      this.currentDutySubject.next(null);
      return of(null);
    }

    return this.http.get<ApiDataWrapper<StaffDutyShift>>(`${this.baseUrl}/staff-duty/my-status`).pipe(
      map((res) => {
        const shift = unwrapData(res);
        return shift && shift.id && shift.isActive ? shift : null;
      }),
      tap((shift) => {
        this.currentDutySubject.next(shift);
        try {
          if (shift) {
            localStorage.setItem('clinic_active_shift', JSON.stringify(shift));
          } else {
            localStorage.removeItem('clinic_active_shift');
          }
        } catch {}
      })
    );
  }

  clockIn(department: string, shiftType: string, notes?: string): Observable<StaffDutyShift> {
    return this.http
      .post<ApiDataWrapper<StaffDutyShift>>(`${this.baseUrl}/staff-duty/clock-in`, {
        department,
        shiftType,
        notes
      })
      .pipe(
        map((res) => unwrapData(res) as StaffDutyShift),
        tap((shift) => {
          this.currentDutySubject.next(shift);
          if (shift) {
            try {
              localStorage.setItem('clinic_active_shift', JSON.stringify(shift));
            } catch {}
          }
        })
      );
  }

  clockOut(handoverNotes?: string): Observable<StaffDutyShift | null> {
    return this.http
      .post<ApiDataWrapper<StaffDutyShift>>(`${this.baseUrl}/staff-duty/clock-out`, {
        handoverNotes
      })
      .pipe(
        map((res) => unwrapData(res)),
        tap(() => {
          this.currentDutySubject.next(null);
          try {
            localStorage.removeItem('clinic_active_shift');
          } catch {}
        })
      );
  }

  getActiveStaff(): Observable<StaffDutyShift[]> {
    return this.http
      .get<StaffDutyShift[] | { data?: StaffDutyShift[]; items?: StaffDutyShift[] }>(
        `${this.baseUrl}/staff-duty/active-staff`
      )
      .pipe(map((res) => unwrapList(res)));
  }

  getActiveDelegations(): Observable<DoctorDelegation[]> {
    return this.http
      .get<DoctorDelegation[] | { data?: DoctorDelegation[]; items?: DoctorDelegation[] }>(
        `${this.baseUrl}/doctor-delegations/active`
      )
      .pipe(map((res) => unwrapList(res)));
  }

  getMyDelegations(): Observable<DoctorDelegation[]> {
    return this.http
      .get<DoctorDelegation[] | { data?: DoctorDelegation[]; items?: DoctorDelegation[] }>(
        `${this.baseUrl}/doctor-delegations/my-delegations`
      )
      .pipe(map((res) => unwrapList(res)));
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
      notes: payload.notes ?? null
    };
    return this.http
      .post<ApiDataWrapper<DoctorDelegation>>(`${this.baseUrl}/doctor-delegations`, body)
      .pipe(map((res) => unwrapData(res) as DoctorDelegation));
  }

  revokeDelegation(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/doctor-delegations/${id}/revoke`, {});
  }
}
