import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getAllUsersWithRoles() {
    return this.http.get<any[]>(`${this.apiUrl}/with-roles`);
  }

  assignRole(userId: string, roleName: string) {
    return this.http.post(`${this.apiUrl}/${userId}/roles`, `"${roleName}"`, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  removeRole(userId: string, roleName: string) {
    return this.http.delete(`${this.apiUrl}/${userId}/roles/${roleName}`);
  }
}
