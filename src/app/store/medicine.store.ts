import { inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { computed } from '@angular/core';
import { pipe, switchMap, tap } from 'rxjs';
import { MedicineService } from '../services/medicine.service';
import { Medicine } from '../models/medicine.model';

interface MedicineState {
  medicines: Medicine[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: MedicineState = {
  medicines: [],
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  searchTerm: '',
  isLoading: false,
  error: null
};

export const MedicineStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((state) => ({
    lowStockMedicines: computed(() =>
      state.medicines().filter(m => m.stockQuantity < 10)
    ),
    outOfStockMedicines: computed(() =>
      state.medicines().filter(m => m.stockQuantity === 0)
    )
  })),

  withMethods((store, medicineService = inject(MedicineService)) => ({
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
                patchState(store, {
                  medicines: response.items || [],
                  totalCount: response.totalCount || 0,
                  isLoading: false
                });
              },
              error: (error) => {
                patchState(store, { isLoading: false, error: error.message || 'Failed to load medicines' });
              }
            })
          )
        )
      )
    ),

    setSearchTerm(term: string) {
      patchState(store, { searchTerm: term, currentPage: 1 });
    },

    setPage(page: number, pageSize: number) {
      patchState(store, { currentPage: page, pageSize: pageSize });
    },

    dispenseMedicine(medicineId: string, quantity: number) {
      medicineService.dispense(medicineId, quantity).subscribe({
        next: () => {
          patchState(store, {
            medicines: store.medicines().map(m =>
              m.id === medicineId
                ? { ...m, stockQuantity: m.stockQuantity - quantity }
                : m
            )
          });
        }
      });
    }
  }))
);
