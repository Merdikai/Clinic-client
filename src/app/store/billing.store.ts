import { inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { computed } from '@angular/core';
import { pipe, switchMap, tap } from 'rxjs';
import { BillingService } from '../services/billing.service';
import { Invoice } from '../models/billing.model';

interface BillingState {
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;
}

const initialState: BillingState = {
  invoices: [],
  isLoading: false,
  error: null
};

export const BillingStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((state) => ({
    totalRevenue: computed(() =>
      state.invoices()
        .filter(i => i.status === 'Paid')
        .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
    ),
    outstandingBalance: computed(() =>
      state.invoices()
        .filter(i => i.status === 'Unpaid' || i.status === 'PartiallyPaid')
        .reduce((sum, i) => sum + (i.balanceDue || 0), 0)
    )
  })),

  withMethods((store, billingService = inject(BillingService)) => ({
    loadInvoices: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          billingService.getInvoices().pipe(
            tap({
              next: (response: any) => {
                const items = Array.isArray(response) ? response : (response.items || []);
                patchState(store, {
                  invoices: items,
                  isLoading: false
                });
              },
              error: (error) => {
                patchState(store, { isLoading: false, error: error.message || 'Failed to load invoices' });
              }
            })
          )
        )
      )
    ),

    createInvoice: rxMethod<any>(
      pipe(
        tap(() => patchState(store, { isLoading: true })),
        switchMap((request) =>
          billingService.createInvoice(request).pipe(
            tap({
              next: (invoice) => {
                patchState(store, {
                  invoices: [...store.invoices(), invoice],
                  isLoading: false
                });
              },
              error: (error) => {
                patchState(store, { isLoading: false, error: error.message || 'Failed to create invoice' });
              }
            })
          )
        )
      )
    ),

    processPayment(invoiceId: string, amountPaid: number, method: string) {
      billingService.processPayment({
        invoiceId,
        amountPaid,
        paymentMethod: method,
        transactionReference: ''
      }).subscribe({
        next: () => {
          patchState(store, {
            invoices: store.invoices().map(inv => {
              if (inv.id === invoiceId) {
                const newBalance = inv.balanceDue - amountPaid;
                return {
                  ...inv,
                  balanceDue: newBalance,
                  status: newBalance <= 0 ? 'Paid' : 'PartiallyPaid'
                };
              }
              return inv;
            })
          });
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
        }
      });
    }
  }))
);
