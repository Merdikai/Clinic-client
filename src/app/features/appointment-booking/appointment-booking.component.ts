import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, of } from 'rxjs';
import { exhaustMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PatientService } from '../../services/patient.service';
import { DoctorService, DoctorDto } from '../../services/doctor.service';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { ToastService } from '../../ui/toast/toast.service';
import { Patient } from '../../models/patient.model';
import { CreateAppointmentRequest } from '../../models/appointment.model';
import { extractProblemDetailsMessage } from '../../models/api.model';
import { combineDateAndTimeToUtcIso } from '../../shared/utils/temporal.util';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';

@Component({
  selector: 'app-appointment-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent
  ],
  templateUrl: './appointment-booking.component.html',
  styleUrls: ['./appointment-booking.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentBookingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly doctorService = inject(DoctorService);
  private readonly appointmentService = inject(AppointmentService);
  public readonly authService = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  isDoctor = computed(() => this.authService.isDoctor());
  isPatient = computed(() =>
    this.authService.isPatient() ||
    this.authService.userRoles().includes('Patient') ||
    this.permissionService.activeRole() === 'Patient'
  );

  currentPatient = signal<Patient | null>(null);
  patients = signal<Patient[]>([]);
  doctors = signal<DoctorDto[]>([]);
  isLoadingPatients = signal(false);
  isLoadingDoctors = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');

  // Defensive RxJS mutation pipeline
  private readonly submitClick$ = new Subject<CreateAppointmentRequest>();

  constructor() {
    this.submitClick$.pipe(
      exhaustMap((request) => {
        this.isSubmitting.set(true);
        this.errorMessage.set('');
        return this.appointmentService.create(request).pipe(
          catchError((error: HttpErrorResponse) => {
            this.isSubmitting.set(false);
            this.errorMessage.set(extractProblemDetailsMessage(error.error, 'Failed to book appointment'));
            return of(null);
          })
        );
      }),
      takeUntilDestroyed()
    ).subscribe((response) => {
      if (response) {
        this.isSubmitting.set(false);
        this.toast.success('Appointment booked successfully.');
        if (this.isPatient()) {
          void this.router.navigate(['/my-appointments']);
        } else {
          void this.router.navigate(['/appointments']);
        }
      }
    });
  }

  bookingForm = this.fb.nonNullable.group({
    patientId: ['', Validators.required],
    doctorId: ['', Validators.required],
    date: ['', Validators.required],
    time: ['', Validators.required],
    durationMinutes: [30, [Validators.required, Validators.min(10), Validators.max(120)]],
    reasonForVisit: ['', [Validators.required, Validators.maxLength(500)]]
  });

  ngOnInit() {
    if (this.isDoctor()) {
      this.toast.info('Doctors do not book appointments directly.');
      void this.router.navigate(['/my-consultations']);
      return;
    }

    if (this.isPatient()) {
      this.isLoadingPatients.set(true);
      this.patientService.getMyProfile().subscribe({
        next: (pat: Patient) => {
          this.currentPatient.set(pat);
          this.bookingForm.patchValue({ patientId: pat.id });
          this.isLoadingPatients.set(false);
        },
        error: () => {
          this.isLoadingPatients.set(false);
          this.errorMessage.set('Unable to verify your patient profile. Please ensure you are signed in with your patient account.');
          this.toast.error('Unable to load your patient profile.');
        }
      });
    } else {
      this.loadPatients();
    }

    this.loadDoctors();

    this.route.queryParams.subscribe((params) => {
      const patientIdParam = params['patientId'] as string | undefined;
      if (patientIdParam && !this.isPatient()) {
        this.bookingForm.patchValue({ patientId: patientIdParam });
      }
    });
  }

  goBack() {
    if (this.isDoctor()) {
      void this.router.navigate(['/my-consultations']);
    } else if (this.isPatient()) {
      void this.router.navigate(['/my-appointments']);
    } else {
      void this.router.navigate(['/appointments']);
    }
  }

  loadPatients() {
    this.isLoadingPatients.set(true);
    this.patientService.getAll(1, 100).subscribe({
      next: (res) => {
        this.patients.set(res.items || []);
        this.isLoadingPatients.set(false);
      },
      error: () => this.isLoadingPatients.set(false)
    });
  }

  loadDoctors() {
    this.isLoadingDoctors.set(true);
    this.doctorService.getAllDoctors().subscribe({
      next: (docs) => {
        this.doctors.set(docs || []);
        this.isLoadingDoctors.set(false);
      },
      error: () => this.isLoadingDoctors.set(false)
    });
  }

  onSubmit() {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const raw = this.bookingForm.getRawValue();
    const scheduledDateTime = combineDateAndTimeToUtcIso(raw.date, raw.time);

    const request: CreateAppointmentRequest = {
      patientId: raw.patientId,
      doctorId: raw.doctorId,
      scheduledDateTime,
      durationMinutes: raw.durationMinutes,
      reasonForVisit: raw.reasonForVisit
    };

    this.submitClick$.next(request);
  }
}
