export interface FinanceDashboardMetrics {
  totalRevenue: number;
  todayRevenue: number;
  pendingReceivables: number;
  totalExpenses: number;
  netProfit: number;
  pendingClaimsCount: number;
  pendingClaimsAmount: number;
  pendingAdjustmentsCount: number;
  pendingPayablesAmount: number;
  pettyCashCurrentBalance: number;
  unreconciledDrawersCount: number;
  departmentRevenue: DepartmentRevenue[];
  monthlyRevenueTrend: MonthlyTrend[];
  recentActivities: RecentFinancialActivity[];
}

export interface DepartmentRevenue {
  department: string;
  revenue: number;
  invoicesCount: number;
  percentage: number;
}

export interface MonthlyTrend {
  monthName: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

export interface RecentFinancialActivity {
  id: string;
  date: string;
  type: string;
  referenceNumber: string;
  description: string;
  amount: number;
  status: string;
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  insuranceProvider: string;
  policyNumber: string;
  groupNumber?: string;
  claimAmount: number;
  coveredAmount: number;
  patientCopay: number;
  status: 'Submitted' | 'InReview' | 'Approved' | 'Remitted' | 'Denied' | 'Appealed';
  remittanceReference?: string;
  denialReason?: string;
  submittedAt: string;
  settledAt?: string;
  notes?: string;
}

export interface CreateInsuranceClaimRequest {
  invoiceId: string;
  insuranceProvider: string;
  policyNumber: string;
  groupNumber?: string;
  claimAmount: number;
  patientCopay: number;
  notes?: string;
}

export interface ReconcileInsuranceClaimRequest {
  status: string;
  coveredAmount: number;
  remittanceReference?: string;
  denialReason?: string;
  notes?: string;
}

export interface BillingAdjustment {
  id: string;
  adjustmentNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  type: 'Discount' | 'Refund' | 'BadDebtWriteOff' | 'CourtesyWaiver';
  amount: number;
  reason: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  approvedAt?: string;
  status: 'PendingApproval' | 'Approved' | 'Rejected';
  requestedByUserName: string;
  createdAt: string;
}

export interface CreateBillingAdjustmentRequest {
  invoiceId: string;
  type: string;
  amount: number;
  reason: string;
}

export interface ReviewBillingAdjustmentRequest {
  status: string;
  notes?: string;
}

export interface ExpenseTransaction {
  id: string;
  expenseNumber: string;
  category: string;
  vendorName: string;
  invoiceReference: string;
  description: string;
  amount: number;
  taxAmount: number;
  dueDate: string;
  paidDate?: string;
  paymentMethod: string;
  status: 'PendingApproval' | 'Approved' | 'Paid' | 'Cancelled';
  pharmacyStockRequisitionId?: string;
  pharmacyRequisitionNumber?: string;
  recordedByUserName: string;
  approvedByUserName?: string;
  createdAt: string;
  notes?: string;
}

export interface CreateExpenseTransactionRequest {
  category: string;
  vendorName: string;
  invoiceReference: string;
  description: string;
  amount: number;
  taxAmount: number;
  dueDate: string;
  paymentMethod: string;
  pharmacyStockRequisitionId?: string;
  notes?: string;
}

export interface SettleExpenseTransactionRequest {
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
}

export interface PettyCashVoucher {
  id: string;
  voucherNumber: string;
  type: 'Disbursement' | 'Replenishment';
  amount: number;
  category: string;
  payee: string;
  description: string;
  disbursedByUserId: string;
  disbursedByUserName: string;
  remainingBalance: number;
  createdAt: string;
  receiptRef?: string;
}

export interface CreatePettyCashVoucherRequest {
  type: string;
  amount: number;
  category: string;
  payee: string;
  description: string;
  receiptRef?: string;
}

export interface PayrollRecord {
  id: string;
  payrollNumber: string;
  staffUserId: string;
  staffName: string;
  role: string;
  periodMonth: number;
  periodYear: number;
  baseSalary: number;
  consultationsCount: number;
  doctorCommissionShare: number;
  overtimeHours: number;
  overtimePay: number;
  taxDeductions: number;
  netSalaryPayable: number;
  status: 'Draft' | 'Approved' | 'Disbursed';
  disbursedAt?: string;
  paymentReference?: string;
  createdAt: string;
}

export interface GeneratePayrollRequest {
  periodMonth: number;
  periodYear: number;
}

export interface DisbursePayrollRequest {
  paymentReference: string;
}

export interface AuditDailyReconciliationRequest {
  auditStatus: string; // 'VerifiedBalanced' | 'DiscrepancyApproved' | 'Disputed'
  auditNotes?: string;
}
