export interface DoctorSchedule {
  id: string;
  doctorId: string;
  doctorName?: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm:ss
  endTime: string;   // HH:mm:ss
  maxPatients?: number;
  slotDurationMinutes?: number;
  isActive: boolean;
}

export interface CreateDoctorScheduleRequest {
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxPatients?: number;
  slotDurationMinutes?: number;
}
