import { inject, computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, exhaustMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AppointmentService } from '../services/appointment.service';
import { Appointment, VitalSignsSnapshot } from '../models/appointment.model';
import { PagedResponse } from '../models/patient.model';
import { extractProblemDetailsMessage } from '../models/api.model';
import { ToastService } from '../ui/toast/toast.service';

interface AppointmentMetadataState {
  selectedDate: Date | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
}

const initialMetadataState: AppointmentMetadataState = {
  selectedDate: null,
  isLoading: false,
  isMutating: false,
  error: null
};

export const AppointmentStore = signalStore(
  { providedIn: 'root' },
  withEntities<Appointment>(),
  withState(initialMetadataState),
  withComputed((state) => ({
    appointments: computed(() => state.entities()),
    pendingAppointments: computed(() => state.entities().filter((a) => a.status === 'PendingApproval')),
    scheduledAppointments: computed(() => state.entities().filter((a) => a.status === 'Scheduled')),
    checkedInAppointments: computed(() => state.entities().filter((a) => a.status === 'CheckedIn')),
    completedAppointments: computed(() => state.entities().filter((a) => a.status === 'Completed'))
  })),
  withMethods((store, apptService = inject(AppointmentService), toast = inject(ToastService)) => ({
    loadAppointments: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          apptService.getAll().pipe(
            tap({
              next: (res: PagedResponse<Appointment> | Appointment[]) => {
                const items = Array.isArray(res) ? res : res?.items ?? [];
                patchState(store, setAllEntities(items), { isLoading: false });
              },
              error: (err: HttpErrorResponse) => {
                patchState(store, {
                  isLoading: false,
                  error: extractProblemDetailsMessage(err.error, err.message || 'Failed to load appointments')
                });
              }
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    updateAppointmentVitals(appointmentId: string, vitalSigns: VitalSignsSnapshot): void {
      patchState(store, updateEntity({ id: appointmentId, changes: { vitalSigns } }));
    },

    setSelectedDate(date: Date | null): void {
      patchState(store, { selectedDate: date });
    },

    approve: rxMethod<string>(
      pipe(
        exhaustMap((appointmentId) => {
          const original = store.entities().find((a) => a.id === appointmentId);
          if (!original) return of(null);

          patchState(store, updateEntity({ id: appointmentId, changes: { status: 'Scheduled' } }), {
            isMutating: true
          });
          toast.info('Approving appointment...');

          return apptService.approveAppointment(appointmentId).pipe(
            tap({
              next: () => {
                patchState(store, { isMutating: false });
                toast.success('Appointment approved and scheduled!');
              },
              error: (err: HttpErrorResponse) => {
                patchState(store, updateEntity({ id: appointmentId, changes: { status: original.status } }), {
                  isMutating: false
                });
                toast.error(`Approval failed: ${extractProblemDetailsMessage(err.error, 'Server error')}`);
              }
            }),
            catchError(() => of(null))
          );
        })
      )
    ),

    checkIn: rxMethod<string>(
      pipe(
        exhaustMap((appointmentId) => {
          const original = store.entities().find((a) => a.id === appointmentId);
          if (!original) return of(null);

          patchState(store, updateEntity({ id: appointmentId, changes: { status: 'CheckedIn' } }), {
            isMutating: true
          });
          toast.info('Checking in patient...');

          return apptService.checkIn(appointmentId).pipe(
            tap({
              next: () => {
                patchState(store, { isMutating: false });
                toast.success('Check-in confirmed');
              },
              error: (err: HttpErrorResponse) => {
                patchState(store, updateEntity({ id: appointmentId, changes: { status: original.status } }), {
                  isMutating: false
                });
                toast.error(`Check-in failed: ${extractProblemDetailsMessage(err.error, 'Server error')}`);
              }
            }),
            catchError(() => of(null))
          );
        })
      )
    ),

    cancel: rxMethod<string>(
      pipe(
        exhaustMap((appointmentId) => {
          const original = store.entities().find((a) => a.id === appointmentId);
          if (!original) return of(null);

          patchState(store, updateEntity({ id: appointmentId, changes: { status: 'Cancelled' } }), {
            isMutating: true
          });
          toast.info('Cancelling appointment...');

          return apptService.cancel(appointmentId).pipe(
            tap({
              next: () => {
                patchState(store, { isMutating: false });
                toast.success('Cancellation confirmed');
              },
              error: (err: HttpErrorResponse) => {
                patchState(store, updateEntity({ id: appointmentId, changes: { status: original.status } }), {
                  isMutating: false
                });
                toast.error(`Cancellation failed: ${extractProblemDetailsMessage(err.error, 'Server error')}`);
              }
            }),
            catchError(() => of(null))
          );
        })
      )
    )
  }))
);
