import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreatePatientRequest, PagedResponse, Patient } from '../models/patient.model';
import { Appointment, VitalSignsSnapshot } from '../models/appointment.model';
import { MpiLookupResult } from '../models/reception.model';
import { ResultEnvelope } from '../models/api.model';
import { Prescription } from '../models/prescription.model';
import { RadiologyOrder } from '../models/radiology.model';

export interface MedicalHistoryVisitDto {
  readonly appointmentId: string;
  readonly visitDate: string;
  readonly doctorId?: string;
  readonly doctorName?: string;
  readonly reasonForVisit?: string;
  readonly diagnosis?: string;
  readonly symptoms?: string;
  readonly findings?: string;
  readonly clinicalNotes?: string;
  readonly vitalSigns?: VitalSignsSnapshot | null;
  readonly prescription?: Prescription | null;
}

export interface PatientMedicalHistoryDto {
  readonly patientId?: string;
  readonly fullName?: string;
  readonly patient?: Patient;
  readonly visits?: readonly MedicalHistoryVisitDto[];
  readonly consultations?: readonly MedicalHistoryConsultationDto[];
  readonly appointments?: readonly Appointment[];
  readonly prescriptions?: readonly MedicalHistoryPrescriptionDto[];
  readonly radiologyOrders?: readonly RadiologyOrder[];
}

export interface MedicalHistoryConsultationDto {
  readonly id: string;
  readonly appointmentId?: string;
  readonly consultationDate?: string;
  readonly createdAt?: string;
  readonly doctorName?: string;
  readonly chiefComplaint?: string;
  readonly symptoms?: string;
  readonly diagnosis?: string;
  readonly clinicalNotes?: string;
  readonly treatmentPlan?: string;
  readonly vitalSigns?: unknown;
  readonly prescriptions?: readonly MedicalHistoryPrescriptionDto[];
}

export interface MedicalHistoryPrescriptionDto {
  readonly id: string;
  readonly medicineName?: string;
  readonly dosage?: string;
  readonly frequency?: string;
  readonly durationDays?: number;
  readonly quantity?: number;
  readonly instructions?: string;
  readonly isDispensed?: boolean;
  readonly prescribedAt?: string;
}

export interface UpdatePatientRequest {
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly gender: string;
  readonly phone: string;
  readonly phoneNumber?: string;
  readonly email: string;
  readonly address?: string;
  readonly bloodGroup: string;
  readonly allergies?: string;
  readonly emergencyContact?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactPhone?: string;
  readonly nationalId?: string;
  readonly insuranceProvider?: string;
  readonly insurancePolicyNumber?: string;
  readonly insuranceCoveragePlan?: string;
  readonly insuranceEligibilityStatus?: string;
}

export interface InsuranceVerificationRequest {
  readonly provider: string;
  readonly policyNumber: string;
  readonly coveragePlan?: string;
  readonly patientNationalId?: string;
}

export interface InsuranceVerificationResponse {
  readonly isEligible: boolean;
  readonly eligibilityStatus: string;
  readonly provider: string;
  readonly policyNumber: string;
  readonly coveragePlan?: string;
  readonly copayPercentage: number;
  readonly annualRemainingCap: number;
  readonly verificationReference: string;
  readonly verifiedAtUtc: string;
  readonly message?: string;
  readonly usedClearinghouseHttp?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/patients`;

  getAll(page = 1, pageSize = 10, search?: string, sortBy?: string, descending = false): Observable<PagedResponse<Patient>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('search', search);
    if (sortBy) params = params.set('sortBy', sortBy);
    params = params.set('descending', descending.toString());

    return this.http.get<PagedResponse<Patient>>(this.apiUrl, { params });
  }

  mpiLookup(query?: string, nationalId?: string, phone?: string, firstName?: string, lastName?: string): Observable<MpiLookupResult[]> {
    let params = new HttpParams();
    if (query) params = params.set('query', query);
    if (nationalId) params = params.set('nationalId', nationalId);
    if (phone) params = params.set('phone', phone);
    if (firstName) params = params.set('firstName', firstName);
    if (lastName) params = params.set('lastName', lastName);
    return this.http.get<MpiLookupResult[]>(`${this.apiUrl}/mpi-lookup`, { params });
  }

  getById(id: string): Observable<Patient | ResultEnvelope<Patient>> {
    return this.http.get<Patient | ResultEnvelope<Patient>>(`${this.apiUrl}/${id}`);
  }

  getMyProfile(): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/me`);
  }

  getMyPanel(doctorId?: string): Observable<Patient[]> {
    let params = new HttpParams();
    if (doctorId) params = params.set('doctorId', doctorId);
    return this.http.get<Patient[]>(`${this.apiUrl}/my-panel`, { params });
  }

  create(request: CreatePatientRequest): Observable<Patient> {
    return this.http.post<Patient>(this.apiUrl, request);
  }

  getAppointments(patientId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/${patientId}/appointments`);
  }

  getMedicalHistory(patientId: string): Observable<PatientMedicalHistoryDto | ResultEnvelope<PatientMedicalHistoryDto>> {
    return this.http.get<PatientMedicalHistoryDto | ResultEnvelope<PatientMedicalHistoryDto>>(`${this.apiUrl}/${patientId}/medical-history`);
  }

  update(id: string, request: UpdatePatientRequest): Observable<Patient | ResultEnvelope<Patient>> {
    return this.http.put<Patient | ResultEnvelope<Patient>>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  verifyInsurance(request: InsuranceVerificationRequest): Observable<InsuranceVerificationResponse> {
    return this.http.post<InsuranceVerificationResponse>(`${this.apiUrl}/verify-insurance`, request);
  }
}
