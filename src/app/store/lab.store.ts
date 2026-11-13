import { inject, computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LabService } from '../services/lab.service';
import { LabOrder, LabTestTemplate, LabMetrics } from '../models/lab.model';
import { PagedResponse } from '../models/patient.model';
import { extractProblemDetailsMessage } from '../models/api.model';

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
    activeOrders: computed(() =>
      state.entities().filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled')
    ),
    completedOrders: computed(() => state.entities().filter((o) => o.status === 'Completed')),
    filteredOrders: computed(() => {
      let list = state.entities();
      const s = state.searchFilter().toLowerCase().trim();
      const status = state.statusFilter();
      const priority = state.priorityFilter();

      if (status !== 'ALL') {
        list = list.filter((o) => o.status === status);
      }
      if (priority !== 'ALL') {
        list = list.filter((o) => o.priority === priority);
      }
      if (s) {
        list = list.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(s) ||
            o.patientName.toLowerCase().includes(s) ||
            o.patientMedicalRecordNumber.toLowerCase().includes(s)
        );
      }
      return list;
    })
  })),
  withMethods((store, labService = inject(LabService)) => ({
    loadOrders: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          labService.getOrders(1, 100).pipe(
            tap({
              next: (res: PagedResponse<LabOrder> | LabOrder[]) => {
                const items: LabOrder[] = Array.isArray(res) ? res : res.items ?? [];
                patchState(store, setAllEntities(items), { isLoading: false });
              },
              error: (err: HttpErrorResponse) => {
                patchState(store, {
                  isLoading: false,
                  error: extractProblemDetailsMessage(err.error, err.message || 'Failed to load lab orders')
                });
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
              error: () => { }
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    setSearchFilter(searchFilter: string): void {
      patchState(store, { searchFilter });
    },

    setStatusFilter(statusFilter: string): void {
      patchState(store, { statusFilter });
    },

    setPriorityFilter(priorityFilter: string): void {
      patchState(store, { priorityFilter });
    },

    addTemplate(template: LabTestTemplate): void {
      patchState(store, { templates: [template, ...store.templates()] });
    },

    updateTemplateInStore(template: LabTestTemplate): void {
      const updated = store.templates().map((t) => (t.id === template.id ? template : t));
      patchState(store, { templates: updated });
    },

    removeTemplateFromStore(id: string): void {
      const remaining = store.templates().filter((t) => t.id !== id);
      patchState(store, { templates: remaining });
    }
  }))
);
