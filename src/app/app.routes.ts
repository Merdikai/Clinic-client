import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { ShellComponent } from './shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'patients',
        loadComponent: () =>
          import('./features/patient-list/patient-list.component').then((m) => m.PatientListComponent)
      },
      {
        path: 'patients/new',
        loadComponent: () =>
          import('./features/patient-form/patient-form.component').then((m) => m.PatientFormComponent)
      },
      {
        path: 'patients/:id',
        loadComponent: () =>
          import('./features/patient-detail/patient-detail.component').then((m) => m.PatientDetailComponent)
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/appointment-list/appointment-list.component').then((m) => m.AppointmentListComponent)
      },
      {
        path: 'appointments/book',
        loadComponent: () =>
          import('./features/appointment-booking/appointment-booking.component').then(
            (m) => m.AppointmentBookingComponent
          )
      },
      {
        path: 'pharmacy',
        loadComponent: () =>
          import('./features/pharmacy/pharmacy.component').then((m) => m.PharmacyComponent)
      },
      {
        path: 'billing',
        loadComponent: () =>
          import('./features/billing/billing.component').then((m) => m.BillingComponent)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent)
      },
      {
        path: '',
        redirectTo: 'patients',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
