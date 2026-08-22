export interface FileUploadResponse {
  id: string;
  patientId: string;
  fileName: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  downloadUrl: string;
}
