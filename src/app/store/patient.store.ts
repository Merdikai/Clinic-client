import { inject, computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { setAllEntities, addEntity, removeEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, exhaustMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PatientService } from '../services/patient.service';
import { Patient, PagedResponse, CreatePatientRequest } from '../models/patient.model';
import { extractProblemDetailsMessage } from '../models/api.model';
import { ToastService } from '../ui/toast/toast.service';

interface PatientMetadataState {
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
}

const initialMetadataState: PatientMetadataState = {
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  searchTerm: '',
  isLoading: false,
  error: null
};

export const PatientStore = signalStore(
  { providedIn: 'root' },
  withEntities<Patient>(),
  withState(initialMetadataState),
  withComputed((state) => ({
    patients: computed(() => state.entities()),
    totalPages: computed(() => Math.ceil(state.totalCount() / Math.max(state.pageSize(), 1))),
    hasNext: computed(() => state.currentPage() < Math.ceil(state.totalCount() / Math.max(state.pageSize(), 1))),
    hasPrevious: computed(() => state.currentPage() > 1)
  })),
  withMethods((store, patientService = inject(PatientService), toast = inject(ToastService)) => ({
    loadPatients: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          patientService.getAll(store.currentPage(), store.pageSize(), store.searchTerm()).pipe(
            tap({
              next: (response: PagedResponse<Patient>) => {
                patchState(store, setAllEntities(response.items || []), {
                  totalCount: response.totalCount || 0,
                  isLoading: false
                });
              },
              error: (error: HttpErrorResponse) => {
                patchState(store, {
                  isLoading: false,
                  error: extractProblemDetailsMessage(error.error, error.message || 'Failed to load patients')
                });
              }
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    createPatient: rxMethod<CreatePatientRequest>(
      pipe(
        tap(() => patchState(store, { isLoading: true })),
        exhaustMap((request) =>
          patientService.create(request).pipe(
            tap({
              next: (patient) => {
                patchState(store, addEntity(patient), {
                  totalCount: store.totalCount() + 1,
                  isLoading: false
                });
                toast.success(`Patient ${patient.firstName} ${patient.lastName} registered successfully!`);
              },
              error: (error: HttpErrorResponse) => {
                patchState(store, {
                  isLoading: false,
                  error: extractProblemDetailsMessage(error.error, error.message)
                });
              }
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    deletePatient: rxMethod<string>(
      pipe(
        exhaustMap((patientId) => {
          const original = store.entities().find((p) => p.id === patientId);
          if (!original) return of(null);

          patchState(store, removeEntity(patientId), {
            totalCount: Math.max(0, store.totalCount() - 1)
          });

          return patientService.delete(patientId).pipe(
            tap({
              next: () => {
                toast.success('Patient deleted successfully');
              },
              error: (err: HttpErrorResponse) => {
                patchState(store, addEntity(original), {
                  totalCount: store.totalCount() + 1
                });
                toast.error(`Error deleting patient: ${extractProblemDetailsMessage(err.error, 'Server error')}`);
              }
            }),
            catchError(() => of(null))
          );
        })
      )
    ),

    setSearchTerm(term: string): void {
      patchState(store, { searchTerm: term, currentPage: 1 });
    },
    setPage(page: number): void {
      patchState(store, { currentPage: page });
    },
    setPageSize(size: number): void {
      patchState(store, { pageSize: size, currentPage: 1 });
    }
  }))
);
