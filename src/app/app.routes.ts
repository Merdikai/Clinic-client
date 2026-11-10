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
    path: 'reset-password',
    loadComponent: () => import('./features/reset-password/reset-password.component')
      .then(m => m.ResetPasswordComponent)
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
        path: 'my-appointments',
        canActivate: [roleGuard(['Patient'])],
        loadComponent: () => import('./features/patient-portal/my-appointments/my-appointments.component')
          .then(m => m.MyAppointmentsComponent)
      },
      {
        path: 'my-medical-file',
        canActivate: [roleGuard(['Patient'])],
        loadComponent: () => import('./features/patient-portal/my-medical-file/my-medical-file.component')
          .then(m => m.MyMedicalFileComponent)
      },
      {
        path: 'my-prescriptions',
        canActivate: [roleGuard(['Patient'])],
        loadComponent: () => import('./features/patient-portal/my-prescriptions/my-prescriptions.component')
          .then(m => m.MyPrescriptionsComponent)
      },
      {
        path: 'my-invoices',
        canActivate: [roleGuard(['Patient'])],
        loadComponent: () => import('./features/patient-portal/my-invoices/my-invoices.component')
          .then(m => m.MyInvoicesComponent)
      },
      {
        path: 'my-consultations',
        canActivate: [roleGuard(['Doctor'])],
        loadComponent: () => import('./features/doctor-portal/my-consultations/my-consultations.component')
          .then(m => m.MyConsultationsComponent)
      },
      {
        path: 'doctor-inbasket',
        canActivate: [roleGuard(['Doctor', 'Radiologist'])],
        loadComponent: () => import('./features/doctor-portal/doctor-inbasket/doctor-inbasket.component')
          .then(m => m.DoctorInbasketComponent)
      },
      {
        path: 'my-patients',
        canActivate: [roleGuard(['Doctor'])],
        loadComponent: () => import('./features/doctor-portal/my-patients/my-patients.component')
          .then(m => m.MyPatientsComponent)
      },
      {
        path: 'radiology',
        canActivate: [roleGuard(['Doctor', 'Radiologist', 'Nurse'])],
        loadComponent: () => import('./features/radiology/radiology.component')
          .then(m => m.RadiologyComponent)
      },
      {
        path: 'patients',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'LabTechnician', 'Accountant', 'Radiologist'])],
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
        path: 'patients/edit/:id',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Nurse', 'Receptionist'])],
        loadComponent: () => import('./features/patient-form/patient-form.component')
          .then(m => m.PatientFormComponent)
      },
      {
        path: 'patients/:id/edit',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Nurse', 'Receptionist'])],
        loadComponent: () => import('./features/patient-form/patient-form.component')
          .then(m => m.PatientFormComponent)
      },
      {
        path: 'patients/:id',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'LabTechnician', 'Accountant', 'Radiologist', 'Patient'])],
        loadComponent: () => import('./features/patient-detail/patient-detail.component')
          .then(m => m.PatientDetailComponent)
      },
      {
        path: 'appointments',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Nurse', 'Receptionist'])],
        loadComponent: () => import('./features/appointment-list/appointment-list.component')
          .then(m => m.AppointmentListComponent)
      },
      {
        path: 'appointments/book',
        canActivate: [roleGuard(['Nurse', 'Receptionist', 'Patient'])],
        loadComponent: () => import('./features/appointment-booking/appointment-booking.component')
          .then(m => m.AppointmentBookingComponent)
      },
      {
        path: 'schedules',
        canActivate: [roleGuard(['Admin', 'Doctor', 'Receptionist', 'Nurse', 'Radiologist', 'LabTechnician', 'Accountant'])],
        loadComponent: () => import('./features/doctor-schedules/doctor-schedules.component')
          .then(m => m.DoctorSchedulesComponent)
      },
      {
        path: 'laboratory',
        canActivate: [roleGuard(['Doctor', 'LabTechnician', 'Nurse', 'Radiologist'])],
        loadComponent: () => import('./features/laboratory/laboratory.component')
          .then(m => m.LaboratoryComponent)
      },
      {
        path: 'pharmacy',
        canActivate: [roleGuard(['Pharmacist', 'Doctor', 'Nurse'])],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'prescriptions'
          },
          {
            path: 'prescriptions',
            loadComponent: () => import('./features/pharmacy/pharmacy.component')
              .then(m => m.PharmacyComponent)
          },
          {
            path: 'pos',
            loadComponent: () => import('./features/pharmacy/pharmacy.component')
              .then(m => m.PharmacyComponent)
          },
          {
            path: 'formulary',
            loadComponent: () => import('./features/pharmacy/pharmacy.component')
              .then(m => m.PharmacyComponent)
          },
          {
            path: 'requisitions',
            loadComponent: () => import('./features/pharmacy/pharmacy.component')
              .then(m => m.PharmacyComponent)
          },
          {
            path: 'audit',
            loadComponent: () => import('./features/pharmacy/pharmacy.component')
              .then(m => m.PharmacyComponent)
          },
          {
            path: 'controlled',
            redirectTo: 'audit'
          }
        ]
      },
      {
        path: 'nurse/procedures',
        canActivate: [roleGuard(['Nurse'])],
        loadComponent: () => import('./features/nursing-procedures/nursing-procedures.component')
          .then(m => m.NursingProceduresComponent)
      },
      {
        path: 'nurse/handover',
        canActivate: [roleGuard(['Nurse'])],
        loadComponent: () => import('./features/shift-handover/shift-handover.component')
          .then(m => m.ShiftHandoverComponent)
      },
      {
        path: 'billing',
        canActivate: [roleGuard(['Accountant', 'Receptionist', 'Pharmacist', 'Doctor', 'LabTechnician'])],
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
        canActivate: [roleGuard(['Admin', 'Doctor'])],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'directory'
          },
          {
            path: 'directory',
            loadComponent: () => import('./features/user-management/user-management.component')
              .then(m => m.UserManagementComponent)
          },
          {
            path: 'pbac',
            loadComponent: () => import('./features/user-management/user-management.component')
              .then(m => m.UserManagementComponent)
          },
          {
            path: 'audit',
            loadComponent: () => import('./features/user-management/user-management.component')
              .then(m => m.UserManagementComponent)
          },
          {
            path: 'roster',
            loadComponent: () => import('./features/user-management/user-management.component')
              .then(m => m.UserManagementComponent)
          }
        ]
      },
      {
        path: '403',
        loadComponent: () => import('./features/access-denied/access-denied.component')
          .then(m => m.AccessDeniedComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '404',
    loadComponent: () => import('./features/not-found/not-found.component')
      .then(m => m.NotFoundComponent)
  },
  {
    path: '**',
    redirectTo: '404'
  }
];
