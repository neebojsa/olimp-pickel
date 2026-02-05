/**
 * Translation utilities for domestic invoices
 * Supports Serbian/Bosnian language for Bosnia and Herzegovina customers
 */

export interface InvoiceTranslations {
  invoice: string;
  billTo: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
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

const bosnianTranslations: InvoiceTranslations = {
  invoice: 'FAKTURA',
  billTo: 'Račun za:',
  invoiceNumber: 'Broj fakture:',
  issueDate: 'Datum izdavanja:',
  dueDate: 'Datum dospijeća:',
  paymentTerms: 'Uslovi plaćanja:',
  orderNumber: 'Broj narudžbe:',
  shippingDate: 'Datum isporuke:',
  incoterms: 'Mjesto isporuke:',
  declarationNumber: 'Broj deklaracije:',
  partName: 'Naziv dijela',
  partNumber: 'Broj dijela',
  unit: 'Jed.',
  quantity: 'Kol.',
  subtotalWeight: 'Težina',
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
  piece: 'kom.'
};

const englishTranslations: InvoiceTranslations = {
  invoice: 'INVOICE',
  billTo: 'Bill To:',
  invoiceNumber: 'Invoice Number:',
  issueDate: 'Issue Date:',
  dueDate: 'Due Date:',
  paymentTerms: 'Payment Terms:',
  orderNumber: 'Order Number:',
  shippingDate: 'Shipping Date:',
  incoterms: 'Incoterms:',
  declarationNumber: 'Declaration Number:',
  partName: 'Part name',
  partNumber: 'Part number',
  unit: 'Unit',
  quantity: 'Qty',
  subtotalWeight: 'Weight',
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
  customerCountry: string | null | undefined
): InvoiceTranslations => {
  // If customer is from Bosnia and Herzegovina, use Bosnian language
  if (customerCountry === 'Bosnia and Herzegovina') {
    return bosnianTranslations;
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
