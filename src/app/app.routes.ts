import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { ShellComponent } from './shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/register/register.component')
      .then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/forgot-password/forgot-password.component')
      .then(m => m.ForgotPasswordComponent)
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'patients',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Nurse', 'Receptionist'])],
        loadComponent: () => import('./features/patient-list/patient-list.component')
          .then(m => m.PatientListComponent)
      },
      {
        path: 'patients/new',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Nurse', 'Receptionist'])],
        loadComponent: () => import('./features/patient-form/patient-form.component')
          .then(m => m.PatientFormComponent)
      },
      {
        path: 'patients/:id',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Nurse', 'Receptionist'])],
        loadComponent: () => import('./features/patient-detail/patient-detail.component')
          .then(m => m.PatientDetailComponent)
      },
      {
        path: 'appointments',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Patient'])],
        loadComponent: () => import('./features/appointment-list/appointment-list.component')
          .then(m => m.AppointmentListComponent)
      },
      {
        path: 'appointments/book',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Patient'])],
        loadComponent: () => import('./features/appointment-booking/appointment-booking.component')
          .then(m => m.AppointmentBookingComponent)
      },
      {
        path: 'schedules',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Receptionist'])],
        loadComponent: () => import('./features/doctor-schedules/doctor-schedules.component')
          .then(m => m.DoctorSchedulesComponent)
      },
      {
        path: 'pharmacy',
        canActivate: [roleGuard(['Admin', 'Pharmacist', 'Doctor'])],
        loadComponent: () => import('./features/pharmacy/pharmacy.component')
          .then(m => m.PharmacyComponent)
      },
      {
        path: 'billing',
        canActivate: [roleGuard(['Admin', 'Accountant', 'Receptionist'])],
        loadComponent: () => import('./features/billing/billing.component')
          .then(m => m.BillingComponent)
      },
      {
        path: 'reports',
        canActivate: [roleGuard(['Admin', 'Accountant'])],
        loadComponent: () => import('./features/reports/reports.component')
          .then(m => m.ReportsComponent)
      },
      {
        path: 'users',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/user-management/user-management.component')
          .then(m => m.UserManagementComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
