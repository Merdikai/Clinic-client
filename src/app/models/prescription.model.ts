export interface PrescriptionItem {
  id: string;
  medicineId: string;
  medicineName?: string;
  genericName?: string;
  dosageInstructions: string;
  dosage?: string;
  strength?: string;
  dosageForm?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  status?: string;
  dispensedQuantity?: number;
  isControlledSubstance?: boolean;
  availableStock?: number;
  quantity: number;
  unitPrice: number;
}

export interface Prescription {
  id: string;
  consultationId: string;
  patientId?: string;
  patientName?: string;
  patientMrn?: string;
  patientAllergies?: string;
  doctorId?: string;
  doctorName?: string;
  status?: string;
  notes?: string;
  verificationNotes?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  medicineName?: string;
  genericName?: string;
  dosageInstructions?: string;
  quantity?: number;
  items: PrescriptionItem[];
  isDispensed: boolean;
  dispensedAt?: string;
  dispensedByPharmacistName?: string;
  issuedAt?: string;
  createdAt: string;
}

export interface DispenseResponse {
  prescriptionId: string;
  fullyDispensed: boolean;
  dispensedItems: Array<{
    medicineName: string;
    requestedQuantity: number;
    dispensedQuantity: number;
    unitPrice: number;
    lineTotal: number;
    isFullyDispensed: boolean;
  }>;
  totalCost: number;
}
