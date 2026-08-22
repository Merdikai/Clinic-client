import { inject, computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { setAllEntities, addEntity, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, exhaustMap } from 'rxjs';
import { BillingService } from '../services/billing.service';
import { Invoice } from '../models/billing.model';
import { ToastService } from '../ui/toast/toast.service';

interface BillingMetadataState {
  isLoading: boolean;
  error: string | null;
}

const initialMetadataState: BillingMetadataState = {
  isLoading: false,
  error: null
};

export const BillingStore = signalStore(
  { providedIn: 'root' },
  withEntities<Invoice>(),
  withState(initialMetadataState),
  withComputed((state) => ({
    invoices: computed(() => state.entities()),
    totalRevenue: computed(() =>
      state.entities()
        .filter(i => i.status === 'Paid')
        .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
    ),
    outstandingBalance: computed(() =>
      state.entities()
        .filter(i => i.status === 'Unpaid' || i.status === 'PartiallyPaid')
        .reduce((sum, i) => sum + (i.balanceDue || 0), 0)
    )
  })),
  withMethods((store, billingService = inject(BillingService), toast = inject(ToastService)) => ({
    loadInvoices: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          billingService.getInvoices().pipe(
            tap({
              next: (response: any) => {
                const items = Array.isArray(response) ? response : (response.items || []);
                patchState(store, setAllEntities(items), { isLoading: false });
              },
              error: (error) => {
                patchState(store, { isLoading: false, error: error.message || 'Failed to load invoices' });
              }
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    createInvoice: rxMethod<any>(
      pipe(
        tap(() => patchState(store, { isLoading: true })),
        exhaustMap((request) =>
          billingService.createInvoice(request).pipe(
            tap({
              next: (invoice) => {
                patchState(store, addEntity(invoice), { isLoading: false });
                toast.success(`Invoice ${invoice.invoiceNumber || ''} created successfully!`);
              },
              error: (error) => {
                patchState(store, { isLoading: false, error: error.message || 'Failed to create invoice' });
              }
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    // TMS Pattern: Optimistic Payment with rollback
    processPayment(invoiceId: string, amountPaid: number, method: string) {
      const original = store.entities().find(i => i.id === invoiceId);
      if (!original) return;

      const newBalance = Math.max(0, original.balanceDue - amountPaid);
      const newStatus = newBalance <= 0 ? 'Paid' : 'PartiallyPaid';

      patchState(store, updateEntity({
        id: invoiceId,
        changes: { balanceDue: newBalance, status: newStatus }
      }));

      billingService.processPayment({
        invoiceId,
        amountPaid,
        paymentMethod: method,
        transactionReference: ''
      }).subscribe({
        next: () => {
          toast.success(`Payment of $${amountPaid} processed successfully!`);
        },
        error: (err) => {
          // Rollback on error
          patchState(store, updateEntity({
            id: invoiceId,
            changes: { balanceDue: original.balanceDue, status: original.status }
          }));
          toast.error(`Payment failed: ${err.message || 'Server error'}`);
        }
      });
    },

    downloadInvoicePdf(invoiceId: string) {
      billingService.downloadPdf(invoiceId).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `invoice-${invoiceId}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          toast.info('Downloading invoice PDF...');
        },
        error: () => toast.error('Failed to download invoice PDF')
      });
    }
  }))
);
