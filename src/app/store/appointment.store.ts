import { inject, computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { AppointmentService } from '../services/appointment.service';
import { Appointment } from '../models/appointment.model';
import { ToastService } from '../ui/toast/toast.service';

interface AppointmentMetadataState {
  selectedDate: Date | null;
  isLoading: boolean;
  error: string | null;
}

const initialMetadataState: AppointmentMetadataState = {
  selectedDate: null,
  isLoading: false,
  error: null
};

export const AppointmentStore = signalStore(
  { providedIn: 'root' },
  withEntities<Appointment>(),
  withState(initialMetadataState),
  withComputed((state) => ({
    appointments: computed(() => state.entities()),
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
              next: (res: any) => {
                const items = Array.isArray(res) ? res : res?.items || [];
                patchState(store, setAllEntities(items), { isLoading: false });
              },
              error: (err) => {
                patchState(store, { isLoading: false, error: err.message || 'Failed to load appointments' });
              }
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    setSelectedDate(date: Date | null) {
      patchState(store, { selectedDate: date });
    },

    // TMS Pattern: Optimistic check-in with rollback
    checkIn(appointmentId: string) {
      const original = store.entities().find(a => a.id === appointmentId);
      if (!original) return;

      // Optimistic update
      patchState(store, updateEntity({ id: appointmentId, changes: { status: 'CheckedIn' } }));
      toast.info('Patient checked in');

      apptService.checkIn(appointmentId).subscribe({
        next: () => {
          toast.success('Check-in confirmed');
        },
        error: (err) => {
          // Rollback on error
          patchState(store, updateEntity({ id: appointmentId, changes: { status: original.status } }));
          toast.error(`Check-in failed: ${err.message || 'Server error'}`);
        }
      });
    },

    // TMS Pattern: Optimistic cancellation with rollback
    cancel(appointmentId: string) {
      const original = store.entities().find(a => a.id === appointmentId);
      if (!original) return;

      // Optimistic update
      patchState(store, updateEntity({ id: appointmentId, changes: { status: 'Cancelled' } }));
      toast.info('Appointment cancelled');

      apptService.cancel(appointmentId).subscribe({
        next: () => {
          toast.success('Cancellation confirmed');
        },
        error: (err) => {
          // Rollback on error
          patchState(store, updateEntity({ id: appointmentId, changes: { status: original.status } }));
          toast.error(`Cancellation failed: ${err.message || 'Server error'}`);
        }
      });
    }
  }))
);
