import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NursingService } from '../../services/nursing.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../ui/toast/toast.service';
import { ShiftHandover, CreateShiftHandoverRequest } from '../../models/nursing.model';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-shift-handover',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './shift-handover.component.html',
  styleUrls: ['./shift-handover.component.scss']
})
export class ShiftHandoverComponent implements OnInit {
  private nursingService = inject(NursingService);
  public authService = inject(AuthService);
  private toast = inject(ToastService);

  handovers = signal<ShiftHandover[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // SBAR Form Signals
  formShiftType = signal<string>('Morning Shift (07:00 - 15:00)');
  formActivePatientCount = signal<number>(6);
  formCriticalAlertsCount = signal<number>(0);

  formSituation = signal<string>('');
  formBackground = signal<string>('');
  formAssessment = signal<string>('');
  formRecommendation = signal<string>('');

  shiftOptions = [
    'Morning Shift (07:00 - 15:00)',
    'Evening Shift (15:00 - 23:00)',
    'Night Shift (23:00 - 07:00)'
  ];

  currentUser = this.authService.currentUser;

  latestHandover = computed(() => {
    const list = this.handovers();
    return list.length > 0 ? list[0] : null;
  });

  ngOnInit(): void {
    this.loadHandovers();
    this.detectCurrentShift();
  }

  detectCurrentShift(): void {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 15) {
      this.formShiftType.set('Morning Shift (07:00 - 15:00)');
    } else if (hour >= 15 && hour < 23) {
      this.formShiftType.set('Evening Shift (15:00 - 23:00)');
    } else {
      this.formShiftType.set('Night Shift (23:00 - 07:00)');
    }
  }

  loadHandovers(): void {
    this.isLoading.set(true);
    this.nursingService.getShiftHandovers().subscribe({
      next: (data) => {
        this.handovers.set(data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load shift handovers.');
      }
    });
  }

  submitHandover(): void {
    if (!this.formSituation().trim()) {
      this.toast.error('Please enter the Situation section for this handover.');
      return;
    }

    this.isSubmitting.set(true);
    const request: CreateShiftHandoverRequest = {
      shiftType: this.formShiftType(),
      situation: this.formSituation().trim(),
      background: this.formBackground().trim(),
      assessment: this.formAssessment().trim(),
      recommendation: this.formRecommendation().trim(),
      activePatientCount: Number(this.formActivePatientCount()) || 0,
      criticalAlertsCount: Number(this.formCriticalAlertsCount()) || 0,
      handoverTimestamp: new Date().toISOString()
    };

    this.nursingService.createShiftHandover(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('SBAR Shift Handover logged and broadcasted.');
        this.formSituation.set('');
        this.formBackground.set('');
        this.formAssessment.set('');
        this.formRecommendation.set('');
        this.loadHandovers();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err.error?.detail || err.error?.title || 'Failed to submit shift handover.');
      }
    });
  }

  fillTemplate(): void {
    this.formSituation.set('Unit operating normally. 6 patients currently admitted/triaged across bays. 2 discharges planned before 17:00.');
    this.formBackground.set('Patient in Bay A arrived with acute hypertension (BP 165/95), received oral amlodipine at 13:00. Room 2 patient post-minor wound debridement.');
    this.formAssessment.set('All patient vital signs stable. Zero active fall incidents. Blood glucose checks scheduled for 16:00 for Bay B.');
    this.formRecommendation.set('Monitor BP response for Bay A at 15:30. Ensure dressing supplies restocked for Room 2. Handover keys to incoming charge nurse.');
    this.toast.info('Loaded clinical SBAR template.');
  }
}
