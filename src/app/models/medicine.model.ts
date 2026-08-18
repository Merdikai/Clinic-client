export interface Medicine {
  id: string;
  code: string;
  name: string;
  category: string;
  stockQuantity: number;
  unitPrice: number;
  expiryDate?: string;
  batchNumber?: string;
}

export interface CreateMedicineRequest {
  code: string;
  name: string;
  category: string;
  stockQuantity: number;
  unitPrice: number;
  expiryDate?: string;
  batchNumber?: string;
}
