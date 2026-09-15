export type InvoicePartySnapshot = {
  name: string;
  legalEntityName: string;
  email: string;
  phone?: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gstNumber: string;
  displayName?: string;
  logoDataUrl?: string;
  brandColor?: string;
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
};

export type InvoicePdfInput = {
  invoiceNumber: string;
  documentType?: 'INVOICE' | 'PROFORMA';
  invoiceType?: string;
  issuedDate: Date;
  dueDate?: Date | null;
  currency: string;
  projectName: string;
  description: string;
  seller: InvoicePartySnapshot;
  buyer: InvoicePartySnapshot;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  status: string;
  termsOfSale?: string;
};
