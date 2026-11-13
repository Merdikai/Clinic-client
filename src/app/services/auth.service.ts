import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, Observable, catchError, of, switchMap, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, AuthResponse, UserInfo, RegisterRequest } from '../models/auth.model';

export interface SeededAccountPreset {
  readonly role: string;
  readonly label: string;
  readonly username: string;
  readonly password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly USER_KEY = 'clinic_user_info';
  private readonly LEGACY_TOKEN_KEY = 'clinic_jwt_token';
  private readonly LEGACY_REFRESH_TOKEN_KEY = 'clinic_refresh_token';

  private readonly tokenSignal = signal<string | null>(null);
  private readonly sessionHintSignal = signal<boolean>(Boolean(this.getStoredUser()));

  readonly currentUser = signal<UserInfo | null>(this.getStoredUser());
  readonly accessToken = computed(() => this.tokenSignal());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly userRoles = computed(() => this.currentUser()?.roles ?? []);
  readonly hasRefreshSession = computed(() => this.sessionHintSignal());

  readonly currentUserId = computed(() => {
    const user = this.currentUser();
    if (user?.userId) return user.userId;
    if (user?.id) return user.id;
    return this.getUserIdFromToken();
  });

  readonly currentUserName = computed(
    () => this.currentUser()?.fullName || this.currentUser()?.username || 'User'
  );
  readonly isDoctor = computed(() => this.hasRole('Doctor'));
  readonly isAdmin = computed(() => this.hasRole('Admin'));
  readonly isRadiologist = computed(() => this.hasRole('Radiologist'));
  readonly isPatient = computed(() => this.hasRole('Patient'));

  get currentUserValue(): UserInfo | null {
    return this.currentUser();
  }

  private getUserIdFromToken(): string | null {
    const token = this.tokenSignal();
    if (!token) return null;
    try {
      const parts = token.split('.');
      const payloadSegment = parts[1];
      if (!payloadSegment) return null;
      const payload = JSON.parse(atob(payloadSegment)) as {
        nameid?: string;
        sub?: string;
        id?: string;
      };
      return payload.nameid ?? payload.sub ?? payload.id ?? null;
    } catch {
      return null;
    }
  }

  initializeSession(): Observable<void> {
    this.scrubLegacyStorageTokens();

    return this.ensureCsrfCookie().pipe(
      switchMap(() => {
        if (!this.getStoredUser()) {
          return of(void 0);
        }
        return this.refreshToken().pipe(
          map(() => void 0),
          catchError(() => {
            this.clearAuth();
            return of(void 0);
          })
        );
      }),
      catchError(() => of(void 0))
    );
  }

  ensureCsrfCookie(): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/auth/csrf`, { withCredentials: true });
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials, { withCredentials: true })
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, data, { withCredentials: true })
      .pipe(
        tap((response) => {
          if (response && response.token) {
            this.handleAuthSuccess(response);
          }
        })
      );
  }

  forgotPassword(email: string): Observable<{ message: string; resetToken?: string | null; resetLink?: string | null }> {
    return this.http.post<{ message: string; resetToken?: string | null; resetLink?: string | null }>(
      `${environment.apiUrl}/auth/forgot-password`,
      { email },
      { withCredentials: true }
    );
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/reset-password`,
      { token, newPassword },
      { withCredentials: true }
    );
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  logout(): void {
    this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({
      error: () => {}
    });
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  getRefreshToken(): string | null {
    return null;
  }

  hasRole(role: string): boolean {
    return this.userRoles().some((r) => r.toLowerCase() === role.toLowerCase());
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((r) => this.hasRole(r));
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.scrubLegacyStorageTokens();
    this.tokenSignal.set(response.token);
    this.sessionHintSignal.set(true);

    const user: UserInfo = {
      id: response.id ?? response.userId,
      userId: response.userId ?? response.id,
      username: response.username,
      fullName: response.fullName,
      roles: response.roles ?? []
    };

    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch {}
    this.currentUser.set(user);
  }

  private getStoredUser(): UserInfo | null {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as UserInfo;
      // Never persist bearer secrets in localStorage
      if (parsed && 'token' in parsed) {
        delete (parsed as { token?: string }).token;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private scrubLegacyStorageTokens(): void {
    try {
      localStorage.removeItem(this.LEGACY_TOKEN_KEY);
      localStorage.removeItem(this.LEGACY_REFRESH_TOKEN_KEY);
    } catch {}
  }

  clearAuth(): void {
    this.tokenSignal.set(null);
    this.sessionHintSignal.set(false);
    this.scrubLegacyStorageTokens();
    try {
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem('clinic_active_role');
    } catch {}
    this.currentUser.set(null);
  }

  getMe(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${environment.apiUrl}/auth/me`, { withCredentials: true });
  }
}
