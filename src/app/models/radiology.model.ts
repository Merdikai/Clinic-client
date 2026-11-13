export type RadiologyModality = 'X-Ray' | 'Ultrasound' | 'CT Scan' | 'MRI' | 'ECG / Echo';
export type RadiologyPriority = 'Routine' | 'Urgent' | 'Stat';
export type RadiologyStatus = 'Ordered' | 'Scheduled' | 'InProgress' | 'Reported' | 'Completed' | 'Cancelled';

export interface RadiologyOrder {
  id: string;
  orderNumber: string;
  accessionNumber: string;
  roomSuite?: string;
  equipmentModel?: string;
  scheduledAt?: string;

  patientId: string;
  patientName: string;
  patientMedicalRecordNumber: string;
  gender?: string;
  dateOfBirth?: string;

  doctorId: string;
  doctorName: string;
  appointmentId?: string;

  modality: RadiologyModality;
  procedureName: string;
  bodyPart: string;
  clinicalIndication: string;
  priority: RadiologyPriority;
  status: RadiologyStatus;
  orderedAt: string;

  performedAt?: string;
  performedByTechnicianName?: string;
  findings?: string;
  impression?: string;
  imageUrl?: string;
  secondaryAttachmentUrls?: string;
  radiologistSignature?: string;
  reportedAt?: string;

  // Critical Finding Emergency Alerts
  isCritical?: boolean;
  criticalAlertNotes?: string;
  criticalAlertAcknowledgedByDoctor?: boolean;
  criticalAlertAcknowledgedAt?: string;

  // Radiation Dosimetry & Contrast Compliance
  radiationDoseDlp?: number;
  radiationDoseDap?: number;
  exposureParameters?: string;
  contrastUsed?: boolean;
  contrastAgentName?: string;
  contrastVolumeMl?: number;
  contrastLotNumber?: string;
  contrastRoute?: string;

  doctorSignedOffAt?: string;
  doctorSignOffNotes?: string;
  price: number;
  isBilled: boolean;
}

export interface CreateRadiologyOrderDto {
  patientId: string;
  appointmentId?: string;
  modality: RadiologyModality;
  procedureName: string;
  bodyPart: string;
  clinicalIndication: string;
  priority?: RadiologyPriority;
  price?: number;
  roomSuite?: string;
}

export interface ScheduleRadiologyOrderDto {
  roomSuite: string;
  equipmentModel?: string;
  scheduledAt?: string;
}

export interface ReportRadiologyOrderDto {
  findings: string;
  impression: string;
  imageUrl?: string;
  secondaryAttachmentUrls?: string;
  radiologistSignature: string;

  isCritical?: boolean;
  criticalAlertNotes?: string;

  radiationDoseDlp?: number;
  radiationDoseDap?: number;
  exposureParameters?: string;

  contrastUsed?: boolean;
  contrastAgentName?: string;
  contrastVolumeMl?: number;
  contrastLotNumber?: string;
  contrastRoute?: string;
  adverseReaction?: string;
  operatorName?: string;
}

export interface DoctorSignOffRadiologyDto {
  notes?: string;
}

export interface AcknowledgeCriticalAlertDto {
  acknowledgmentNotes?: string;
}

export interface RadiologyMetrics {
  totalOrders: number;
  orderedCount: number;
  scheduledCount: number;
  inProgressCount: number;
  completedCount: number;
  pendingDoctorReviewCount: number;
  statUrgentCount: number;
  criticalAlertsCount: number;

  // Compatibility aliases
  awaitingScan?: number;
  pendingReporting?: number;
  completedStudies?: number;
}

export interface RadiologySafetyLog {
  orderId: string;
  orderNumber: string;
  accessionNumber: string;
  patientName: string;
  modality: string;
  procedureName: string;
  performedAt?: string;
  performedByTechnicianName?: string;
  radiationDoseDlp?: number;
  radiationDoseDap?: number;
  exposureParameters?: string;
  contrastUsed: boolean;
  contrastAgentName?: string;
  contrastVolumeMl?: number;
  contrastLotNumber?: string;
  contrastRoute?: string;
  adverseReaction?: string;
  operatorName?: string;
}
