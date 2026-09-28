import { Component, inject, signal, computed, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { BillingService } from '../../services/billing.service';
import { Invoice } from '../../models/billing.model';
import { PatientService } from '../../services/patient.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Patient } from '../../models/patient.model';
import { FileUploadResponse } from '../../models/file-upload.model';
import { ToastService } from '../../ui/toast/toast.service';
import { LabService } from '../../services/lab.service';
import { LabOrder } from '../../models/lab.model';
import { RadiologyService } from '../../services/radiology.service';
import { RadiologyOrder } from '../../models/radiology.model';
import { EmrAccessService } from '../../services/emr-access.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.scss']
})
export class PatientDetailComponent implements OnInit {
  id = input.required<string>();
  private patientService = inject(PatientService);
  private fileService   = inject(FileUploadService);
  private toast         = inject(ToastService);
  private billingService = inject(BillingService);
  private labService = inject(LabService);
  private radiologyService = inject(RadiologyService);
  private emrAccessService = inject(EmrAccessService);
  public authService = inject(AuthService);
  public permissionService = inject(PermissionService);

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

  canCreateAppointment = computed(() => {
    return !this.isDoctor() && !this.isRadiologist();
  });

  assignedDoctorName = computed(() => {
    const appts = this.patientAppointments();
    if (appts && appts.length > 0) {
      const activeAppt = appts.find((a: any) => a.status === 'Scheduled' || a.status === 'CheckedIn' || a.status === 'InConsultation') || appts[0];
      if (activeAppt?.doctorName) return `Dr. ${activeAppt.doctorName}`;
    }
    const visits = this.history()?.visits;
    if (visits && visits.length > 0 && visits[0].doctorName) {
      return `Dr. ${visits[0].doctorName}`;
    }
    return null;
  });

  isAttendingDoctor = computed(() => {
    if (!this.isDoctor()) return false;
    if (this.authService.isAdmin() || (this.permissionService.activeRole() || '').toLowerCase() === 'admin') return true;
    const currentId = this.authService.currentUserId();
    if (!currentId) return false;
    
    const appts = this.patientAppointments();
    if (appts && appts.length > 0) {
      const hasMyActiveAppt = appts.some((a: any) => a.doctorId && a.doctorId.toLowerCase() === currentId.toLowerCase());
      if (hasMyActiveAppt) return true;
    }
    const visits = this.history()?.visits;
    if (visits && visits.length > 0) {
      const hasMyVisit = visits.some((v: any) => v.doctorId && v.doctorId.toLowerCase() === currentId.toLowerCase());
      if (hasMyVisit) return true;
    }
    return false;
  });

  patientLabOrders = signal<LabOrder[]>([]);
  patientRadiologyOrders = signal<RadiologyOrder[]>([]);
  patientAppointments = signal<any[]>([]);

  // Break-Glass Emergency State
  isBreakGlassModalOpen = signal<boolean>(false);
  breakGlassReason = signal<string>('');
  isTriggeringBreakGlass = signal<boolean>(false);

  triggerBreakGlass() {
    const reason = this.breakGlassReason().trim();
    if (!reason) {
      this.toast.error('Clinical emergency justification is mandatory.');
      return;
    }

    this.isTriggeringBreakGlass.set(true);
    this.emrAccessService.breakGlass(this.id(), reason).subscribe({
      next: (res: any) => {
        this.isTriggeringBreakGlass.set(false);
        this.isBreakGlassModalOpen.set(false);
        this.breakGlassReason.set('');
        this.toast.success('🚨 Emergency Break-Glass granted and security audit logged.');
      },
      error: (err: any) => {
        this.isTriggeringBreakGlass.set(false);
        this.toast.error(err?.error?.detail || 'Failed to authorize break-glass override.');
      }
    });
  }


  patient   = signal<Patient | null>(null);
  history   = signal<any>(null);
  files     = signal<FileUploadResponse[]>([]);
  isLoading   = signal(false);
  isUploading = signal(false);

  // Billing / Invoice signals
  patientInvoices      = signal<Invoice[]>([]);
  selectedInvoice      = signal<Invoice | null>(null);
  paymentAmount        = signal<number>(0);
  paymentMethod        = signal<string>('Cash');
  isPaymentModalOpen   = signal(false);
  isProcessingPayment  = signal(false);

  emergencyContactName = computed(() => {
    const raw = this.patient()?.emergencyContact || (this.patient() as any)?.emergencyContactName || '';
    if (!raw) return 'Not Provided';
    const match = raw.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    return match && match[1] ? match[1].trim() : raw;
  });

  emergencyContactPhone = computed(() => {
    const raw = this.patient()?.emergencyContact || '';
    const directPhone = (this.patient() as any)?.emergencyContactPhone;
    if (directPhone) return directPhone;
    if (!raw) return 'Not Provided';
    const match = raw.match(/\((.*?)\)/);
    return match ? match[1].trim() : 'Not Provided';
  });

  // Edit Patient Details Modal State
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

