import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardSummary {
  totalPatients: number;
  todayAppointments: number;
  totalAppointmentsToday: number;
  pendingAppointments: number;
  completedAppointments: number;
  todayRevenue: number;
  dailyRevenue: number;
  lowStockMedicines: number;
  lowStockItemsCount: number;
  outstandingPayments: number;
  outstandingBalance: number;
  topMedicines: Array<{ medicineName: string; count: number }>;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getSummary() {
    return this.http.get<any>(`${environment.apiUrl}/reports/dashboard`).pipe(
      map((res: any) => ({
        totalPatients: res.totalPatients ?? 0,
        todayAppointments: res.todayAppointments ?? res.totalAppointmentsToday ?? 0,
        totalAppointmentsToday: res.todayAppointments ?? res.totalAppointmentsToday ?? 0,
        pendingAppointments: res.pendingAppointments ?? 0,
        completedAppointments: res.completedAppointments ?? 0,
        todayRevenue: res.todayRevenue ?? res.dailyRevenue ?? 0,
        dailyRevenue: res.todayRevenue ?? res.dailyRevenue ?? 0,
        lowStockMedicines: res.lowStockMedicines ?? res.lowStockItemsCount ?? 0,
        lowStockItemsCount: res.lowStockMedicines ?? res.lowStockItemsCount ?? 0,
        outstandingPayments: res.outstandingPayments ?? res.outstandingBalance ?? 0,
        outstandingBalance: res.outstandingPayments ?? res.outstandingBalance ?? 0,
        topMedicines: res.topMedicines ?? []
      }))
    );
  }
}
