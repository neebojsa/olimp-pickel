import { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate } from "@/lib/dateUtils";
import { getInvoiceTranslations, getProformaInvoiceTranslations } from "@/lib/translationUtils";

// Function to estimate lines an item will take based on description length
const estimateItemLines = (item: any) => {
  const description = item.description || '';
  const charsPerLine = 25;
  const descriptionLines = Math.max(1, Math.ceil(description.length / charsPerLine));
  return descriptionLines;
};

// Function to calculate items per page based on lines and split into pages
const paginateInvoiceItems = (items: any[]) => {
  if (!items || items.length === 0) return [];
  
  // Reduced line counts to account for fixed footer space (footer takes ~20mm = ~8 lines)
  const linesPerFullPage = 30; // Reduced from 35 to account for footer
  const linesPerLastPage = 8; // Reduced from 11 to account for footer + summary
  
  const itemsWithLines = items.map(item => ({
    item,
    lines: estimateItemLines(item)
  }));
  
  const pages: any[][] = [];
  let currentIndex = 0;
  let currentLines = 0;
  let currentPageItems: any[] = [];
  
  const isLastPage = (remainingItems: typeof itemsWithLines) => {
    const remainingLines = remainingItems.reduce((sum, { lines }) => sum + lines, 0);
    return remainingLines <= linesPerLastPage;
  };
  
  while (currentIndex < itemsWithLines.length) {
    const { item, lines } = itemsWithLines[currentIndex];
    const remainingItems = itemsWithLines.slice(currentIndex);
    const willBeLastPage = isLastPage(remainingItems);
    const maxLinesForCurrentPage = willBeLastPage ? linesPerLastPage : linesPerFullPage;
    
    if (currentLines + lines <= maxLinesForCurrentPage) {
      currentPageItems.push(item);
      currentLines += lines;
      currentIndex++;
    } else {
      if (currentPageItems.length > 0) {
        pages.push(currentPageItems);
        currentPageItems = [];
        currentLines = 0;
      } else {
        currentPageItems.push(item);
        currentLines += lines;
        currentIndex++;
      }
    }
  }
  
  if (currentPageItems.length > 0) {
    pages.push(currentPageItems);
  }
  
  return pages.length > 0 ? pages : [items];
};

// Get country code from country name (ISO 3166-1 alpha-2)
const getCountryCode = (countryName: string | null | undefined): string => {
  if (!countryName) return '';
  
  const countryCodeMap: Record<string, string> = {
    'United States': 'US',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'Italy': 'IT',
    'Spain': 'ES',
    'Netherlands': 'NL',
    'Belgium': 'BE',
    'Switzerland': 'CH',
    'Austria': 'AT',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Poland': 'PL',
    'Czech Republic': 'CZ',
    'Portugal': 'PT',
    'Greece': 'GR',
    'Ireland': 'IE',
    'Japan': 'JP',
    'China': 'CN',
    'India': 'IN',
    'South Korea': 'KR',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'Bosnia and Herzegovina': 'BA',
    'Croatia': 'HR',
    'Serbia': 'RS',
    'Slovenia': 'SI',
    'Slovakia': 'SK',
    'Hungary': 'HU',
    'Romania': 'RO',
    'Bulgaria': 'BG',
    'Ukraine': 'UA',
    'Montenegro': 'ME',
    'North Macedonia': 'MK',
    'Albania': 'AL',
    'Kosovo': 'XK'
  };
  
  return countryCodeMap[countryName] || countryName.substring(0, 2).toUpperCase();
};

interface InvoicePrintDocumentProps {
  invoice: any;
  inventoryItems: any[];
  companyInfo: any;
  invoiceSettings: {
    primaryColor: string;
    domesticFooter: string[];
    foreignFooter: string[];
    foreignNote: string;
    signatory: string;
  };
  /** When true, uses Proforma invoice / Profaktura labels instead of Invoice / Faktura */
  isProforma?: boolean;
}

