import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/auth.model';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  currentUser = signal<User | null>(null);
  accessToken = signal<string | null>(null);

  constructor() {
    const token = sessionStorage.getItem('access_token');
    const user = sessionStorage.getItem('current_user');
    
    if (token && user) {
      this.accessToken.set(token);
      try {
        this.currentUser.set(JSON.parse(user));
      } catch {
        this.logout();
      }
    }
  }

  login(request: LoginRequest) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, request).pipe(
      tap(response => {
        this.accessToken.set(response.token);
        const user: User = {
          id: '',
          username: response.username,
          email: '',
          firstName: response.fullName?.split(' ')[0] || response.username,
          lastName: response.fullName?.split(' ')[1] || '',
          roles: response.roles || []
        };
        this.currentUser.set(user);

        sessionStorage.setItem('access_token', response.token);
        sessionStorage.setItem('current_user', JSON.stringify(user));
      })
    );
  }

  register(request: RegisterRequest) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, request);
  }

  logout() {
    this.accessToken.set(null);
    this.currentUser.set(null);
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('current_user');
  }

  isAuthenticated() {
    return this.accessToken() !== null;
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.roles?.includes(role) ?? false;
  }
}
