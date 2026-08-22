export interface PrescriptionItem {
  id: string;
  medicineId: string;
  medicineName?: string;
  dosageInstructions: string;
  quantity: number;
  unitPrice: number;
}

export interface Prescription {
  id: string;
  consultationId: string;
  patientName?: string;
  doctorName?: string;
  items: PrescriptionItem[];
  isDispensed: boolean;
  dispensedAt?: string;
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
