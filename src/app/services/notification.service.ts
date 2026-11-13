import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notifications`;

  sendTestNotification(message?: string): Observable<{ message?: string } | void> {
    return this.http.post<{ message?: string } | void>(`${this.apiUrl}/test`, { message: message || 'Broadcast alert to all clinical staff' });
  }
}
