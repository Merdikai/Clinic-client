import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, AuthResponse, UserInfo, RegisterRequest } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'clinic_jwt_token';
  private readonly REFRESH_TOKEN_KEY = 'clinic_refresh_token';
  private readonly USER_KEY = 'clinic_user_info';

  currentUser = signal<UserInfo | null>(this.getStoredUser());
  accessToken = computed(() => this.currentUser()?.token || this.getToken());
  isAuthenticated = computed(() => !!this.accessToken());
  userRoles = computed(() => this.currentUser()?.roles ?? []);

  currentUserId = computed(() => {
    const user = this.currentUser();
    if (user?.userId) return user.userId;
    if (user?.id) return user.id;
    return this.getUserIdFromToken();
  });

  currentUserName = computed(() => this.currentUser()?.fullName || this.currentUser()?.username || 'User');
  isDoctor = computed(() => this.hasRole('Doctor'));
  isAdmin = computed(() => this.hasRole('Admin'));
  isRadiologist = computed(() => this.hasRole('Radiologist'));
  isPatient = computed(() => this.hasRole('Patient'));

  get currentUserValue(): UserInfo | null {
    return this.currentUser();
  }

  private getUserIdFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.nameid || payload.sub || payload.id || null;
    } catch {
      return null;
    }
  }


  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response))
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap(response => {
        if (response && response.token) {
          this.handleAuthSuccess(response);
        }
      })
    );
  }

  forgotPassword(email: string) {
    return this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post(`${environment.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap(response => this.handleAuthSuccess(response))
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({
        error: () => {}
      });
    }
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  hasRole(role: string): boolean {
    return (this.userRoles() || []).some(r => r?.toLowerCase() === role?.toLowerCase());
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(r => this.hasRole(r));
  }

  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    if (response.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    }
    const user: UserInfo = {
      username: response.username,
      fullName: response.fullName,
      roles: response.roles,
      token: response.token
    };
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private getStoredUser(): UserInfo | null {
    const stored = localStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  getMe() {
    return this.http.get<any>(`${environment.apiUrl}/auth/me`);
  }

}
