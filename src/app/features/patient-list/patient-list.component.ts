import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PatientStore } from '../../store/patient.store';

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
  private patientStore = inject(PatientStore);

  patients = this.patientStore.patients;
  totalCount = this.patientStore.totalCount;
  isLoading = this.patientStore.isLoading;
  displayedColumns = ['mrn', 'name', 'gender', 'phone', 'bloodGroup'];

  ngOnInit() {
    this.patientStore.loadPatients();
  }

  onSearch(event: Event) {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.patientStore.setSearchTerm(searchTerm);
    this.patientStore.loadPatients();
  }

  onPageChange(event: PageEvent) {
    this.patientStore.setPage(event.pageIndex + 1);
    this.patientStore.setPageSize(event.pageSize);
    this.patientStore.loadPatients();
  }
}
