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
  parameters?: LabParameterTemplate[];
}

export interface CreateLabTestTemplateRequest {
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  sampleType: string;
  turnaroundTimeHours: number;
  price: number;
  parametersJson?: string;
}

export interface UpdateLabTestTemplateRequest {
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  sampleType: string;
  turnaroundTimeHours: number;
  price: number;
  isActive: boolean;
  parametersJson?: string;
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
  verifiedByDoctorId?: string;
  verifiedByDoctorName?: string;
  resultDate: string;
  parameterResultsJson: string;
  remarks?: string;
  hasAbnormalFlag: boolean;
  attachmentUrl?: string;
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
  specimenBarcode?: string;
  isRejected: boolean;
  rejectionReason?: string;
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
  collectedByTechnicianName?: string;
  completedAt?: string;
  specimenBarcode?: string;
  specimenType?: string;
  sampleCondition?: string;
  isRejected: boolean;
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedByTechnicianName?: string;
  requiresRecollection: boolean;
  technicianNotes?: string;
  verifiedByDoctorId?: string;
  verifiedByDoctorName?: string;
  verifiedAt?: string;
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

export interface SpecimenIntakeRequest {
  labOrderId: string;
  specimenType: string;
  tubeType: string;
  sampleCondition: string;
  collectionVolumeMl?: number;
  technicianNotes?: string;
}

export interface SpecimenRejectRequest {
  labOrderId: string;
  orderItemId?: string;
  rejectionReason: string;
  requiresRecollection: boolean;
  notes?: string;
}

export interface LabReagent {
  id: string;
  name: string;
  catalogCode: string;
  category: string;
  lotNumber: string;
  currentStock: number;
  minimumThreshold: number;
  unitOfMeasure: string;
  expiryDate: string;
  storageCondition: string;
  status: string;
  manufacturer?: string;
  unitCost: number;
  lastRestockedAt?: string;
  notes?: string;
}

export interface CreateLabReagentRequest {
  name: string;
  catalogCode: string;
  category: string;
  lotNumber: string;
  currentStock: number;
  minimumThreshold: number;
  unitOfMeasure: string;
  expiryDate: string;
  storageCondition: string;
  manufacturer?: string;
  unitCost: number;
  notes?: string;
}

export interface UpdateReagentStockRequest {
  adjustmentQuantity: number;
  reason: string;
}

export interface LabStockRequisition {
  id: string;
  requisitionNumber: string;
  labReagentId?: string;
  itemName: string;
  category: string;
  quantityRequested: number;
  unitOfMeasure: string;
  estimatedUnitCost: number;
  totalEstimatedCost: number;
  urgency: string;
  reason: string;
  status: string;
  requestedByUserId: string;
  requestedByUserName: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface CreateLabRequisitionRequest {
  labReagentId?: string;
  itemName: string;
  category: string;
  quantityRequested: number;
  unitOfMeasure: string;
  estimatedUnitCost: number;
  urgency: string;
  reason: string;
}

export interface ReviewLabRequisitionRequest {
  status: string;
  reviewNotes?: string;
}

export interface LabEquipmentLog {
  id: string;
  equipmentName: string;
  equipmentModel: string;
  serialNumber: string;
  location: string;
  logType: string;
  controlLotNumber?: string;
  standardDeviationScore?: number;
  status: string;
  findings: string;
  correctiveAction?: string;
  performedByUserId: string;
  performedByUserName: string;
  performedAt: string;
  nextMaintenanceDueDate?: string;
  createdAt: string;
}

export interface CreateLabEquipmentLogRequest {
  equipmentName: string;
  equipmentModel: string;
  serialNumber: string;
  location: string;
  logType: string;
  controlLotNumber?: string;
  standardDeviationScore?: number;
  status: string;
  findings: string;
  correctiveAction?: string;
  nextMaintenanceDueDate?: string;
}

export interface LabMetrics {
  pendingOrders: number;
  samplesCollected: number;
  inProgress: number;
  completedToday: number;
  totalTests: number;
  criticalValueAlerts: number;
  rejectedSamples: number;
  lowStockReagents: number;
  calibrationsDue: number;
}
