import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Medicine } from '../models/medicine.model';

export interface PharmacyMetrics {
  pendingPrescriptionsCount: number;
  dispensedTodayCount: number;
  lowStockMedicinesCount: number;
  nearExpiryMedicinesCount: number;
  controlledSubstancesCount: number;
  todayDispensaryRevenue: number;
}

export interface PharmacyStockRequisition {
  id: string;
  requisitionNumber: string;
  medicineId: string;
  medicineName: string;
  medicineCode: string;
  quantityRequested: number;
  quantityApproved: number;
  type: string;
  department: string;
  supplierName?: string;
  status: string;
  requestedByUserName: string;
  approvedByUserName?: string;
  createdAt: string;
  estimatedUnitCost: number;
  totalAmount: number;
  notes?: string;
}

export interface ControlledSubstanceLog {
  id: string;
  logNumber: string;
  medicineId: string;
  medicineName: string;
  strength?: string;
  dosageForm?: string;
  prescriptionId?: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  prescribingDoctorName: string;
  pharmacistName: string;
  witnessPharmacistName?: string;
  quantityDispensed: number;
  remainingBalance: number;
  medicalJustification: string;
  dispensedAt: string;
}

export interface PrescriptionLabel {
  prescriptionId: string;
  rxNumber: string;
  patientName: string;
  patientMrn: string;
  medicineName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  quantity: number;
  dosageInstructions: string;
  doctorName: string;
  dispensedDate: string;
  pharmacistName: string;
  clinicName: string;
  clinicPhone: string;
  cautionNotes: string;
}

@Injectable({ providedIn: 'root' })
export class PharmacyService {
  private http = inject(HttpClient);
  private pharmacyUrl = `${environment.apiUrl}/pharmacy`;
  private prescriptionsUrl = `${environment.apiUrl}/prescriptions`;
  private medicinesUrl = `${environment.apiUrl}/medicines`;

  // METRICS & KPIS
  getMetrics(): Observable<PharmacyMetrics> {
    return this.http.get<PharmacyMetrics>(`${this.pharmacyUrl}/metrics`);
  }

  // REQUISITIONS & PURCHASE ORDERS
  getRequisitions(status?: string): Observable<PharmacyStockRequisition[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<PharmacyStockRequisition[]>(`${this.pharmacyUrl}/requisitions`, { params });
  }

  createRequisition(payload: {
    medicineId: string;
    quantityRequested: number;
    type: string;
    department: string;
    supplierName?: string;
    notes?: string;
  }): Observable<PharmacyStockRequisition> {
    return this.http.post<PharmacyStockRequisition>(`${this.pharmacyUrl}/requisitions`, payload);
  }

  reviewRequisition(id: string, payload: {
    status: string;
    quantityApproved?: number;
    reviewNotes?: string;
  }): Observable<PharmacyStockRequisition> {
    return this.http.patch<PharmacyStockRequisition>(`${this.pharmacyUrl}/requisitions/${id}`, payload);
  }

  // CONTROLLED SUBSTANCES REGULATORY AUDIT
  getControlledSubstances(): Observable<ControlledSubstanceLog[]> {
    return this.http.get<ControlledSubstanceLog[]>(`${this.pharmacyUrl}/controlled-substances`);
  }

  // PRESCRIPTIONS DISPENSARY QUEUE
  getPrescriptions(status?: string, patientId?: string): Observable<any[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (patientId) params = params.set('patientId', patientId);
    return this.http.get<any[]>(this.prescriptionsUrl, { params });
  }

  dispensePrescription(id: string, verificationNotes?: string): Observable<any> {
    return this.http.post<any>(`${this.prescriptionsUrl}/${id}/dispense`, { verificationNotes });
  }

  generateInvoice(id: string): Observable<any> {
    return this.http.post<any>(`${this.prescriptionsUrl}/${id}/invoice`, {});
  }

  getPrescriptionLabel(id: string, itemId?: string): Observable<PrescriptionLabel[]> {
    let params = new HttpParams();
    if (itemId) params = params.set('itemId', itemId);
    return this.http.get<PrescriptionLabel[]>(`${this.prescriptionsUrl}/${id}/label`, { params });
  }

  // FORMULARY & MEDICINES CATALOG
  getAllMedicines(): Observable<Medicine[]> {
    return this.http.get<Medicine[]>(`${this.medicinesUrl}/all`);
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.medicinesUrl}/categories`);
  }

  getLowStock(): Observable<Medicine[]> {
    return this.http.get<Medicine[]>(`${this.medicinesUrl}/low-stock`);
  }

  getLowStockMedicines(): Observable<Medicine[]> {
    return this.getLowStock();
  }

  getControlledMedicines(): Observable<Medicine[]> {
    return this.http.get<Medicine[]>(`${this.medicinesUrl}/controlled`);
  }
}
