export interface VitalSign {
  id: string;
  appointmentId: string;
  consultationId?: string;
  recordedByUserId?: string;
  systolicBP: number;
  diastolicBP: number;
  temperatureC: number;
  heartRateBpm: number;
  respiratoryRate: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
  oxygenSaturation?: number;
  painScore?: number;
  recordedAt: string;
}

export interface RecordVitalsRequest {
  appointmentId: string;
  consultationId?: string;
  systolicBP: number;
  diastolicBP: number;
  temperatureC: number;
  heartRateBpm: number;
  respiratoryRate: number;
  weightKg: number;
  heightCm: number;
  oxygenSaturation?: number;
  painScore?: number;
}

