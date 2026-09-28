export interface DailyCashSummary {
  reconciliationDate: string;
  cashCollected: number;
  cardCollected: number;
  digitalCollected: number;
  totalCollected: number;
  invoicesSettledCount: number;
  receptionistName: string;
}

export interface CreateDailyCashReconciliation {
  shift: string;
  cashCollected: number;
  cardCollected: number;
  digitalCollected: number;
  totalCollected: number;
  closingCashCounted: number;
  notes?: string;
}

export interface DailyCashReconciliation {
  id: string;
  receptionistUserId: string;
  receptionistName: string;
  reconciliationDate: string;
  shift: string;
  cashCollected: number;
  cardCollected: number;
  digitalCollected: number;
  totalCollected: number;
  closingCashCounted: number;
  discrepancyAmount: number;
  invoicesSettledCount: number;
  status: string; // 'Balanced' | 'Discrepancy' | 'Closed'
  notes?: string;
  auditedByUserId?: string;
  auditedByUserName?: string;
  auditedAt?: string;
  auditStatus?: string;
  auditNotes?: string;
  createdAt: string;
}

export type DailyCashReconciliationResponse = DailyCashReconciliation;

export interface VisitorInquiry {
  id: string;
  visitorName: string;
  phoneNumber: string;
  inquiryType: string;
  departmentTarget: string;
  notes: string;
  status: string; // 'Open' | 'Resolved'
  handledByUserId: string;
  handledByUserName: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CreateVisitorInquiry {
  visitorName: string;
  phoneNumber: string;
  inquiryType: string;
  departmentTarget: string;
  notes: string;
}

export interface MpiLookupResult {
  id: string;
  medicalRecordNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  nationalId?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  matchReason: string;
  confidenceLevel: string; // 'Exact' | 'High' | 'Medium'
}
