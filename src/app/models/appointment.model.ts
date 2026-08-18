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
}

export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  scheduledDateTime: string;
  durationMinutes: number;
  reasonForVisit: string;
}
