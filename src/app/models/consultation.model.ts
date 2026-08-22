export interface CreatePrescriptionItemRequest {
  medicineId: string;
  quantity: number;
  dosageInstructions: string;
}

export interface CreateConsultationRequest {
  appointmentId: string;
  symptoms: string;
  diagnosis: string;
  clinicalNotes: string;
  prescriptionNotes?: string;
  prescriptionItems?: CreatePrescriptionItemRequest[];
}

export interface Consultation {
  id: string;
  appointmentId: string;
  doctorName: string;
  symptoms: string;
  diagnosis: string;
  clinicalNotes: string;
  consultedAt: string;
}
