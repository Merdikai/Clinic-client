import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LabStore } from '../../store/lab.store';
import { LabService } from '../../services/lab.service';
import { PatientService } from '../../services/patient.service';
import { ToastService } from '../../ui/toast/toast.service';
import {
  LabOrder,
  LabOrderItem,
  LabTestTemplate,
  LabResultFlag,
  CreateLabOrderRequest,
  RecordLabResultRequest,
  LabParameterResult
} from '../../models/lab.model';

@Component({
  selector: 'app-laboratory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './laboratory.component.html',
  styleUrls: ['./laboratory.component.scss']
})
export class LaboratoryComponent implements OnInit {
  labStore = inject(LabStore);
  private labService = inject(LabService);
  private patientService = inject(PatientService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  // Patient search for order placement
  patients = signal<any[]>([]);
  isCreatingOrder = signal<boolean>(false);
  isEnteringResults = signal<boolean>(false);
  isViewingReport = signal<boolean>(false);
  selectedOrder = signal<LabOrder | null>(null);
  selectedOrderItem = signal<LabOrderItem | null>(null);

  // New Order Form
  orderForm: FormGroup = this.fb.group({
    patientId: ['', Validators.required],
    priority: ['Routine', Validators.required],
    clinicalNotes: [''],
    selectedTests: [[], Validators.required]
  });

  // Result entry parameters
  resultParameters = signal<Array<{
    name: string;
    unit: string;
    minRef?: number;
    maxRef?: number;
    normalText?: string;
    value: string | number;
    flag: LabResultFlag;
  }>>([]);
  resultRemarks = signal<string>('');
  isSubmitting = signal<boolean>(false);

  // Active Tab Filter
  selectedTab = signal<number>(0);

  displayedColumns = ['orderNumber', 'patient', 'tests', 'orderDate', 'priority', 'status', 'totalCost', 'actions'];
  catalogColumns = ['testCode', 'testName', 'category', 'sampleType', 'turnaround', 'price', 'parameters'];

  ngOnInit() {
    this.labStore.loadOrders();
    this.labStore.loadTemplates();
    this.labStore.loadMetrics();
    this.loadPatients();
  }

  loadPatients() {
    this.patientService.getAll(1, 100).subscribe({
      next: (res: any) => {
        this.patients.set(res.items || (Array.isArray(res) ? res : []));
      },
      error: () => {}
    });
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.labStore.setSearchFilter(value);
  }

  onStatusFilter(status: string) {
    this.labStore.setStatusFilter(status);
  }

  onPriorityFilter(priority: string) {
    this.labStore.setPriorityFilter(priority);
  }

  // --- Order Creation Modal ---
  openCreateOrderModal() {
    this.orderForm.reset({
      patientId: '',
      priority: 'Routine',
      clinicalNotes: '',
      selectedTests: []
    });
    this.isCreatingOrder.set(true);
  }

  closeCreateOrderModal() {
    this.isCreatingOrder.set(false);
  }

  isTestSelected(templateId: string): boolean {
    const selected: string[] = this.orderForm.get('selectedTests')?.value || [];
    return selected.includes(templateId);
  }

  toggleTestSelection(templateId: string) {
    const selected: string[] = [...(this.orderForm.get('selectedTests')?.value || [])];
    const index = selected.indexOf(templateId);
    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(templateId);
    }
    this.orderForm.patchValue({ selectedTests: selected });
  }

  calculateOrderTotal(): number {
    const selected: string[] = this.orderForm.get('selectedTests')?.value || [];
    const templates = this.labStore.templates();
    return templates
      .filter(t => selected.includes(t.id))
      .reduce((sum, t) => sum + t.price, 0);
  }

