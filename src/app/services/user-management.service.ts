import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserDto {
  userId?: string;
  id?: string;
  userName?: string;
  username?: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role?: string;
  roles?: string[];
  isActive: boolean;
  phoneNumber?: string;
  createdAt?: string;
}

export interface CreateUserDto {
  userName: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.baseUrl}/users/with-roles`);
  }

  /**
   * Admin atomic staff provisioning — creates user + assigns role in one call.
   * Calls POST /api/v1/users (AdminCreateUserCommand).
   */
  createUser(payload: CreateUserDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/users`, {
      userName: payload.userName,
      username: payload.userName,
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
      roleName: payload.role,
      phoneNumber: payload.phoneNumber
    });
  }

  assignRole(userId: string, roleName: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${userId}/roles`, { roleName });
  }

  removeRole(userId: string, roleName: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/${userId}/roles/${roleName}`);
  }

  toggleUserStatus(userId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${userId}/toggle-status`, {});
  }

  /**
   * Admin credential reset — directly sets a staff member's password.
   * Calls POST /api/v1/users/{userId}/reset-password (AdminResetPasswordCommand).
   */
  resetPassword(userId: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${userId}/reset-password`, { newPassword });
  }
}
