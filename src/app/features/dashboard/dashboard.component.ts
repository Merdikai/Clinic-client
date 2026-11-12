import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardService, DashboardSummary } from '../../services/dashboard.service';
import { LabStore } from '../../store/lab.store';
import { LiveSyncService } from '../../services/live-sync.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ToastService } from '../../ui/toast/toast.service';
import { AppointmentService } from '../../services/appointment.service';
import { PrescriptionService } from '../../services/prescription.service';
import { BillingService } from '../../services/billing.service';
import { PatientService } from '../../services/patient.service';
import { NursingService } from '../../services/nursing.service';
import { VitalSignsService } from '../../services/vital-signs.service';
import { PermissionService } from '../../services/permission.service';
import { ReceptionService } from '../../services/reception.service';
import { PharmacyService, PharmacyMetrics } from '../../services/pharmacy.service';
import { FinanceService } from '../../services/finance.service';
import { RadiologyService } from '../../services/radiology.service';
import { Patient } from '../../models/patient.model';
import { Appointment } from '../../models/appointment.model';
import { Prescription } from '../../models/prescription.model';
import { Invoice } from '../../models/billing.model';
import { ShiftHandover } from '../../models/nursing.model';
import { Medicine } from '../../models/medicine.model';
import { DailyCashSummary, VisitorInquiry, MpiLookupResult } from '../../models/reception.model';
import { FinanceDashboardMetrics } from '../../models/finance.model';
import { RadiologyMetrics, RadiologyOrder } from '../../models/radiology.model';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  host: {
    '(document:keydown.escape)': 'onEscapeKey()'
  },
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private liveSync = inject(LiveSyncService);
  public authService = inject(AuthService);
  public labStore = inject(LabStore);
  private permissionService = inject(PermissionService);
  private appointmentService = inject(AppointmentService);
  private prescriptionService = inject(PrescriptionService);
  private billingService = inject(BillingService);
  private patientService = inject(PatientService);
  private nursingService = inject(NursingService);
  private vitalSignsService = inject(VitalSignsService);
  private receptionService = inject(ReceptionService);
  private pharmacyService = inject(PharmacyService);
  private financeService = inject(FinanceService);
  private radiologyService = inject(RadiologyService);
  private notifService = inject(NotificationService);
  private toast = inject(ToastService);

  summary = signal<DashboardSummary | null>(null);
  isLoading = signal(true);
  recentEvents = this.liveSync.globalActivities;

  userRole = computed(() => {
    return this.permissionService.activeRole() || this.authService.userRoles()[0] || 'Admin';
  });

  isPatientView = computed(() => this.userRole().toLowerCase() === 'patient');
  isReceptionistView = computed(() => this.userRole().toLowerCase() === 'receptionist');
  isPharmacistView = computed(() => this.userRole().toLowerCase() === 'pharmacist');
  isRadiologistView = computed(() => this.userRole().toLowerCase() === 'radiologist');
  isAccountantView = computed(() => {
    const role = this.userRole().toLowerCase();
    return role === 'accountant' || role === 'finance' || role === 'financeofficer';
  });

  dashboardTitle = computed(() => {
    switch (this.userRole().toLowerCase()) {
      case 'doctor': return 'Physician Dashboard';
      case 'nurse': return 'Nursing & Triage Dashboard';
      case 'receptionist': return 'Front Desk Dashboard';
      case 'pharmacist': return 'Dispensary Dashboard';
      case 'accountant':
      case 'finance':
      case 'financeofficer': return 'Finance Dashboard';
      case 'labtechnician': return 'Laboratory Dashboard';
      case 'radiologist': return 'Radiology Dashboard';
      case 'patient': return 'Patient Health Portal';
      default: return 'Operations Dashboard';
    }
  });

  dashboardSubtitle = computed(() => {
    const user = this.authService.currentUser();
    const actor = user?.fullName || user?.username || this.userRole();
    switch (this.userRole().toLowerCase()) {
      case 'doctor': return `${actor} · Consultations, diagnostics sign-off, and patient panel`;
      case 'nurse': return `${actor} · Triage intake, vital signs, and SBAR shift handover`;
      case 'receptionist': return `${actor} · Arrival queue, MPI screening, and daily drawer reconciliation`;
      case 'pharmacist': return `${actor} · Prescription verification, counter POS, and inventory`;
      case 'accountant':
      case 'finance':
      case 'financeofficer': return `${actor} · Revenue cycle, receivables, payables, and drawer audits`;
      case 'labtechnician': return `${actor} · Specimen accession queue and diagnostic test profiles`;
      case 'radiologist': return `${actor} · RIS worklist telemetry, suites, and radiation safety`;
      case 'patient': return `${actor} · Appointments, prescriptions, and billing summary`;
      default: return `${actor} · Clinic census, staffing governance, and operational activity`;
    }
  });

  // Radiologist Operations Signals
  radiologyMetrics = signal<RadiologyMetrics | null>(null);
  radiologyOrders = signal<RadiologyOrder[]>([]);
  radiologyLoading = signal<boolean>(false);

  radiologyCriticalOrders = computed(() =>
    this.radiologyOrders().filter(o => o.priority === 'Stat')
  );
  radiologyUnreportedOrders = computed(() =>
    this.radiologyOrders().filter(o => o.status !== 'Reported' && o.status !== 'Completed' && o.status !== 'Cancelled')
  );

  // Accountant Operations Signals
  financeMetrics = signal<FinanceDashboardMetrics | null>(null);
  financeLoading = signal<boolean>(false);

  // Pharmacist Operations Signals
  pharmacyMetrics = signal<PharmacyMetrics | null>(null);
  pharmacyPendingPrescriptions = signal<Prescription[]>([]);
  pharmacyLowStockMedicines = signal<Medicine[]>([]);
  pharmacyLoading = signal<boolean>(false);

  // Patient Portal Specific Signals
  patientProfile = signal<Patient | null>(null);
  patientAppointments = signal<Appointment[]>([]);
  patientPrescriptions = signal<Prescription[]>([]);
  patientInvoices = signal<Invoice[]>([]);
  patientLoading = signal(false);

  patientPendingApptsCount = computed(() =>
    this.patientAppointments().filter(a => a.status === 'PendingApproval').length
  );
  patientScheduledApptsCount = computed(() =>
    this.patientAppointments().filter(a => a.status === 'Scheduled').length
  );
  patientOutstandingBalance = computed(() =>
    this.patientInvoices()
      .filter(i => i.status !== 'Paid')
      .reduce((sum, inv) => sum + (inv.balanceDue || inv.totalAmount || 0), 0)
  );

  // Nurse Operations Signals
  nurseAppointments = signal<Appointment[]>([]);
  nurseProceduresTodayCount = signal<number>(0);
  latestShiftHandover = signal<ShiftHandover | null>(null);
  nurseLoading = signal(false);

  // Nurse Triage Modal State
  isNurseTriageModalOpen = signal(false);
  activeNurseAppt = signal<Appointment | null>(null);
  isSubmittingTriage = signal(false);

  nurseSystolic = signal<number>(120);
  nurseDiastolic = signal<number>(80);
  nurseHeartRate = signal<number>(72);
  nurseTemp = signal<number>(36.8);
  nurseRespiratory = signal<number>(16);
  nurseWeight = signal<number>(70);
  nurseHeight = signal<number>(170);
  nurseSpO2 = signal<number>(98);
  nursePain = signal<number>(0);
  nurseUrgency = signal<string>('Routine');
  nurseRoom = signal<string>('Exam Room 1');
  nurseTriageNotes = signal<string>('');

  nurseBmi = computed(() => {
    const h = (this.nurseHeight() || 170) / 100;
    const w = this.nurseWeight() || 70;
    return h > 0 ? parseFloat((w / (h * h)).toFixed(1)) : 0;
  });

  awaitingTriageCount = computed(() =>
    this.nurseAppointments().filter(a => (a.status === 'CheckedIn' || a.status === 'Scheduled') && !a.vitalSigns).length
  );

  triagedWaitingCount = computed(() =>
    this.nurseAppointments().filter(a => a.status === 'TriageComplete' || (a.status === 'CheckedIn' && a.vitalSigns)).length
  );

  activeBaysOccupancyCount = computed(() =>
    this.nurseAppointments().filter(a => !!a.roomAssignment && a.status !== 'Completed' && a.status !== 'Cancelled').length
  );

  // Receptionist Operations Signals
  receptionTodaySummary = signal<DailyCashSummary | null>(null);
  receptionInquiries = signal<VisitorInquiry[]>([]);
  receptionTodayAppointments = signal<Appointment[]>([]);
  receptionLoading = signal<boolean>(false);
  mpiSearchQuery = signal<string>('');
  mpiSearchResults = signal<MpiLookupResult[]>([]);
  isSearchingMpi = signal<boolean>(false);

  // Drawer Closing Modal
  showDrawerModal = signal<boolean>(false);
  drawerShift = signal<string>('Morning Shift');
  drawerCashCounted = signal<number>(0);
  drawerNotes = signal<string>('');
  isSubmittingDrawer = signal<boolean>(false);

  // New Inquiry Modal
  showNewInquiryModal = signal<boolean>(false);
  inquiryVisitorName = signal<string>('');
  inquiryPhone = signal<string>('');
  inquiryType = signal<string>('General Information');
  inquiryDept = signal<string>('Reception');
  inquiryNotes = signal<string>('');
  isSubmittingInquiry = signal<boolean>(false);

  // Desk Check-In Modal
  showDeskCheckInModal = signal<boolean>(false);
  deskCheckInAppt = signal<Appointment | null>(null);
  deskToken = signal<string>('');
  deskVisitType = signal<string>('General Consultation');
  deskRoutingStation = signal<string>('Nurse Triage Station');
  isSubmittingCheckIn = signal<boolean>(false);
  today = new Date();

  receptionCheckInCount = computed(() =>
    this.receptionTodayAppointments().filter(a => a.status === 'CheckedIn' || a.status === 'TriageComplete' || a.status === 'InConsultation' || a.status === 'Completed').length
  );
  receptionScheduledCount = computed(() =>
    this.receptionTodayAppointments().filter(a => a.status === 'Scheduled').length
  );
  receptionCashTotal = computed(() =>
    this.receptionTodaySummary()?.totalCollected || 0
  );
  receptionOpenInquiriesCount = computed(() =>
    this.receptionInquiries().filter(i => i.status === 'Open').length
  );

  isAlertModalOpen = signal(false);
  isSendingAlert = signal(false);
  alertMessage = signal('All medical personnel please be advised: Routine server sync scheduled for tonight.');

  onEscapeKey(): void {
    if (this.isAlertModalOpen()) {
      this.closeBroadcastModal();
    } else if (this.isNurseTriageModalOpen()) {
      this.closeNurseTriageModal();
    } else if (this.showDeskCheckInModal()) {
      this.closeDeskCheckInModal();
    } else if (this.showDrawerModal()) {
      this.closeDrawerModal();
    } else if (this.showNewInquiryModal()) {
      this.closeInquiryModal();
    }
  }

  openBroadcastModal() {
    this.isAlertModalOpen.set(true);
  }

  closeBroadcastModal() {
    this.isAlertModalOpen.set(false);
  }

  sendBroadcastAlert() {
    const msg = this.alertMessage().trim();
    if (!msg) return;

    this.isSendingAlert.set(true);
    this.notifService.sendTestNotification(msg).subscribe({
      next: () => {
        this.isSendingAlert.set(false);
        this.isAlertModalOpen.set(false);
        this.toast.success('Announcement broadcast to all staff: ' + msg);
      },
      error: () => {
        this.isSendingAlert.set(false);
        this.toast.error('Failed to broadcast alert notification');
      }
    });
  }

  ngOnInit() {
    this.loadData();
    this.labStore.loadMetrics();
    this.labStore.loadOrders();
    this.labStore.loadTemplates();
    this.setupRealtimeListeners();
    this.loadPatientPortalData();
    this.loadNurseData();
    this.loadReceptionData();
    this.loadPharmacyData();
    this.loadAccountantData();
    this.loadRadiologyData();
  }

  loadNurseData() {
    this.nurseLoading.set(true);
    this.appointmentService.getAll(1, 50).subscribe({
      next: (res: any) => {
        const appts = res?.items || (Array.isArray(res) ? res : []);
        this.nurseAppointments.set(appts);
        this.nurseLoading.set(false);
      },
      error: () => this.nurseLoading.set(false)
    });

    this.nursingService.getProcedures().subscribe({
      next: (procs) => {
        this.nurseProceduresTodayCount.set(procs ? procs.length : 0);
      },
      error: () => { }
    });

    this.nursingService.getLatestHandover().subscribe({
      next: (handover) => {
        this.latestShiftHandover.set(handover);
      },
      error: () => { }
    });
  }

  openNurseTriageModal(appt: Appointment) {
    this.activeNurseAppt.set(appt);
    this.nurseUrgency.set(appt.triageUrgency || 'Routine');
    this.nurseRoom.set(appt.roomAssignment || 'Exam Room 1');
    this.nurseTriageNotes.set(appt.triageNotes || '');
    this.nurseSystolic.set(120);
    this.nurseDiastolic.set(80);
    this.nurseHeartRate.set(72);
    this.nurseTemp.set(36.8);
    this.nurseRespiratory.set(16);
    this.nurseWeight.set(70);
    this.nurseHeight.set(170);
    this.nurseSpO2.set(98);
    this.nursePain.set(0);

    if (appt.id) {
      this.vitalSignsService.getByAppointment(appt.id).subscribe({
        next: (v: any) => {
          if (v) {
            const sys = v.systolicBP ?? v.systolicBp ?? v.SystolicBP;
            const dia = v.diastolicBP ?? v.diastolicBp ?? v.DiastolicBP;
            const hr = v.heartRateBpm ?? v.heartRate ?? v.HeartRateBpm;
            const temp = v.temperatureC ?? v.temperature ?? v.TemperatureC;
            const resp = v.respiratoryRate ?? v.RespiratoryRate;
            const wt = v.weightKg ?? v.WeightKg;
            const ht = v.heightCm ?? v.HeightCm;
            const spo2 = v.oxygenSaturation ?? v.OxygenSaturation;
            const pain = v.painScore ?? v.PainScore;

            if (sys != null) this.nurseSystolic.set(Number(sys));
            if (dia != null) this.nurseDiastolic.set(Number(dia));
            if (hr != null) this.nurseHeartRate.set(Number(hr));
            if (temp != null) this.nurseTemp.set(Number(temp));
            if (resp != null) this.nurseRespiratory.set(Number(resp));
            if (wt != null) this.nurseWeight.set(Number(wt));
            if (ht != null) this.nurseHeight.set(Number(ht));
            if (spo2 != null) this.nurseSpO2.set(Number(spo2));
            if (pain != null) this.nursePain.set(Number(pain));
          }
        },
        error: () => { }
      });
    }

    this.isNurseTriageModalOpen.set(true);
  }

  closeNurseTriageModal() {
    this.isNurseTriageModalOpen.set(false);
    this.activeNurseAppt.set(null);
  }

  saveNurseTriage() {
    const appt = this.activeNurseAppt();
    if (!appt) return;

    this.isSubmittingTriage.set(true);
    const vitalsPayload = {
      appointmentId: appt.id,
      systolicBP: Number(this.nurseSystolic()),
      diastolicBP: Number(this.nurseDiastolic()),
      heartRateBpm: Number(this.nurseHeartRate()),
      temperatureC: Number(this.nurseTemp()),
      respiratoryRate: Number(this.nurseRespiratory()),
      weightKg: Number(this.nurseWeight()),
      heightCm: Number(this.nurseHeight()),
      oxygenSaturation: Number(this.nurseSpO2()),
      painScore: Number(this.nursePain())
    };

    const staffId = this.authService.currentUser()?.id;
    this.vitalSignsService.record(vitalsPayload, staffId).subscribe({
      next: () => {
        this.appointmentService.updateTriage(appt.id, {
          triageUrgency: this.nurseUrgency(),
          roomAssignment: this.nurseRoom(),
          triageNotes: this.nurseTriageNotes(),
          status: 'TriageComplete'
        }).subscribe({
          next: () => {
            this.isSubmittingTriage.set(false);
            this.closeNurseTriageModal();
            this.toast.success(`Triage and vitals completed for ${appt.patientName}!`);
            this.loadNurseData();
          },
          error: () => {
            this.isSubmittingTriage.set(false);
            this.closeNurseTriageModal();
            this.toast.success(`Vital signs recorded for ${appt.patientName}.`);
            this.loadNurseData();
          }
        });
      },
      error: (err) => {
        this.isSubmittingTriage.set(false);
        this.toast.error(err.error?.detail || 'Failed to save triage.');
      }
    });
  }

  quickDischarge(appointmentId: string) {
    this.appointmentService.updateStatus(appointmentId, { status: 'Completed' }).subscribe({
      next: () => {
        this.toast.success('Patient discharged and marked Completed.');
        this.loadNurseData();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to discharge patient.');
      }
    });
  }

  loadData() {
    this.isLoading.set(true);
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.summary.set({
          totalPatients: 0,
          todayAppointments: 0,
          totalAppointmentsToday: 0,
          pendingAppointments: 0,
          completedAppointments: 0,
          todayRevenue: 0,
          dailyRevenue: 0,
          lowStockMedicines: 0,
          lowStockItemsCount: 0,
          outstandingPayments: 0,
          outstandingBalance: 0,
          topMedicines: []
        });
        this.isLoading.set(false);
      }
    });
  }

  loadPatientPortalData() {
    this.patientLoading.set(true);
    this.patientService.getMyProfile().subscribe({
      next: (pat: any) => {
        this.patientProfile.set(pat);
        this.fetchPatientDetails(pat.id);
      },
      error: () => {
        const fallbackPatient = {
          id: 'a11ce000-0000-0000-0000-000000000001',
          firstName: 'Alice',
          lastName: 'Patient',
          medicalRecordNumber: 'PAT-ALICE-001',
          dateOfBirth: '1992-04-15',
          gender: 'Female',
          phone: '+1 (555) 666-7777',
          email: 'alice.patient@clinic.com',
          address: '742 Evergreen Terrace, Springfield',
          bloodGroup: 'O+',
          emergencyContact: 'Bob Patient (+1 555-999-8888)'
        } as any;
        this.patientProfile.set(fallbackPatient);
        this.fetchPatientDetails(fallbackPatient.id);
      }
    });
  }

  private fetchPatientDetails(patientId: string) {
    this.appointmentService.getAll(1, 20, patientId).subscribe({
      next: (res: any) => {
        const appts = Array.isArray(res) ? res : res?.items || [];
        this.patientAppointments.set(appts);
      }
    });

    this.prescriptionService.getPatientPrescriptions(patientId).subscribe({
      next: (rxs: any) => {
        const rxList = Array.isArray(rxs) ? rxs : rxs?.items || [];
        this.patientPrescriptions.set(rxList);
      }
    });

    this.billingService.getInvoicesByPatient(patientId).subscribe({
      next: (invs: any) => {
        const invList = Array.isArray(invs) ? invs : invs?.items || [];
        this.patientInvoices.set(invList);
        this.patientLoading.set(false);
      },
      error: () => {
        this.patientLoading.set(false);
      }
    });
  }

  private setupRealtimeListeners() {
    this.liveSync.appointmentBooked$.subscribe(() => {
      this.loadData();
      if (this.patientProfile()?.id) {
        this.fetchPatientDetails(this.patientProfile()!.id);
      }
    });

    this.liveSync.patientCheckedIn$.subscribe(() => {
      this.loadData();
    });

    this.liveSync.lowStockAlert$.subscribe(() => {
      this.loadPharmacyData();
    });

    this.liveSync.invoicePaid$.subscribe(() => {
      this.loadData();
      this.loadPharmacyData();
      this.loadAccountantData();
      if (this.patientProfile()?.id) {
        this.fetchPatientDetails(this.patientProfile()!.id);
      }
    });
  }

  loadReceptionData() {
    this.receptionLoading.set(true);
    this.receptionService.getTodayCashSummary().subscribe({
      next: summary => {
        this.receptionTodaySummary.set(summary);
        if (summary) {
          this.drawerCashCounted.set(summary.cashCollected);
        }
      },
      error: () => { }
    });

    this.receptionService.getInquiries().subscribe({
      next: inquiries => this.receptionInquiries.set(inquiries || []),
      error: () => { }
    });

    this.appointmentService.getAll(1, 100).subscribe({
      next: (res: any) => {
        const appts = Array.isArray(res) ? res : res?.items || [];
        this.receptionTodayAppointments.set(appts);
        this.receptionLoading.set(false);
      },
      error: () => {
        this.receptionLoading.set(false);
      }
    });
  }

  onMpiSearchChange(val: string) {
    this.mpiSearchQuery.set(val);
    this.searchMpi();
  }

  searchMpi() {
    const q = this.mpiSearchQuery().trim();
    if (!q) {
      this.mpiSearchResults.set([]);
      return;
    }
    this.isSearchingMpi.set(true);
    this.patientService.mpiLookup(q).subscribe({
      next: results => {
        this.isSearchingMpi.set(false);
        this.mpiSearchResults.set(results || []);
      },
      error: () => {
        this.isSearchingMpi.set(false);
      }
    });
  }

  openDeskCheckIn(appt: Appointment) {
    this.openDeskCheckInModal(appt);
  }

  openDeskCheckInModal(appt: Appointment) {
    this.deskCheckInAppt.set(appt);
    const existing = appt.tokenNumber || `Q-${Math.floor(100 + Math.random() * 900)}`;
    this.deskToken.set(existing);
    this.deskVisitType.set(appt.visitType || 'General Consultation');
    this.deskRoutingStation.set('Nurse Triage Station');
    this.showDeskCheckInModal.set(true);
  }

  closeDeskCheckIn() {
    this.closeDeskCheckInModal();
  }

  closeDeskCheckInModal() {
    this.showDeskCheckInModal.set(false);
    this.deskCheckInAppt.set(null);
  }

  submitDeskCheckIn() {
    this.confirmDeskCheckIn();
  }

  confirmDeskCheckIn() {
    const appt = this.deskCheckInAppt();
    if (!appt) return;

    this.isSubmittingCheckIn.set(true);
    this.appointmentService.checkInWithDetails(appt.id, this.deskToken(), this.deskVisitType()).subscribe({
      next: () => {
        this.isSubmittingCheckIn.set(false);
        this.toast.success(`Patient checked in! Token [${this.deskToken()}] issued and routed to ${this.deskRoutingStation()}.`);
        this.closeDeskCheckInModal();
        this.loadReceptionData();
      },
      error: err => {
        this.isSubmittingCheckIn.set(false);
        this.toast.error(err.error?.detail || 'Check-in failed');
      }
    });
  }

  openDrawerModal() {
    this.showDrawerModal.set(true);
  }

  closeDrawerModal() {
    this.showDrawerModal.set(false);
  }

  submitDrawerReconciliation() {
    const summary = this.receptionTodaySummary();
    if (!summary) return;

    this.isSubmittingDrawer.set(true);
    this.receptionService.submitReconciliation({
      shift: this.drawerShift(),
      cashCollected: summary.cashCollected,
      cardCollected: summary.cardCollected,
      digitalCollected: summary.digitalCollected,
      totalCollected: summary.totalCollected,
      closingCashCounted: this.drawerCashCounted(),
      notes: this.drawerNotes()
    }).subscribe({
      next: res => {
        this.isSubmittingDrawer.set(false);
        this.closeDrawerModal();
        const discrepancy = res.discrepancyAmount;
        if (Math.abs(discrepancy) < 0.01) {
          this.toast.success('Daily Cash Drawer closed successfully! Register is balanced.');
        } else {
          this.toast.warning(`Daily Cash Drawer closed with discrepancy of $${discrepancy.toFixed(2)}. Logged for audit.`);
        }
        this.loadReceptionData();
      },
      error: err => {
        this.isSubmittingDrawer.set(false);
        this.toast.error(err.error?.detail || 'Failed to submit drawer reconciliation');
      }
    });
  }

  openInquiryModal() {
    this.inquiryVisitorName.set('');
    this.inquiryPhone.set('');
    this.inquiryType.set('General Information');
    this.inquiryDept.set('Reception');
    this.inquiryNotes.set('');
    this.showNewInquiryModal.set(true);
  }

  closeInquiryModal() {
    this.showNewInquiryModal.set(false);
  }

  submitInquiry() {
    if (!this.inquiryVisitorName().trim() || !this.inquiryNotes().trim()) {
      this.toast.warning('Please enter visitor name and inquiry notes');
      return;
    }

    this.isSubmittingInquiry.set(true);
    this.receptionService.createInquiry({
      visitorName: this.inquiryVisitorName().trim(),
      phoneNumber: this.inquiryPhone().trim(),
      inquiryType: this.inquiryType(),
      departmentTarget: this.inquiryDept(),
      notes: this.inquiryNotes().trim()
    }).subscribe({
      next: () => {
        this.isSubmittingInquiry.set(false);
        this.toast.success('Visitor inquiry logged and queued.');
        this.closeInquiryModal();
        this.loadReceptionData();
      },
      error: err => {
        this.isSubmittingInquiry.set(false);
        this.toast.error(err.error?.detail || 'Failed to log inquiry');
      }
    });
  }

  resolveVisitorInquiry(id: string) {
    this.receptionService.resolveInquiry(id, 'Resolved at front desk').subscribe({
      next: () => {
        this.toast.success('Inquiry ticket marked as Resolved.');
        this.loadReceptionData();
      },
      error: () => this.toast.error('Failed to resolve inquiry ticket')
    });
  }

  loadPharmacyData() {
    this.pharmacyLoading.set(true);
    this.pharmacyService.getMetrics().subscribe({
      next: (m) => this.pharmacyMetrics.set(m),
      error: () => { }
    });

    this.prescriptionService.getAll(undefined, 'Pending').subscribe({
      next: (rxs: any) => {
        const list = Array.isArray(rxs) ? rxs : rxs?.items || [];
        this.pharmacyPendingPrescriptions.set(list);
        this.pharmacyLoading.set(false);
      },
      error: () => this.pharmacyLoading.set(false)
    });

    this.pharmacyService.getLowStockMedicines().subscribe({
      next: (meds) => this.pharmacyLowStockMedicines.set(meds || []),
      error: () => { }
    });
  }

  loadAccountantData() {
    this.financeLoading.set(true);
    this.financeService.getMetrics().subscribe({
      next: (m) => {
        this.financeMetrics.set(m);
        this.financeLoading.set(false);
      },
      error: () => this.financeLoading.set(false)
    });
  }

  fallbackRadiologyOrders: RadiologyOrder[] = [
    {
      id: 'rad-seed-01',
      orderNumber: 'RAD-20260920-0001',
      accessionNumber: 'ACC-20260920-0001',
      patientId: 'p-1',
      patientName: 'Elena Rostova',
      patientMedicalRecordNumber: 'MRN-9021-ER',
      doctorId: 'd-1',
      doctorName: 'Sarah James',
      modality: 'CT Scan',
      procedureName: 'CTA Chest Pulmonary Embolism Protocol',
      bodyPart: 'Chest / Pulmonary Vasculature',
      clinicalIndication: 'Acute pleuritic chest pain, severe tachycardia, hypoxia. Rule out PE.',
      priority: 'Stat',
      status: 'InProgress',
      roomSuite: 'Suite 2 - Dual-Source CT (SOMATOM)',
      equipmentModel: 'Siemens SOMATOM Force (128-Slice)',
      isCritical: true,
      criticalAlertNotes: 'EMERGENCY: Suspected saddle pulmonary embolus with RV strain.',
      orderedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      price: 280,
      isBilled: true,
      contrastUsed: true,
      contrastAgentName: 'Omnipaque 350',
      radiationDoseDlp: 420.5
    },
    {
      id: 'rad-seed-02',
      orderNumber: 'RAD-20260920-0002',
      accessionNumber: 'ACC-20260920-0002',
      patientId: 'p-2',
      patientName: 'John Connor',
      patientMedicalRecordNumber: 'MRN-4481-JC',
      doctorId: 'd-2',
      doctorName: 'John Smith',
      modality: 'X-Ray',
      procedureName: 'Chest X-Ray PA & Lateral (2 Views)',
      bodyPart: 'Thorax',
      clinicalIndication: 'Productive purulent cough, fever 38.8C. Rule out consolidation.',
      priority: 'Urgent',
      status: 'Ordered',
      roomSuite: 'Suite 1 - Digital Radiography',
      equipmentModel: 'Siemens Multix Impact DR',
      orderedAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      price: 65,
      isBilled: false,
      contrastUsed: false
    },
    {
      id: 'rad-seed-03',
      orderNumber: 'RAD-20260920-0003',
      accessionNumber: 'ACC-20260920-0003',
      patientId: 'p-3',
      patientName: 'Robert Langdon',
      patientMedicalRecordNumber: 'MRN-7732-RL',
      doctorId: 'd-1',
      doctorName: 'Sarah James',
      modality: 'CT Scan',
      procedureName: 'CT Head Non-Contrast Rapid Protocol',
      bodyPart: 'Head / Brain',
      clinicalIndication: 'Sudden onset focal neurological deficit, left arm paresis.',
      priority: 'Stat',
      status: 'Scheduled',
      roomSuite: 'Suite 2 - Dual-Source CT (SOMATOM)',
      equipmentModel: 'Siemens SOMATOM Force (128-Slice)',
      isCritical: true,
      criticalAlertNotes: 'Acute Stroke Protocol: Code Stroke evaluation.',
      orderedAt: new Date(Date.now() - 3600000 * 0.8).toISOString(),
      price: 220,
      isBilled: false,
      contrastUsed: false,
      radiationDoseDlp: 780.0
    },
    {
      id: 'rad-seed-04',
      orderNumber: 'RAD-20260920-0004',
      accessionNumber: 'ACC-20260920-0004',
      patientId: 'p-4',
      patientName: 'Sophia Martinez',
      patientMedicalRecordNumber: 'MRN-3310-SM',
      doctorId: 'd-2',
      doctorName: 'John Smith',
      modality: 'Ultrasound',
      procedureName: 'Abdominal Complete Sonogram',
      bodyPart: 'Abdomen / RUQ',
      clinicalIndication: 'Right upper quadrant post-prandial colic. Rule out cholelithiasis.',
      priority: 'Routine',
      status: 'Completed',
      roomSuite: 'Suite 4 - Ultrasound Bay A',
      equipmentModel: 'Philips EPIQ Elite US',
      findings: 'Multiple mobile acoustic shadowing gallstones. No acute cholecystitis.',
      impression: 'Cholelithiasis without biliary tree obstruction.',
      radiologistSignature: 'Attending Radiologist, MD',
      orderedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      reportedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      price: 120,
      isBilled: true,
      contrastUsed: false
    },
    {
      id: 'rad-seed-05',
      orderNumber: 'RAD-20260920-0005',
      accessionNumber: 'ACC-20260920-0005',
      patientId: 'p-5',
      patientName: 'Michael Chang',
      patientMedicalRecordNumber: 'MRN-5592-MC',
      doctorId: 'd-1',
      doctorName: 'Sarah James',
      modality: 'MRI',
      procedureName: 'Lumbar Spine MRI 3T Non-Contrast',
      bodyPart: 'Spine / Lumbar',
      clinicalIndication: 'Radiculopathy radiating down right lower extremity, refractory to NSAIDs.',
      priority: 'Routine',
      status: 'Scheduled',
      roomSuite: 'Suite 3 - MRI GE SIGNA 1.5T',
      equipmentModel: 'GE SIGNA Voyager 1.5T',
      orderedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      price: 480,
      isBilled: false,
      contrastUsed: false
    }
  ];

  loadRadiologyData() {
    this.radiologyLoading.set(true);
    this.radiologyService.getMetrics().subscribe({
      next: (m) => this.radiologyMetrics.set(m),
      error: () => { }
    });

    this.radiologyService.getOrders().subscribe({
      next: (orders) => {
        if (orders && orders.length > 0) {
          this.radiologyOrders.set(orders);
        } else {
          this.radiologyOrders.set(this.fallbackRadiologyOrders);
        }
        this.radiologyLoading.set(false);
      },
      error: () => {
        this.radiologyOrders.set(this.fallbackRadiologyOrders);
        this.radiologyLoading.set(false);
      }
    });
  }
}
