import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'patients',
    loadComponent: () => import('./features/patient-list/patient-list.component')
      .then(m => m.PatientListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'patients/:id',
    loadComponent: () => import('./features/patient-detail/patient-detail.component')
      .then(m => m.PatientDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'appointments',
    loadComponent: () => import('./features/appointment-list/appointment-list.component')
      .then(m => m.AppointmentListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'appointments/book',
    loadComponent: () => import('./features/appointment-booking/appointment-booking.component')
      .then(m => m.AppointmentBookingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pharmacy',
    loadComponent: () => import('./features/pharmacy/pharmacy.component')
      .then(m => m.PharmacyComponent),
    canActivate: [authGuard]
  },
  {
    path: 'billing',
    loadComponent: () => import('./features/billing/billing.component')
      .then(m => m.BillingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.component')
      .then(m => m.ReportsComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: '/patients',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/patients'
  }
];
