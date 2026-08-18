import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MedicineStore } from '../../store/medicine.store';
import { LiveSyncService } from '../../services/live-sync.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  templateUrl: './pharmacy.component.html',
  styleUrls: ['./pharmacy.component.scss']
})
export class PharmacyComponent implements OnInit {
  private medicineStore = inject(MedicineStore);
  private liveSyncService = inject(LiveSyncService);

  medicines = this.medicineStore.medicines;
  totalCount = this.medicineStore.totalCount;
  isLoading = this.medicineStore.isLoading;
  lowStockMedicines = this.medicineStore.lowStockMedicines;
  displayedColumns = ['code', 'name', 'category', 'stock', 'unitPrice', 'actions'];

  constructor() {
    this.liveSyncService.lowStockAlert$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.medicineStore.loadMedicines();
    });
  }

  ngOnInit() {
    this.medicineStore.loadMedicines();
  }

  onSearch(event: Event) {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.medicineStore.setSearchTerm(searchTerm);
    this.medicineStore.loadMedicines();
  }

  onPageChange(event: any) {
    this.medicineStore.setPage(event.pageIndex + 1, event.pageSize);
    this.medicineStore.loadMedicines();
  }

  dispense(medicineId: string) {
    this.medicineStore.dispenseMedicine(medicineId, 1);
  }

  getStockColor(stock: number): string {
    if (stock < 10) return '#ef4444';
    if (stock < 50) return '#f59e0b';
    return '#10b981';
  }
}
