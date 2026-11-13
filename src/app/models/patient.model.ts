export interface Patient {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address?: string;
  bloodGroup: string;
  bloodType?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  nationalId?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceCoveragePlan?: string;
  insuranceEligibilityStatus?: string;
  registeredAt?: string;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  nationalId?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceCoveragePlan?: string;
  insuranceEligibilityStatus?: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
