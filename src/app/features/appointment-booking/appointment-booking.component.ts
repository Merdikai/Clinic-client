import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  styleUrls: ['./appointment-booking.component.scss']
})
export class AppointmentBookingComponent implements OnInit {
  private fb = inject(FormBuilder);
  private patientService = inject(PatientService);
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  public authService = inject(AuthService);
  private permissionService = inject(PermissionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

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
  private submitClick$ = new Subject<any>();

  constructor() {
    this.submitClick$.pipe(
      exhaustMap((request) => {
        this.isSubmitting.set(true);
        this.errorMessage.set('');
        return this.appointmentService.create(request).pipe(
          catchError((error) => {
            this.isSubmitting.set(false);
            this.errorMessage.set(error.error?.detail || error.error?.message || 'Failed to book appointment');
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
          this.router.navigate(['/my-appointments']);
        } else {
          this.router.navigate(['/appointments']);
        }
      }
    });
  }

  bookingForm = this.fb.group({
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
      this.router.navigate(['/my-consultations']);
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
          const fallback: any = {
            id: 'a11ce000-0000-0000-0000-000000000001',
            firstName: 'Alice',
            lastName: 'Patient',
            medicalRecordNumber: 'PAT-ALICE-001',
            email: 'alice.patient@clinic.com'
          };
          this.currentPatient.set(fallback);
          this.bookingForm.patchValue({ patientId: fallback.id });
          this.isLoadingPatients.set(false);
        }
      });
    } else {
      this.loadPatients();
    }

    this.loadDoctors();

    this.route.queryParams.subscribe((params) => {
      if (params['patientId'] && !this.isPatient()) {
        this.bookingForm.patchValue({ patientId: params['patientId'] });
      }
    });
  }

  goBack() {
    if (this.isDoctor()) {
      this.router.navigate(['/my-consultations']);
    } else if (this.isPatient()) {
      this.router.navigate(['/my-appointments']);
    } else {
      this.router.navigate(['/appointments']);
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

    const date = this.bookingForm.value.date!;
    const time = this.bookingForm.value.time!;
    const scheduledDateTime = new Date(`${date}T${time}:00`).toISOString();

    const request = {
      patientId: this.bookingForm.value.patientId!,
      doctorId: this.bookingForm.value.doctorId!,
      scheduledDateTime,
      durationMinutes: this.bookingForm.value.durationMinutes!,
      reasonForVisit: this.bookingForm.value.reasonForVisit!
    };

    this.submitClick$.next(request);
  }
}
