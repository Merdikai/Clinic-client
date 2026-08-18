export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: 'Draft' | 'Issued' | 'Paid' | 'PartiallyPaid' | 'Unpaid' | 'Overdue' | 'Cancelled';
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreateInvoiceRequest {
  patientId: string;
  appointmentId?: string;
  dueDate?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface PaymentRequest {
  invoiceId: string;
  amountPaid: number;
  paymentMethod: string;
  transactionReference?: string;
}
