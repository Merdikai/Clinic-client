export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientName: string;
  issueDate: string;
  dueDate: string;
  status: string;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  balanceDue: number;
  lineItems: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
