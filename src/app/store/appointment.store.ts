import { inject, computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { AppointmentService } from '../services/appointment.service';
import { Appointment } from '../models/appointment.model';

interface AppointmentState {
  appointments: Appointment[];
  selectedDate: Date | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AppointmentState = {
  appointments: [],
  selectedDate: null,
  isLoading: false,
  error: null
};

export const AppointmentStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => ({
    scheduledAppointments: computed(() => state.appointments().filter((a) => a.status === 'Scheduled')),
    checkedInAppointments: computed(() => state.appointments().filter((a) => a.status === 'CheckedIn')),
    completedAppointments: computed(() => state.appointments().filter((a) => a.status === 'Completed'))
  })),
  withMethods((store, apptService = inject(AppointmentService)) => ({
    loadAppointments: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          apptService.getAll().pipe(
            tap({
              next: (res: any) => {
                const items = Array.isArray(res) ? res : res?.items || [];
                patchState(store, { appointments: items, isLoading: false });
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
    checkIn(appointmentId: string) {
      apptService.checkIn(appointmentId).subscribe({
        next: () => {
          patchState(store, {
            appointments: store.appointments().map((a) =>
              a.id === appointmentId ? { ...a, status: 'CheckedIn' } : a
            )
          });
        }
      });
    },
    cancel(appointmentId: string) {
      apptService.cancel(appointmentId).subscribe({
        next: () => {
          patchState(store, {
            appointments: store.appointments().map((a) =>
              a.id === appointmentId ? { ...a, status: 'Cancelled' } : a
            )
          });
        }
      });
    }
  }))
);
