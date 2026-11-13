import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DoctorScheduleService } from '../../services/doctor-schedule.service';
import { DoctorDto, DoctorService } from '../../services/doctor.service';
import { UserDto, UserManagementService } from '../../services/user-management.service';
import { CreateDoctorScheduleRequest, DoctorSchedule } from '../../models/doctor-schedule.model';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { ToastService } from '../../ui/toast/toast.service';

import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

export interface UnifiedShiftItem {
  id: string;
  doctorId?: string;
  department: 'Radiology' | 'Doctor' | 'Nurse' | 'Laboratory' | 'Reception';
  staffName: string;
  staffTitle: string;
  departmentSuite: string;
  avatarIcon: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  maxPatients?: number;
  shiftType: 'Day Shift' | 'Evening Call' | 'Night STAT' | 'Diagnostic Read' | 'Interventional' | 'Rotation';
  isActive: boolean;
  notes?: string;
  phoneExtension?: string;
  isCustomDoctorShift?: boolean;
}

@Component({
  selector: 'app-doctor-schedules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './doctor-schedules.component.html',
  styleUrls: ['./doctor-schedules.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DoctorSchedulesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private scheduleService = inject(DoctorScheduleService);
  private doctorService = inject(DoctorService);
  private userService = inject(UserManagementService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public authService = inject(AuthService);
  public permissionService = inject(PermissionService);

  isDoctorRole = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'doctor' || this.authService.hasRole('Doctor'));
  isRadiologistRole = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'radiologist' || this.authService.hasRole('Radiologist'));
  isReceptionistRole = computed(() => (this.permissionService.activeRole() || '').toLowerCase() === 'receptionist' || this.authService.hasRole('Receptionist'));
  currentUserId = computed(() => this.authService.currentUserId());

  canManageSchedules = computed(() => {
    const role = (this.permissionService.activeRole() || '').toLowerCase();
    return role === 'admin' || this.authService.hasRole('Admin');
  });

  selectedDepartment = signal<'ALL' | 'Radiology' | 'Doctor' | 'Nurse' | 'Laboratory' | 'Reception'>('ALL');

  pageTitle = computed(() => {
    switch (this.selectedDepartment()) {
      case 'Radiology':
        return 'Radiology & Modality Suites Coverage';
      case 'Doctor':
        return 'Attending Physician Clinical Shifts';
      case 'Nurse':
        return 'Nursing Staff & Ward Duty Shifts';
      case 'Laboratory':
        return 'Laboratory & Phlebotomy Station Roster';
      case 'Reception':
        return 'Front Desk & Admissions Shifts';
      default:
        return 'Hospital Shift Rostering';
    }
  });

  pageSubtitle = computed(() =>
    'Manage clinical operating hours, equipment suite coverage, diagnostic reading duties, and on-duty rotations'
  );

  schedules = signal<DoctorSchedule[]>([]);
  doctors = signal<DoctorDto[]>([]);
  realClinicUsers = signal<UserDto[]>([]);
  editingShiftId = signal<string | null>(null);
  isEditMode = computed(() => this.editingShiftId() !== null);

  selectedDoctorId = signal<string>('ALL');
  selectedDayFilter = signal<number | 'ALL'>('ALL');
  selectedStatusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  departmentStaffDirectory: Record<string, { name: string; title: string; suite: string; phone?: string; shift?: string }[]> = {
    Radiology: [
      { name: 'Dr. Ray Radiologist, MD, FACR', title: 'Lead Diagnostic Radiologist & RSO', suite: 'Reading Room Alpha — PACS Workstation', phone: 'Ext. 4101', shift: 'Diagnostic Read' },
      { name: 'Dr. Elena Rostova, MD', title: 'Interventional Radiologist & C-Arm Lead', suite: 'Suite 5 — Interventional C-Arm Suite', phone: 'Ext. 4105', shift: 'Interventional' },
      { name: 'Marcus Wright, RT(R)(CT)', title: 'Lead CT Technologist', suite: 'Suite 2 — Dual-Source CT', phone: 'Ext. 4102', shift: 'Day Shift' },
      { name: 'Sarah Jenkins, RT(R)', title: 'Senior Diagnostic Radiographer', suite: 'Suite 1 — Digital Radiography (DR)', phone: 'Ext. 4103', shift: 'Day Shift' },
      { name: 'David Lin, RT(R)(MR)', title: 'Superconducting MRI Specialist', suite: 'Suite 3 — 1.5T Superconducting MRI', phone: 'Ext. 4104', shift: 'Day Shift' },
      { name: 'Angela Davis, RDMS', title: 'Diagnostic Medical Sonographer', suite: 'Suite 4 — Color Doppler Ultrasound', phone: 'Ext. 4106', shift: 'Day Shift' }
    ],
    Doctor: [
      { name: 'Dr. John Smith, MD', title: 'Attending Cardiologist', suite: 'Cardiology Suite — Exam 1', phone: 'Ext. 2001', shift: 'Day Shift' },
      { name: 'Dr. Emily Davis, MD', title: 'Pediatric Specialist', suite: 'Pediatrics Suite — Exam 2', phone: 'Ext. 2002', shift: 'Day Shift' },
      { name: 'Dr. Sarah Wilson, MD', title: 'Internal Medicine Physician', suite: 'Primary Care Suite — Exam 3', phone: 'Ext. 2003', shift: 'Day Shift' },
      { name: 'Dr. Robert Chen, MD', title: 'Consultant Neurologist', suite: 'Neurology Suite — Exam 4', phone: 'Ext. 2004', shift: 'Day Shift' }
    ],
    Nurse: [
      { name: 'Clara Barton, RN, BSN', title: 'Triage & Infusion Therapy Lead', suite: 'Clinical Care Bay A — Triage Station', phone: 'Ext. 3101', shift: 'Day Shift' },
      { name: 'Florence Nightingale, RN', title: 'Inpatient & Post-Op Recovery Specialist', suite: 'Recovery Wing — Suite B', phone: 'Ext. 3102', shift: 'Day Shift' },
      { name: 'John Kelly, RN, CEN', title: 'Emergency & Trauma Care Nurse', suite: 'Rapid Treatment Bay 3', phone: 'Ext. 3103', shift: 'Night STAT' }
    ],
    Laboratory: [
      { name: 'James Watson, MLS (ASCP)', title: 'Lead Clinical Biochemist & Hematology', suite: 'Diagnostic Pathology Core Lab — Station 1', phone: 'Ext. 5101', shift: 'Day Shift' },
      { name: 'Rosalind Franklin, PhD, MLS', title: 'Senior Cytogeneticist & Serology Lead', suite: 'Microbiology & Serology Cleanroom', phone: 'Ext. 5102', shift: 'Day Shift' },
      { name: 'Alex Chen, MLT', title: 'Urinalysis & STAT Diagnostics Tech', suite: 'Point-of-Care STAT Lab Bench', phone: 'Ext. 5103', shift: 'Day Shift' }
    ],
    Reception: [
      { name: 'Robert Vance', title: 'Patient Admissions & Financial Counselor', suite: 'Main Lobby Registration Desk 1', phone: 'Ext. 2101', shift: 'Day Shift' },
      { name: 'Kelly Kapoor', title: 'Appointment Scheduling & Queue Coordinator', suite: 'Main Lobby Registration Desk 2', phone: 'Ext. 2102', shift: 'Day Shift' },
      { name: 'Pam Beesly', title: 'Patient Experience & Front Desk Lead', suite: 'Central Admissions Desk 3', phone: 'Ext. 2103', shift: 'Day Shift' }
    ]
  };

  customStaffMode = signal<boolean>(false);
  selectedStaffDropdown = signal<string>('');
  showAddModal = signal<boolean>(false);

  scheduleForm: FormGroup = this.fb.group({
    department: ['Radiology', Validators.required],
    staffName: ['', Validators.required],
    staffTitle: ['Lead Diagnostic Radiologist & RSO', Validators.required],
    departmentSuite: ['Reading Room Alpha — PACS Workstation', Validators.required],
    dayOfWeek: [1, Validators.required],
    startTime: ['07:30', Validators.required],
    endTime: ['16:00', Validators.required],
    shiftType: ['Diagnostic Read', Validators.required],
    slotDurationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(120)]]
  });

  days = [
    { value: 0, label: 'Sunday', short: 'SUN' },
    { value: 1, label: 'Monday', short: 'MON' },
    { value: 2, label: 'Tuesday', short: 'TUE' },
    { value: 3, label: 'Wednesday', short: 'WED' },
    { value: 4, label: 'Thursday', short: 'THU' },
    { value: 5, label: 'Friday', short: 'FRI' },
    { value: 6, label: 'Saturday', short: 'SAT' }
  ];

  private readonly STAFF_SHIFTS_STORAGE_KEY = 'clinic_hospital_staff_shifts';

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showAddModal() && !this.isSaving()) {
      this.closeAddModal();
    }
  }

  private loadHospitalStaffShiftsFromStorage(): UnifiedShiftItem[] {
    try {
      const stored = localStorage.getItem(this.STAFF_SHIFTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to seeded schedule defaults
    }
    return this.getDefaultHospitalStaffShifts();
  }

  private saveHospitalStaffShiftsToStorage(shifts: UnifiedShiftItem[]): void {
    try {
      localStorage.setItem(this.STAFF_SHIFTS_STORAGE_KEY, JSON.stringify(shifts));
    } catch {
      // Ignore storage quota error
    }
  }

  getDefaultHospitalStaffShifts(): UnifiedShiftItem[] {
    return [
      {
        id: 'rad-s1',
        department: 'Radiology',
        staffName: 'Dr. Ray Radiologist, MD, FACR',
        staffTitle: 'Lead Diagnostic Radiologist & Radiation Safety Officer',
        departmentSuite: 'Reading Room Alpha — High-Resolution PACS Workstation',
        avatarIcon: 'visibility',
        dayOfWeek: 1,
        startTime: '07:30',
        endTime: '16:00',
        shiftType: 'Diagnostic Read',
        isActive: true,
        notes: 'Primary Thoracic, Neuro CT/MRI Sign-Off & STAT Desk',
        phoneExtension: 'Ext. 4101'
      },
      {
        id: 'rad-s2',
        department: 'Radiology',
        staffName: 'Dr. Ray Radiologist, MD, FACR',
        staffTitle: 'Lead Diagnostic Radiologist & Radiation Safety Officer',
        departmentSuite: 'Reading Room Alpha — High-Resolution PACS Workstation',
        avatarIcon: 'visibility',
        dayOfWeek: 3,
        startTime: '07:30',
        endTime: '16:00',
        shiftType: 'Diagnostic Read',
        isActive: true,
        notes: 'Primary Thoracic, Neuro CT/MRI Sign-Off & STAT Desk',
        phoneExtension: 'Ext. 4101'
      },
      {
        id: 'rad-s3',
        department: 'Radiology',
        staffName: 'Dr. Ray Radiologist, MD, FACR',
        staffTitle: 'Lead Diagnostic Radiologist & Radiation Safety Officer',
        departmentSuite: 'Reading Room Alpha — High-Resolution PACS Workstation',
        avatarIcon: 'visibility',
        dayOfWeek: 5,
        startTime: '07:30',
        endTime: '16:00',
        shiftType: 'Diagnostic Read',
        isActive: true,
        notes: 'Primary Thoracic, Neuro CT/MRI Sign-Off & STAT Desk',
        phoneExtension: 'Ext. 4101'
      },
      {
        id: 'rad-s4',
        department: 'Radiology',
        staffName: 'Dr. Aris Thorne, MD',
        staffTitle: 'Attending Interventional Radiologist',
        departmentSuite: 'Suite 5 — Interventional C-Arm & Fluoroscopy Suite',
        avatarIcon: 'medical_services',
        dayOfWeek: 2,
        startTime: '08:30',
        endTime: '17:00',
        shiftType: 'Interventional',
        isActive: true,
        notes: 'Biopsy guidance, Lumbar Epidural, Joint Injections & Vascular Line Placements',
        phoneExtension: 'Ext. 4105'
      },
      {
        id: 'rad-s5',
        department: 'Radiology',
        staffName: 'Marcus Wright, RT(R)(CT)',
        staffTitle: 'Lead CT Technologist',
        departmentSuite: 'Suite 2 — Dual-Source CT',
        avatarIcon: 'settings_remote',
        dayOfWeek: 1,
        startTime: '07:00',
        endTime: '15:30',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'Contrast administration, IV Cannulation & PE/Angio Protocols',
        phoneExtension: 'Ext. 4102'
      },
      {
        id: 'rad-s6',
        department: 'Radiology',
        staffName: 'Marcus Wright, RT(R)(CT)',
        staffTitle: 'Lead CT Technologist',
        departmentSuite: 'Suite 2 — Dual-Source CT',
        avatarIcon: 'settings_remote',
        dayOfWeek: 2,
        startTime: '07:00',
        endTime: '15:30',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'Contrast administration, IV Cannulation & PE/Angio Protocols',
        phoneExtension: 'Ext. 4102'
      },
      {
        id: 'rad-s7',
        department: 'Radiology',
        staffName: 'Sarah Jenkins, RT(R)',
        staffTitle: 'Senior Diagnostic Radiographer',
        departmentSuite: 'Suite 1 — Digital Radiography (DR)',
        avatarIcon: 'filter_frames',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '16:30',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'General & Emergency Skeletal / Chest Digital Radiography',
        phoneExtension: 'Ext. 4103'
      },
      {
        id: 'rad-s8',
        department: 'Radiology',
        staffName: 'David Lin, RT(R)(MR)',
        staffTitle: 'Superconducting MRI Specialist',
        departmentSuite: 'Suite 3 — 1.5T Superconducting MRI',
        avatarIcon: 'donut_large',
        dayOfWeek: 4,
        startTime: '08:00',
        endTime: '18:00',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'Neuro, MSK & Abdominal MR sequences; Implant Safety Screening',
        phoneExtension: 'Ext. 4104'
      },
      {
        id: 'rad-s9',
        department: 'Radiology',
        staffName: 'Angela Davis, RDMS',
        staffTitle: 'Diagnostic Medical Sonographer',
        departmentSuite: 'Suite 4 — Color Doppler Ultrasound',
        avatarIcon: 'waves',
        dayOfWeek: 2,
        startTime: '08:30',
        endTime: '17:00',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'Abdominal, Small Parts, Carotid Doppler & Pelvic sonography',
        phoneExtension: 'Ext. 4106'
      },
      {
        id: 'nur-s1',
        department: 'Nurse',
        staffName: 'Clara Bennett, BSN, RN',
        staffTitle: 'Head Emergency & Triage Nurse',
        departmentSuite: 'Central Triage & Clinical Vitals Intake Bay',
        avatarIcon: 'healing',
        dayOfWeek: 1,
        startTime: '07:00',
        endTime: '15:30',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'Patient intake triage, rapid vitals assessment, telemetry monitoring',
        phoneExtension: 'Ext. 3101'
      },
      {
        id: 'nur-s2',
        department: 'Nurse',
        staffName: 'Michael Scott, RN',
        staffTitle: 'Clinical Infusion & Procedure Nurse',
        departmentSuite: 'Day Care Ward & Recovery Lounge',
        avatarIcon: 'medication',
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '17:30',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'IV Cannulation, medication administration, wound dressing',
        phoneExtension: 'Ext. 3102'
      },
      {
        id: 'lab-s1',
        department: 'Laboratory',
        staffName: 'Jane Doe, MLS(ASCP)',
        staffTitle: 'Senior Clinical Laboratory Scientist',
        departmentSuite: 'Core Pathology & Automated Analyzers Lab',
        avatarIcon: 'biotech',
        dayOfWeek: 1,
        startTime: '06:30',
        endTime: '15:00',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'Hematology CBC, Clinical Chemistries, Coagulation verification',
        phoneExtension: 'Ext. 5101'
      },
      {
        id: 'lab-s2',
        department: 'Laboratory',
        staffName: 'Alex Vance, CPT',
        staffTitle: 'Lead Certified Phlebotomist',
        departmentSuite: 'Outpatient Phlebotomy Drawing Station A',
        avatarIcon: 'bloodtype',
        dayOfWeek: 3,
        startTime: '07:00',
        endTime: '15:30',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'STAT blood collections, pediatric draws & specimen accessioning',
        phoneExtension: 'Ext. 5102'
      },
      {
        id: 'rec-s0',
        department: 'Reception',
        staffName: 'Clara Receptionist',
        staffTitle: 'Patient Admissions & Front Desk Lead',
        departmentSuite: 'Main Lobby Registration Desk 1',
        avatarIcon: 'badge',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '16:30',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'Patient check-in, registration triage & insurance verification',
        phoneExtension: 'Ext. 2101'
      },
      {
        id: 'rec-s1',
        department: 'Reception',
        staffName: 'Robert Vance',
        staffTitle: 'Patient Admissions & Financial Counselor',
        departmentSuite: 'Main Lobby Registration Desk 1',
        avatarIcon: 'badge',
        dayOfWeek: 1,
        startTime: '07:30',
        endTime: '16:00',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'Patient check-in, insurance eligibility verification & copay receipt',
        phoneExtension: 'Ext. 2101'
      },
      {
        id: 'rec-s2',
        department: 'Reception',
        staffName: 'Kelly Kapoor',
        staffTitle: 'Appointment Scheduling & Queue Coordinator',
        departmentSuite: 'Main Lobby Registration Desk 2',
        avatarIcon: 'support_agent',
        dayOfWeek: 2,
        startTime: '08:30',
        endTime: '17:00',
        shiftType: 'Day Shift',
        isActive: true,
        notes: 'Walk-in queue management, appointment bookings & phone triage',
        phoneExtension: 'Ext. 2102'
      }
    ];
  }

  hospitalStaffShifts = signal<UnifiedShiftItem[]>(this.loadHospitalStaffShiftsFromStorage());

  allUnifiedShifts = computed<UnifiedShiftItem[]>(() => {
    const dbUsers = this.realClinicUsers();

    const dbShifts: UnifiedShiftItem[] = this.schedules().map(s => {
      const matchedUser = dbUsers.find(u =>
        (u.id && u.id.toLowerCase() === (s.doctorId || '').toLowerCase()) ||
        (u.userId && u.userId.toLowerCase() === (s.doctorId || '').toLowerCase())
      );

      let staffName = '';
      if (s.doctorName && s.doctorName.trim() && s.doctorName !== 'Unknown Doctor') {
        staffName = s.doctorName;
      } else if (matchedUser) {
        staffName = matchedUser.fullName || `${matchedUser.firstName} ${matchedUser.lastName}`.trim() || matchedUser.userName || 'Staff Member';
      } else {
        staffName = this.getDoctorName(s.doctorId, s.doctorName);
      }

      let department: 'Radiology' | 'Doctor' | 'Nurse' | 'Laboratory' | 'Reception' = 'Doctor';
      let staffTitle = 'Attending Clinical Physician';
      let departmentSuite = `Exam Suite ${(parseInt((s.id || '').replace(/[^0-9a-f]/gi, '').slice(-2) || '1', 16) % 5) + 1}`;
      let avatarIcon = 'stethoscope';
      let shiftType: 'Day Shift' | 'Evening Call' | 'Night STAT' | 'Diagnostic Read' | 'Interventional' | 'Rotation' = 'Day Shift';

      if (matchedUser) {
        const roles = ((matchedUser.roles || (matchedUser.role ? [matchedUser.role] : [])) as string[]).map(r => (r || '').toLowerCase());
        if (roles.includes('receptionist') || roles.includes('reception')) {
          department = 'Reception';
          staffTitle = 'Patient Admissions & Financial Counselor';
          departmentSuite = 'Main Lobby Registration Desk 1';
          avatarIcon = 'badge';
        } else if (roles.includes('nurse')) {
          department = 'Nurse';
          staffTitle = 'Registered Care Nurse (RN)';
          departmentSuite = 'Central Triage & Clinical Vitals Intake Bay';
          avatarIcon = 'healing';
        } else if (roles.includes('radiologist') || roles.includes('radiology')) {
          department = 'Radiology';
          staffTitle = 'Diagnostic Radiologist & Modality Specialist';
          departmentSuite = 'Reading Room Alpha — High-Resolution PACS Workstation';
          avatarIcon = 'visibility';
          shiftType = 'Diagnostic Read';
        } else if (roles.includes('labtechnician') || roles.includes('laboratorist') || roles.includes('lab') || roles.includes('laboratory')) {
          department = 'Laboratory';
          staffTitle = 'Medical Laboratory Scientist (MLS)';
          departmentSuite = 'Core Pathology & Automated Analyzers Lab';
          avatarIcon = 'biotech';
        } else if (roles.includes('doctor') || roles.includes('physician')) {
          department = 'Doctor';
          staffTitle = 'Attending Clinical Physician';
          departmentSuite = 'Clinical Consultation Exam Suite 1';
          avatarIcon = 'stethoscope';
        }
      } else {
        const lowerName = staffName.toLowerCase();
        if (lowerName.includes('reception') || lowerName.includes('clara') || lowerName.includes('vance') || lowerName.includes('kapoor')) {
          department = 'Reception';
          staffTitle = 'Patient Admissions & Financial Counselor';
          departmentSuite = 'Main Lobby Registration Desk 1';
          avatarIcon = 'badge';
        } else if (lowerName.includes('nurse') || lowerName.includes('joy') || lowerName.includes('barton')) {
          department = 'Nurse';
          staffTitle = 'Registered Care Nurse (RN)';
          departmentSuite = 'Central Triage & Clinical Vitals Intake Bay';
          avatarIcon = 'healing';
        } else if (lowerName.includes('radiolog') || lowerName.includes('ray') || lowerName.includes('elena')) {
          department = 'Radiology';
          staffTitle = 'Diagnostic Radiologist';
          departmentSuite = 'Reading Room Alpha — High-Resolution PACS Workstation';
          avatarIcon = 'visibility';
          shiftType = 'Diagnostic Read';
        } else if (lowerName.includes('lab') || lowerName.includes('technician') || lowerName.includes('watson')) {
          department = 'Laboratory';
          staffTitle = 'Medical Laboratory Scientist (MLS)';
          departmentSuite = 'Core Pathology & Automated Analyzers Lab';
          avatarIcon = 'biotech';
        }
      }

      return {
        id: s.id,
        doctorId: s.doctorId,
        department,
        staffName,
        staffTitle,
        departmentSuite,
        avatarIcon,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime?.slice(0, 5) || '09:00',
        endTime: s.endTime?.slice(0, 5) || '17:00',
        slotDurationMinutes: s.slotDurationMinutes || 30,
        maxPatients: s.maxPatients || 20,
        shiftType,
        isActive: s.isActive,
        notes: department === 'Doctor'
          ? `Clinical Consultation Slots (${s.slotDurationMinutes || 30} mins)`
          : `Scheduled duty shift in ${departmentSuite}`,
        phoneExtension: department === 'Reception' ? 'Ext. 2101' : department === 'Nurse' ? 'Ext. 3101' : department === 'Radiology' ? 'Ext. 4101' : 'Ext. 2000',
        isCustomDoctorShift: true
      };
    });

    const dbKeys = new Set(dbShifts.map(d => `${d.staffName.toLowerCase()}-${d.dayOfWeek}`));
    const nonDuplicatedHospitalShifts = this.hospitalStaffShifts().filter(
      h => !dbKeys.has(`${h.staffName.toLowerCase()}-${h.dayOfWeek}`)
    );

    return [...nonDuplicatedHospitalShifts, ...dbShifts];
  });

  filteredShifts = computed<UnifiedShiftItem[]>(() => {
    let list = this.allUnifiedShifts();
    const dept = this.selectedDepartment();
    const dayFilter = this.selectedDayFilter();
    const statusFilter = this.selectedStatusFilter();
    const q = this.searchQuery().toLowerCase().trim();

    if (dept !== 'ALL') {
      list = list.filter(s => s.department === dept);
    }

    if (dayFilter !== 'ALL') {
      list = list.filter(s => s.dayOfWeek === dayFilter);
    }

    if (statusFilter === 'ACTIVE') {
      list = list.filter(s => s.isActive);
    } else if (statusFilter === 'INACTIVE') {
      list = list.filter(s => !s.isActive);
    }

    if (q) {
      list = list.filter(s =>
        s.staffName.toLowerCase().includes(q) ||
        s.staffTitle.toLowerCase().includes(q) ||
        s.departmentSuite.toLowerCase().includes(q) ||
        s.shiftType.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q))
      );
    }

    return list;
  });

  radiologyShiftsCount = computed(() => this.allUnifiedShifts().filter(s => s.department === 'Radiology').length);
  doctorShiftsCount = computed(() => this.allUnifiedShifts().filter(s => s.department === 'Doctor').length);
  nurseShiftsCount = computed(() => this.allUnifiedShifts().filter(s => s.department === 'Nurse').length);
  labShiftsCount = computed(() => this.allUnifiedShifts().filter(s => s.department === 'Laboratory').length);
  receptionShiftsCount = computed(() => this.allUnifiedShifts().filter(s => s.department === 'Reception').length);

  currentUserDisplayName = computed<string>(() => {
    const user = this.authService.currentUser();
    if (!user) return '';
    const fullName = user.fullName || '';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const username = user.username || user.userName || '';
    const combined = `${firstName} ${lastName}`.trim();
    return fullName || combined || username;
  });

  myShifts = computed<UnifiedShiftItem[]>(() => {
    if (this.canManageSchedules()) return [];
    const rawName = this.currentUserDisplayName().toLowerCase().trim();
    const userId = (this.currentUserId() || '').toLowerCase();
    const user = this.authService.currentUser();
    const username = (user?.username || user?.userName || '').toLowerCase().trim();
    const userRoles = (this.authService.userRoles() || []).map(r => r.toLowerCase());
    const isReceptionist = userRoles.includes('receptionist');

    const stripped = rawName.replace(/^(dr\.|dr |prof\.|nurse |rn |rt\(r\)|mls |mlt )/i, '').trim();

    return this.allUnifiedShifts().filter(s => {
      if (userId && s.doctorId && s.doctorId.toLowerCase() === userId) {
        return true;
      }

      const sn = s.staffName.toLowerCase().trim();
      const snStripped = sn.replace(/^(dr\.|dr |prof\.|nurse |rn |rt\(r\)|mls |mlt )/i, '').trim();

      if (rawName && (sn === rawName || sn.includes(rawName) || rawName.includes(sn))) {
        return true;
      }
      if (stripped && (snStripped === stripped || snStripped.includes(stripped) || stripped.includes(snStripped))) {
        return true;
      }
      if (username && sn.includes(username)) {
        return true;
      }

      if (isReceptionist && s.department === 'Reception') {
        if (sn.includes('clara') || username.includes('clara') || rawName.includes('clara')) {
          return true;
        }
      }

      return false;
    });
  });

  myShiftsSectionExpanded = signal<boolean>(true);

  hasMyShiftOnDay(dayValue: number): boolean {
    return this.myShifts().some(s => s.dayOfWeek === dayValue);
  }

  hasActiveMyShiftOnDay(dayValue: number): boolean {
    return this.myShifts().some(s => s.dayOfWeek === dayValue && s.isActive);
  }

  clearFilters(): void {
    this.selectedDepartment.set('ALL');
    this.selectedDayFilter.set('ALL');
    this.selectedStatusFilter.set('ALL');
    this.searchQuery.set('');
  }

  loadAllRealClinicStaff(): void {
    this.userService.getUsers().subscribe({
      next: (res: UserDto[] | { data?: UserDto[]; items?: UserDto[] }) => {
        let list: UserDto[] = [];
        if (Array.isArray(res)) list = res;
        else if (res && Array.isArray(res.data)) list = res.data;
        else if (res && Array.isArray(res.items)) list = res.items;

        this.realClinicUsers.set(list);
      },
      error: () => { }
    });
  }

  availableStaffForSelectedDept = computed(() => {
    const dept = this.scheduleForm.get('department')?.value || 'Radiology';
    const baseList: { name: string; title: string; suite: string; phone?: string; shift?: string; department?: string }[] =
      this.departmentStaffDirectory[dept] || [];
    const dbUsers = this.realClinicUsers();

    let realRoleStaff: { name: string; title: string; suite: string; phone?: string; shift?: string; department?: string }[] = [];

    if (dept === 'Radiology') {
      const radUsers = dbUsers.filter(u => {
        const roles = ((u.roles || (u.role ? [u.role] : [])) as string[]).map((r: string) => r.toLowerCase());
        return roles.includes('radiologist') || roles.includes('radiology');
      });
      realRoleStaff = radUsers.map(u => ({
        name: u.fullName || (`Dr. ${u.firstName} ${u.lastName}`).trim() || u.userName || 'Radiologist',
        title: 'Diagnostic Radiologist & Modality Specialist',
        suite: 'Reading Room Alpha — High-Resolution PACS Workstation',
        phone: u.phoneNumber || 'Ext. 4101',
        shift: 'Diagnostic Read',
        department: 'Radiology'
      }));
    } else if (dept === 'Doctor') {
      const docUsers = dbUsers.filter(u => {
        const roles = ((u.roles || (u.role ? [u.role] : [])) as string[]).map((r: string) => r.toLowerCase());
        return roles.includes('doctor') || roles.includes('physician');
      });
      const fromDocService = this.doctors().map((d, idx) => ({
        name: `Dr. ${d.firstName} ${d.lastName}`,
        title: d.specialization ? `Attending ${d.specialization}` : 'Clinical Physician',
        suite: `Consultation Exam Suite ${(idx % 5) + 1}`,
        phone: `Ext. ${2001 + (idx % 20)}`,
        shift: 'Day Shift',
        department: 'Doctor'
      }));
      const fromDb = docUsers.map(u => ({
        name: u.fullName || (`Dr. ${u.firstName} ${u.lastName}`).trim() || u.userName || 'Doctor',
        title: 'Attending Clinical Physician',
        suite: 'Clinical Consultation Exam Suite 1',
        phone: u.phoneNumber || 'Ext. 2000',
        shift: 'Day Shift',
        department: 'Doctor'
      }));
      realRoleStaff = [...fromDocService, ...fromDb];
    } else if (dept === 'Nurse') {
      const nurseUsers = dbUsers.filter(u => {
        const roles = ((u.roles || (u.role ? [u.role] : [])) as string[]).map((r: string) => r.toLowerCase());
        return roles.includes('nurse');
      });
      realRoleStaff = nurseUsers.map(u => ({
        name: u.fullName || (`${u.firstName} ${u.lastName}`).trim() || u.userName || 'Nurse',
        title: 'Registered Care Nurse (RN)',
        suite: 'Clinical Care Bay A — Triage Station',
        phone: u.phoneNumber || 'Ext. 3101',
        shift: 'Day Shift',
        department: 'Nurse'
      }));
    } else if (dept === 'Laboratory') {
      const labUsers = dbUsers.filter(u => {
        const roles = ((u.roles || (u.role ? [u.role] : [])) as string[]).map((r: string) => r.toLowerCase());
        return roles.includes('laboratorist') || roles.includes('lab') || roles.includes('laboratory');
      });
      realRoleStaff = labUsers.map(u => ({
        name: u.fullName || (`${u.firstName} ${u.lastName}`).trim() || u.userName || 'Lab Specialist',
        title: 'Medical Laboratory Scientist (MLS)',
        suite: 'Diagnostic Pathology Core Lab — Station 1',
        phone: u.phoneNumber || 'Ext. 5101',
        shift: 'Day Shift',
        department: 'Laboratory'
      }));
    } else if (dept === 'Reception') {
      const recUsers = dbUsers.filter(u => {
        const roles = ((u.roles || (u.role ? [u.role] : [])) as string[]).map((r: string) => r.toLowerCase());
        return roles.includes('receptionist') || roles.includes('reception');
      });
      realRoleStaff = recUsers.map(u => ({
        name: u.fullName || (`${u.firstName} ${u.lastName}`).trim() || u.userName || 'Admissions Coordinator',
        title: 'Patient Admissions & Financial Counselor',
        suite: 'Main Lobby Registration Desk 1',
        phone: u.phoneNumber || 'Ext. 2101',
        shift: 'Day Shift',
        department: 'Reception'
      }));
    }

    const names = new Set(realRoleStaff.map(s => s.name.toLowerCase()));
    const unseededBase = baseList.filter(s => !names.has(s.name.toLowerCase()));
    return [...realRoleStaff, ...unseededBase];
  });

  allRegisteredStaff = computed(() => {
    const dbUsers = this.realClinicUsers();
    return dbUsers.map(u => {
      const roles = ((u.roles || (u.role ? [u.role] : [])) as string[]).map((r: string) => r.toLowerCase());
      let roleDept: 'Radiology' | 'Doctor' | 'Nurse' | 'Laboratory' | 'Reception' = 'Doctor';
      let defaultTitle = 'Clinical Staff Specialist';
      let defaultSuite = 'Clinical Consultation Suite 1';
      let defaultShift = 'Day Shift';

      if (roles.includes('radiologist') || roles.includes('radiology')) {
        roleDept = 'Radiology';
        defaultTitle = 'Diagnostic Radiologist';
        defaultSuite = 'Reading Room Alpha — High-Resolution PACS Workstation';
        defaultShift = 'Diagnostic Read';
      } else if (roles.includes('doctor') || roles.includes('physician')) {
        roleDept = 'Doctor';
        defaultTitle = 'Attending Physician';
        defaultSuite = 'Consultation Exam Suite 1';
      } else if (roles.includes('nurse')) {
        roleDept = 'Nurse';
        defaultTitle = 'Registered Nurse (RN)';
        defaultSuite = 'Clinical Care Bay A — Triage Station';
      } else if (roles.includes('laboratorist') || roles.includes('lab') || roles.includes('laboratory')) {
        roleDept = 'Laboratory';
        defaultTitle = 'Medical Laboratory Scientist (MLS)';
        defaultSuite = 'Diagnostic Pathology Core Lab — Station 1';
      } else if (roles.includes('receptionist') || roles.includes('reception')) {
        roleDept = 'Reception';
        defaultTitle = 'Patient Admissions Coordinator';
        defaultSuite = 'Main Lobby Registration Desk 1';
      } else if (roles.includes('admin')) {
        roleDept = 'Doctor';
        defaultTitle = 'Hospital Clinic Administrator';
        defaultSuite = 'Administration Suite 101';
      }

      const rawName = u.fullName ||
        ((u.firstName || u.lastName) ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '') ||
        u.userName || 'Staff Member';

      const formattedName = (roleDept === 'Doctor' || roleDept === 'Radiology') && !rawName.startsWith('Dr.')
        ? `Dr. ${rawName}`
        : rawName;

      return {
        name: formattedName,
        title: defaultTitle,
        department: roleDept,
        suite: defaultSuite,
        phone: u.phoneNumber || 'Ext. 1000',
        shift: defaultShift
      };
    });
  });

  otherRegisteredStaff = computed(() => {
    const deptNames = new Set(this.availableStaffForSelectedDept().map(s => s.name.toLowerCase()));
    return this.allRegisteredStaff().filter(s => !deptNames.has(s.name.toLowerCase()));
  });

  onDepartmentModalChange(dept: string): void {
    this.scheduleForm.patchValue({ department: dept });
    this.customStaffMode.set(false);
    const staffList = this.availableStaffForSelectedDept();
    const first = staffList[0];
    if (first) {
      this.selectedStaffDropdown.set(first.name);
      this.scheduleForm.patchValue({
        staffName: first.name,
        staffTitle: first.title,
        departmentSuite: first.suite,
        shiftType: first.shift || 'Day Shift'
      });
    } else {
      this.selectedStaffDropdown.set('__custom__');
      this.customStaffMode.set(true);
      this.scheduleForm.patchValue({
        staffName: '',
        staffTitle: 'Specialist',
        departmentSuite: 'Suite 1'
      });
    }
  }

  onStaffDropdownChange(name: string): void {
    if (name === '__custom__') {
      this.customStaffMode.set(true);
      this.selectedStaffDropdown.set('__custom__');
      this.scheduleForm.patchValue({ staffName: '' });
      return;
    }

    this.customStaffMode.set(false);
    this.selectedStaffDropdown.set(name);

    let staff: { name: string; title: string; suite: string; phone?: string; shift?: string; department?: string } | undefined =
      this.availableStaffForSelectedDept().find(s => s.name === name);

    if (!staff) {
      staff = this.allRegisteredStaff().find(s => s.name === name);
      if (staff && staff.department) {
        this.scheduleForm.patchValue({ department: staff.department });
      }
    }

    if (staff) {
      this.scheduleForm.patchValue({
        staffName: staff.name,
        staffTitle: staff.title,
        departmentSuite: staff.suite,
        shiftType: staff.shift || this.scheduleForm.get('shiftType')?.value || 'Day Shift'
      });
    } else {
      this.scheduleForm.patchValue({ staffName: name });
    }
  }

  ngOnInit(): void {
    const initialDept = (this.route.snapshot.queryParams['dept'] || this.route.snapshot.queryParams['role'] || '').toLowerCase();
    if (initialDept === 'radiology') {
      this.selectedDepartment.set('Radiology');
    } else if (initialDept === 'doctor') {
      this.selectedDepartment.set('Doctor');
    } else if (initialDept === 'nurse') {
      this.selectedDepartment.set('Nurse');
    } else if (initialDept === 'lab' || initialDept === 'laboratory') {
      this.selectedDepartment.set('Laboratory');
    } else if (initialDept === 'reception') {
      this.selectedDepartment.set('Reception');
    } else if (initialDept === 'all') {
      this.selectedDepartment.set('ALL');
    } else if (this.isRadiologistRole()) {
      this.selectedDepartment.set('Radiology');
    } else if (this.isDoctorRole()) {
      this.selectedDepartment.set('Doctor');
    } else if (this.isReceptionistRole()) {
      this.selectedDepartment.set('Reception');
    } else {
      this.selectedDepartment.set('ALL');
    }

    this.loadAllRealClinicStaff();
    this.loadDoctors();
    this.loadSchedules();
  }

  setDepartment(dept: 'ALL' | 'Radiology' | 'Doctor' | 'Nurse' | 'Laboratory' | 'Reception') {
    this.selectedDepartment.set(dept);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dept: dept === 'ALL' ? 'all' : dept.toLowerCase() },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  loadDoctors(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (docs) => {
        const docList = docs || [];
        const firstDoc = docList[0];
        if (firstDoc) {
          this.doctors.set(docList);
          if (!this.scheduleForm.get('staffName')?.value) {
            this.scheduleForm.patchValue({ staffName: `Dr. ${firstDoc.firstName} ${firstDoc.lastName}` });
          }
        } else {
          this.fallbackToUserDoctors();
        }
      },
      error: () => this.fallbackToUserDoctors()
    });
  }

  private fallbackToUserDoctors(): void {
    this.userService.getUsers().subscribe({
      next: (res: UserDto[] | { data?: UserDto[]; items?: UserDto[] }) => {
        let list: UserDto[] = [];
        if (Array.isArray(res)) list = res;
        else if (res && Array.isArray(res.data)) list = res.data;
        else if (res && Array.isArray(res.items)) list = res.items;

        const docUsers: DoctorDto[] = list.filter(u => {
          const roles = u.roles || (u.role ? [u.role] : []);
          return roles.some((r: string) => r.toLowerCase() === 'doctor' || r.toLowerCase() === 'admin');
        }).map(u => ({
          id: u.id || u.userId || '',
          firstName: u.firstName || u.userName || 'Doctor',
          lastName: u.lastName || '',
          fullName: u.fullName,
          email: u.email || ''
        }));

        this.doctors.set(docUsers);
        const firstUserDoc = docUsers[0];
        if (firstUserDoc && !this.scheduleForm.get('staffName')?.value) {
          this.scheduleForm.patchValue({ staffName: `Dr. ${firstUserDoc.firstName} ${firstUserDoc.lastName}` });
        }
      },
      error: () => { }
    });
  }

  loadSchedules(): void {
    this.isLoading.set(true);
    const docId = this.selectedDoctorId() === 'ALL' ? undefined : this.selectedDoctorId();
    this.scheduleService.getAll(docId).subscribe({
      next: (data) => {
        this.schedules.set(data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.schedules.set([]);
        this.isLoading.set(false);
      }
    });
  }

  openAddModal(): void {
    this.editingShiftId.set(null);
    const defaultDept = this.selectedDepartment() === 'ALL'
      ? (this.isRadiologistRole() ? 'Radiology' : 'Doctor')
      : this.selectedDepartment();

    this.onDepartmentModalChange(defaultDept);
    this.showAddModal.set(true);
  }

  openEditModal(shift: UnifiedShiftItem): void {
    this.editingShiftId.set(shift.id);
    this.scheduleForm.patchValue({
      department: shift.department,
      staffName: shift.staffName,
      staffTitle: shift.staffTitle,
      departmentSuite: shift.departmentSuite,
      dayOfWeek: shift.dayOfWeek,
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftType: shift.shiftType,
      slotDurationMinutes: shift.slotDurationMinutes || 30
    });

    const matchingStaff = [...this.availableStaffForSelectedDept(), ...this.allRegisteredStaff()]
      .find(s => s.name.toLowerCase() === shift.staffName.toLowerCase());

    if (matchingStaff) {
      this.customStaffMode.set(false);
      this.selectedStaffDropdown.set(matchingStaff.name);
    } else {
      this.selectedStaffDropdown.set('__custom__');
      this.customStaffMode.set(true);
    }

    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.editingShiftId.set(null);
  }

  saveSchedule(): void {
    if (this.scheduleForm.invalid) return;

    this.isSaving.set(true);
    const val = this.scheduleForm.value;

    if (this.isEditMode()) {
      const editId = this.editingShiftId();
      const dbShift = this.schedules().find(s => s.id === editId);

      if (dbShift) {
        this.scheduleService.delete(editId!).subscribe({
          next: () => {
            const rawStaffName = (val.staffName || '').trim().toLowerCase();
            const cleanStaffName = rawStaffName.replace(/^dr\.\s*/i, '').trim();
            const matchedUser = this.realClinicUsers().find(u => {
              const uFull = (u.fullName || `${u.firstName} ${u.lastName}`).trim().toLowerCase();
              const uClean = uFull.replace(/^dr\.\s*/i, '').trim();
              const uName = (u.userName || u.username || '').toLowerCase();
              return uFull === rawStaffName || uClean === cleanStaffName || uName === cleanStaffName;
            });
            const targetId = matchedUser?.id || matchedUser?.userId || dbShift.doctorId;

            const payload: CreateDoctorScheduleRequest = {
              doctorId: targetId,
              dayOfWeek: Number(val.dayOfWeek),
              startTime: val.startTime.length === 5 ? val.startTime + ':00' : val.startTime,
              endTime: val.endTime.length === 5 ? val.endTime + ':00' : val.endTime,
              maxPatients: 20,
              slotDurationMinutes: Number(val.slotDurationMinutes || 30)
            };

            this.scheduleService.create(payload).subscribe({
              next: () => {
                this.isSaving.set(false);
                this.showAddModal.set(false);
                this.editingShiftId.set(null);
                this.toast.success(`Working shift updated for ${val.staffName}.`);
                this.loadSchedules();
              },
              error: (err) => {
                this.isSaving.set(false);
                this.toast.error(err.error?.detail || err.error?.message || 'Failed to update shift.');
                this.loadSchedules();
              }
            });
          },
          error: () => {
            this.isSaving.set(false);
            this.toast.error('Failed to update shift.');
          }
        });
        return;
      } else {
        this.hospitalStaffShifts.update(prev => {
          const updated = prev.map(s => {
            if (s.id === editId) {
              return {
                ...s,
                department: val.department,
                staffName: val.staffName,
                staffTitle: val.staffTitle,
                departmentSuite: val.departmentSuite,
                dayOfWeek: Number(val.dayOfWeek),
                startTime: val.startTime,
                endTime: val.endTime,
                shiftType: val.shiftType,
                slotDurationMinutes: Number(val.slotDurationMinutes || 30),
                notes: `Duty shift assigned to ${val.departmentSuite}`
              };
            }
            return s;
          });
          this.saveHospitalStaffShiftsToStorage(updated);
          return updated;
        });
        this.isSaving.set(false);
        this.showAddModal.set(false);
        this.editingShiftId.set(null);
        this.toast.success(`Working shift updated for ${val.staffName}.`);
        return;
      }
    }

    const rawStaffName = (val.staffName || '').trim().toLowerCase();
    const cleanStaffName = rawStaffName.replace(/^dr\.\s*/i, '').trim();

    const matchedUser = this.realClinicUsers().find(u => {
      const uFull = (u.fullName || `${u.firstName} ${u.lastName}`).trim().toLowerCase();
      const uClean = uFull.replace(/^dr\.\s*/i, '').trim();
      const uName = (u.userName || u.username || '').toLowerCase();
      return uFull === rawStaffName || uClean === cleanStaffName ||
        uFull.includes(cleanStaffName) || cleanStaffName.includes(uClean) ||
        uName === cleanStaffName;
    });

    const matchedDoctor = val.department === 'Doctor'
      ? (this.doctors().find(d => `${d.firstName} ${d.lastName}`.toLowerCase().includes(cleanStaffName)) || this.doctors()[0])
      : null;

    const targetUserId = matchedUser?.id || matchedUser?.userId || matchedDoctor?.id;

    if (targetUserId) {
      const payload: CreateDoctorScheduleRequest = {
        doctorId: targetUserId,
        dayOfWeek: Number(val.dayOfWeek),
        startTime: val.startTime.length === 5 ? val.startTime + ':00' : val.startTime,
        endTime: val.endTime.length === 5 ? val.endTime + ':00' : val.endTime,
        maxPatients: 20,
        slotDurationMinutes: Number(val.slotDurationMinutes || 30)
      };

      this.scheduleService.create(payload).subscribe({
        next: () => {
          this.toast.success(`${val.department} shift schedule saved.`);
          this.isSaving.set(false);
          this.showAddModal.set(false);
          this.editingShiftId.set(null);
          this.loadSchedules();
        },
        error: (err) => {
          const detail = err.error?.detail || err.error?.message || 'Failed to save shift to database.';
          this.toast.error(detail);
          this.isSaving.set(false);
        }
      });
    } else {
      const newShift: UnifiedShiftItem = {
        id: `shift-${Date.now()}`,
        department: val.department,
        staffName: val.staffName,
        staffTitle: val.staffTitle,
        departmentSuite: val.departmentSuite,
        avatarIcon: val.department === 'Radiology' ? 'visibility' : val.department === 'Nurse' ? 'healing' : val.department === 'Laboratory' ? 'biotech' : val.department === 'Reception' ? 'badge' : 'stethoscope',
        dayOfWeek: Number(val.dayOfWeek),
        startTime: val.startTime,
        endTime: val.endTime,
        shiftType: val.shiftType,
        isActive: true,
        notes: `Scheduled shift in ${val.departmentSuite}`,
        phoneExtension: val.department === 'Reception' ? 'Ext. 2101' : 'Ext. 4000'
      };

      this.hospitalStaffShifts.update(prev => {
        const updated = [newShift, ...prev];
        this.saveHospitalStaffShiftsToStorage(updated);
        return updated;
      });
      this.isSaving.set(false);
      this.showAddModal.set(false);
      this.toast.success(`${val.department} staff shift rostered.`);
    }
  }

  toggleSchedule(item: UnifiedShiftItem): void {
    if (item.isCustomDoctorShift) {
      this.scheduleService.toggleStatus(item.id).subscribe({
        next: () => {
          this.toast.success('Shift status toggled.');
          this.loadSchedules();
        },
        error: () => this.toast.error('Failed to update shift status.')
      });
    } else {
      this.hospitalStaffShifts.update(list => {
        const updated = list.map(s => s.id === item.id ? { ...s, isActive: !s.isActive } : s);
        this.saveHospitalStaffShiftsToStorage(updated);
        return updated;
      });
      this.toast.success('Staff shift status toggled.');
    }
  }

  deleteSchedule(item: UnifiedShiftItem): void {
    if (confirm(`Are you sure you want to remove ${item.staffName}'s shift from the roster?`)) {
      if (item.isCustomDoctorShift) {
        this.scheduleService.delete(item.id).subscribe({
          next: () => {
            this.toast.success('Shift removed from roster.');
            this.loadSchedules();
          },
          error: () => this.toast.error('Failed to delete shift.')
        });
      } else {
        this.hospitalStaffShifts.update(list => {
          const updated = list.filter(s => s.id !== item.id);
          this.saveHospitalStaffShiftsToStorage(updated);
          return updated;
        });
        this.toast.success('Shift removed from roster.');
      }
    }
  }

  getDayName(dayNum: number): string {
    const d = this.days.find(x => x.value === dayNum);
    return d ? d.label : 'Day ' + dayNum;
  }

  getDoctorName(doctorId: string, fallbackName?: string): string {
    if (fallbackName && fallbackName.trim() !== '') return fallbackName;
    const doc = this.doctors().find(d => d.id === doctorId);
    if (doc) {
      return doc.fullName || `Dr. ${doc.firstName} ${doc.lastName}`.trim();
    }
    return 'Attending Physician';
  }

  getMyShiftTime(dayValue: number): string {
    const shift = this.myShifts().find(s => s.dayOfWeek === dayValue);
    if (!shift) return '';
    return `${shift.startTime} - ${shift.endTime}`;
  }
}
