import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withEntities, setAllEntities, addEntity, removeEntity } from '@ngrx/signals/entities';
import { inject } from '@angular/core';
import { Patient, CreatePatientRequest } from '../models/patient.model';
import { PatientService } from '../services/patient.service';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';

export interface PatientState {
  isLoading: boolean;
  error: string | null;
  totalCount: number;
}

const initialState: PatientState = {
  isLoading: false,
  error: null,
  totalCount: 0
};

export const PatientStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withEntities<Patient>(),
  withMethods((store, patientService = inject(PatientService)) => ({
    loadPatients: rxMethod<{ page?: number; pageSize?: number; search?: string }>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(({ page = 1, pageSize = 10, search }) =>
          patientService.getAll(page, pageSize, search).pipe(
            tap((response) => {
              patchState(store, setAllEntities(response.items), {
                totalCount: response.totalCount,
                isLoading: false
              });
            }),
            catchError((err) => {
              patchState(store, { error: err.message || 'Failed to load patients', isLoading: false });
              return of(null);
            })
          )
        )
      )
    ),
    addPatientOptimistic(patient: Patient) {
      patchState(store, addEntity(patient));
    }
  }))
);
