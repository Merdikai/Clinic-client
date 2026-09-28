export interface Medicine {
  id: string;
  code: string;
  name: string;
  genericName?: string;
  category: string;
  dosageForm?: string;
  strength?: string;
  manufacturer?: string;
  stockQuantity: number;
  reorderLevel?: number;
  costPrice?: number;
  unitPrice: number;
  expiryDate?: string;
  batchNumber?: string;
  storageConditions?: string;
  isControlledSubstance?: boolean;
  isActive?: boolean;
  isLowStock?: boolean;
  isNearExpiry?: boolean;
}

export interface CreateMedicineRequest {
  code: string;
  name: string;
  genericName?: string;
  category: string;
  dosageForm?: string;
  strength?: string;
  manufacturer?: string;
  stockQuantity: number;
  reorderLevel?: number;
  costPrice?: number;
  unitPrice: number;
  expiryDate?: string;
  batchNumber?: string;
  storageConditions?: string;
  isControlledSubstance?: boolean;
  isActive?: boolean;
}

