export type LabOrderStatus = 'Ordered' | 'SampleCollected' | 'InProgress' | 'Completed' | 'Cancelled';
export type LabOrderPriority = 'Routine' | 'Urgent' | 'Stat';
export type LabResultFlag = 'Normal' | 'Low' | 'High' | 'Critical';

export interface LabParameterTemplate {
  name: string;
  unit: string;
  minRef?: number;
  maxRef?: number;
  normalText?: string;
}

export interface LabTestTemplate {
  id: string;
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  sampleType: string;
  turnaroundTimeHours: number;
  price: number;
  isActive: boolean;
  parametersJson: string;
  // Parsed helper
  parameters?: LabParameterTemplate[];
}

export interface LabParameterResult {
  parameterName: string;
  value: string | number;
  unit: string;
  minRef?: number;
  maxRef?: number;
  normalText?: string;
  flag: LabResultFlag;
}

export interface LabResult {
  id: string;
  labOrderItemId: string;
  performedByTechnicianId?: string;
  performedByTechnicianName?: string;
  resultDate: string;
  parameterResultsJson: string;
  remarks?: string;
  hasAbnormalFlag: boolean;
  attachmentUrl?: string;
  // Parsed helper
  results?: LabParameterResult[];
}

export interface LabOrderItem {
  id: string;
  labOrderId: string;
  labTestTemplateId: string;
  testCode: string;
  testName: string;
  category: string;
  sampleType: string;
  status: LabOrderStatus;
  price: number;
  result?: LabResult;
}

export interface LabOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientMedicalRecordNumber: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  orderDate: string;
  status: LabOrderStatus;
  priority: LabOrderPriority;
  clinicalNotes?: string;
  totalCost: number;
  isBilled: boolean;
  sampleCollectedAt?: string;
  completedAt?: string;
  items: LabOrderItem[];
}

export interface CreateLabOrderRequest {
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  priority: string;
  clinicalNotes?: string;
  testTemplateIds: string[];
}

export interface RecordLabResultRequest {
  labOrderItemId: string;
  parameterResultsJson: string;
  remarks?: string;
  hasAbnormalFlag: boolean;
  attachmentUrl?: string;
}

export interface LabMetrics {
  pendingOrders: number;
  samplesCollected: number;
  inProgress: number;
  completedToday: number;
  totalTests: number;
}
