import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BillingService } from '../../services/billing.service';
import { Invoice } from '../../models/billing.model';
import { PatientMedicalHistoryDto, PatientService, UpdatePatientRequest } from '../../services/patient.service';
import { FileUploadService } from '../../services/file-upload.service';
import { PagedResponse, Patient } from '../../models/patient.model';
import { Appointment } from '../../models/appointment.model';
import { ResultEnvelope, extractProblemDetailsMessage, unwrapResult } from '../../models/api.model';
import { FileUploadResponse } from '../../models/file-upload.model';
import { ToastService } from '../../ui/toast/toast.service';
import { LabService } from '../../services/lab.service';
import { LabOrder } from '../../models/lab.model';
import { RadiologyService } from '../../services/radiology.service';
import { RadiologyOrder } from '../../models/radiology.model';
import { EmrAccessService } from '../../services/emr-access.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { LiveSyncService } from '../../services/live-sync.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { calculateAgeFromDob, combineDateAndTimeToUtcIso, toPlainDateIso } from '../../shared/utils/temporal.util';

export interface ParsedLabParameterItem {
  readonly name: string;
  readonly value: string | number;
  readonly unit: string;
  readonly normalText?: string;
  readonly minRef?: number;
  readonly maxRef?: number;
  readonly flag?: string;
}

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientDetailComponent implements OnInit {
  id = input.required<string>();
  private readonly patientService = inject(PatientService);
  private readonly fileService = inject(FileUploadService);
  private readonly toast = inject(ToastService);
  private readonly billingService = inject(BillingService);
  private readonly labService = inject(LabService);
  private readonly radiologyService = inject(RadiologyService);
  private readonly emrAccessService = inject(EmrAccessService);
  private readonly liveSync = inject(LiveSyncService);
  private readonly destroyRef = inject(DestroyRef);
  public readonly authService = inject(AuthService);
  public readonly permissionService = inject(PermissionService);

  // Reactive Angular 22 rxResource for patient chart lookup when id route param changes
  readonly patientResource = rxResource<Patient | null, string>({
    params: () => this.id(),
    stream: ({ params: patientId }) =>
      patientId
        ? this.patientService.getById(patientId).pipe(
            map((res) => unwrapResult(res)),
            catchError(() => of(null))
          )
        : of(null)
  });

  isReceptionist = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'receptionist' || this.authService.hasRole('Receptionist');
  });

  isDoctor = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'doctor' || this.authService.hasRole('Doctor');
  });

  isNurse = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'nurse' || this.authService.hasRole('Nurse');
  });

  isRadiologist = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'radiologist' || this.authService.hasRole('Radiologist');
  });

  isAdmin = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'admin' || this.authService.hasRole('Admin');
  });

  canEditPatient = computed(() => {
    return this.isAdmin() || this.isDoctor() || this.isNurse() || this.isReceptionist();
  });

  canCreateAppointment = computed(() => {
    return !this.isDoctor() && !this.isRadiologist();
  });

  canOpenLaboratory = computed(() => {
    return this.isDoctor() || this.isNurse() || this.isRadiologist();
  });

  canOpenRadiology = computed(() => {
    return this.isDoctor() || this.isRadiologist() || this.isNurse();
  });

  readonly patient = signal<Patient | null>(null);
  readonly patientAge = computed(() => calculateAgeFromDob(this.patient()?.dateOfBirth));

  patientFullName = computed(() => {
    const p = this.patient() ?? this.patientResource.value() ?? null;
    if (!p) return 'Patient Chart';
    return `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient Chart';
  });

  assignedDoctorName = computed(() => {
    const appts = this.patientAppointments();
    if (appts.length > 0) {
      const activeAppt =
        appts.find((a) => a.status === 'Scheduled' || a.status === 'CheckedIn' || a.status === 'InConsultation') ??
        appts[0];
      if (activeAppt?.doctorName) return `Dr. ${activeAppt.doctorName}`;
    }
    const visits = this.history()?.visits;
    const firstVisit = visits?.[0];
    if (firstVisit?.doctorName) {
      return `Dr. ${firstVisit.doctorName}`;
    }
    return null;
  });

  isAttendingDoctor = computed(() => {
    if (!this.isDoctor()) return false;
    if (this.authService.isAdmin() || (this.permissionService.activeRole() || '').toLowerCase() === 'admin') return true;
    const currentId = this.authService.currentUserId();
    if (!currentId) return false;

    const appts = this.patientAppointments();
    if (appts.length > 0) {
      const hasMyActiveAppt = appts.some((a) => a.doctorId && a.doctorId.toLowerCase() === currentId.toLowerCase());
      if (hasMyActiveAppt) return true;
    }
    const visits = this.history()?.visits;
    if (visits && visits.length > 0) {
      const hasMyVisit = visits.some((v) => v.doctorId && v.doctorId.toLowerCase() === currentId.toLowerCase());
      if (hasMyVisit) return true;
    }
    return false;
  });

  patientLabOrders = signal<LabOrder[]>([]);
  patientRadiologyOrders = signal<RadiologyOrder[]>([]);
  patientAppointments = signal<Appointment[]>([]);

  isBreakGlassModalOpen = signal<boolean>(false);
  breakGlassReason = signal<string>('');
  isTriggeringBreakGlass = signal<boolean>(false);

  history = signal<PatientMedicalHistoryDto | null>(null);
  files = signal<FileUploadResponse[]>([]);
  isLoading = signal(false);
  isUploading = signal(false);

  patientInvoices = signal<Invoice[]>([]);
  selectedInvoice = signal<Invoice | null>(null);
  paymentAmount = signal<number>(0);
  paymentMethod = signal<string>('Cash');
  isPaymentModalOpen = signal(false);
  isProcessingPayment = signal(false);

  emergencyContactName = computed(() => {
    const p = this.patient();
    const raw = p?.emergencyContact || p?.emergencyContactName || '';
    if (!raw) return 'Not Provided';
    const match = raw.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    return match && match[1] ? match[1].trim() : raw;
  });

  emergencyContactPhone = computed(() => {
    const p = this.patient();
    const raw = p?.emergencyContact || '';
    const directPhone = p?.emergencyContactPhone;
    if (directPhone) return directPhone;
    if (!raw) return 'Not Provided';
    const match = raw.match(/\((.*?)\)/);
    return match && match[1] ? match[1].trim() : 'Not Provided';
  });

  isEditModalOpen = signal<boolean>(false);
  isSavingPatient = signal<boolean>(false);

  editForm = signal<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    email: string;
    address: string;
    bloodGroup: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    allergies: string;
    nationalId: string;
    insuranceProvider: string;
    insurancePolicyNumber: string;
    insuranceCoveragePlan: string;
    insuranceEligibilityStatus: string;
  }>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    bloodGroup: 'O+',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    nationalId: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceCoveragePlan: '',
    insuranceEligibilityStatus: 'Active / Eligible'
  });

  totalInvoiced = computed(() => this.patientInvoices().reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0));
  totalBalanceDue = computed(() => this.patientInvoices().reduce((acc, inv) => acc + (Number(inv.balanceDue) || 0), 0));
  totalPaid = computed(() => Math.max(0, this.totalInvoiced() - this.totalBalanceDue()));

  constructor() {
    // Sync resource value into local mutable patient signal
    effect(() => {
      const resourcePatient = this.patientResource.value();
      if (resourcePatient) {
        this.patient.set(resourcePatient);
        this.isLoading.set(false);
      } else if (!this.patientResource.isLoading()) {
        this.isLoading.set(false);
      }
    });

    // Subscribe to SignalR patient-specific real-time chart updates
    effect((onCleanup) => {
      const patientId = this.id();
      if (!patientId) return;
      void this.liveSync.subscribeToPatient(patientId);
      onCleanup(() => {
        void this.liveSync.unsubscribeFromPatient(patientId);
      });
    });

    this.liveSync.reconnected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ prolonged }) => {
        if (prolonged) {
          this.refreshAllPatientSections();
        }
      });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isBreakGlassModalOpen()) {
      this.isBreakGlassModalOpen.set(false);
    } else if (this.isPaymentModalOpen()) {
      this.closePaymentModal();
    } else if (this.isEditModalOpen()) {
      this.closeEditModal();
    }
  }

  triggerBreakGlass() {
    const reason = this.breakGlassReason().trim();
    if (!reason) {
      this.toast.error('Clinical emergency justification is mandatory.');
      return;
    }

    this.isTriggeringBreakGlass.set(true);
    this.emrAccessService.breakGlass(this.id(), reason).subscribe({
      next: () => {
        this.isTriggeringBreakGlass.set(false);
        this.isBreakGlassModalOpen.set(false);
        this.breakGlassReason.set('');
        this.toast.success('Emergency Break-Glass granted and security audit logged.');
      },
      error: (err: HttpErrorResponse) => {
        this.isTriggeringBreakGlass.set(false);
        this.toast.error(extractProblemDetailsMessage(err.error, 'Failed to authorize break-glass override.'));
      }
    });
  }

  openEditModal() {
    const p = this.patient();
    if (!p) return;

    let ecName = '';
    let ecPhone = '';
    const rawEc = p.emergencyContact || p.emergencyContactName || '';
    const match = rawEc.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    if (match) {
      ecName = match[1]?.trim() || '';
      ecPhone = match[2]?.trim() || p.emergencyContactPhone || '';
    } else {
      ecName = rawEc;
      ecPhone = p.emergencyContactPhone || '';
    }

    const dobStr = toPlainDateIso(p.dateOfBirth);

    this.editForm.set({
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      dateOfBirth: dobStr,
      gender: p.gender || 'Male',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      bloodGroup: p.bloodGroup || p.bloodType || 'O+',
      emergencyContactName: ecName,
      emergencyContactPhone: ecPhone,
      allergies: p.allergies || '',
      nationalId: p.nationalId || '',
      insuranceProvider: p.insuranceProvider || '',
      insurancePolicyNumber: p.insurancePolicyNumber || '',
      insuranceCoveragePlan: p.insuranceCoveragePlan || '',
      insuranceEligibilityStatus: p.insuranceEligibilityStatus || 'Active / Eligible'
    });
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
  }

  savePatientEdit() {
    const form = this.editForm();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      this.toast.error('First Name, Last Name, and Phone Number are required.');
      return;
    }

    this.isSavingPatient.set(true);
    const emergencyContactFormatted = form.emergencyContactPhone
      ? `${form.emergencyContactName} (${form.emergencyContactPhone})`
      : form.emergencyContactName;

    const payload: UpdatePatientRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: combineDateAndTimeToUtcIso(form.dateOfBirth, '00:00'),
      gender: form.gender,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      bloodGroup: form.bloodGroup,
      emergencyContact: emergencyContactFormatted,
      allergies: form.allergies.trim(),
      nationalId: form.nationalId.trim(),
      insuranceProvider: form.insuranceProvider.trim(),
      insurancePolicyNumber: form.insurancePolicyNumber.trim(),
      insuranceCoveragePlan: form.insuranceCoveragePlan.trim(),
      insuranceEligibilityStatus: form.insuranceEligibilityStatus
    };

    this.patientService.update(this.id(), payload).subscribe({
      next: (res) => {
        this.isSavingPatient.set(false);
        this.isEditModalOpen.set(false);
        const updated = unwrapResult(res);
        const current = this.patient();
        this.patient.set(updated ?? (current ? { ...current, ...payload } : null));
        this.toast.success('Patient demographics and insurance file updated.');
        this.refreshAllPatientSections();
      },
      error: (err: HttpErrorResponse) => {
        this.isSavingPatient.set(false);
        this.toast.error(extractProblemDetailsMessage(err.error, 'Failed to update patient file.'));
      }
    });
  }

  loadPatientProfile() {
    this.patientResource.reload();
  }

  loadMedicalHistory() {
    this.patientService.getMedicalHistory(this.id()).subscribe({
      next: (h) => {
        this.history.set(unwrapResult(h));
      },
      error: () => { }
    });
  }

  ngOnInit() {
    this.isLoading.set(true);
    this.patientService.getById(this.id()).subscribe({
      next: (data) => {
        const patient = unwrapResult(data);
        this.patient.set(patient);
        this.isLoading.set(false);

        this.emrAccessService.logAccess(this.id(), 'ViewChart', 'Clinical chart opened').subscribe({
          next: () => { },
          error: () => { }
        });
      },
      error: () => this.isLoading.set(false)
    });

    this.refreshAllPatientSections();
  }

  private refreshAllPatientSections(): void {
    this.loadMedicalHistory();
    this.loadFiles();
    this.loadInvoices();
    this.loadLabOrders();
    this.loadRadiologyOrders();
    this.loadAppointments();
  }

  loadAppointments() {
    this.patientService.getAppointments(this.id()).subscribe({
      next: (appts: Appointment[] | { items?: Appointment[] }) => {
        const list = Array.isArray(appts) ? appts : (appts.items ?? []);
        this.patientAppointments.set(list);
      },
      error: () => this.patientAppointments.set([])
    });
  }

  loadFiles() {
    this.fileService.getPatientFiles(this.id()).subscribe({
      next: (files: FileUploadResponse[]) => {
        this.files.set(Array.isArray(files) ? files : []);
      },
      error: () => {
        this.files.set([]);
      }
    });
  }

  loadInvoices() {
    this.billingService.getInvoicesByPatient(this.id()).subscribe({
      next: (res: Invoice[] | PagedResponse<Invoice>) => {
        const list: Invoice[] = Array.isArray(res) ? res : (res.items ?? []);
        this.patientInvoices.set(list);
      },
      error: () => this.patientInvoices.set([])
    });
  }

  copyPrescriptionId(id: string) {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(id).then(() => {
        this.toast.success('Prescription ID copied to clipboard.');
      });
    } else {
      this.toast.success('Prescription ID: ' + id);
    }
  }

  downloadFile(file: FileUploadResponse) {
    this.toast.info('Downloading ' + (file.originalFileName || file.fileName) + '...');
    this.fileService.downloadPatientFile(this.id(), file.fileName).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.originalFileName || file.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toast.success('Download complete.');
      },
      error: () => {
        this.toast.error('Failed to download file');
      }
    });
  }

  downloadInvoicePdf(invoice: Invoice) {
    this.billingService.downloadPdf(invoice.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toast.success('Invoice PDF downloaded.');
      },
      error: () => {
        this.toast.error('Failed to download invoice PDF');
      }
    });
  }

  openPaymentModal(invoice: Invoice) {
    this.selectedInvoice.set(invoice);
    this.paymentAmount.set(invoice.balanceDue || invoice.totalAmount || 0);
    this.paymentMethod.set('Cash');
    this.isPaymentModalOpen.set(true);
  }

  closePaymentModal() {
    this.isPaymentModalOpen.set(false);
    this.selectedInvoice.set(null);
  }

  submitPayment() {
    const inv = this.selectedInvoice();
    if (!inv) return;

    if (this.paymentAmount() <= 0) {
      this.toast.error('Payment amount must be greater than zero');
      return;
    }

    this.isProcessingPayment.set(true);
    this.billingService
      .processPayment({
        invoiceId: inv.id,
        amountPaid: Number(this.paymentAmount()),
        paymentMethod: this.paymentMethod()
      })
      .subscribe({
        next: () => {
          this.isProcessingPayment.set(false);
          this.isPaymentModalOpen.set(false);
          this.toast.success(`Payment of ${this.paymentAmount()} processed.`);
          this.loadInvoices();
          this.loadLabOrders();
        },
        error: (err: HttpErrorResponse) => {
          this.isProcessingPayment.set(false);
          this.toast.error(extractProblemDetailsMessage(err.error, 'Payment processing failed'));
        }
      });
  }

  onFileSelected(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;

    this.isUploading.set(true);

    this.fileService.uploadPatientFile(this.id(), file).subscribe({
      next: (res: FileUploadResponse | ResultEnvelope<FileUploadResponse>) => {
        const uploaded = unwrapResult(res);
        this.files.update((list) => [uploaded, ...list]);
        this.isUploading.set(false);
        inputEl.value = '';
        this.toast.success(`File '${file.name}' uploaded.`);
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading.set(false);
        inputEl.value = '';
        this.toast.error(extractProblemDetailsMessage(err.error, 'File upload failed'));
      }
    });
  }

  loadLabOrders() {
    const patientId = this.id();
    if (!patientId) return;
    this.labService.getOrdersByPatient(patientId).subscribe({
      next: (orders) => this.patientLabOrders.set(orders),
      error: () => this.patientLabOrders.set([])
    });
  }

  loadRadiologyOrders() {
    const patientId = this.id();
    if (!patientId) return;
    this.radiologyService.getOrders(patientId).subscribe({
      next: (orders) => this.patientRadiologyOrders.set(orders || []),
      error: () => this.patientRadiologyOrders.set([])
    });
  }

  getParsedLabResults(json: string): ParsedLabParameterItem[] {
    try {
      const parsed: unknown = JSON.parse(json);
      return Array.isArray(parsed) ? (parsed as ParsedLabParameterItem[]) : [];
    } catch {
      return [];
    }
  }
}
