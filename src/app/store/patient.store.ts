import { inject, computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { PatientService } from '../services/patient.service';
import { Patient, PagedResponse } from '../models/patient.model';

interface PatientState {
  patients: Patient[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: PatientState = {
  patients: [],
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  searchTerm: '',
  isLoading: false,
  error: null
};

export const PatientStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => ({
    totalPages: computed(() => Math.ceil(state.totalCount() / Math.max(state.pageSize(), 1))),
    hasNext: computed(() => state.currentPage() < Math.ceil(state.totalCount() / Math.max(state.pageSize(), 1))),
    hasPrevious: computed(() => state.currentPage() > 1)
  })),
  withMethods((store, patientService = inject(PatientService)) => ({
    loadPatients: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          patientService.getAll(store.currentPage(), store.pageSize(), store.searchTerm()).pipe(
            tap({
              next: (response: PagedResponse<Patient>) => {
                patchState(store, {
                  patients: response.items || [],
                  totalCount: response.totalCount || 0,
                  isLoading: false
                });
              },
              error: (error) => {
                patchState(store, { isLoading: false, error: error.message || 'Failed to load patients' });
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
    setPage(page: number) {
      patchState(store, { currentPage: page });
    },
    setPageSize(size: number) {
      patchState(store, { pageSize: size, currentPage: 1 });
    }
  }))
);
