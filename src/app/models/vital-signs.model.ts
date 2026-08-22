export interface VitalSign {
  id: string;
  appointmentId: string;
  systolicBP: number;
  diastolicBP: number;
  temperatureC: number;
  heartRateBpm: number;
  respiratoryRate: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
  recordedAt: string;
}

export interface RecordVitalsRequest {
  appointmentId: string;
  systolicBP: number;
  diastolicBP: number;
  temperatureC: number;
  heartRateBpm: number;
  respiratoryRate: number;
  weightKg: number;
  heightCm: number;
}
