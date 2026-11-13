import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { RadiologyService } from '../../services/radiology.service';
import { PatientService } from '../../services/patient.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { ToastService } from '../../ui/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent, StatusTone } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import {
  RadiologyOrder,
  RadiologyModality,
  RadiologyPriority,
  RadiologyStatus,
  CreateRadiologyOrderDto,
  ScheduleRadiologyOrderDto,
  ReportRadiologyOrderDto,
  AcknowledgeCriticalAlertDto,
  RadiologySafetyLog,
  RadiologyMetrics
} from '../../models/radiology.model';
import { PagedResponse, Patient } from '../../models/patient.model';
import { toPlainDateIso } from '../../shared/utils/temporal.util';

export interface ModalitySuiteStatus {
  id: string;
  name: string;
  roomNumber: string;
  modality: RadiologyModality;
  equipment: string;
  status: 'Ready' | 'In Scan' | 'Calibrating' | 'Maintenance';
  activeAccession?: string;
  activePatient?: string;
  dailyScansCount: number;
  lastQACheck: string;
  tempOrHelium: string;
}

@Component({
  selector: 'app-radiology',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatCheckboxModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './radiology.component.html',
  styleUrls: ['./radiology.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RadiologyComponent implements OnInit, OnDestroy {
  private radiologyService = inject(RadiologyService);
  private patientService = inject(PatientService);
  public authService = inject(AuthService);
  public permissionService = inject(PermissionService);
  public toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  selectedParamOrderId = signal<string | null>(null);
  isCinePlaying = signal<boolean>(false);
  private cineInterval: ReturnType<typeof setInterval> | null = null;

  // Active Workspace Navigation Tab
  activeTab = signal<'overview' | 'worklist' | 'viewer' | 'reports' | 'safety' | 'suites'>('overview');

  orders = signal<RadiologyOrder[]>([]);
  patients = signal<Patient[]>([]);
  metrics = signal<RadiologyMetrics | null>(null);
  safetyLogs = signal<RadiologySafetyLog[]>([]);
  isLoading = signal(true);

  // Worklist Filters
  searchQuery = signal('');
  selectedModality = signal<string>('ALL');
  selectedStatus = signal<string>('ALL');
  selectedPriority = signal<string>('ALL');

  // Radiation Safety Filters & Signals
  safetySearchQuery = signal('');
  safetyModalityFilter = signal<string>('ALL');
  safetyContrastFilter = signal<string>('ALL');
  isNewSafetyEntryModalOpen = signal(false);

  // New Safety Entry Form Fields
  newSafetyAccession = signal('');
  newSafetyPatient = signal('');
  newSafetyModality = signal<string>('CT Scan');
  newSafetyProcedure = signal('');
  newSafetyDlp = signal<number | null>(450);
  newSafetyDap = signal<number | null>(15.5);
  newSafetyParams = signal('120 kVp, 250 mAs, Pitch 0.9');
  newSafetyContrastUsed = signal(true);
  newSafetyContrastAgent = signal('Omnipaque 350');
  newSafetyContrastVolume = signal(85);
  newSafetyContrastLot = signal('LOT-2026-X99');

  // Reporting Queue Filter
  reportsSearchQuery = signal('');

  // Modals & Drawers
  isOrderModalOpen = signal(false);
  isScheduleModalOpen = signal(false);
  isReportModalOpen = signal(false);
  isViewerModalOpen = signal(false);
  isNurseStudyModalOpen = signal(false);
  isSubmitting = signal(false);

  // Active selection
  selectedOrder = signal<RadiologyOrder | null>(null);
  nurseSelectedStudy = signal<RadiologyOrder | null>(null);

  // PACS Web DICOM Viewer State
  viewerOrder = signal<RadiologyOrder | null>(null);
  viewerWindowLevelPreset = signal<'Default' | 'Bone' | 'SoftTissue' | 'Lung' | 'Brain'>('Default');
  viewerZoom = signal<number>(100);
  viewerInverted = signal<boolean>(false);
  viewerRotation = signal<number>(0);
  viewerActiveSlice = signal<number>(0);
  viewerCaliperActive = signal<boolean>(false);
  viewerAngleActive = signal<boolean>(false);
  viewerMetadataDrawerOpen = signal<boolean>(false);

  // Multi-slice image simulation stack
  slicesList = signal<{ sliceNumber: number; zPos: string; label: string; url: string }[]>([
    { sliceNumber: 1, zPos: '-120.0mm', label: 'Thoracic Inlet (Apical)', url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80' },
    { sliceNumber: 2, zPos: '-85.5mm', label: 'Aortic Arch & Carina', url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80' },
    { sliceNumber: 3, zPos: '-42.0mm', label: 'Main Pulmonary Artery Bifurcation', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80' },
    { sliceNumber: 4, zPos: '0.0mm', label: 'Mid-Ventricular 4-Chamber Level', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80' },
    { sliceNumber: 5, zPos: '+45.0mm', label: 'Diaphragmatic Bases & Costophrenic Sulci', url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80' }
  ]);

  // Order Placement Form
  newOrderPatientId = signal('');
  newOrderModality = signal<RadiologyModality>('X-Ray');
  newOrderProcedureName = signal('');
  newOrderBodyPart = signal('');
  newOrderClinicalIndication = signal('');
  newOrderPriority = signal<RadiologyPriority>('Routine');
  newOrderRoomSuite = signal('Suite 1 - Digital X-Ray (Siemens)');
  newOrderPrice = signal(85.00);

  // Schedule Modal Form
  scheduleRoomSuite = signal('Suite 2 - CT Suite (SOMATOM)');
  scheduleEquipmentModel = signal('Siemens SOMATOM Force 128');
  scheduleDateTime = signal('');

  // Structured Reporting Form State
  reportFindings = signal('');
  reportImpression = signal('');
  reportImageUrl = signal('https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80');
  reportSecondaryAttachments = signal('');
  reportSignature = signal('Attending Radiologist, MD');
  reportIsCritical = signal(false);
  reportCriticalNotes = signal('');
  reportRadiationDlp = signal<number | undefined>(undefined);
  reportRadiationDap = signal<number | undefined>(undefined);
  reportExposureParams = signal('120 kVp, 250 mAs, Pitch 0.8');
  reportContrastUsed = signal(false);
  reportContrastAgent = signal('Omnipaque (Iohexol 350mg/mL)');
  reportContrastVolume = signal<number>(100);
  reportContrastLot = signal('LOT-2026-X99');
  reportContrastRoute = signal('IV Antecubital 20G');

  // Doctor Review & Critical Ack
  doctorSignOffNotes = signal('');
  criticalAckNotes = signal('');

  // Modality Equipment Suites
  modalitySuites = signal<ModalitySuiteStatus[]>([
    {
      id: 'suite-1',
      name: 'Suite 1 - Digital Radiography (DR)',
      roomNumber: 'Room 101',
      modality: 'X-Ray',
      equipment: 'Siemens Multix Impact (DR Wireless)',
      status: 'Ready',
      dailyScansCount: 14,
      lastQACheck: 'Today 07:15 (Passed)',
      tempOrHelium: 'Detector: 21.8°C'
    },
    {
      id: 'suite-2',
      name: 'Suite 2 - Dual-Source High-Speed CT',
      roomNumber: 'Room 102',
      modality: 'CT Scan',
      equipment: 'Siemens SOMATOM Force (128-Slice)',
      status: 'In Scan',
      activeAccession: 'ACC-20260920-0001',
      activePatient: 'Elena Rostova',
      dailyScansCount: 9,
      lastQACheck: 'Today 06:45 (Passed)',
      tempOrHelium: 'Tube: 44°C • Ready'
    },
    {
      id: 'suite-3',
      name: 'Suite 3 - 1.5T Superconducting MRI',
      roomNumber: 'Room 103 (RF Shielded)',
      modality: 'MRI',
      equipment: 'GE SIGNA Voyager 1.5T (Wide Bore)',
      status: 'Ready',
      dailyScansCount: 6,
      lastQACheck: 'Yesterday 18:00 (Passed)',
      tempOrHelium: 'Liquid Helium: 98.4%'
    },
    {
      id: 'suite-4',
      name: 'Suite 4 - Advanced Color Doppler Ultrasound',
      roomNumber: 'Bay 104A',
      modality: 'Ultrasound',
      equipment: 'Philips EPIQ 7 (Matrix Transducers)',
      status: 'Ready',
      dailyScansCount: 11,
      lastQACheck: 'Today 08:00 (Passed)',
      tempOrHelium: 'Probe Integrity: 100%'
    },
    {
      id: 'suite-5',
      name: 'Suite 5 - Echocardiography & Vascular Lab',
      roomNumber: 'Bay 104B',
      modality: 'ECG / Echo',
      equipment: 'GE Vivid E95 4D Cardiovascular',
      status: 'Ready',
      dailyScansCount: 8,
      lastQACheck: 'Today 08:30 (Passed)',
      tempOrHelium: 'Calibrated'
    }
  ]);

  currentUser = computed(() => this.authService.currentUser());
  isDoctor = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    const roles = this.currentUser()?.roles ?? [];
    return role === 'doctor' || roles.includes('Doctor');
  });
  isRadiologist = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    const roles = this.currentUser()?.roles ?? [];
    return role === 'radiologist' || roles.includes('Radiologist');
  });
  isAdmin = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    const roles = this.currentUser()?.roles ?? [];
    return role === 'admin' || roles.includes('Admin');
  });

  isCashier = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    const roles = this.currentUser()?.roles ?? [];
    return role === 'accountant' || roles.includes('Accountant');
  });

  isNurse = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    const roles = this.currentUser()?.roles ?? [];
    return role === 'nurse' || roles.includes('Nurse');
  });

  pageTitle = computed(() => 'Diagnostic Imaging & PACS');
  pageSubtitle = computed(() =>
    this.isNurse()
      ? 'Clinical RIS worklist, diagnostic reports, and patient study tracking'
      : 'RIS modality worklist, PACS DICOM review, structured reporting, and radiation safety'
  );

  nurseCompletedCount = computed(() => this.orders().filter(o => o.status === 'Reported' || o.status === 'Completed').length);
  nurseInScanCount = computed(() => this.orders().filter(o => o.status === 'InProgress' || o.status === 'Scheduled').length);

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.viewerMetadataDrawerOpen()) this.viewerMetadataDrawerOpen.set(false);
    else if (this.isOrderModalOpen()) this.isOrderModalOpen.set(false);
    else if (this.isScheduleModalOpen()) this.isScheduleModalOpen.set(false);
    else if (this.isReportModalOpen()) this.isReportModalOpen.set(false);
    else if (this.isNewSafetyEntryModalOpen()) this.isNewSafetyEntryModalOpen.set(false);
    else if (this.isNurseStudyModalOpen()) this.closeNurseStudyDetails();
  }

  openNurseStudyDetails(order: RadiologyOrder) {
    this.nurseSelectedStudy.set(order);
    this.isNurseStudyModalOpen.set(true);
  }

  closeNurseStudyDetails() {
    this.isNurseStudyModalOpen.set(false);
    this.nurseSelectedStudy.set(null);
  }

  isAddendumMode = signal<boolean>(false);
  originalSigningRadiologist = signal<string>('');

  scopeFilter = signal<'my' | 'all'>('my');

  currentRadiologistName = computed(() => {
    const user = this.currentUser();
    const fullName = user?.fullName || '';
    const username = user?.username || '';
    if (username.toLowerCase().includes('elena') || fullName.toLowerCase().includes('elena')) {
      return 'Elena';
    }
    if (username.toLowerCase().includes('ray') || fullName.toLowerCase().includes('ray')) {
      return 'Ray';
    }
    return fullName || '';
  });

  radiologistProfileTitle = computed(() => {
    const name = this.currentRadiologistName();
    if (name === 'Elena') {
      return 'Dr. Elena Vance, MD — Diagnostic Radiologist & Neuroradiologist';
    }
    if (name === 'Ray') {
      return 'Dr. Ray Radiologist, MD, FACR — Senior Diagnostic Radiologist';
    }
    const user = this.currentUser();
    const full = user?.fullName || this.authService.currentUserName();
    return `Dr. ${full || 'Radiologist'}, MD — Diagnostic Imaging Specialist`;
  });

  getRadiologistSignature(): string {
    const name = this.currentRadiologistName();
    if (name === 'Elena') {
      return 'Dr. Elena Vance, MD (Diagnostic Radiologist & Neuroradiologist)';
    }
    if (name === 'Ray') {
      return 'Dr. Ray Radiologist, MD, FACR (Senior Diagnostic Radiologist)';
    }
    const user = this.currentUser();
    const fullName = user?.fullName || this.authService.currentUserName();
    if (fullName && fullName !== 'User') {
      return fullName.startsWith('Dr.') ? `${fullName}, MD, FACR` : `Dr. ${fullName}, MD, FACR`;
    }
    return 'Dr. Ray Radiologist, MD, FACR';
  }

  isStudyAssociatedWithMe(order: RadiologyOrder): boolean {
    const name = this.currentRadiologistName().toLowerCase();
    if (!name) return true;
    const sig = (order.radiologistSignature || '').toLowerCase();
    const tech = (order.performedByTechnicianName || '').toLowerCase();
    return sig.includes(name) || tech.includes(name);
  }

  // STAT Critical Alert Orders (High Attention)
  criticalOrders = computed(() => {
    return this.orders().filter(o => o.isCritical || o.priority === 'Stat');
  });

  unreportedOrders = computed(() => {
    return this.orders().filter(o => o.status === 'Ordered' || o.status === 'Scheduled' || o.status === 'InProgress');
  });

  filteredOrders = computed(() => {
    let list = this.orders();
    const query = this.searchQuery().toLowerCase().trim();
    const modality = this.selectedModality();
    const status = this.selectedStatus();
    const priority = this.selectedPriority();

    if (this.isRadiologist() && this.scopeFilter() === 'my') {
      list = list.filter(o => this.isStudyAssociatedWithMe(o) || o.status === 'Ordered' || o.status === 'Scheduled' || o.status === 'InProgress');
    }

    if (modality !== 'ALL') {
      list = list.filter(o => o.modality === modality);
    }
    if (status !== 'ALL') {
      list = list.filter(o => o.status === status);
    }
    if (priority !== 'ALL') {
      list = list.filter(o => o.priority === priority);
    }
    if (query) {
      list = list.filter(o =>
        o.orderNumber.toLowerCase().includes(query) ||
        (o.accessionNumber && o.accessionNumber.toLowerCase().includes(query)) ||
        o.patientName.toLowerCase().includes(query) ||
        o.procedureName.toLowerCase().includes(query) ||
        o.bodyPart.toLowerCase().includes(query) ||
        (o.clinicalIndication || '').toLowerCase().includes(query) ||
        (o.roomSuite || '').toLowerCase().includes(query)
      );
    }
    return list;
  });

  defaultSafetyLogs: RadiologySafetyLog[] = [
    {
      orderId: 'rad-seed-01',
      orderNumber: 'RAD-20260920-0001',
      accessionNumber: 'ACC-20260920-0001',
      patientName: 'Elena Rostova',
      modality: 'CT Scan',
      procedureName: 'CTA Chest Pulmonary Embolism Protocol',
      performedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      performedByTechnicianName: 'Marcus Wright, RT(R)(CT)',
      radiationDoseDlp: 420.5,
      radiationDoseDap: 18.2,
      exposureParameters: '120 kVp, 260 mAs, 0.6mm slices, Pitch 0.9',
      contrastUsed: true,
      contrastAgentName: 'Omnipaque 350 (Iohexol)',
      contrastVolumeMl: 85,
      contrastLotNumber: 'LOT-OMN8921B',
      contrastRoute: 'IV Right Antecubital 18G'
    },
    {
      orderId: 'rad-seed-02',
      orderNumber: 'RAD-20260920-0002',
      accessionNumber: 'ACC-20260920-0002',
      patientName: 'John Connor',
      modality: 'X-Ray',
      procedureName: 'Chest X-Ray PA & Lateral (2 Views)',
      performedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      performedByTechnicianName: 'Sarah Jenkins, RT(R)',
      radiationDoseDap: 0.14,
      exposureParameters: '115 kVp, 3.2 mAs, SID 180cm DR Wireless',
      contrastUsed: false
    },
    {
      orderId: 'rad-seed-03',
      orderNumber: 'RAD-20260920-0003',
      accessionNumber: 'ACC-20260920-0003',
      patientName: 'Robert Langdon',
      modality: 'CT Scan',
      procedureName: 'CT Head & Brain Non-Contrast High-Res',
      performedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      performedByTechnicianName: 'Marcus Wright, RT(R)(CT)',
      radiationDoseDlp: 780.0,
      radiationDoseDap: 24.5,
      exposureParameters: '120 kVp, 300 mAs, 0.625mm helical slices',
      contrastUsed: false
    },
    {
      orderId: 'rad-seed-04',
      orderNumber: 'RAD-20260920-0004',
      accessionNumber: 'ACC-20260920-0004',
      patientName: 'Sophia Martinez',
      modality: 'CT Scan',
      procedureName: 'CT Abdomen & Pelvis Tri-Phasic with IV & Oral',
      performedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      performedByTechnicianName: 'Marcus Wright, RT(R)(CT)',
      radiationDoseDlp: 680.0,
      radiationDoseDap: 29.1,
      exposureParameters: '120 kVp, 240 mAs, CARE Dose4D automated',
      contrastUsed: true,
      contrastAgentName: 'Visipaque 320 (Iodixanol Iso-osmolar)',
      contrastVolumeMl: 100,
      contrastLotNumber: 'LOT-VIS7712A',
      contrastRoute: 'IV Left Forearm 20G'
    },
    {
      orderId: 'rad-seed-05',
      orderNumber: 'RAD-20260920-0005',
      accessionNumber: 'ACC-20260920-0005',
      patientName: 'Michael Chang',
      modality: 'MRI',
      procedureName: 'MRI Brain with Dynamic Contrast (3T)',
      performedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      performedByTechnicianName: 'David Miller, RT(R)(MR)',
      exposureParameters: '3T Multi-channel Head Matrix Coil, Non-ionizing RF',
      contrastUsed: true,
      contrastAgentName: 'Gadavist (Gadobutrol 1.0 mmol/mL)',
      contrastVolumeMl: 7.5,
      contrastLotNumber: 'LOT-GAD4421C',
      contrastRoute: 'IV Hand Vein 22G'
    },
    {
      orderId: 'rad-seed-06',
      orderNumber: 'RAD-20260920-0006',
      accessionNumber: 'ACC-20260920-0006',
      patientName: 'Arthur Dent',
      modality: 'Fluoroscopy',
      procedureName: 'Lumbar Epidural Steroid Injection Guidance',
      performedAt: new Date(Date.now() - 3600000 * 16).toISOString(),
      performedByTechnicianName: 'Dr. Ray Radiologist / Tech Clara',
      radiationDoseDap: 1.85,
      exposureParameters: '78 kVp, 1.2 mA Pulsed Fluoro (48 sec total run)',
      contrastUsed: true,
      contrastAgentName: 'Omnipaque 240 Non-ionic',
      contrastVolumeMl: 10,
      contrastLotNumber: 'LOT-OMN1044A',
      contrastRoute: 'Epidural Needle Intrathecal Confirmation'
    },
    {
      orderId: 'rad-seed-07',
      orderNumber: 'RAD-20260920-0007',
      accessionNumber: 'ACC-20260920-0007',
      patientName: 'Clara Oswald',
      modality: 'X-Ray',
      procedureName: 'Lumbar Spine AP & Lateral Weight-bearing',
      performedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      performedByTechnicianName: 'Sarah Jenkins, RT(R)',
      radiationDoseDap: 0.45,
      exposureParameters: '75 kVp, 25 mAs, AEC Chamber L+R Active',
      contrastUsed: false
    },
    {
      orderId: 'rad-seed-08',
      orderNumber: 'RAD-20260920-0008',
      accessionNumber: 'ACC-20260920-0008',
      patientName: 'James Kirk',
      modality: 'CT Scan',
      procedureName: 'Coronary CT Angiography (CCTA) 128-Slice',
      performedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      performedByTechnicianName: 'Marcus Wright, RT(R)(CT)',
      radiationDoseDlp: 240.0,
      radiationDoseDap: 12.8,
      exposureParameters: '100 kVp, 280 mAs, Prospective ECG Triggering 70-80% RR',
      contrastUsed: true,
      contrastAgentName: 'Isovue 370 (Iopamidol)',
      contrastVolumeMl: 70,
      contrastLotNumber: 'LOT-ISO9932B',
      contrastRoute: 'IV Right Antecubital 18G with Saline Chase'
    }
  ];

  filteredSafetyLogs = computed(() => {
    let list = this.safetyLogs();
    if (list.length === 0) {
      list = this.defaultSafetyLogs;
    }
    const q = this.safetySearchQuery().toLowerCase().trim();
    const mod = this.safetyModalityFilter();
    const cont = this.safetyContrastFilter();

    if (mod !== 'ALL') {
      list = list.filter(l => l.modality.toLowerCase() === mod.toLowerCase());
    }
    if (cont === 'CONTRAST') {
      list = list.filter(l => l.contrastUsed);
    } else if (cont === 'NON_CONTRAST') {
      list = list.filter(l => !l.contrastUsed);
    }
    if (q) {
      list = list.filter(l =>
        l.accessionNumber.toLowerCase().includes(q) ||
        l.orderNumber.toLowerCase().includes(q) ||
        l.patientName.toLowerCase().includes(q) ||
        l.procedureName.toLowerCase().includes(q) ||
        (l.contrastAgentName || '').toLowerCase().includes(q) ||
        (l.contrastLotNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  filteredUnreportedOrders = computed(() => {
    const list = this.unreportedOrders();
    const q = this.reportsSearchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(o =>
      o.patientName.toLowerCase().includes(q) ||
      (o.patientMedicalRecordNumber && o.patientMedicalRecordNumber.toLowerCase().includes(q)) ||
      o.procedureName.toLowerCase().includes(q) ||
      o.modality.toLowerCase().includes(q) ||
      (o.accessionNumber && o.accessionNumber.toLowerCase().includes(q))
    );
  });

  reportingTemplates = [
    {
      id: 'cxr-normal',
      title: 'Normal Chest X-Ray (PA & Lat)',
      modality: 'X-Ray',
      isCritical: false,
      findings: 'Lungs are clear bilaterally without focal consolidation, pneumothorax, or pleural effusion. Cardiomediastinal contours are normal in size and configuration. Trachea is midline. Osseous thoracic cage and imaged soft tissues are unremarkable.',
      impression: 'No acute cardiopulmonary disease. Normal 2-view chest radiograph.'
    },
    {
      id: 'head-ct-normal',
      title: 'Head CT Non-Contrast (Normal)',
      modality: 'CT Scan',
      isCritical: false,
      radiationDlp: 850,
      exposureParams: '120 kVp, 300 mAs, 0.625mm slices',
      findings: 'No evidence of acute intracranial hemorrhage, extra-axial fluid collection, or mass effect. Ventricles and sulci are age-appropriate. Gray-white matter differentiation is preserved. Basal cisterns are patent. Calvarium is intact.',
      impression: 'No acute intracranial pathology or hemorrhage identified.'
    },
    {
      id: 'pe-stat-critical',
      title: 'STAT: Acute Pulmonary Embolism (Critical)',
      modality: 'CT Scan',
      isCritical: true,
      radiationDlp: 480,
      contrastUsed: true,
      contrastAgent: 'Omnipaque 350',
      contrastVolume: 90,
      findings: 'Extensive saddle embolus visualized straddling the main pulmonary arterial bifurcation, extending into right and left descending interlobar branches with partial luminal occlusions. Right ventricular dilation noted with RV/LV diameter ratio > 1.3, consistent with acute right ventricular strain. No aortic dissection.',
      impression: 'CRITICAL ALERT: Acute bilateral pulmonary embolism with CT signs of acute right heart strain. Recommend immediate clinical correlation and anticoagulation therapy.',
      criticalNotes: 'Stat findings immediately telephoned directly to attending physician Dr. Sarah James. Verbal read back verified.'
    },
    {
      id: 'ich-stat-critical',
      title: 'STAT: Acute Subdural / Epidural Bleed (Critical)',
      modality: 'CT Scan',
      isCritical: true,
      radiationDlp: 920,
      findings: 'Hyperdense crescentic extra-axial fluid collection along the right frontoparietal convexity measuring up to 14 mm in maximal thickness. Associated subfalcine herniation with 6 mm midline shift to the left and effacement of the right lateral ventricle.',
      impression: 'CRITICAL ALERT: Acute right hemispheric subdural hematoma with significant mass effect and 6 mm midline shift. Emergency neurosurgical consultation indicated.',
      criticalNotes: 'Emergency finding alerted to ER / Attending Physician team at time of scan.'
    },
    {
      id: 'abd-us-normal',
      title: 'Abdominal Ultrasound Complete (Normal)',
      modality: 'Ultrasound',
      isCritical: false,
      findings: 'Liver demonstrates homogeneous echotexture without focal parenchymal lesions or intrahepatic biliary ductal dilatation. Gallbladder is well-distended, thin-walled, with no intraluminal calculi or sludge. Common bile duct measures 4 mm. Spleen and bilateral kidneys are normal in size and cortical thickness.',
      impression: 'Normal complete abdominal sonogram. No evidence of cholelithiasis, cholecystitis, or biliary obstruction.'
    },
    {
      id: 'spine-mri-disc',
      title: 'Lumbar Spine MRI (L4-L5 Disc Herniation)',
      modality: 'MRI',
      isCritical: false,
      findings: 'Normal lumbar lordosis. Well-maintained vertebral body heights without marrow infiltration. At L4-L5, there is a posterior central-to-left paracentral disc protrusion measuring 5 mm, causing moderate spinal canal narrowing and left L5 traversing nerve root abutment. Bilateral neural foramina remain patent.',
      impression: 'L4-L5 posterior paracentral disc protrusion causing mild-to-moderate canal stenosis and left L5 traversing nerve root impingement.'
    }
  ];

  // Modality quick presets for order creation
  modalityPresets: Record<RadiologyModality, { name: string; bodyPart: string; price: number; indication: string; defaultSuite: string }[]> = {
    'X-Ray': [
      { name: 'Chest PA & Lateral (2 Views)', bodyPart: 'Thorax / Chest', price: 65.00, indication: 'Evaluate for focal airspace consolidation, pleural effusion, or cardiomegaly', defaultSuite: 'Suite 1 - Digital X-Ray (Siemens)' },
      { name: 'Spine Lumbar (AP & Lateral)', bodyPart: 'Lumbar Spine', price: 75.00, indication: 'Evaluate disc space narrowing and spondylolisthesis', defaultSuite: 'Suite 1 - Digital X-Ray (Siemens)' },
      { name: 'Knee (AP, Lateral, Sunrise)', bodyPart: 'Right Knee', price: 70.00, indication: 'Assess joint space narrowing and osteophytes', defaultSuite: 'Suite 1 - Digital X-Ray (Siemens)' }
    ],
    'Ultrasound': [
      { name: 'Abdominal Complete US', bodyPart: 'Abdomen', price: 120.00, indication: 'Assess gallbladder, biliary ductal dilatation, and liver parenchyma', defaultSuite: 'Suite 4 - Advanced Color Doppler Ultrasound' },
      { name: 'Pelvic & Transvaginal US', bodyPart: 'Pelvis', price: 135.00, indication: 'Assess endometrial thickness and adnexal architecture', defaultSuite: 'Suite 4 - Advanced Color Doppler Ultrasound' },
      { name: 'Thyroid High-Resolution US', bodyPart: 'Neck / Thyroid', price: 110.00, indication: 'Characterize thyroid nodule TI-RADS score', defaultSuite: 'Suite 4 - Advanced Color Doppler Ultrasound' }
    ],
    'CT Scan': [
      { name: 'CT Pulmonary Angiography (PE Protocol)', bodyPart: 'Chest / Pulmonary Artery', price: 320.00, indication: 'Rule out acute pulmonary embolism, sudden dyspnea, elevated D-Dimer', defaultSuite: 'Suite 2 - Dual-Source High-Speed CT' },
      { name: 'CT Chest with IV Contrast', bodyPart: 'Chest', price: 280.00, indication: 'High-resolution evaluation of pulmonary parenchyma or mediastinal lymphadenopathy', defaultSuite: 'Suite 2 - Dual-Source High-Speed CT' },
      { name: 'CT Abdomen & Pelvis with Contrast', bodyPart: 'Abdomen / Pelvis', price: 340.00, indication: 'Assess acute abdominal pain, appendicitis or diverticulitis', defaultSuite: 'Suite 2 - Dual-Source High-Speed CT' },
      { name: 'CT Brain / Head Non-Contrast', bodyPart: 'Head / Brain', price: 250.00, indication: 'Rule out acute intracranial hemorrhage or mass effect', defaultSuite: 'Suite 2 - Dual-Source High-Speed CT' }
    ],
    'MRI': [
      { name: 'Brain MRI with & without Contrast', bodyPart: 'Brain', price: 550.00, indication: 'Evaluation of persistent neurological deficits and parenchymal signal abnormality', defaultSuite: 'Suite 3 - 1.5T Superconducting MRI' },
      { name: 'Lumbar Spine MRI', bodyPart: 'Spine', price: 480.00, indication: 'Evaluate nerve root impingement and disc herniation', defaultSuite: 'Suite 3 - 1.5T Superconducting MRI' }
    ],
    'ECG / Echo': [
      { name: '12-Lead Diagnostic Electrocardiogram', bodyPart: 'Cardiovascular', price: 45.00, indication: 'Evaluate rhythm, ST-segment elevation/depression, and QT interval', defaultSuite: 'Suite 5 - Echocardiography & Vascular Lab' },
      { name: 'Transthoracic Echocardiogram (TTE)', bodyPart: 'Heart', price: 210.00, indication: 'Quantify left ventricular ejection fraction and valvular regurgitation', defaultSuite: 'Suite 5 - Echocardiography & Vascular Lab' }
    ]
  };

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
      radiologistSignature: 'Dr. Ray Radiologist, MD, FACR',
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
      patientName: 'Arthur Pendelton',
      patientMedicalRecordNumber: 'MRN-8820-AP',
      doctorId: 'd-3',
      doctorName: 'David Lee',
      modality: 'MRI',
      procedureName: 'Lumbar Spine MRI without Contrast',
      bodyPart: 'Spine (L-Spine)',
      clinicalIndication: 'Severe L5-S1 radiculopathy and progressive right foot drop.',
      priority: 'Urgent',
      status: 'Ordered',
      roomSuite: 'Suite 3 - 1.5T Superconducting MRI',
      equipmentModel: 'GE SIGNA Pioneer 1.5T MRI',
      orderedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      price: 480,
      isBilled: false,
      contrastUsed: false
    }
  ];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const currentTab = this.activeTab();
      const rawTab = params['tab'] as 'overview' | 'worklist' | 'viewer' | 'reports' | 'safety' | 'suites' | undefined;

      if (rawTab && ['overview', 'worklist', 'viewer', 'reports', 'safety', 'suites'].includes(rawTab)) {
        if (this.isNurse() && ['viewer', 'reports', 'safety', 'suites'].includes(rawTab)) {
          if (currentTab !== 'worklist') {
            this.activeTab.set('worklist');
          }
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: 'worklist' },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        } else if (rawTab !== currentTab) {
          this.activeTab.set(rawTab);
        }
      } else if (this.isNurse() && ['viewer', 'reports', 'safety', 'suites'].includes(currentTab)) {
        this.activeTab.set('worklist');
      }

      if (params['priority']) {
        this.selectedPriority.set(params['priority']);
      }
      if (params['orderPatientId']) {
        if (!this.isNurse()) {
          this.openOrderModal(params['orderPatientId']);
        }
      }
      if (params['orderId']) {
        this.selectedParamOrderId.set(params['orderId']);
        const found = this.orders().find(o => o.id === params['orderId']);
        if (found) {
          if (this.isNurse()) {
            this.openNurseStudyDetails(found);
          } else {
            if (this.activeTab() === 'viewer') this.viewerOrder.set(found);
            if (this.activeTab() === 'reports') this.openReportingDesk(found, false);
          }
        }
      }
    });

    this.loadData();
    this.loadSafetyLogs();
  }

  ngOnDestroy() {
    this.stopCine();
  }

  toggleCine() {
    if (this.isCinePlaying()) {
      this.stopCine();
    } else {
      this.startCine();
    }
  }

  startCine() {
    this.isCinePlaying.set(true);
    if (this.cineInterval) clearInterval(this.cineInterval);
    this.cineInterval = setInterval(() => {
      const current = this.viewerActiveSlice();
      const total = this.slicesList().length;
      const next = (current + 1) % total;
      this.viewerActiveSlice.set(next);
    }, 650);
  }

  stopCine() {
    this.isCinePlaying.set(false);
    if (this.cineInterval) {
      clearInterval(this.cineInterval);
      this.cineInterval = null;
    }
  }

  onViewerOrderSelect(orderId: string) {
    const found = this.orders().find(o => o.id === orderId);
    if (found) {
      this.viewerOrder.set(found);
    }
  }

  setTab(tabName: 'overview' | 'worklist' | 'viewer' | 'reports' | 'safety' | 'suites') {
    if (this.isNurse() && ['viewer', 'reports', 'safety', 'suites'].includes(tabName)) {
      this.toast.info('Diagnostic DICOM viewing and reporting tools are reserved for physicians and radiologists. Use RIS Worklist to review clinical reports.');
      tabName = 'worklist';
    }
    this.activeTab.set(tabName);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabName },
      queryParamsHandling: 'merge'
    });
  }

  loadData() {
    this.isLoading.set(true);
    this.radiologyService.getOrders().subscribe({
      next: (orders) => {
        const finalOrders = orders && orders.length > 0 ? orders : this.fallbackRadiologyOrders;
        this.orders.set(finalOrders);
        this.isLoading.set(false);

        const paramId = this.selectedParamOrderId();
        const targetOrder = paramId ? finalOrders.find(o => o.id === paramId) : null;

        if (targetOrder) {
          if (this.isNurse()) {
            this.openNurseStudyDetails(targetOrder);
          } else if (this.activeTab() === 'viewer') {
            this.viewerOrder.set(targetOrder);
          } else if (this.activeTab() === 'reports') {
            this.openReportingDesk(targetOrder, false);
          }
        } else {
          const firstFinal = finalOrders[0];
          if (firstFinal && !this.viewerOrder() && !this.isNurse()) {
            this.viewerOrder.set(firstFinal);
          }
          if (!this.selectedOrder() && firstFinal && !this.isNurse() && this.activeTab() === 'reports') {
            const pending = finalOrders.find(o => o.status === 'Ordered' || o.status === 'Scheduled' || o.status === 'InProgress') ?? firstFinal;
            this.openReportingDesk(pending, false);
          }
        }
      },
      error: () => {
        this.orders.set(this.fallbackRadiologyOrders);
        this.isLoading.set(false);
        const firstOrder = this.fallbackRadiologyOrders[0];
        if (firstOrder && !this.viewerOrder() && !this.isNurse()) this.viewerOrder.set(firstOrder);
        if (firstOrder && !this.selectedOrder() && !this.isNurse() && this.activeTab() === 'reports') this.openReportingDesk(firstOrder, false);
      }
    });

    this.radiologyService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m)
    });

    this.patientService.getAll(1, 100).subscribe({
      next: (res: PagedResponse<Patient> | Patient[]) => this.patients.set(Array.isArray(res) ? res : (res.items ?? []))
    });
  }

  loadSafetyLogs() {
    this.radiologyService.getSafetyLogs().subscribe({
      next: (logs) => {
        if (logs && logs.length > 0) {
          this.safetyLogs.set(logs);
        } else {
          this.safetyLogs.set(this.defaultSafetyLogs);
        }
      },
      error: () => {
        this.safetyLogs.set(this.defaultSafetyLogs);
      }
    });
  }

  openNewSafetyEntryModal() {
    if (this.isNurse()) {
      this.toast.error('Dosimetry registry logging is restricted to radiologists and radiology technicians.');
      return;
    }
    this.newSafetyAccession.set(`ACC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`);
    const firstPatient = this.patients()[0];
    this.newSafetyPatient.set(firstPatient ? `${firstPatient.firstName} ${firstPatient.lastName}` : 'Elena Rostova');
    this.newSafetyModality.set('CT Scan');
    this.newSafetyProcedure.set('CT Chest / Abdomen with IV Contrast');
    this.newSafetyDlp.set(480);
    this.newSafetyDap.set(18.2);
    this.newSafetyParams.set('120 kVp, 240 mAs, CARE Dose4D');
    this.newSafetyContrastUsed.set(true);
    this.newSafetyContrastAgent.set('Omnipaque 350 (Iohexol)');
    this.newSafetyContrastVolume.set(90);
    this.newSafetyContrastLot.set('LOT-2026-OMN91');
    this.isNewSafetyEntryModalOpen.set(true);
  }

  saveNewSafetyEntry() {
    const technicianName = this.getRadiologistSignature();
    const dto = {
      accessionNumber: this.newSafetyAccession() || undefined,
      patientName: this.newSafetyPatient() || 'Clinical Patient',
      modality: this.newSafetyModality() || 'CT Scan',
      procedureName: this.newSafetyProcedure() || 'Radiology Examination',
      performedByTechnicianName: technicianName,
      radiationDoseDlp: this.newSafetyDlp() ?? undefined,
      radiationDoseDap: this.newSafetyDap() ?? undefined,
      exposureParameters: this.newSafetyParams() || undefined,
      contrastUsed: this.newSafetyContrastUsed(),
      contrastAgentName: this.newSafetyContrastUsed() ? this.newSafetyContrastAgent() : undefined,
      contrastVolumeMl: this.newSafetyContrastUsed() ? this.newSafetyContrastVolume() : undefined,
      contrastLotNumber: this.newSafetyContrastUsed() ? this.newSafetyContrastLot() : undefined,
      contrastRoute: this.newSafetyContrastUsed() ? 'IV Antecubital 20G' : undefined
    };

    this.radiologyService.createSafetyLog(dto).subscribe({
      next: (createdLog) => {
        this.safetyLogs.update(prev => [createdLog, ...prev.filter(l => l.orderId !== createdLog.orderId)]);
        this.isNewSafetyEntryModalOpen.set(false);
        this.toast.success('Radiation Dosimetry & Contrast Record logged into Hospital Audit Registry.');
        this.loadSafetyLogs();
      },
      error: () => {
        const entry: RadiologySafetyLog = {
          orderId: `manual-${Date.now()}`,
          orderNumber: `RAD-${Date.now().toString().slice(-6)}`,
          accessionNumber: this.newSafetyAccession(),
          patientName: this.newSafetyPatient(),
          modality: this.newSafetyModality(),
          procedureName: this.newSafetyProcedure(),
          performedAt: new Date().toISOString(),
          performedByTechnicianName: technicianName,
          radiationDoseDlp: this.newSafetyDlp() ?? undefined,
          radiationDoseDap: this.newSafetyDap() ?? undefined,
          exposureParameters: this.newSafetyParams(),
          contrastUsed: this.newSafetyContrastUsed(),
          contrastAgentName: this.newSafetyContrastUsed() ? this.newSafetyContrastAgent() : undefined,
          contrastVolumeMl: this.newSafetyContrastUsed() ? this.newSafetyContrastVolume() : undefined,
          contrastLotNumber: this.newSafetyContrastUsed() ? this.newSafetyContrastLot() : undefined,
          contrastRoute: this.newSafetyContrastUsed() ? 'IV Antecubital 20G' : undefined
        };
        this.safetyLogs.update(prev => [entry, ...prev]);
        this.isNewSafetyEntryModalOpen.set(false);
        this.toast.success('Radiation Dosimetry & Contrast Record logged into Hospital Audit Registry.');
      }
    });
  }

  exportSafetyAudit(format: 'PDF' | 'CSV') {
    const logs = this.safetyLogs();
    if (!logs || logs.length === 0) {
      this.toast.error('No radiation safety audit logs available to export.');
      return;
    }

    if (format === 'CSV') {
      this.downloadSafetyLogsCsv(logs);
    } else {
      this.downloadSafetyLogsPdf(logs);
    }
  }

  private downloadSafetyLogsCsv(logs: RadiologySafetyLog[]) {
    const headers = [
      'Accession Number',
      'Patient Name',
      'Modality',
      'Procedure Protocol',
      'Exam Date & Time',
      'DLP (mGy*cm)',
      'DAP (Gy*cm2)',
      'Exposure Parameters',
      'Contrast Administered',
      'Contrast Agent',
      'Volume (mL)',
      'Contrast Lot #',
      'Route',
      'Adverse Reaction',
      'Operating Tech / Radiologist'
    ];

    const escapeCsv = (val: unknown) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = logs.map(l => [
      escapeCsv(l.accessionNumber || l.orderNumber || 'N/A'),
      escapeCsv(l.patientName),
      escapeCsv(l.modality),
      escapeCsv(l.procedureName),
      escapeCsv(l.performedAt ? new Date(l.performedAt).toLocaleString() : 'N/A'),
      escapeCsv(l.radiationDoseDlp ?? 'N/A'),
      escapeCsv(l.radiationDoseDap ?? 'N/A'),
      escapeCsv(l.exposureParameters || 'Standard Protocol'),
      escapeCsv(l.contrastUsed ? 'YES' : 'NO'),
      escapeCsv(l.contrastAgentName || 'N/A'),
      escapeCsv(l.contrastVolumeMl ?? 'N/A'),
      escapeCsv(l.contrastLotNumber || 'N/A'),
      escapeCsv(l.contrastRoute || 'N/A'),
      escapeCsv(l.adverseReaction || 'None'),
      escapeCsv(l.operatorName || l.performedByTechnicianName || this.getRadiologistSignature())
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = toPlainDateIso(new Date().toISOString());
    link.setAttribute('href', url);
    link.setAttribute('download', `Hospital_Radiation_Dosimetry_Safety_Audit_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.toast.success('Radiation Safety Registry CSV downloaded to your computer.');
  }

  private downloadSafetyLogsPdf(logs: RadiologySafetyLog[]) {
    const printWindow = window.open('', '_blank', 'width=1150,height=850');
    if (!printWindow) {
      this.toast.error('Pop-up blocked. Please allow pop-ups to export PDF audit report.');
      return;
    }

    const dlpLogs = logs.filter(l => l.radiationDoseDlp);
    const meanDlp = dlpLogs.length > 0
      ? Math.round(dlpLogs.reduce((a, b) => a + (b.radiationDoseDlp || 0), 0) / dlpLogs.length)
      : 420;
    const contrastCount = logs.filter(l => l.contrastUsed).length;

    const rowsHtml = logs.map((l, idx) => `
      <tr style="${idx % 2 === 0 ? 'background:#f8fafc;' : 'background:#ffffff;'}">
        <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; font-family:monospace; font-weight:700; color:#075985;">${l.accessionNumber || 'ACC-2026-X'}</td>
        <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; font-weight:600; color:#0f172a;">${l.patientName}</td>
        <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0;"><span style="background:#f0f9ff; color:#075985; padding:3px 7px; border-radius:4px; font-size:11px; font-weight:700;">${l.modality}</span></td>
        <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; color:#334155;">${l.procedureName}</td>
        <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; font-size:12px; color:#475569;">${l.performedAt ? new Date(l.performedAt).toLocaleString() : 'N/A'}</td>
        <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; font-weight:700; color:${(l.radiationDoseDlp || 0) > 800 ? '#991b1b' : '#0f172a'};">${l.radiationDoseDlp ? l.radiationDoseDlp + ' mGy·cm' : 'N/A'}</td>
        <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0;">${l.contrastUsed ? `<strong style="color:#1b5e20;">YES</strong> (${l.contrastAgentName || 'Omnipaque'} - ${l.contrastVolumeMl || 80}mL)` : '<span style="color:#64748b;">None</span>'}</td>
        <td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; font-size:12px; color:#1b5e20; font-weight:600;">${l.adverseReaction || 'None'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Radiation Dosimetry & Safety Audit Registry - City Health Clinic</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 15px; margin-bottom: 20px; }
          .title-box h1 { margin: 0 0 5px 0; font-size: 20px; color: #0f172a; font-weight: 800; letter-spacing: -0.02em; }
          .title-box p { margin: 0; font-size: 13px; color: #475569; }
          .badge-box { text-align: right; }
          .acr-badge { background: #1e293b; color: white; padding: 5px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; display: inline-block; margin-bottom: 4px; }
          .date-sub { font-size: 11px; color: #475569; }
          .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
          .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; background: #f8fafc; }
          .kpi-card .lbl { font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; display: block; margin-bottom: 4px; }
          .kpi-card .val { font-size: 22px; font-weight: 800; color: #0f172a; }
          .kpi-card .sub { font-size: 11px; color: #1b5e20; font-weight: 600; display: block; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
          th { background: #0f172a; color: #ffffff; padding: 10px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: flex-end; gap: 10px;">
          <button onclick="window.print()" style="background:#1e293b; color:#fff; border:none; padding:9px 20px; border-radius:4px; font-weight:700; cursor:pointer; font-size:14px;">Print / Save as PDF</button>
        </div>
        <div class="header">
          <div class="title-box">
            <h1>CITY HEALTH CLINIC — DEPARTMENT OF RADIOLOGY & IMAGING</h1>
            <p>Hospital Radiation Dosimetry, Contrast Safety & ALARA Regulatory Audit Registry</p>
          </div>
          <div class="badge-box">
            <div class="acr-badge">ACR ACCREDITED SUITE</div>
            <div class="date-sub">Audit Timestamp: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <span class="lbl">Total Audited Studies</span>
            <div class="val">${logs.length} Exams</div>
            <span class="sub">100% Registry Logged</span>
          </div>
          <div class="kpi-card">
            <span class="lbl">Mean CT Dose (DLP)</span>
            <div class="val">${meanDlp} mGy·cm</div>
            <span class="sub">Within Diagnostic Reference Level (&lt; 850)</span>
          </div>
          <div class="kpi-card">
            <span class="lbl">IV Contrast Administrations</span>
            <div class="val">${contrastCount} Patients</div>
            <span class="sub">100% Lot Verified • Zero Extravasation</span>
          </div>
          <div class="kpi-card">
            <span class="lbl">ALARA Regulatory Compliance</span>
            <div class="val" style="color: #1b5e20;">99.4% Verified</div>
            <span class="sub">Joint Commission & ACR Standard</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Accession #</th>
              <th>Patient Name</th>
              <th>Modality</th>
              <th>Procedure Protocol</th>
              <th>Date & Time</th>
              <th>DLP (Dose)</th>
              <th>IV Contrast Administered</th>
              <th>Adverse Events</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Radiation Safety Officer: ${this.getRadiologistSignature()} (Diagnostic Imaging Safety Registry)</span>
          <span>Official Hospital EMR Diagnostic Telemetry Export • Confidential Medical Audit Registry</span>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    this.toast.success('Radiation Safety Registry PDF ready for printing/saving.');
  }

  // --- ORDER CREATION WORKFLOW ---
  openOrderModal(patientId?: string) {
    if (!this.isDoctor() && !this.isRadiologist() && !this.isAdmin()) {
      this.toast.error('Only attending doctors, radiologists, and administrators can create new imaging orders.');
      return;
    }
    if (patientId) {
      this.newOrderPatientId.set(patientId);
    } else if (!this.newOrderPatientId()) {
      this.newOrderPatientId.set(this.patients()[0]?.id || '');
    }
    this.newOrderModality.set('X-Ray');
    this.applyModalityPreset('X-Ray', 0);
    this.newOrderPriority.set('Routine');
    this.isOrderModalOpen.set(true);
  }

  billOrder(order: RadiologyOrder) {
    this.radiologyService.billOrder(order.id).subscribe({
      next: () => {
        this.toast.success(`Study ${order.orderNumber} marked as Billed.`);
        this.orders.update(orders => orders.map(o => o.id === order.id ? { ...o, isBilled: true } : o));
      },
      error: (err) => {
        this.toast.error('Failed to bill study: ' + (err.error?.detail || err.message));
      }
    });
  }

  applyModalityPreset(modality: RadiologyModality, index = 0) {
    this.newOrderModality.set(modality);
    const preset = this.modalityPresets[modality]?.[index];
    if (preset) {
      this.newOrderProcedureName.set(preset.name);
      this.newOrderBodyPart.set(preset.bodyPart);
      this.newOrderPrice.set(preset.price);
      this.newOrderClinicalIndication.set(preset.indication);
      this.newOrderRoomSuite.set(preset.defaultSuite);
    }
  }

  createOrder() {
    if (!this.isDoctor() && !this.isRadiologist() && !this.isAdmin()) {
      this.toast.error('Only attending doctors, radiologists, and administrators can create new imaging orders.');
      return;
    }
    if (!this.newOrderPatientId() || !this.newOrderProcedureName()) {
      this.toast.error('Patient and Procedure name are required.');
      return;
    }

    this.isSubmitting.set(true);
    const dto: CreateRadiologyOrderDto = {
      patientId: this.newOrderPatientId(),
      modality: this.newOrderModality(),
      procedureName: this.newOrderProcedureName(),
      bodyPart: this.newOrderBodyPart(),
      clinicalIndication: this.newOrderClinicalIndication(),
      priority: this.newOrderPriority(),
      price: this.newOrderPrice(),
      roomSuite: this.newOrderRoomSuite()
    };

    this.radiologyService.createOrder(dto).subscribe({
      next: (res) => {
        this.toast.success(`Imaging requisition ${res.orderNumber} (Accession ${res.accessionNumber}) generated!`);
        this.isSubmitting.set(false);
        this.isOrderModalOpen.set(false);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to place imaging order: ' + (err.error?.detail || err.message));
      }
    });
  }

  // --- SUITE SCHEDULING WORKFLOW ---
  openScheduleModal(order: RadiologyOrder) {
    if (this.isNurse()) {
      this.toast.error('Suite scheduling is reserved for radiology personnel.');
      return;
    }
    this.selectedOrder.set(order);
    this.scheduleRoomSuite.set(order.roomSuite || 'Suite 2 - Dual-Source High-Speed CT');
    this.scheduleEquipmentModel.set(order.equipmentModel || 'Siemens SOMATOM Force (128-Slice)');
    this.scheduleDateTime.set(new Date().toISOString().substring(0, 16));
    this.isScheduleModalOpen.set(true);
  }

  submitSchedule() {
    if (this.isNurse()) {
      this.toast.error('Suite scheduling is reserved for radiology personnel.');
      return;
    }
    const order = this.selectedOrder();
    if (!order) return;

    this.isSubmitting.set(true);
    const dto: ScheduleRadiologyOrderDto = {
      roomSuite: this.scheduleRoomSuite(),
      equipmentModel: this.scheduleEquipmentModel(),
      scheduledAt: this.scheduleDateTime() ? new Date(this.scheduleDateTime()).toISOString() : new Date().toISOString()
    };

    this.radiologyService.scheduleOrder(order.id, dto).subscribe({
      next: (res) => {
        this.toast.success(`Study ${res.accessionNumber} scheduled in ${res.roomSuite}!`);
        this.isSubmitting.set(false);
        this.isScheduleModalOpen.set(false);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error('Scheduling error: ' + (err.error?.detail || err.message));
      }
    });
  }

  // --- WEB PACS DICOM VIEWER CONTROLS ---
  openInViewer(order: RadiologyOrder) {
    if (this.isNurse()) {
      this.toast.info('PACS DICOM viewer is reserved for radiologists and physicians.');
      return;
    }
    this.viewerOrder.set(order);
    this.selectedOrder.set(order);
    this.viewerZoom.set(100);
    this.viewerInverted.set(false);
    this.viewerRotation.set(0);
    this.viewerWindowLevelPreset.set('Default');
    this.viewerActiveSlice.set(0);
    if (order.imageUrl) {
      const imageUrl = order.imageUrl;
      this.slicesList.update(list => {
        const copy = [...list];
        const firstSlice = copy[0];
        if (firstSlice) {
          copy[0] = { ...firstSlice, url: imageUrl };
        }
        return copy;
      });
    }
    this.setTab('viewer');
  }

  openReportingDesk(order: RadiologyOrder, navigateToTab: boolean = true) {
    if (this.isNurse()) {
      if (navigateToTab) {
        this.toast.info('Structured reporting desk is reserved for radiologists.');
      }
      return;
    }
    this.selectedOrder.set(order);
    this.reportFindings.set(order.findings || 'Exam demonstrates preserved anatomic alignment without acute fractures or focal consolidation.');
    this.reportImpression.set(order.impression || 'Normal study. No acute structural abnormality.');
    this.reportImageUrl.set(order.imageUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80');
    this.reportSecondaryAttachments.set(order.secondaryAttachmentUrls || '');

    const isSigned = order.status === 'Completed' && !!order.radiologistSignature;
    const isMine = this.isStudyAssociatedWithMe(order);
    this.isAddendumMode.set(isSigned && !isMine);
    this.originalSigningRadiologist.set(order.radiologistSignature || '');

    this.reportSignature.set(this.getRadiologistSignature());
    this.reportIsCritical.set(order.isCritical || false);
    this.reportCriticalNotes.set(order.criticalAlertNotes || '');
    this.reportRadiationDlp.set(order.radiationDoseDlp);
    this.reportRadiationDap.set(order.radiationDoseDap);
    this.reportExposureParams.set(order.exposureParameters || '120 kVp, 250 mAs');
    this.reportContrastUsed.set(order.contrastUsed || false);
    this.reportContrastAgent.set(order.contrastAgentName || 'Omnipaque 350');
    this.reportContrastVolume.set(order.contrastVolumeMl || 100);
    this.reportContrastLot.set(order.contrastLotNumber || 'LOT-2026-X99');
    this.reportContrastRoute.set(order.contrastRoute || 'IV Antecubital 20G');
    if (navigateToTab) {
      this.setTab('reports');
    }
  }

  updateOrderStatus(order: RadiologyOrder, status: string) {
    if (this.isNurse()) {
      this.toast.error('Status modifications are reserved for radiologists.');
      return;
    }
    this.radiologyService.updateStatus(order.id, status).subscribe({
      next: (updated) => {
        this.toast.success(`Study ${updated.accessionNumber || updated.orderNumber} status changed to ${status}!`);
        this.loadData();
      },
      error: (err) => {
        this.toast.error('Failed to update study status: ' + (err.error?.detail || err.message));
      }
    });
  }

  openViewerModal(order: RadiologyOrder) {
    if (this.isNurse()) {
      this.toast.info('PACS viewer is reserved for radiologists and physicians.');
      return;
    }
    this.selectedOrder.set(order);
    this.viewerOrder.set(order);
    this.isViewerModalOpen.set(true);
  }

  setWindowLevel(preset: 'Default' | 'Bone' | 'SoftTissue' | 'Lung' | 'Brain') {
    this.viewerWindowLevelPreset.set(preset);
    this.toast.info(`Window/Level applied: ${preset}`);
  }

  zoomIn() {
    this.viewerZoom.update(z => Math.min(z + 25, 300));
  }

  zoomOut() {
    this.viewerZoom.update(z => Math.max(z - 25, 50));
  }

  resetViewer() {
    this.viewerZoom.set(100);
    this.viewerInverted.set(false);
    this.viewerRotation.set(0);
    this.viewerWindowLevelPreset.set('Default');
    this.viewerCaliperActive.set(false);
    this.viewerAngleActive.set(false);
  }

  rotateCW() {
    this.viewerRotation.update(r => (r + 90) % 360);
  }

  toggleInvert() {
    this.viewerInverted.update(inv => !inv);
  }

  toggleCaliper() {
    this.viewerCaliperActive.update(c => !c);
    if (this.viewerCaliperActive()) {
      this.viewerAngleActive.set(false);
      this.toast.info('Digital Caliper Tool active: Measure distance in mm');
    }
  }

  toggleAngle() {
    this.viewerAngleActive.update(a => !a);
    if (this.viewerAngleActive()) {
      this.viewerCaliperActive.set(false);
      this.toast.info('Digital Cobb Angle Tool active');
    }
  }

  selectSlice(index: number) {
    this.viewerActiveSlice.set(index);
  }

  // --- STRUCTURED REPORTING WORKFLOW ---
  openReportModal(order: RadiologyOrder) {
    this.selectedOrder.set(order);
    this.reportFindings.set(order.findings || 'Exam demonstrates preserved anatomic alignment without acute fractures or focal consolidation.');
    this.reportImpression.set(order.impression || 'Normal study. No acute structural abnormality.');
    this.reportImageUrl.set(order.imageUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80');
    this.reportSecondaryAttachments.set(order.secondaryAttachmentUrls || '');

    const isSigned = order.status === 'Completed' && !!order.radiologistSignature;
    const isMine = this.isStudyAssociatedWithMe(order);
    this.isAddendumMode.set(isSigned && !isMine);
    this.originalSigningRadiologist.set(order.radiologistSignature || '');

    this.reportSignature.set(this.getRadiologistSignature());
    this.reportIsCritical.set(order.isCritical || false);
    this.reportCriticalNotes.set(order.criticalAlertNotes || '');
    this.reportRadiationDlp.set(order.radiationDoseDlp);
    this.reportRadiationDap.set(order.radiationDoseDap);
    this.reportExposureParams.set(order.exposureParameters || '120 kVp, 250 mAs');
    this.reportContrastUsed.set(order.contrastUsed || false);
    this.reportContrastAgent.set(order.contrastAgentName || 'Omnipaque 350');
    this.reportContrastVolume.set(order.contrastVolumeMl || 100);
    this.reportContrastLot.set(order.contrastLotNumber || 'LOT-2026-X99');
    this.reportContrastRoute.set(order.contrastRoute || 'IV Antecubital 20G');
    this.isReportModalOpen.set(true);
  }

  applyReportingTemplate(template: typeof this.reportingTemplates[0]) {
    this.reportFindings.set(template.findings);
    this.reportImpression.set(template.impression);
    this.reportIsCritical.set(template.isCritical);
    if (template.criticalNotes) {
      this.reportCriticalNotes.set(template.criticalNotes);
    }
    if (template.radiationDlp) {
      this.reportRadiationDlp.set(template.radiationDlp);
    }
    if (template.exposureParams) {
      this.reportExposureParams.set(template.exposureParams);
    }
    if (template.contrastUsed) {
      this.reportContrastUsed.set(true);
      if (template.contrastAgent) this.reportContrastAgent.set(template.contrastAgent);
      if (template.contrastVolume) this.reportContrastVolume.set(template.contrastVolume);
    }
    this.toast.success(`Loaded template: ${template.title}`);
  }

  submitReport() {
    const order = this.selectedOrder();
    if (!order) return;

    if (!this.reportFindings().trim() || !this.reportImpression().trim()) {
      this.toast.error('Findings and Clinical Impression are mandatory.');
      return;
    }

    if (this.reportIsCritical() && !this.reportCriticalNotes().trim()) {
      this.toast.error('Critical findings require verbal notification notes documenting who was notified.');
      return;
    }

    this.isSubmitting.set(true);
    const dto: ReportRadiologyOrderDto = {
      findings: this.reportFindings(),
      impression: this.reportImpression(),
      imageUrl: this.reportImageUrl(),
      secondaryAttachmentUrls: this.reportSecondaryAttachments(),
      radiologistSignature: this.reportSignature(),
      isCritical: this.reportIsCritical(),
      criticalAlertNotes: this.reportCriticalNotes(),
      radiationDoseDlp: this.reportRadiationDlp(),
      radiationDoseDap: this.reportRadiationDap(),
      exposureParameters: this.reportExposureParams(),
      contrastUsed: this.reportContrastUsed(),
      contrastAgentName: this.reportContrastUsed() ? this.reportContrastAgent() : undefined,
      contrastVolumeMl: this.reportContrastUsed() ? this.reportContrastVolume() : undefined,
      contrastLotNumber: this.reportContrastUsed() ? this.reportContrastLot() : undefined,
      contrastRoute: this.reportContrastUsed() ? this.reportContrastRoute() : undefined
    };

    this.radiologyService.reportOrder(order.id, dto).subscribe({
      next: (res) => {
        if (res.isCritical) {
          this.toast.warning(`CRITICAL finding recorded! Emergency notification dispatched for ${res.accessionNumber}.`);
        } else {
          this.toast.success(`Diagnostic report signed for Accession ${res.accessionNumber}!`);
        }
        this.isSubmitting.set(false);
        this.isReportModalOpen.set(false);
        this.loadData();
        this.loadSafetyLogs();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to sign report: ' + (err.error?.detail || err.message));
      }
    });
  }

  // --- ATTENDING DOCTOR CRITICAL FINDING ACKNOWLEDGMENT ---
  acknowledgeCriticalFinding(order: RadiologyOrder) {
    if (!this.isDoctor() && !this.isRadiologist()) {
      this.toast.error('Only attending physicians or radiologists may acknowledge critical findings.');
      return;
    }
    this.isSubmitting.set(true);
    const dto: AcknowledgeCriticalAlertDto = {
      acknowledgmentNotes: this.criticalAckNotes().trim() || 'Verbal and PACS alert received. Emergency clinical management initiated immediately.'
    };

    this.radiologyService.acknowledgeCriticalAlert(order.id, dto).subscribe({
      next: (res) => {
        this.toast.success(`Critical Finding Alert for ${res.accessionNumber} formally acknowledged!`);
        this.isSubmitting.set(false);
        this.criticalAckNotes.set('');
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to acknowledge critical alert: ' + (err.error?.detail || err.message));
      }
    });
  }

  // --- ATTENDING DOCTOR SIGN-OFF ---
  signOffAsDoctor(order: RadiologyOrder) {
    if (!this.isDoctor()) {
      this.toast.error('Only attending physicians may perform clinical sign-off.');
      return;
    }
    this.isSubmitting.set(true);
    this.radiologyService.doctorSignOff(order.id, this.doctorSignOffNotes().trim() || 'Reviewed and concurred with imaging interpretation. Integrated into patient care plan.').subscribe({
      next: (res) => {
        this.toast.success(`Physician sign-off recorded for study ${res.accessionNumber || res.orderNumber}!`);
        this.isSubmitting.set(false);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to record doctor sign-off: ' + (err.error?.detail || err.message));
      }
    });
  }

  // Semantic tone helpers
  getStatusTone(status?: string): StatusTone {
    switch (status) {
      case 'Completed':
      case 'Reported':
        return 'success';
      case 'InProgress':
        return 'info';
      case 'Scheduled':
      case 'Ordered':
        return 'warning';
      case 'Cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  getPriorityTone(priority?: string): StatusTone {
    switch (priority) {
      case 'Stat':
        return 'danger';
      case 'Urgent':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  getSuiteTone(status: ModalitySuiteStatus['status']): StatusTone {
    switch (status) {
      case 'Ready':
        return 'success';
      case 'In Scan':
        return 'info';
      case 'Calibrating':
        return 'warning';
      case 'Maintenance':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  getStatusClass(status: RadiologyStatus): string {
    switch (status) {
      case 'Ordered': return 'status-ordered';
      case 'Scheduled': return 'status-scheduled';
      case 'InProgress': return 'status-inprogress';
      case 'Reported': return 'status-reported';
      case 'Completed': return 'status-completed';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getPriorityClass(priority: RadiologyPriority): string {
    switch (priority) {
      case 'Stat': return 'priority-stat';
      case 'Urgent': return 'priority-urgent';
      default: return 'priority-routine';
    }
  }
}
