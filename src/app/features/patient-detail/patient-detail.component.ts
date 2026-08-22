import { Component, inject, signal, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { PatientService } from '../../services/patient.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Patient } from '../../models/patient.model';
import { FileUploadResponse } from '../../models/file-upload.model';
import { ToastService } from '../../ui/toast/toast.service';

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
    MatChipsModule
  ],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.scss']
})
export class PatientDetailComponent implements OnInit {
  id = input.required<string>();
  private patientService = inject(PatientService);
  private fileService = inject(FileUploadService);
  private toast = inject(ToastService);

  patient = signal<Patient | null>(null);
  history = signal<any>(null);
  files = signal<FileUploadResponse[]>([]);
  isLoading = signal(false);
  isUploading = signal(false);

  ngOnInit() {
    this.isLoading.set(true);
    this.patientService.getById(this.id()).subscribe({
      next: (data) => {
        this.patient.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.patientService.getMedicalHistory(this.id()).subscribe({
      next: (h) => this.history.set(h),
      error: () => {}
    });

    this.loadFiles();
  }

  loadFiles() {
    this.fileService.getPatientFiles(this.id()).subscribe({
      next: (files) => this.files.set(files || []),
      error: () => {}
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploading.set(true);

    this.fileService.uploadPatientFile(this.id(), file).subscribe({
      next: (res) => {
        this.files.update((list) => [res, ...list]);
        this.isUploading.set(false);
        this.toast.success(`File '${file.name}' uploaded successfully!`);
      },
      error: () => {
        this.isUploading.set(false);
        this.toast.error('File upload failed');
      }
    });
  }
}
