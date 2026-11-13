export interface VitalSignsSnapshot {
  readonly id?: string;
  readonly appointmentId?: string;
  readonly systolicBP?: number;
  readonly diastolicBP?: number;
  readonly heartRateBpm?: number;
  readonly temperatureC?: number;
  readonly respiratoryRate?: number;
  readonly weightKg?: number;
  readonly heightCm?: number;
  readonly oxygenSaturation?: number;
  readonly painScore?: number;
  readonly recordedAt?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  scheduledDateTime: string;
  durationMinutes: number;
  status: string;
  reasonForVisit: string;
  triageUrgency?: string;
  roomAssignment?: string;
  triageNotes?: string;
  tokenNumber?: string;
  visitType?: string;
  vitalSigns?: VitalSignsSnapshot;
}

export interface CheckInAppointmentRequest {
  tokenNumber?: string;
  visitType?: string;
}

export interface RescheduleAppointmentRequest {
  newScheduledDateTime: string;
  reason?: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  scheduledDateTime: string;
  durationMinutes: number;
  reasonForVisit: string;
}

export interface UpdateAppointmentTriageRequest {
  triageUrgency?: string;
  roomAssignment?: string;
  triageNotes?: string;
  status?: string;
}

export interface UpdateAppointmentStatusRequest {
  status: string;
  roomAssignment?: string;
}