  submitOrder() {
    if (this.orderForm.invalid) return;
    const formVal = this.orderForm.value;
    if (!formVal.selectedTests || formVal.selectedTests.length === 0) {
      this.toast.error('Please select at least one laboratory test');
      return;
    }

    this.isSubmitting.set(true);
    const req: CreateLabOrderRequest = {
      patientId: formVal.patientId,
      priority: formVal.priority,
      clinicalNotes: formVal.clinicalNotes,
      testTemplateIds: formVal.selectedTests
    };

    this.labService.createOrder(req).subscribe({
      next: (created) => {
        this.toast.success(`Lab order ${created.orderNumber} placed successfully!`);
        this.isSubmitting.set(false);
        this.closeCreateOrderModal();
        this.labStore.loadOrders();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || err.message || 'Failed to place lab order');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Order Status Transitions ---
  updateStatus(order: LabOrder, newStatus: string) {
    this.labService.updateOrderStatus(order.id, newStatus).subscribe({
      next: () => {
        this.toast.success(`Order ${order.orderNumber} updated to ${newStatus}`);
        this.labStore.loadOrders();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to update order status');
      }
    });
  }

  // --- Result Entry Modal ---
  openResultModal(order: LabOrder, item: LabOrderItem) {
    this.selectedOrder.set(order);
    this.selectedOrderItem.set(item);
    this.resultRemarks.set(item.result?.remarks || '');

    // Parse template parameters
    const template = this.labStore.templates().find(t => t.id === item.labTestTemplateId);
    let params: any[] = [];
    if (template && template.parametersJson) {
      try {
        params = JSON.parse(template.parametersJson);
      } catch (e) {
        params = [];
      }
    }

    // Existing results or default
    let existingResults: LabParameterResult[] = [];
    if (item.result && item.result.parameterResultsJson) {
      try {
        existingResults = JSON.parse(item.result.parameterResultsJson);
      } catch (e) {
        existingResults = [];
      }
    }

    const parameterList = params.map(p => {
      const existing = existingResults.find(e => e.parameterName === p.name);
      return {
        name: p.name,
        unit: p.unit || '',
        minRef: p.minRef,
        maxRef: p.maxRef,
        normalText: p.normalText || '',
        value: existing ? existing.value : '',
        flag: (existing ? existing.flag : 'Normal') as LabResultFlag
      };
    });

    this.resultParameters.set(parameterList);
    this.isEnteringResults.set(true);
  }

  closeResultModal() {
    this.isEnteringResults.set(false);
    this.selectedOrder.set(null);
    this.selectedOrderItem.set(null);
    this.resultParameters.set([]);
  }

  evaluateParamFlag(param: any) {
    const val = parseFloat(param.value);
    if (isNaN(val)) {
      param.flag = 'Normal';
      return;
    }
    if (param.minRef !== undefined && val < param.minRef) {
      param.flag = 'Low';
    } else if (param.maxRef !== undefined && val > param.maxRef) {
      param.flag = 'High';
    } else {
      param.flag = 'Normal';
    }
  }

  submitResults() {
    const item = this.selectedOrderItem();
    if (!item) return;

    const params = this.resultParameters();
    const hasAbnormal = params.some(p => p.flag === 'Low' || p.flag === 'High' || p.flag === 'Critical');

    this.isSubmitting.set(true);
    const req: RecordLabResultRequest = {
      labOrderItemId: item.id,
      parameterResultsJson: JSON.stringify(params),
      remarks: this.resultRemarks(),
      hasAbnormalFlag: hasAbnormal
    };

    this.labService.recordResult(req).subscribe({
      next: () => {
        this.toast.success(`Lab results recorded for ${item.testName}`);
        this.isSubmitting.set(false);
        this.closeResultModal();
        this.labStore.loadOrders();
        this.labStore.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Failed to record results');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Report View & Print ---
  openReportModal(order: LabOrder) {
    this.selectedOrder.set(order);
    this.isViewingReport.set(true);
  }

  closeReportModal() {
    this.isViewingReport.set(false);
    this.selectedOrder.set(null);
  }

  printReport() {
    window.print();
  }

  getParsedParameters(json: string): any[] {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Ordered': return 'status-ordered';
      case 'SampleCollected': return 'status-collected';
      case 'InProgress': return 'status-inprogress';
      case 'Completed': return 'status-completed';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'Routine': return 'priority-routine';
      case 'Urgent': return 'priority-urgent';
      case 'Stat': return 'priority-stat';
      default: return '';
    }
  }

  getFlagClass(flag: string): string {
    switch (flag) {
      case 'Normal': return 'flag-normal';
      case 'Low': return 'flag-low';
      case 'High': return 'flag-high';
      case 'Critical': return 'flag-critical';
      default: return '';
    }
  }
}

