import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent implements OnInit {
  private http = inject(HttpClient);
  invoices = signal<any[]>([]);
  isLoading = signal(false);
  displayedColumns = ['number', 'patient', 'date', 'total', 'status', 'actions'];

  ngOnInit() {
    this.isLoading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/billing/invoices/unpaid`).subscribe({
      next: (res) => {
        this.invoices.set(res || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getDownloadUrl(id: string): string {
    return `${environment.apiUrl}/billing/invoices/${id}/pdf`;
  }
}
