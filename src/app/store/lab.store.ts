import { inject, computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { setAllEntities, addEntity, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, exhaustMap } from 'rxjs';
import { LabService } from '../services/lab.service';
import { LabOrder, LabTestTemplate, LabMetrics } from '../models/lab.model';
import { ToastService } from '../ui/toast/toast.service';

interface LabState {
  isLoading: boolean;
  error: string | null;
  templates: LabTestTemplate[];
  metrics: LabMetrics | null;
  searchFilter: string;
  statusFilter: string;
  priorityFilter: string;
}

const initialLabState: LabState = {
  isLoading: false,
  error: null,
  templates: [],
  metrics: null,
  searchFilter: '',
  statusFilter: 'ALL',
  priorityFilter: 'ALL'
};

export const LabStore = signalStore(
  { providedIn: 'root' },
  withEntities<LabOrder>(),
  withState(initialLabState),
  withComputed((state) => ({
    allOrders: computed(() => state.entities()),
    activeOrders: computed(() => state.entities().filter(o => o.status !== 'Completed' && o.status !== 'Cancelled')),
    completedOrders: computed(() => state.entities().filter(o => o.status === 'Completed')),
    filteredOrders: computed(() => {
      let list = state.entities();
      const s = state.searchFilter().toLowerCase().trim();
      const status = state.statusFilter();
      const priority = state.priorityFilter();

      if (status !== 'ALL') {
        list = list.filter(o => o.status === status);
      }
      if (priority !== 'ALL') {
        list = list.filter(o => o.priority === priority);
      }
      if (s) {
        list = list.filter(o =>
          o.orderNumber.toLowerCase().includes(s) ||
          o.patientName.toLowerCase().includes(s) ||
          o.patientMedicalRecordNumber.toLowerCase().includes(s)
        );
      }
      return list;
    })
  })),
  withMethods((store, labService = inject(LabService), toast = inject(ToastService)) => ({
    loadOrders: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          labService.getOrders(1, 100).pipe(
            tap({
              next: (res: any) => {
                const items: LabOrder[] = res.items || (Array.isArray(res) ? res : []);
                patchState(store, setAllEntities(items), { isLoading: false });
              },
              error: (err) => {
                patchState(store, { isLoading: false, error: err.message || 'Failed to load lab orders' });
              }
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    loadTemplates: rxMethod<void>(
      pipe(
        switchMap(() =>
          labService.getTemplates().pipe(
            tap({
              next: (templates) => patchState(store, { templates }),
              error: () => patchState(store, { templates: [] })
            }),
            catchError(() => of([]))
          )
        )
      )
    ),

    loadMetrics: rxMethod<void>(
      pipe(
        switchMap(() =>
          labService.getMetrics().pipe(
            tap({
              next: (metrics) => patchState(store, { metrics }),
              error: () => {}
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    setSearchFilter(searchFilter: string) {
      patchState(store, { searchFilter });
    },

    setStatusFilter(statusFilter: string) {
      patchState(store, { statusFilter });
    },

    setPriorityFilter(priorityFilter: string) {
      patchState(store, { priorityFilter });
    }
  }))
);
