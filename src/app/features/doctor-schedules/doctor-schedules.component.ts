import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { DoctorScheduleService } from '../../services/doctor-schedule.service';
import { DoctorService } from '../../services/doctor.service';
import { ToastService } from '../../ui/toast/toast.service';
import { DoctorSchedule } from '../../models/doctor-schedule.model';

@Component({
  selector: 'app-doctor-schedules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule
  ],
  templateUrl: './doctor-schedules.component.html',
  styleUrls: ['./doctor-schedules.component.scss']
})
export class DoctorSchedulesComponent implements OnInit {
  private fb = inject(FormBuilder);
  doctorScheduleService = inject(DoctorScheduleService);
  doctorService = inject(DoctorService);
  toast = inject(ToastService);

  doctors = signal<any[]>([]);
  selectedDoctorId = signal<string>('');
  schedules = signal<DoctorSchedule[]>([]);
  showAddForm = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  scheduleForm = this.fb.group({
    dayOfWeek: [1, Validators.required],
    startTime: ['09:00:00', Validators.required],
    endTime: ['17:00:00', Validators.required],
    slotDurationMinutes: [30, [Validators.required, Validators.min(5)]]
  });

  days = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  ngOnInit(): void {
    this.loadDoctors();
  }

  loadDoctors(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (docs: any[]) => {
        this.doctors.set(docs || []);
        if (docs && docs.length > 0) {
          this.selectedDoctorId.set(docs[0].id);
          this.loadSchedules();
        }
      },
      error: () => this.toast.error('Failed to load doctors')
    });
  }

  loadSchedules(): void {
    const docId = this.selectedDoctorId();
    if (!docId) return;

    this.doctorScheduleService.getByDoctor(docId).subscribe({
      next: (data: DoctorSchedule[]) => this.schedules.set(data || []),
      error: () => this.schedules.set([])
    });
  }

  onDoctorChange(doctorId: string): void {
    this.selectedDoctorId.set(doctorId);
    this.loadSchedules();
  }

  saveSchedule(): void {
    if (this.scheduleForm.invalid || !this.selectedDoctorId()) return;

    this.isSaving.set(true);
    const formVal = this.scheduleForm.value;

    const payload = {
      doctorId: this.selectedDoctorId(),
      dayOfWeek: Number(formVal.dayOfWeek),
      startTime: formVal.startTime!.length === 5 ? formVal.startTime! + ':00' : formVal.startTime!,
      endTime: formVal.endTime!.length === 5 ? formVal.endTime! + ':00' : formVal.endTime!,
      maxPatients: 20,
      slotDurationMinutes: Number(formVal.slotDurationMinutes || 30)
    };

    this.doctorScheduleService.create(payload).subscribe({
      next: () => {
        this.toast.success('Doctor schedule shift created successfully!');
        this.isSaving.set(false);
        this.showAddForm.set(false);
        this.loadSchedules();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.detail || 'Failed to save schedule');
        this.isSaving.set(false);
      }
    });
  }

  toggleSchedule(id: string): void {
    this.doctorScheduleService.toggleStatus(id).subscribe({
      next: () => {
        this.toast.success('Shift status toggled');
        this.loadSchedules();
      },
      error: () => this.toast.error('Failed to update shift status')
    });
  }

  deleteSchedule(id: string): void {
    this.doctorScheduleService.delete(id).subscribe({
      next: () => {
        this.toast.success('Shift schedule removed');
        this.loadSchedules();
      },
      error: () => this.toast.error('Failed to remove shift')
    });
  }

  getDayName(dayNum: number): string {
    const d = this.days.find(x => x.value === dayNum);
    return d ? d.label : 'Day ' + dayNum;
  }
}
