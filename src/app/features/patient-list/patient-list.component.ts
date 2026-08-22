import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PatientStore } from '../../store/patient.store';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss']
})
export class PatientListComponent implements OnInit {
  patientStore = inject(PatientStore);

  patients = this.patientStore.patients;
  isLoading = this.patientStore.isLoading;
  totalCount = this.patientStore.totalCount;
  selectedGender = signal<string>('ALL');
  searchQuery = signal<string>('');

  displayedColumns = ['patientId', 'name', 'gender', 'phone', 'bloodGroup', 'actions'];

  filteredPatients = computed(() => {
    let list = this.patients() || [];
    const gender = this.selectedGender();
    if (gender !== 'ALL') {
      list = list.filter(p => p.gender?.toLowerCase() === gender.toLowerCase());
    }
    return list;
  });

  maleCount = computed(() => (this.patients() || []).filter(p => p.gender?.toLowerCase() === 'male').length);
  femaleCount = computed(() => (this.patients() || []).filter(p => p.gender?.toLowerCase() === 'female').length);

  ngOnInit() {
    this.patientStore.loadPatients();
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.patientStore.setSearchTerm(value);
    this.patientStore.loadPatients();
  }

  setGenderFilter(gender: string) {
    this.selectedGender.set(gender);
  }

  onPageChange(event: PageEvent) {
    this.patientStore.setPageSize(event.pageSize);
    this.patientStore.setPage(event.pageIndex + 1);
    this.patientStore.loadPatients();
  }

  getInitials(name: string): string {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
}
