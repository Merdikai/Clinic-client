export interface CreatePrescriptionItemRequest {
  medicineId: string;
  quantity: number;
  dosageInstructions: string;
}

export interface CreateConsultationRequest {
  appointmentId: string;
  symptoms: string;
  findings?: string;
  diagnosis: string;
  clinicalNotes: string;
  prescriptionNotes?: string;
  prescriptionItems?: CreatePrescriptionItemRequest[];
  labTestTemplateIds?: string[];
  radiologyOrders?: {
    modality: string;
    procedureName: string;
    bodyPart: string;
    clinicalIndication: string;
    priority?: string;
    price?: number;
  }[];
  nursingProcedureOrders?: {
    procedureType: string;
    bodySite?: string;
    notes?: string;
    priority?: string;
    price?: number;
  }[];
}

export interface Consultation {
  id: string;
  appointmentId: string;
  doctorId?: string;
  doctorName?: string;
  patientId?: string;
  patientName?: string;
  symptoms: string;
  findings?: string;
  diagnosis: string;
  clinicalNotes: string;
  prescriptionNotes?: string;
  consultedAt: string;
}
