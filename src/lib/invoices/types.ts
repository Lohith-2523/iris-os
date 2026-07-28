export type InvoicePartySnapshot = {
  name: string;
  legalEntityName: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gstNumber: string;
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type InvoicePdfInput = {
  invoiceNumber: string;
  issuedDate: Date;
  dueDate: Date;
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
};