export function InvoicePrintDocument({
  invoice,
  inventoryItems,
  companyInfo,
  invoiceSettings,
  isProforma = false
}: InvoicePrintDocumentProps) {
  const invoiceItems = invoice.invoice_items || [];
  const paginatedItems = paginateInvoiceItems(invoiceItems);
  const totalPages = paginatedItems.length;
  
  // Get translations based on customer country and document type
  const translations = useMemo(() => {
    if (!invoice) {
      return isProforma ? getProformaInvoiceTranslations(undefined) : getInvoiceTranslations(undefined);
    }
    
    const customerCountry = invoice.customers?.country;
    return isProforma ? getProformaInvoiceTranslations(customerCountry) : getInvoiceTranslations(customerCountry);
  }, [invoice, isProforma]);

  return (
    <>
      <style>{`
        /* Screen preview styles - A4 dimensions */
        @media screen {
          .invoice-container {
            max-width: 240mm !important;
            width: auto !important;
            margin: 0 auto !important;
            padding: 5mm !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }
          
          .print-invoice-page {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            aspect-ratio: 210 / 297 !important;
            background: white !important;
            box-shadow: 0 1mm 1.5mm rgba(0, 0, 0, 0.1) !important;
            margin: 0 auto 5mm auto !important;
            padding: 15mm 15mm 10mm 15mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            overflow: visible !important;
            flex-shrink: 0 !important;
          }
          
          .print-invoice-page:last-of-type {
            margin-bottom: 0 !important;
          }
          
          .print-invoice {
            width: 100% !important;
            min-height: 100% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
          }

          .invoice-preview-scale .text-xs,
          .invoice-preview-scale .print-text-xs {
            font-size: 0.642rem !important;
          }

          .invoice-preview-scale .text-sm,
          .invoice-preview-scale .print-text-sm {
            font-size: 0.749rem !important;
          }

          .invoice-preview-scale .text-base,
          .invoice-preview-scale .print-text-base {
            font-size: 0.856rem !important;
          }

          .invoice-preview-scale .text-lg,
          .invoice-preview-scale .print-text-lg {
            font-size: 0.963rem !important;
          }

          .invoice-preview-scale .invoice-logo {
            height: calc(2.75rem * 0.8) !important;
          }

          .invoice-footer-columns {
            width: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            gap: 6mm !important;
          }

          .invoice-footer-columns > div {
            flex: 1 1 0 !important;
          }
          
          .invoice-footer-wrapper {
            position: absolute !important;
            bottom: 10mm !important;
            left: 15mm !important;
            right: 15mm !important;
            width: calc(100% - 30mm) !important;
            margin-top: 0 !important;
          }
          
          .invoice-content-area {
            padding-bottom: 0mm !important;
            overflow: visible !important;
            min-height: 0 !important;
            position: relative !important;
            z-index: 0 !important;
          }
          
          .invoice-footer-wrapper {
            z-index: 1 !important;
          }
          
          .invoice-foreign-note {
            z-index: 2 !important;
          }
          
          .invoice-items-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            table-layout: fixed !important;
            page-break-inside: auto !important;
            margin-bottom: 0 !important;
          }
          
          .invoice-items-table tbody tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .invoice-items-table th,
          .invoice-items-table td {
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
            padding: 0.4rem !important;
          }
          
          .invoice-items-table th {
            vertical-align: middle !important;
          }
          
          .invoice-items-table tbody tr td {
            vertical-align: middle !important;
            border-top: 0.25mm solid rgb(212, 212, 212) !important;
            border-bottom: none !important;
          }
          
          .invoice-items-table tbody tr:first-child td {
            border-top: 0.25mm solid rgb(212, 212, 212) !important;
          }
          
          .invoice-items-table th:nth-child(1),
          .invoice-items-table td:nth-child(1) {
            width: 33% !important;
            max-width: 33% !important;
          }
          
          .invoice-items-table th:nth-child(2),
          .invoice-items-table td:nth-child(2) {
            width: 17% !important;
            max-width: 17% !important;
          }
          
          .invoice-items-table th:nth-child(3),
          .invoice-items-table td:nth-child(3) {
            width: 8% !important;
            max-width: 8% !important;
          }
          
          .invoice-items-table th:nth-child(4),
          .invoice-items-table td:nth-child(4) {
            width: 8% !important;
            max-width: 8% !important;
          }
          
          .invoice-items-table th:nth-child(5),
          .invoice-items-table td:nth-child(5) {
            width: 10% !important;
            max-width: 10% !important;
          }
          
          .invoice-items-table th:nth-child(6),
          .invoice-items-table td:nth-child(6) {
            width: 12% !important;
            max-width: 12% !important;
          }
          
          .invoice-items-table th:nth-child(7),
          .invoice-items-table td:nth-child(7) {
            width: 12% !important;
            max-width: 12% !important;
            text-align: right !important;
          }
        }
        
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            background: white !important;
            overflow: visible !important;
          }
          
          .invoice-container {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            max-width: none !important;
            width: 210mm !important;
            height: 297mm !important;
            box-shadow: none !important;
          }
          
          @page {
            margin: 0 !important;
            size: A4;
          }
          
          .print-invoice-page {
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 15mm 15mm 10mm 15mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            background: white !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          
          .print-invoice-page.page-break {
            page-break-before: always !important;
          }
          
          .print-invoice-page:not(:last-child) {
            page-break-after: always !important;
          }
          
          .print-invoice {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .invoice-preview-scale .text-xs,
          .invoice-preview-scale .print-text-xs {
            font-size: 0.642rem !important;
          }

          .invoice-preview-scale .text-sm,
          .invoice-preview-scale .print-text-sm {
            font-size: 0.749rem !important;
          }

          .invoice-preview-scale .text-base,
          .invoice-preview-scale .print-text-base {
            font-size: 0.856rem !important;
          }

          .invoice-preview-scale .text-lg,
          .invoice-preview-scale .print-text-lg {
            font-size: 0.963rem !important;
          }

          .invoice-preview-scale .invoice-logo {
            height: calc(2.75rem * 0.8) !important;
          }

          .invoice-footer-columns {
            width: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            gap: 6mm !important;
            flex-wrap: nowrap !important;
          }

          .invoice-footer-columns > div {
            flex: 1 1 0 !important;
          }
          
          .invoice-footer-wrapper {
            position: absolute !important;
            bottom: 10mm !important;
            left: 15mm !important;
            right: 15mm !important;
            width: calc(100% - 30mm) !important;
            margin-top: 0 !important;
            z-index: 1 !important;
          }
          
          .invoice-content-area {
            padding-bottom: 0mm !important;
            overflow: visible !important;
            min-height: 0 !important;
            position: relative !important;
            z-index: 0 !important;
          }
          
          .invoice-items-table {
            page-break-inside: auto !important;
            margin-bottom: 0 !important;
          }
          
          .invoice-items-table tbody tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .invoice-foreign-note {
            z-index: 2 !important;
          }
          
          .invoice-header {
            display: flex !important;
            justify-content: space-between !important;
            margin-bottom: 8mm !important;
          }
          
          .invoice-items-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            margin: 5mm 0 !important;
            table-layout: fixed !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .invoice-items-table th,
          .invoice-items-table td {
            border-left: none !important;
            border-right: none !important;
            padding: 0.4rem !important;
            text-align: left !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .invoice-items-table th {
            vertical-align: middle !important;
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
            border-top: 0.25mm solid #000 !important;
            border-bottom: 0.25mm solid #000 !important;
          }
          
          .invoice-items-table tbody tr td {
            vertical-align: middle !important;
            border-top: 0.25mm solid #6b7280 !important;
            border-bottom: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .invoice-items-table tbody tr:first-child td {
            border-top: 0.25mm solid #6b7280 !important;
          }
          
          .invoice-items-table th:nth-child(1),
          .invoice-items-table td:nth-child(1) {
            width: 23% !important;
            max-width: 23% !important;
          }
          
          .invoice-items-table th:nth-child(2),
          .invoice-items-table td:nth-child(2) {
            width: 15% !important;
            max-width: 15% !important;
          }
          
          .invoice-items-table th:nth-child(3),
          .invoice-items-table td:nth-child(3) {
            width: 8% !important;
            max-width: 8% !important;
          }
          
          .invoice-items-table th:nth-child(4),
          .invoice-items-table td:nth-child(4) {
            width: 8% !important;
            max-width: 8% !important;
          }
          
          .invoice-items-table th:nth-child(5),
          .invoice-items-table td:nth-child(5) {
            width: 12% !important;
            max-width: 12% !important;
          }
          
          .invoice-items-table th:nth-child(6),
          .invoice-items-table td:nth-child(6) {
            width: 14% !important;
            max-width: 14% !important;
          }
          
          .invoice-items-table th:nth-child(7),
          .invoice-items-table td:nth-child(7) {
            width: 20% !important;
            max-width: 20% !important;
            text-align: right !important;
          }
          
          .print-invoice-page,
          .print-invoice-page * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .page-break {
            page-break-before: always !important;
          }
          
          .no-page-break {
            page-break-inside: avoid !important;
          }

          .invoice-title-bg {
            position: absolute !important;
            width: 76mm !important;
            padding-left: 6mm !important;
            right: 2mm !important;
            justify-content: left !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .total-amount-bg {
            position: absolute !important;
            width: 76mm !important;
            padding-left: 6mm !important;
            right: 2mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="invoice-container">
        {paginatedItems.map((pageItems, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === totalPages - 1;
          
          return (
            <div 
              key={pageIndex} 
              className={`print-invoice-page print-invoice print:text-black print:bg-white print:min-h-[calc(100vh-1in)] print:flex print:flex-col invoice-preview-scale ${pageIndex > 0 ? 'page-break' : ''}`}
              style={{gap: '0.75rem'}}
            >
              {/* Company Header with Invoice Title */}
              {companyInfo && (
                <div className="company-header print:mb-6 flex justify-between items-end">
                  <div>
                    {companyInfo.logo_url && (
                      <div className="mb-1">
                        <img src={companyInfo.logo_url} alt="Company Logo" className="h-11 print:h-14 object-contain invoice-logo" />
                      </div>
                    )}
                    <div className="text-sm print-text-sm">
                      <div className="inline-block">
                        <p className="font-medium border-b border-gray-600 print:border-black pb-1 inline-block text-xs">
                          {companyInfo.legal_name || companyInfo.company_name} - {companyInfo.address} - {companyInfo.postal_code} {companyInfo.city} - Bosnia and Herzegovina
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="print-invoice-bg h-[2rem] flex items-center invoice-title-bg" 
                    style={{
                      backgroundColor: invoiceSettings.primaryColor,
                      position: 'absolute',
                      width: '76mm',
                      paddingLeft: '6mm',
                      right: '2mm',
                      justifyContent: 'left'
                    }}
                  >
                    <span className="text-lg print-text-lg font-medium text-black">{translations.invoice}</span>
                    {totalPages > 1 && (
                      <span className="text-sm print-text-sm ml-2">(Page {pageIndex + 1} of {totalPages})</span>
                    )}
                  </div>
                </div>
              )}

              {/* Invoice Header */}
              <div className="invoice-header grid grid-cols-2 gap-6">
                <div>
                  <h3 className="mb-2 print-text-sm text-sm font-normal">{translations.billTo}</h3>
                  <p className="font-bold print-text-base print:font-bold">{invoice.customers?.name}</p>
                  {invoice.customers?.address && (
                    <p className="text-sm whitespace-pre-line print-text-sm">{invoice.customers.address}</p>
                  )}
                  {invoice.customers?.city && (
                    <p className="text-sm print-text-sm">{invoice.customers.city}</p>
                  )}
                  {invoice.customers?.country && (
                    <p className="text-sm print-text-sm">{invoice.customers.country}</p>
                  )}
                  {invoice.customers?.phone && (
                    <p className="text-sm print-text-sm">{invoice.customers.phone}</p>
                  )}
                  {invoice.contact_person_reference && (
                    <p className="text-sm print-text-sm"><span className="font-medium">Reference:</span> {invoice.contact_person_reference}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="space-y-1 print:space-y-2">
                    <p className="print-text-sm"><span className="font-medium">{translations.invoiceNumber}</span> {invoice.invoice_number}</p>
                    {invoice.order_number && <p className="print-text-sm"><span className="font-medium">{translations.orderNumber}</span> {invoice.order_number}</p>}
                    <p className="print-text-sm"><span className="font-medium">{translations.issueDate}</span> {formatDate(invoice.issue_date)}</p>
                    <p className="print-text-sm"><span className="font-medium">{translations.dueDate}</span> {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}</p>
                    {invoice.shipping_date && <p className="print-text-sm"><span className="font-medium">{translations.shippingDate}</span> {formatDate(invoice.shipping_date)}</p>}
                    {invoice.incoterms && (
                      <p className="print-text-sm">
                        <span className="font-medium">{translations.incoterms}</span>{' '}
                        {invoice.incoterms}
                        {(() => {
                          // For EXW, use company address
                          if (invoice.incoterms === 'EXW' && companyInfo) {
                            const parts: string[] = [];
                            if (companyInfo.postal_code) parts.push(companyInfo.postal_code);
                            if (companyInfo.city) parts.push(companyInfo.city);
                            if (companyInfo.country) {
                              const countryCode = getCountryCode(companyInfo.country);
                              if (countryCode) parts.push(countryCode);
                            }
                            return parts.length > 0 ? `, ${parts.join(' ')}` : '';
                          } else if (invoice.incoterms === 'DAP') {
                            // For DAP, use customer's DAP address
                            const dapAddress = (invoice.customers as any)?.dap_address;
                            return dapAddress ? `, ${dapAddress}` : '';
                          } else if (invoice.incoterms === 'FCO') {
                            // For FCO, use customer's FCO address
                            const fcoAddress = (invoice.customers as any)?.fco_address;
                            return fcoAddress ? `, ${fcoAddress}` : '';
                          }
                          return '';
                        })()}
                      </p>
                    )}
                    {invoice.declaration_number && <p className="print-text-sm"><span className="font-medium">{translations.declarationNumber}</span> {invoice.declaration_number}</p>}
                  </div>
                </div>
              </div>

              {/* Content area with padding to prevent footer overlap */}
              <div className="invoice-content-area">
                {/* Invoice Items */}
                <div className="no-page-break">
                  <table className="invoice-items-table w-full border-collapse print:border-black">
                    <thead>
                      <tr>
                        <th className="text-left text-sm" style={{verticalAlign: 'middle'}}>{translations.partName}</th>
                        <th className="text-left text-sm" style={{verticalAlign: 'middle'}}>{translations.partNumber}</th>
                        <th className="text-left text-sm" style={{verticalAlign: 'middle'}}>{translations.unit}</th>
                        <th className="text-left text-sm" style={{verticalAlign: 'middle'}}>{translations.quantity}</th>
                        <th className="text-left text-sm" style={{verticalAlign: 'middle'}}>{translations.subtotalWeight}</th>
                        <th className="text-left text-sm" style={{verticalAlign: 'middle'}}>{translations.price}</th>
                        <th className="text-right text-sm" style={{verticalAlign: 'middle'}}>{translations.amount}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item: any, itemIndex: number) => {
                        // Use inventory_id if available, otherwise fallback to name lookup for backward compatibility
                        const inventoryItem = item.inventory_id 
                          ? inventoryItems.find(inv => inv.id === item.inventory_id)
                          : inventoryItems.find(inv => inv.name === item.description);
                        const subtotalWeight = (inventoryItem?.weight || 0) * item.quantity;
                        // Translate "piece"/"pieces" to "kom." for domestic invoices
                        const isDomestic = invoice.customers?.country === 'Bosnia and Herzegovina';
                        const unitValue = inventoryItem?.unit || translations.piece;
                        const displayUnit = (isDomestic && (unitValue === 'piece' || unitValue === 'pieces' || !unitValue)) 
                          ? 'kom.' 
                          : unitValue;
                        return (
                          <tr key={itemIndex}>
                            <td className="text-left text-sm" style={{verticalAlign: 'middle'}}>{item.description}</td>
                            <td className="text-left text-sm" style={{verticalAlign: 'middle'}}>{inventoryItem?.part_number || '-'}</td>
                            <td className="text-left text-sm" style={{verticalAlign: 'middle'}}>{displayUnit}</td>
                            <td className="text-left text-sm" style={{verticalAlign: 'middle'}}>{item.quantity}</td>
                            <td className="text-left text-sm" style={{verticalAlign: 'middle'}}>{subtotalWeight.toFixed(2)} kg</td>
                            <td className="text-left text-sm" style={{verticalAlign: 'middle'}}>{formatCurrency(item.unit_price, invoice.currency)}</td>
                            <td className="text-right text-sm" style={{verticalAlign: 'middle'}}>{formatCurrency(item.total, invoice.currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Invoice Summary - Only on last page */}
                {isLastPage && (
                  <>
                    <div className="grid grid-cols-2 gap-6 no-page-break print:mt-8">
                      <div style={{ width: '111mm' }}>
                        <h3 className="font-semibold mb-2 print-text-base">{translations.summary}</h3>
                        <div className="space-y-1 text-sm print:space-y-2 print-text-sm">
                          <p><span className="font-medium">{translations.totalQuantity}</span> {invoice.total_quantity} {translations.pieces}</p>
                          <p><span className="font-medium">{translations.netWeight}</span> {invoice.net_weight} kg</p>
                          <p><span className="font-medium">{translations.totalWeight}</span> {invoice.total_weight} kg</p>
                          <p><span className="font-medium">{translations.packing}</span> {invoice.packing} {invoice.packing === 1 ? translations.package : translations.packages}</p>
                        </div>
                        {/* Declaration for foreign invoices under 6000€ */}
                        {invoice.customers?.country !== 'Bosnia and Herzegovina' && 
                         invoice.currency === 'EUR' && 
                         (invoice.amount || 0) < 6000 && (
                          <div className="mt-4 print:mt-6 text-sm print-text-sm space-y-2">
                            <p className="leading-relaxed text-justify print:text-justify">
                              Izjava: Izvoznik proizvoda obuhvaćenih ovom ispravom izjavljuje da su, osim ako je to drugačije izričito navedeno, ovi proizvodi bosanskohercegovačkog preferencijalnog porijekla.
                            </p>
                            <p className="leading-relaxed">
                              Potpis izvoznika: {invoiceSettings.signatory || 'Radmila Kuzmanović'} <span style={{ borderBottom: '0.25mm solid #000', display: 'inline-block', minWidth: '40mm' }}></span>
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right w-3/5 ml-auto">
                        <div className="space-y-2 print:space-y-3">
                          {(() => {
                            const vatRate = invoice.customers?.vat_rate || 17;
                            return (
                              <>
                                <div className="flex justify-between print-text-sm">
                                  <span>{translations.subtotal}</span>
                                  <span>{formatCurrency((invoice.amount || 0) / (1 + (vatRate / 100)), invoice.currency)}</span>
                                </div>
                                <div className="flex justify-between print-text-sm">
                                  <span>{translations.vat} ({vatRate}%):</span>
                                  <span>{formatCurrency((invoice.amount || 0) - (invoice.amount || 0) / (1 + (vatRate / 100)), invoice.currency)}</span>
                                </div>
                              </>
                            );
                          })()}
                          <div 
                            style={{
                              backgroundColor: invoiceSettings.primaryColor,
                              position: 'absolute',
                              width: '76mm',
                              paddingLeft: '13mm',
                              paddingRight: '13mm',
                              height: '2rem',
                              right: '2mm'
                            }} 
                            className="flex justify-between font-bold text-lg print-invoice-bg h-[2.2rem] items-center print-text-base total-amount-bg"
                          >
                            <span>{translations.total}</span>
                            <span>{formatCurrency(invoice.amount || 0, invoice.currency)}</span>
                          </div>
                        </div>
                        {/* VAT Exemption Notice for Foreign Customers */}
                        {invoice.customers?.country !== 'Bosnia and Herzegovina' && (
                          <div 
                            className="print-text-xs text-xs" 
                            style={{ 
                              position: 'absolute',
                              right: '2mm',
                              width: '76mm',
                              paddingLeft: '0',
                              paddingRight: '0',
                              marginTop: '10.5mm',
                              textAlign: 'left',
                              color: '#000000'
                            }}
                          >
                            <p className="mb-1 leading-tight">Oslobođeno od plaćanja PDV-a po članu 27. tačka 1. zakona o PDV-u, Službeni glasnik br. 91/05 i 35/05.</p>
                            <p className="leading-tight">Exempt from VAT payment pursuant to Article 27, Item 1 of the VAT Law, Official Gazette No. 91/05 and 35/05.</p>
                          </div>
                        )}
                        {/* Signatory */}
                        {invoiceSettings.signatory && (
                          <div 
                            className="text-center" 
                            style={{ 
                              position: 'absolute',
                              right: '2mm',
                              width: '76mm',
                              paddingLeft: '13mm',
                              paddingRight: '13mm',
                              marginTop: invoice.customers?.country !== 'Bosnia and Herzegovina' ? '26.5mm' : '12mm',
                              fontSize: '0.7rem'
                            }}
                          >
                            <p style={{ marginBottom: '1.6rem' }}>{invoiceSettings.signatory}</p>
                            <div style={{ borderBottom: '0.25mm solid #000', width: '100%', margin: '0 auto' }}></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {invoice.notes && (
                      <div className="no-page-break print:mt-6">
                        <h3 className="font-semibold mb-2 print-text-base">{translations.notes}</h3>
                        <p className="text-sm whitespace-pre-line print-text-sm">{invoice.notes}</p>
                      </div>
                    )}
                  </>
                )}

              </div>

              {/* Foreign Customer Note - Above footer line - FIXED position */}
              {isLastPage && invoice.customers?.country !== 'Bosnia and Herzegovina' && invoiceSettings.foreignNote && invoiceSettings.foreignNote.trim() && (
                <div 
                  className="invoice-foreign-note"
                  style={{ 
                    position: 'absolute',
                    bottom: '30mm',
                    left: '15mm',
                    right: '15mm',
                    width: 'calc(100% - 30mm)'
                  }}
                >
                  <p 
                    className="print-text-xs text-xs leading-relaxed" 
                    style={{ 
                      color: '#000000',
                      textAlign: 'justify',
                      marginBottom: 0
                    }}
                  >
                    {invoiceSettings.foreignNote.replace(/\{invoice_number\}/g, invoice.invoice_number || '')}
                  </p>
                </div>
              )}

              {/* Footer with separator line - FIXED at bottom */}
              {(invoiceSettings.foreignFooter.some(col => col.trim()) || invoiceSettings.domesticFooter.some(col => col.trim())) && (
                <div className="invoice-footer-wrapper">
                  <Separator className="print:border-black print:border-t print:mt-4 print:mb-2 border-t border-gray-600 mt-4 mb-2" />
                  <div className="text-xs print-text-xs flex justify-between gap-6 invoice-footer-columns" style={{ color: '#000000' }}>
                    {invoice.customers?.country === 'Bosnia and Herzegovina' ? (
                      <>
                        <div className="whitespace-pre-line text-left flex-1 min-w-0">{invoiceSettings.domesticFooter[0]}</div>
                        <div className="whitespace-pre-line text-center flex-1 min-w-0">{invoiceSettings.domesticFooter[1]}</div>
                        <div className="whitespace-pre-line text-right flex-1 min-w-0">{invoiceSettings.domesticFooter[2]}</div>
                      </>
                    ) : (
                      <>
                        <div className="whitespace-pre-line text-left flex-1 min-w-0">{invoiceSettings.foreignFooter[0]}</div>
                        <div className="whitespace-pre-line text-center flex-1 min-w-0">{invoiceSettings.foreignFooter[1]}</div>
                        <div className="whitespace-pre-line text-right flex-1 min-w-0">{invoiceSettings.foreignFooter[2]}</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
