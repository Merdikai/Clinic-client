export interface NursingProcedure {
  id: string;
  patientId: string;
  patientName?: string;
  appointmentId?: string;
  orderedByDoctorId?: string;
  orderedByDoctorName?: string;
  performedByUserId?: string;
  performedByUserName?: string;
  procedureType: string;
  bodySite?: string;
  notes?: string;
  patientTolerance?: string;
  suppliesUsed?: string;
  status: 'Ordered' | 'InProgress' | 'Completed';
  priority: 'Routine' | 'Urgent' | 'Stat';
  orderedAt: string;
  performedAt?: string;
  price: number;
  isBilled: boolean;
}

export interface CreateNursingProcedureRequest {
  patientId: string;
  appointmentId?: string;
  procedureType: string;
  bodySite?: string;
  notes?: string;
  patientTolerance?: string;
  suppliesUsed?: string;
  performedAt?: string;
}

export interface OrderNursingProcedureRequest {
  patientId: string;
  appointmentId?: string;
  procedureType: string;
  bodySite?: string;
  notes?: string;
  priority?: 'Routine' | 'Urgent' | 'Stat';
  price?: number;
}

export interface CompleteNursingProcedureRequest {
  patientTolerance?: string;
  suppliesUsed?: string;
  notes?: string;
}

export interface ShiftHandover {
  id: string;
  nurseUserId: string;
  nurseUserName?: string;
  shiftType: string;
  handoverTimestamp: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  activePatientCount: number;
  criticalAlertsCount: number;
}

export interface CreateShiftHandoverRequest {
  shiftType: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  activePatientCount?: number;
  criticalAlertsCount?: number;
  handoverTimestamp?: string;
}
