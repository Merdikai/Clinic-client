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

  sendTestNotification(message?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/test`, { message: message || 'Broadcast alert to all clinical staff' });
  }
}
