import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserWithRoles {
  userId: string;
  username: string;
  fullName: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getAllUsersWithRoles(): Observable<UserWithRoles[]> {
    return this.http.get<UserWithRoles[]>(`${this.apiUrl}/with-roles`);
  }

  getUserRoles(userId: string): Observable<UserWithRoles> {
    return this.http.get<UserWithRoles>(`${this.apiUrl}/${userId}/roles`);
  }

  assignRole(userId: string, roleName: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${userId}/roles`, { roleName });
  }

  removeRole(userId: string, roleName: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}/roles/${roleName}`);
  }
}
