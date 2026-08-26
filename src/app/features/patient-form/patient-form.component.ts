import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PatientService } from '../../services/patient.service';
import { ToastService } from '../../ui/toast/toast.service';

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
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.scss']
})
export class PatientFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private patientService = inject(PatientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  editId = signal<string | null>(null);
  isSubmitting = signal(false);
  errorMessage = signal('');

  patientForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    dateOfBirth: ['', Validators.required],
    gender: ['Male', Validators.required],
    phoneNumber: ['', [Validators.maxLength(20)]],
    email: ['', [Validators.email]],
    address: [''],
    bloodGroup: ['A+'],
    emergencyContactName: [''],
    emergencyContactPhone: ['']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.patientService.getById(id).subscribe({
        next: (p: any) => {
          const patient = p?.isSuccess !== undefined ? p.value : p;
          if (!patient) return;

          let emName = patient.emergencyContactName || '';
          let emPhone = patient.emergencyContactPhone || '';

          if (!emName && patient.emergencyContact) {
            const match = patient.emergencyContact.match(/^(.*?)(?:\s*\((.*?)\))?$/);
            emName = match && match[1] ? match[1].trim() : patient.emergencyContact;
            emPhone = match && match[2] ? match[2].trim() : '';
          }

          this.patientForm.patchValue({
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            dateOfBirth: patient.dateOfBirth ? (new Date(patient.dateOfBirth) as any) : '',
            gender: patient.gender || 'Male',
            phoneNumber: patient.phone || patient.phoneNumber || '',
            email: patient.email || '',
            address: patient.address || '',
            bloodGroup: patient.bloodGroup || patient.bloodType || 'A+',
            emergencyContactName: emName,
            emergencyContactPhone: emPhone
          });
        },
        error: () => {
          this.toast.error('Failed to load patient information');
        }
      });
    }
  }

  onSubmit() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formVal = this.patientForm.value;
    const emContact = formVal.emergencyContactName
      ? `${formVal.emergencyContactName}${formVal.emergencyContactPhone ? ` (${formVal.emergencyContactPhone})` : ''}`
      : '';

    const request: any = {
      firstName: formVal.firstName!.trim(),
      lastName: formVal.lastName!.trim(),
      dateOfBirth: formVal.dateOfBirth ? new Date(formVal.dateOfBirth).toISOString() : new Date().toISOString(),
      gender: formVal.gender!,
      phone: (formVal.phoneNumber || '').trim(),
      phoneNumber: (formVal.phoneNumber || '').trim(),
      email: (formVal.email || '').trim(),
      address: (formVal.address || '').trim(),
      bloodGroup: formVal.bloodGroup || 'A+',
      emergencyContact: emContact,
      emergencyContactName: (formVal.emergencyContactName || '').trim(),
      emergencyContactPhone: (formVal.emergencyContactPhone || '').trim()
    };

    if (this.editId()) {
      this.patientService.update(this.editId()!, request).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success('Patient details updated successfully!');
          this.router.navigate(['/patients']);
        },
        error: (error) => {
          this.isSubmitting.set(false);
          const msg = error.error?.detail || error.error?.title || 'Failed to update patient';
          this.errorMessage.set(msg);
          this.toast.error(msg);
        }
      });
    } else {
      this.patientService.create(request).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success('Patient registered successfully!');
          this.router.navigate(['/patients']);
        },
        error: (error) => {
          this.isSubmitting.set(false);
          const msg = error.error?.detail || error.error?.title || 'Failed to register patient';
          this.errorMessage.set(msg);
          this.toast.error(msg);
        }
      });
    }
  }
}
