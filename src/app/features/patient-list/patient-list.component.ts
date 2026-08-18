import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss']
})
export class PatientListComponent implements OnInit {
  private patientService = inject(PatientService);

  patients = signal<Patient[]>([]);
  totalCount = signal(0);
  isLoading = signal(false);
  displayedColumns = ['mrn', 'name', 'gender', 'phone', 'bloodGroup'];

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients(page = 1, pageSize = 10, search?: string) {
    this.isLoading.set(true);
    this.patientService.getAll(page, pageSize, search).subscribe({
      next: (response) => {
        this.patients.set(response.items || []);
        this.totalCount.set(response.totalCount || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event) {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.loadPatients(1, 10, searchTerm);
  }

  onPageChange(event: PageEvent) {
    this.loadPatients(event.pageIndex + 1, event.pageSize);
  }
}
