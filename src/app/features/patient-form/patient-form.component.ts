import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.scss']
})
export class PatientFormComponent {
  private fb = inject(FormBuilder);
  private patientService = inject(PatientService);
  private router = inject(Router);

  isSubmitting = signal(false);
  errorMessage = signal('');

  patientForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    dateOfBirth: ['', Validators.required],
    gender: ['Male', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.maxLength(20)]],
    email: ['', [Validators.email]],
    address: [''],
    bloodGroup: ['A+'],
    emergencyContactName: [''],
    emergencyContactPhone: ['']
  });

  onSubmit() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formVal = this.patientForm.value;
    const request: any = {
      firstName: formVal.firstName!,
      lastName: formVal.lastName!,
      dateOfBirth: formVal.dateOfBirth ? new Date(formVal.dateOfBirth).toISOString() : new Date().toISOString(),
      gender: formVal.gender!,
      phoneNumber: formVal.phoneNumber!,
      email: formVal.email || '',
      address: formVal.address || '',
      bloodGroup: formVal.bloodGroup || '',
      emergencyContactName: formVal.emergencyContactName || '',
      emergencyContactPhone: formVal.emergencyContactPhone || ''
    };

    this.patientService.create(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/patients']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.detail || error.error?.title || 'Failed to register patient');
      }
    });
  }
}
