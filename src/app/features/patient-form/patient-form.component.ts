import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-patient-form',
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
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.scss']
})
export class PatientFormComponent {
  private fb = inject(FormBuilder);
  private patientService = inject(PatientService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isSubmitting = signal(false);
  errorMessage = signal('');

  patientForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    dateOfBirth: ['', Validators.required],
    gender: ['', Validators.required],
    phone: ['', [Validators.required, Validators.maxLength(20)]],
    email: ['', [Validators.email]],
    address: ['', [Validators.maxLength(500)]],
    bloodGroup: [''],
    emergencyContact: ['']
  });

  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  genders = ['Male', 'Female', 'Other'];

  onSubmit() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const request = {
      firstName: this.patientForm.value.firstName!,
      lastName: this.patientForm.value.lastName!,
      dateOfBirth: new Date(this.patientForm.value.dateOfBirth!).toISOString(),
      gender: this.patientForm.value.gender!,
      phone: this.patientForm.value.phone!,
      email: this.patientForm.value.email || '',
      address: this.patientForm.value.address || '',
      bloodGroup: this.patientForm.value.bloodGroup || '',
      emergencyContact: this.patientForm.value.emergencyContact || ''
    };

    this.patientService.create(request).subscribe({
      next: (patient) => {
        this.isSubmitting.set(false);
        this.snackBar.open('Patient created successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/patients', patient.id]);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.detail || error.error?.message || 'Failed to create patient');
      }
    });
  }
}
