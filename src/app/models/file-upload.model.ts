export interface FileUploadResponse {
  id: string;
  fileName: string;          // disk filename (GUID__originalName)
  originalFileName: string;  // human-readable name for display
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  downloadUrl?: string;
}
