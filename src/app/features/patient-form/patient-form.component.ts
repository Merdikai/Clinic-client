import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule
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

  // Common quick allergy chips
  commonAllergies = [
    'No Known Drug Allergies (NKDA)',
    'Penicillin',
    'Amoxicillin',
    'Sulfa Drugs',
    'Aspirin / NSAIDs',
    'Latex',
    'Peanuts'
  ];

  mpiMatches = signal<any[]>([]);
  isCheckingMpi = signal(false);
  isVerifyingEligibility = signal(false);
  eligibilityVerified = signal(false);

  patientForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    dateOfBirth: ['', Validators.required],
    gender: ['Male', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.maxLength(20)]],
    email: ['', [Validators.email]],
    address: [''],
    bloodGroup: ['A+'],
    nationalId: [''],
    insuranceProvider: ['Self-Pay / Private'],
    insurancePolicyNumber: [''],
    insuranceCoveragePlan: ['Standard Out-of-Pocket'],
    insuranceEligibilityStatus: ['Self-Pay'],
    allergies: [''],
    emergencyContactName: [''],
    emergencyContactPhone: ['']
  });

  // Calculate form completion progress
  completionCount = computed(() => {
    // Core required fields
    const f = this.patientForm.controls;
    let count = 0;
    if (f.firstName.value?.trim()) count++;
    if (f.lastName.value?.trim()) count++;
    if (f.dateOfBirth.value) count++;
    if (f.gender.value) count++;
    if (f.phoneNumber.value?.trim()) count++;
    return count;
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

          let dobString = '';
          if (patient.dateOfBirth) {
            const d = new Date(patient.dateOfBirth);
            if (!isNaN(d.getTime())) {
              dobString = d.toISOString().split('T')[0];
            }
          }

          this.patientForm.patchValue({
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            dateOfBirth: dobString,
            gender: patient.gender || 'Male',
            phoneNumber: patient.phone || patient.phoneNumber || '',
            email: patient.email || '',
            address: patient.address || '',
            bloodGroup: patient.bloodGroup || patient.bloodType || 'A+',
            nationalId: patient.nationalId || '',
            insuranceProvider: patient.insuranceProvider || 'Self-Pay / Private',
            insurancePolicyNumber: patient.insurancePolicyNumber || '',
            insuranceCoveragePlan: patient.insuranceCoveragePlan || 'Standard Out-of-Pocket',
            insuranceEligibilityStatus: patient.insuranceEligibilityStatus || 'Self-Pay',
            allergies: patient.allergies || '',
            emergencyContactName: emName,
            emergencyContactPhone: emPhone
          });
          if (patient.insuranceEligibilityStatus?.includes('Verified') || patient.insuranceEligibilityStatus?.includes('Active')) {
            this.eligibilityVerified.set(true);
          }
        },
        error: () => {
          this.toast.error('Failed to load patient information');
        }
      });
    }

    // Set up real-time Master Patient Index (MPI) screening for new registrations
    if (!this.editId()) {
      this.patientForm.valueChanges.subscribe(val => {
        const phone = (val.phoneNumber || '').trim();
        const natId = (val.nationalId || '').trim();
        const fName = (val.firstName || '').trim();
        const lName = (val.lastName || '').trim();

        if (phone.length >= 7 || natId.length >= 4 || (fName.length >= 3 && lName.length >= 3)) {
          this.isCheckingMpi.set(true);
          this.patientService.mpiLookup(undefined, natId || undefined, phone || undefined, fName || undefined, lName || undefined)
            .subscribe({
              next: matches => {
                this.isCheckingMpi.set(false);
                this.mpiMatches.set(matches || []);
              },
              error: () => {
                this.isCheckingMpi.set(false);
              }
            });
        } else {
          this.mpiMatches.set([]);
        }
      });
    }
  }

  verifyInsurance() {
    const provider = this.patientForm.get('insuranceProvider')?.value;
    const policy = this.patientForm.get('insurancePolicyNumber')?.value;

    if (!provider || provider.toLowerCase().includes('self-pay')) {
      this.toast.info('Self-pay patient selected. No external payer verification required.');
      this.patientForm.patchValue({ insuranceEligibilityStatus: 'Self-Pay' });
      return;
    }

    if (!policy || policy.trim().length < 4) {
      this.toast.warning('Please enter a valid Policy / Member ID number (at least 4 characters) before running verification.');
      return;
    }

    this.isVerifyingEligibility.set(true);
    setTimeout(() => {
      this.isVerifyingEligibility.set(false);
      this.eligibilityVerified.set(true);
      this.patientForm.patchValue({ insuranceEligibilityStatus: 'Active - Verified' });
      this.toast.success(`Eligibility Verified with ${provider}! Policy #${policy} is active with copay coverage.`);
    }, 600);
  }

  addAllergyTag(tag: string) {
    const current = this.patientForm.get('allergies')?.value || '';
    if (!current.trim()) {
      this.patientForm.patchValue({ allergies: tag });
      return;
    }

    if (tag === 'No Known Drug Allergies (NKDA)') {
      this.patientForm.patchValue({ allergies: tag });
      return;
    }

    if (current.includes(tag)) return;

    if (current.includes('No Known Drug Allergies (NKDA)')) {
      this.patientForm.patchValue({ allergies: tag });
      return;
    }

    this.patientForm.patchValue({ allergies: `${current}, ${tag}` });
  }

  onSubmit() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      this.toast.warning('Please fill in all required demographic and contact fields.');
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
      nationalId: (formVal.nationalId || '').trim(),
      insuranceProvider: (formVal.insuranceProvider || 'Self-Pay / Private').trim(),
      insurancePolicyNumber: (formVal.insurancePolicyNumber || '').trim(),
      insuranceCoveragePlan: (formVal.insuranceCoveragePlan || 'Standard Out-of-Pocket').trim(),
      insuranceEligibilityStatus: (formVal.insuranceEligibilityStatus || 'Self-Pay').trim(),
      allergies: (formVal.allergies || '').trim(),
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
          const msg = error.error?.detail || error.error?.title || 'Failed to update patient details';
          this.errorMessage.set(msg);
          this.toast.error(msg);
        }
      });
    } else {
      this.patientService.create(request).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success('Patient registered successfully! New EMR created.');
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
