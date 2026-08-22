import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { FileUploadResponse } from '../models/file-upload.model';

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/files`;

  uploadPatientFile(patientId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<FileUploadResponse>(`${this.apiUrl}/upload/${patientId}`, formData);
  }

  getPatientFiles(patientId: string) {
    return this.http.get<FileUploadResponse[]>(`${this.apiUrl}/patient/${patientId}`);
  }
}