  // Financial summary computeds
  totalInvoiced = computed(() => this.patientInvoices().reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0));
  totalBalanceDue = computed(() => this.patientInvoices().reduce((acc, inv) => acc + (Number(inv.balanceDue) || 0), 0));
  totalPaid = computed(() => Math.max(0, this.totalInvoiced() - this.totalBalanceDue()));

  openEditModal() {
    const p = this.patient();
    if (!p) return;

    let ecName = '';
    let ecPhone = '';
    const rawEc = p.emergencyContact || (p as any)?.emergencyContactName || '';
    const match = rawEc.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    if (match) {
      ecName = match[1]?.trim() || '';
      ecPhone = match[2]?.trim() || (p as any)?.emergencyContactPhone || '';
    } else {
      ecName = rawEc;
      ecPhone = (p as any)?.emergencyContactPhone || '';
    }

    let dobStr = '';
    if (p.dateOfBirth) {
      try {
        dobStr = new Date(p.dateOfBirth).toISOString().split('T')[0];
      } catch {
        dobStr = p.dateOfBirth;
      }
    }

    this.editForm.set({
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      dateOfBirth: dobStr,
      gender: p.gender || 'Male',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      bloodGroup: p.bloodGroup || (p as any).bloodType || 'O+',
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

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : new Date().toISOString(),
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
      next: (res: any) => {
        this.isSavingPatient.set(false);
        this.isEditModalOpen.set(false);
        const updated = (res as any)?.isSuccess !== undefined ? res.value : res;
        this.patient.set(updated || { ...this.patient()!, ...payload });
        this.toast.success('Patient demographics & clinical insurance file successfully updated!');
        
        // Reload all sections to ensure sync
        this.loadPatientProfile();
        this.loadMedicalHistory();
        this.loadAppointments();
        this.loadInvoices();
        this.loadFiles();
        this.loadLabOrders();
      },
      error: (err: any) => {
        this.isSavingPatient.set(false);
        const msg = err.error?.detail || err.error?.title || 'Failed to update patient file.';
        this.toast.error(msg);
      }
    });
  }

  loadPatientProfile() {
    this.patientService.getById(this.id()).subscribe({
      next: (data) => {
        const patient = (data as any)?.isSuccess !== undefined ? (data as any).value : data;
        this.patient.set(patient);
      },
      error: () => {}
    });
  }

  loadMedicalHistory() {
    this.patientService.getMedicalHistory(this.id()).subscribe({
      next: (h: any) => {
        const data = h && h.isSuccess !== undefined ? h.value : h;
        this.history.set(data);
      },
      error: () => {}
    });
  }

  ngOnInit() {
    this.isLoading.set(true);
    this.patientService.getById(this.id()).subscribe({
      next: (data) => {
        const patient = (data as any)?.isSuccess !== undefined ? (data as any).value : data;
        this.patient.set(patient);
        this.isLoading.set(false);

        // HIPAA §164.312(b): Log every EMR chart access event
        this.emrAccessService.logAccess(this.id(), 'ViewChart', 'Clinical chart opened').subscribe({
          next: () => {},
          error: () => {} // fire-and-forget — audit failure must never block clinical workflow
        });
      },
      error: () => this.isLoading.set(false)
    });

    this.loadMedicalHistory();
    this.loadFiles();
    this.loadInvoices();
    this.loadLabOrders();
    this.loadRadiologyOrders();
    this.loadAppointments();
  }

  loadAppointments() {
    this.patientService.getAppointments(this.id()).subscribe({
      next: (appts: any) => {
        const list = Array.isArray(appts) ? appts : (appts?.items || []);
        this.patientAppointments.set(list);
      },
      error: () => this.patientAppointments.set([])
    });
  }

  loadFiles() {
    this.fileService.getPatientFiles(this.id()).subscribe({
      next: (files: any) => {
        // API returns an array directly (controller calls result.Value)
        const list: FileUploadResponse[] = Array.isArray(files) ? files : [];
        this.files.set(list);
      },
      error: () => {
        // Silently fail — shows empty state
        this.files.set([]);
      }
    });
  }

  loadInvoices() {
    this.billingService.getInvoicesByPatient(this.id()).subscribe({
      next: (res: any) => {
        const list: Invoice[] = Array.isArray(res) ? res : res?.items || [];
        this.patientInvoices.set(list);
      },
      error: () => this.patientInvoices.set([])
    });
  }

  copyPrescriptionId(id: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id).then(() => {
        this.toast.success('Prescription ID copied to clipboard!');
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
        this.toast.success('Download complete!');
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
        this.toast.success('Invoice PDF downloaded successfully!');
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
    this.billingService.processPayment({
      invoiceId: inv.id,
      amountPaid: Number(this.paymentAmount()),
      paymentMethod: this.paymentMethod()
    }).subscribe({
      next: () => {
        this.isProcessingPayment.set(false);
        this.isPaymentModalOpen.set(false);
        this.toast.success(`Payment of ${this.paymentAmount()} processed successfully!`);
        this.loadInvoices();
    this.loadLabOrders();
      },
      error: (err: any) => {
        this.isProcessingPayment.set(false);
        const msg = err.error?.detail || err.error?.title || 'Payment processing failed';
        this.toast.error(msg);
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploading.set(true);

    this.fileService.uploadPatientFile(this.id(), file).subscribe({
      next: (res: any) => {
        const uploaded: FileUploadResponse = (res as any)?.isSuccess !== undefined ? (res as any).value : res;
        this.files.update((list) => [uploaded, ...list]);
        this.isUploading.set(false);
        input.value = '';
        this.toast.success(`File '${file.name}' uploaded successfully!`);
      },
      error: (err: any) => {
        this.isUploading.set(false);
        input.value = '';
        const msg = err.error?.detail || err.error?.title || 'File upload failed';
        this.toast.error(msg);
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

  getParsedLabResults(json: string): any[] {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }
}
