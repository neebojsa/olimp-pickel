/**
 * Translation utilities for domestic invoices
 * Supports Serbian/Bosnian language for Bosnia and Herzegovina customers
 */

export interface InvoiceTranslations {
  invoice: string;
  billTo: string;
  invoiceNumber: string;
  issueDate: string;
  paymentTerms: string;
  orderNumber: string;
  shippingDate: string;
  incoterms: string;
  declarationNumber: string;
  partName: string;
  partNumber: string;
  unit: string;
  quantity: string;
  subtotalWeight: string;
  price: string;
  amount: string;
  summary: string;
  totalQuantity: string;
  netWeight: string;
  totalWeight: string;
  packing: string;
  package: string;
  packages: string;
  subtotal: string;
  vat: string;
  total: string;
  notes: string;
  generatedOn: string;
  at: string;
  pieces: string;
  piece: string;
}

const serbianTranslations: InvoiceTranslations = {
  invoice: 'FAKTURA',
  billTo: 'Račun za:',
  invoiceNumber: 'Broj fakture:',
  issueDate: 'Datum izdavanja:',
  paymentTerms: 'Uslovi plaćanja:',
  orderNumber: 'Broj narudžbe:',
  shippingDate: 'Datum isporuke:',
  incoterms: 'Incoterms:',
  declarationNumber: 'Broj deklaracije:',
  partName: 'Naziv dijela',
  partNumber: 'Broj dijela',
  unit: 'Jedinica',
  quantity: 'Količina',
  subtotalWeight: 'Ukupna težina',
  price: 'Cijena',
  amount: 'Iznos',
  summary: 'Sažetak',
  totalQuantity: 'Ukupna količina:',
  netWeight: 'Neto težina:',
  totalWeight: 'Ukupna težina:',
  packing: 'Pakovanje:',
  package: 'paket',
  packages: 'paketa',
  subtotal: 'Ukupno bez PDV:',
  vat: 'PDV',
  total: 'Ukupno:',
  notes: 'Napomene',
  generatedOn: 'Generisano',
  at: 'u',
  pieces: 'kom',
  piece: 'komad'
};

const englishTranslations: InvoiceTranslations = {
  invoice: 'INVOICE',
  billTo: 'Bill To:',
  invoiceNumber: 'Invoice Number:',
  issueDate: 'Issue Date:',
  paymentTerms: 'Payment Terms:',
  orderNumber: 'Order Number:',
  shippingDate: 'Shipping Date:',
  incoterms: 'Incoterms:',
  declarationNumber: 'Declaration Number:',
  partName: 'Part name',
  partNumber: 'Part number',
  unit: 'Unit',
  quantity: 'Quantity',
  subtotalWeight: 'Subtotal weight',
  price: 'Price',
  amount: 'Amount',
  summary: 'Summary',
  totalQuantity: 'Total Quantity:',
  netWeight: 'Net Weight:',
  totalWeight: 'Total Weight:',
  packing: 'Packing:',
  package: 'package',
  packages: 'packages',
  subtotal: 'Subtotal:',
  vat: 'VAT',
  total: 'Total:',
  notes: 'Notes',
  generatedOn: 'Generated on',
  at: 'at',
  pieces: 'pcs',
  piece: 'piece'
};

/**
 * Get translations based on customer country
 * @param customerCountry - Customer's country
 * @param companyCountry - Company's country (default: Bosnia and Herzegovina)
 * @returns Translation object
 */
export const getInvoiceTranslations = (
  customerCountry: string | null | undefined,
  companyCountry: string = 'Bosnia and Herzegovina'
): InvoiceTranslations => {
  // If customer is from the same country as company, use local language
  if (customerCountry === companyCountry) {
    return serbianTranslations;
  }
  
  // Otherwise use English
  return englishTranslations;
};

/**
 * Check if an invoice is domestic (customer from same country as company)
 * @param customerCountry - Customer's country
 * @param companyCountry - Company's country (default: Bosnia and Herzegovina)
 * @returns boolean indicating if invoice is domestic
 */
export const isDomesticInvoice = (
  customerCountry: string | null | undefined,
  companyCountry: string = 'Bosnia and Herzegovina'
): boolean => {
  return customerCountry === companyCountry;
};
