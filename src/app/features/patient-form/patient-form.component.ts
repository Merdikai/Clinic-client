import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { debounceTime } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { PatientService, UpdatePatientRequest } from '../../services/patient.service';
import { CreatePatientRequest, Patient } from '../../models/patient.model';
import { MpiLookupResult } from '../../models/reception.model';
import { ResultEnvelope, extractProblemDetailsMessage, unwrapResult } from '../../models/api.model';
import { combineDateAndTimeToUtcIso, toPlainDateIso } from '../../shared/utils/temporal.util';
import { ToastService } from '../../ui/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent
  ],
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.scss']
})
export class PatientFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly editId = signal<string | null>(null);
  readonly isLoadingPatient = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly commonAllergies = [
    'No Known Drug Allergies (NKDA)',
    'Penicillin',
    'Amoxicillin',
    'Sulfa Drugs',
    'Aspirin / NSAIDs',
    'Latex',
    'Peanuts'
  ];

  readonly mpiMatches = signal<MpiLookupResult[]>([]);
  readonly isCheckingMpi = signal(false);
  readonly isVerifyingEligibility = signal(false);
  readonly eligibilityVerified = signal(false);

  readonly patientForm = this.fb.group({
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

  readonly completionCount = computed(() => {
    const f = this.patientForm.controls;
    let count = 0;
    if (f.firstName.value?.trim()) count++;
    if (f.lastName.value?.trim()) count++;
    if (f.dateOfBirth.value) count++;
    if (f.gender.value) count++;
    if (f.phoneNumber.value?.trim()) count++;
    return count;
  });

  eligibilityTone(): 'success' | 'info' | 'neutral' {
    if (this.eligibilityVerified()) return 'success';
    const provider = this.patientForm.get('insuranceProvider')?.value || '';
    if (provider.includes('Self-Pay')) return 'info';
    return 'neutral';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.isLoadingPatient.set(true);
      this.patientService.getById(id).subscribe({
        next: (response: Patient | ResultEnvelope<Patient>) => {
          this.isLoadingPatient.set(false);
          const patient = unwrapResult(response) as Patient & {
            phoneNumber?: string;
            emergencyContactName?: string;
            emergencyContactPhone?: string;
          };
          if (!patient) return;

          let emName = patient.emergencyContactName || '';
          let emPhone = patient.emergencyContactPhone || '';

          if (!emName && patient.emergencyContact) {
            const match = patient.emergencyContact.match(/^(.*?)(?:\s*\((.*?)\))?$/);
            emName = match && match[1] ? match[1].trim() : patient.emergencyContact;
            emPhone = match && match[2] ? match[2].trim() : '';
          }

          const dobString = toPlainDateIso(patient.dateOfBirth);

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
          if (
            patient.insuranceEligibilityStatus?.includes('Verified') ||
            patient.insuranceEligibilityStatus?.includes('Active')
          ) {
            this.eligibilityVerified.set(true);
          }
        },
        error: () => {
          this.isLoadingPatient.set(false);
          this.toast.error('Failed to load patient information');
        }
      });
    }

    if (!this.editId()) {
      this.patientForm.valueChanges
        .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
        .subscribe((val) => {
          const phone = (val.phoneNumber || '').trim();
          const natId = (val.nationalId || '').trim();
          const fName = (val.firstName || '').trim();
          const lName = (val.lastName || '').trim();

          if (phone.length >= 7 || natId.length >= 4 || (fName.length >= 3 && lName.length >= 3)) {
            this.isCheckingMpi.set(true);
            this.patientService
              .mpiLookup(undefined, natId || undefined, phone || undefined, fName || undefined, lName || undefined)
              .subscribe({
                next: (matches) => {
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

  verifyInsurance(): void {
    const provider = (this.patientForm.get('insuranceProvider')?.value ?? '').trim();
    const policy = (this.patientForm.get('insurancePolicyNumber')?.value ?? '').trim();
    const coveragePlan = (this.patientForm.get('insuranceCoveragePlan')?.value ?? '').trim();
    const nationalId = (this.patientForm.get('nationalId')?.value ?? '').trim();

    if (!provider || provider.toLowerCase().includes('self-pay')) {
      this.toast.info('Self-pay patient selected. No external payer verification required.');
      this.eligibilityVerified.set(false);
      this.patientForm.patchValue({ insuranceEligibilityStatus: 'Self-Pay' });
      return;
    }

    if (policy.length < 4) {
      this.toast.warning(
        'Please enter a valid Policy / Member ID number (at least 4 characters) before running verification.'
      );
      return;
    }

    this.isVerifyingEligibility.set(true);
    this.patientService
      .verifyInsurance({
        provider,
        policyNumber: policy,
        coveragePlan: coveragePlan || undefined,
        patientNationalId: nationalId || undefined
      })
      .subscribe({
        next: (result) => {
          this.isVerifyingEligibility.set(false);
          this.eligibilityVerified.set(result.isEligible);
          this.patientForm.patchValue({
            insuranceEligibilityStatus: result.eligibilityStatus,
            insuranceCoveragePlan: result.coveragePlan || coveragePlan || 'Standard Plan'
          });
          if (result.isEligible) {
            this.toast.success(
              `Eligibility verified (${result.provider} · Ref ${result.verificationReference}, copay ${result.copayPercentage}%, cap $${result.annualRemainingCap}).`
            );
          } else {
            this.toast.warning(`Eligibility status: ${result.eligibilityStatus} (${result.verificationReference}).`);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isVerifyingEligibility.set(false);
          this.eligibilityVerified.set(false);
          this.toast.error(extractProblemDetailsMessage(err.error, 'Insurance eligibility clearinghouse unavailable.'));
        }
      });
  }

  addAllergyTag(tag: string): void {
    const current = this.patientForm.get('allergies')?.value || '';
    if (!current.trim() || tag === 'No Known Drug Allergies (NKDA)') {
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

  onSubmit(): void {
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

    const dobIso = combineDateAndTimeToUtcIso(formVal.dateOfBirth || new Date(), '00:00');
    const phoneTrimmed = (formVal.phoneNumber || '').trim();

    if (this.editId()) {
      const updatePayload: UpdatePatientRequest = {
        firstName: formVal.firstName!.trim(),
        lastName: formVal.lastName!.trim(),
        dateOfBirth: dobIso,
        gender: formVal.gender!,
        phone: phoneTrimmed,
        phoneNumber: phoneTrimmed,
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

      this.patientService.update(this.editId()!, updatePayload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success('Patient details updated successfully!');
          void this.router.navigate(['/patients']);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          const msg = extractProblemDetailsMessage(error.error, 'Failed to update patient details');
          this.errorMessage.set(msg);
          this.toast.error(msg);
        }
      });
    } else {
      const createPayload: CreatePatientRequest = {
        firstName: formVal.firstName!.trim(),
        lastName: formVal.lastName!.trim(),
        dateOfBirth: dobIso,
        gender: formVal.gender!,
        phone: phoneTrimmed,
        email: (formVal.email || '').trim(),
        address: (formVal.address || '').trim(),
        bloodGroup: formVal.bloodGroup || 'A+',
        nationalId: (formVal.nationalId || '').trim(),
        insuranceProvider: (formVal.insuranceProvider || 'Self-Pay / Private').trim(),
        insurancePolicyNumber: (formVal.insurancePolicyNumber || '').trim(),
        insuranceCoveragePlan: (formVal.insuranceCoveragePlan || 'Standard Out-of-Pocket').trim(),
        insuranceEligibilityStatus: (formVal.insuranceEligibilityStatus || 'Self-Pay').trim(),
        allergies: (formVal.allergies || '').trim(),
        emergencyContact: emContact
      };

      this.patientService.create(createPayload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success('Patient registered successfully! New EMR created.');
          void this.router.navigate(['/patients']);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          const msg = extractProblemDetailsMessage(error.error, 'Failed to register patient');
          this.errorMessage.set(msg);
          this.toast.error(msg);
        }
      });
    }
  }
}
