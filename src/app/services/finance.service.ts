import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FinanceDashboardMetrics,
  InsuranceClaim,
  CreateInsuranceClaimRequest,
  ReconcileInsuranceClaimRequest,
  BillingAdjustment,
  CreateBillingAdjustmentRequest,
  ReviewBillingAdjustmentRequest,
  ExpenseTransaction,
  CreateExpenseTransactionRequest,
  SettleExpenseTransactionRequest,
  PettyCashVoucher,
  CreatePettyCashVoucherRequest,
  PayrollRecord,
  GeneratePayrollRequest,
  DisbursePayrollRequest,
  AuditDailyReconciliationRequest
} from '../models/finance.model';
import { DailyCashReconciliationResponse } from '../models/reception.model';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/finance`;
  private reconciliationsUrl = `${environment.apiUrl}/daily-reconciliations`;

  // ─── Metrics ───
  getMetrics(): Observable<FinanceDashboardMetrics> {
    return this.http.get<FinanceDashboardMetrics>(`${this.apiUrl}/metrics`);
  }

  // ─── Insurance Claims ───
  getClaims(status?: string, provider?: string): Observable<InsuranceClaim[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (provider) params = params.set('provider', provider);
    return this.http.get<InsuranceClaim[]>(`${this.apiUrl}/claims`, { params });
  }

  createClaim(request: CreateInsuranceClaimRequest): Observable<InsuranceClaim> {
    return this.http.post<InsuranceClaim>(`${this.apiUrl}/claims`, request);
  }

  reconcileClaim(id: string, request: ReconcileInsuranceClaimRequest): Observable<InsuranceClaim> {
    return this.http.patch<InsuranceClaim>(`${this.apiUrl}/claims/${id}/reconcile`, request);
  }

  // ─── Billing Adjustments & Refunds ───
  getAdjustments(status?: string): Observable<BillingAdjustment[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<BillingAdjustment[]>(`${this.apiUrl}/adjustments`, { params });
  }

  createAdjustment(request: CreateBillingAdjustmentRequest): Observable<BillingAdjustment> {
    return this.http.post<BillingAdjustment>(`${this.apiUrl}/adjustments`, request);
  }

  reviewAdjustment(id: string, request: ReviewBillingAdjustmentRequest): Observable<BillingAdjustment> {
    return this.http.patch<BillingAdjustment>(`${this.apiUrl}/adjustments/${id}/review`, request);
  }

  // ─── Expenses & Accounts Payable ───
  getExpenses(category?: string, status?: string): Observable<ExpenseTransaction[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    if (status) params = params.set('status', status);
    return this.http.get<ExpenseTransaction[]>(`${this.apiUrl}/expenses`, { params });
  }

  createExpense(request: CreateExpenseTransactionRequest): Observable<ExpenseTransaction> {
    return this.http.post<ExpenseTransaction>(`${this.apiUrl}/expenses`, request);
  }

  settleExpense(id: string, request: SettleExpenseTransactionRequest): Observable<ExpenseTransaction> {
    return this.http.patch<ExpenseTransaction>(`${this.apiUrl}/expenses/${id}/settle`, request);
  }

  // ─── Petty Cash ───
  getPettyCash(limit = 50): Observable<PettyCashVoucher[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<PettyCashVoucher[]>(`${this.apiUrl}/petty-cash`, { params });
  }

  createPettyCashVoucher(request: CreatePettyCashVoucherRequest): Observable<PettyCashVoucher> {
    return this.http.post<PettyCashVoucher>(`${this.apiUrl}/petty-cash`, request);
  }

  // ─── Payroll & Commissions ───
  getPayroll(month?: number, year?: number): Observable<PayrollRecord[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month.toString());
    if (year) params = params.set('year', year.toString());
    return this.http.get<PayrollRecord[]>(`${this.apiUrl}/payroll`, { params });
  }

  generatePayroll(request: GeneratePayrollRequest): Observable<PayrollRecord[]> {
    return this.http.post<PayrollRecord[]>(`${this.apiUrl}/payroll/generate`, request);
  }

  disbursePayroll(id: string, request: DisbursePayrollRequest): Observable<PayrollRecord> {
    return this.http.patch<PayrollRecord>(`${this.apiUrl}/payroll/${id}/disburse`, request);
  }

  // ─── Daily Cash Drawer Shift Audits (Receptionist connection) ───
  getDailyReconciliations(limit = 30): Observable<DailyCashReconciliationResponse[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<DailyCashReconciliationResponse[]>(`${this.reconciliationsUrl}`, { params });
  }

  auditDailyReconciliation(id: string, request: AuditDailyReconciliationRequest): Observable<DailyCashReconciliationResponse> {
    return this.http.patch<DailyCashReconciliationResponse>(`${this.reconciliationsUrl}/${id}/audit`, request);
  }
}
