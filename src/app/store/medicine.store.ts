import { inject, computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { setAllEntities, setEntity, removeEntity, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, exhaustMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MedicineService } from '../services/medicine.service';
import { Medicine } from '../models/medicine.model';
import { PagedResponse } from '../models/patient.model';
import { extractProblemDetailsMessage } from '../models/api.model';
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
  pageSize: 100,
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
    lowStockMedicines: computed(() => state.entities().filter((m) => m.stockQuantity < 10)),
    outOfStockMedicines: computed(() => state.entities().filter((m) => m.stockQuantity === 0))
  })),
  withMethods((store, medicineService = inject(MedicineService), toast = inject(ToastService)) => {
    const executeDispense = rxMethod<{ readonly medicineId: string; readonly quantity: number }>(
      pipe(
        exhaustMap(({ medicineId, quantity }) => {
          const original = store.entities().find((m) => m.id === medicineId);
          if (!original) return of(null);

          const newStock = Math.max(0, original.stockQuantity - quantity);
          patchState(store, updateEntity({ id: medicineId, changes: { stockQuantity: newStock } }));

          return medicineService.dispense(medicineId, quantity).pipe(
            tap({
              next: () => {
                toast.success(`Dispensed ${quantity} units of ${original.name}`);
              },
              error: (err: HttpErrorResponse) => {
                patchState(
                  store,
                  updateEntity({ id: medicineId, changes: { stockQuantity: original.stockQuantity } })
                );
                toast.error(`Failed to dispense: ${extractProblemDetailsMessage(err.error, 'Server error')}`);
              }
            }),
            catchError(() => of(null))
          );
        })
      )
    );

    return {
      loadMedicines: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null })),
          switchMap(() =>
            medicineService.getAll(store.currentPage(), store.pageSize(), store.searchTerm()).pipe(
              tap({
                next: (response: PagedResponse<Medicine>) => {
                  patchState(store, setAllEntities(response.items || []), {
                    totalCount: response.totalCount || 0,
                    isLoading: false
                  });
                },
                error: (error: HttpErrorResponse) => {
                  patchState(store, {
                    isLoading: false,
                    error: extractProblemDetailsMessage(error.error, error.message || 'Failed to load medicines')
                  });
                }
              }),
              catchError(() => of(null))
            )
          )
        )
      ),

      upsertMedicineEntity(medicine: Medicine): void {
        patchState(store, setEntity(medicine));
      },

      removeMedicineEntity(id: string): void {
        patchState(store, removeEntity(id));
      },

      setSearchTerm(term: string): void {
        patchState(store, { searchTerm: term, currentPage: 1 });
      },

      setPage(page: number, pageSize: number): void {
        patchState(store, { currentPage: page, pageSize });
      },

      dispenseMedicine(medicineId: string, quantity: number): void {
        executeDispense({ medicineId, quantity });
      }
    };
  })
);
