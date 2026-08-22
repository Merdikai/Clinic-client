import { inject, computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { MedicineService } from '../services/medicine.service';
import { Medicine } from '../models/medicine.model';
import { ToastService } from '../ui/toast/toast.service';

interface MedicineMetadataState {
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
}

const initialMetadataState: MedicineMetadataState = {
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  searchTerm: '',
  isLoading: false,
  error: null
};

export const MedicineStore = signalStore(
  { providedIn: 'root' },
  withEntities<Medicine>(),
  withState(initialMetadataState),
  withComputed((state) => ({
    medicines: computed(() => state.entities()),
    lowStockMedicines: computed(() =>
      state.entities().filter(m => m.stockQuantity < 10)
    ),
    outOfStockMedicines: computed(() =>
      state.entities().filter(m => m.stockQuantity === 0)
    )
  })),
  withMethods((store, medicineService = inject(MedicineService), toast = inject(ToastService)) => ({
    loadMedicines: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          medicineService.getAll(
            store.currentPage(),
            store.pageSize(),
            store.searchTerm()
          ).pipe(
            tap({
              next: (response: any) => {
                patchState(
                  store,
                  setAllEntities(response.items || []),
                  {
                    totalCount: response.totalCount || 0,
                    isLoading: false
                  }
                );
              },
              error: (error) => {
                patchState(store, { isLoading: false, error: error.message || 'Failed to load medicines' });
              }
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    setSearchTerm(term: string) {
      patchState(store, { searchTerm: term, currentPage: 1 });
    },

    setPage(page: number, pageSize: number) {
      patchState(store, { currentPage: page, pageSize });
    },

    // TMS Pattern: Optimistic Dispense with rollback
    dispenseMedicine(medicineId: string, quantity: number) {
      const original = store.entities().find(m => m.id === medicineId);
      if (!original) return;

      const newStock = Math.max(0, original.stockQuantity - quantity);
      patchState(store, updateEntity({ id: medicineId, changes: { stockQuantity: newStock } }));

      medicineService.dispense(medicineId, quantity).subscribe({
        next: () => {
          toast.success(`Dispensed ${quantity} units of ${original.name}`);
        },
        error: (err) => {
          // Rollback on failure
          patchState(store, updateEntity({ id: medicineId, changes: { stockQuantity: original.stockQuantity } }));
          toast.error(`Failed to dispense: ${err.message || 'Server error'}`);
        }
      });
    }
  }))
);
