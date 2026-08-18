import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { PatientService } from '../../services/patient.service';
import { DoctorService, DoctorDto } from '../../services/doctor.service';
import { AppointmentService } from '../../services/appointment.service';
import { Patient } from '../../models/patient.model';

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
    MatSnackBarModule
  ],
  templateUrl: './appointment-booking.component.html',
  styleUrls: ['./appointment-booking.component.scss']
})
export class AppointmentBookingComponent implements OnInit {
  private fb = inject(FormBuilder);
  private patientService = inject(PatientService);
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  patients = signal<Patient[]>([]);
  doctors = signal<DoctorDto[]>([]);
  isSubmitting = signal(false);
  errorMessage = signal('');

  bookingForm = this.fb.group({
    patientId: ['', Validators.required],
    doctorId: ['', Validators.required],
    date: ['', Validators.required],
    time: ['', Validators.required],
    durationMinutes: [30, [Validators.required, Validators.min(10), Validators.max(120)]],
    reasonForVisit: ['', [Validators.required, Validators.maxLength(500)]]
  });

  ngOnInit() {
    this.loadPatients();
    this.loadDoctors();

    this.route.queryParams.subscribe((params) => {
      if (params['patientId']) {
        this.bookingForm.patchValue({ patientId: params['patientId'] });
      }
    });
  }

  loadPatients() {
    this.patientService.getAll(1, 100).subscribe({
      next: (res) => this.patients.set(res.items || []),
      error: () => {}
    });
  }

  loadDoctors() {
    this.doctorService.getAllDoctors().subscribe({
      next: (docs) => this.doctors.set(docs || []),
      error: () => {}
    });
  }

  onSubmit() {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

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

    this.appointmentService.create(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.snackBar.open('Appointment booked successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/appointments']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.detail || error.error?.message || 'Failed to book appointment');
      }
    });
  }
}
