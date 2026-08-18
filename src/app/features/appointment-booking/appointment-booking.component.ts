import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppointmentService } from '../../services/appointment.service';

@Component({
  selector: 'app-appointment-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './appointment-booking.component.html',
  styleUrls: ['./appointment-booking.component.scss']
})
export class AppointmentBookingComponent {
  private fb = inject(FormBuilder);
  private apptService = inject(AppointmentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  bookingForm = this.fb.group({
    patientId: ['', Validators.required],
    doctorId: ['', Validators.required],
    scheduledDateTime: ['', Validators.required],
    durationMinutes: [30],
    reasonForVisit: ['', Validators.required]
  });

  isLoading = signal(false);
  errorMessage = signal('');

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['patientId']) {
        this.bookingForm.patchValue({ patientId: params['patientId'] });
      }
    });
  }

  onSubmit() {
    if (this.bookingForm.invalid) return;
    this.isLoading.set(true);
    this.apptService.create(this.bookingForm.value as any).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/appointments']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to book appointment');
      }
    });
  }
}
