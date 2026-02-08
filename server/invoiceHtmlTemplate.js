/**
 * Server-side HTML template generator for invoices
 * Generates the exact same HTML structure as the frontend print view
 */

// Translation utilities (mirrored from frontend)
const getInvoiceTranslations = (customerCountry) => {
  if (customerCountry === 'Bosnia and Herzegovina') {
    return {
      invoice: 'FAKTURA',
      billTo: 'Račun za:',
      invoiceNumber: 'Broj fakture:',
      issueDate: 'Datum izdavanja:',
      dueDate: 'Datum dospijeća:',
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
      pieces: 'kom',
      piece: 'kom.'
    };
  }
  return {
    invoice: 'INVOICE',
    billTo: 'Bill To:',
    invoiceNumber: 'Invoice Number:',
    issueDate: 'Issue Date:',
    dueDate: 'Due Date:',
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
    pieces: 'pcs',
    piece: 'piece'
  };
};

const formatCurrency = (amount, currency) => {
  if (currency === 'BAM') {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (error) {
    return `${amount} ${currency}`;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getCountryCode = (country) => {
  const codes = {
    'Bosnia and Herzegovina': 'BA',
    'Germany': 'DE',
    'Austria': 'AT',
    'Croatia': 'HR',
    'Serbia': 'RS',
  };
  return codes[country] || '';
};

// Paginate invoice items (same logic as frontend)
const paginateInvoiceItems = (items, itemsPerPage = 15) => {
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
};

/**
 * Generate complete HTML for invoice PDF
 */
export const generateInvoiceHTML = (invoice, companyInfo, invoiceSettings, inventoryItems) => {
  const translations = getInvoiceTranslations(invoice.customers?.country);
  const invoiceItems = invoice.invoice_items || [];
  const paginatedItems = paginateInvoiceItems(invoiceItems);
  const totalPages = paginatedItems.length;
  const isDomestic = invoice.customers?.country === 'Bosnia and Herzegovina';

  // Generate pages HTML
  const pagesHTML = paginatedItems.map((pageItems, pageIndex) => {
    const isLastPage = pageIndex === totalPages - 1;
    
    // Generate items table rows
    const itemsRows = pageItems.map((item) => {
      const inventoryItem = inventoryItems.find(inv => inv.id === item.inventory_id) || 
                           inventoryItems.find(inv => inv.name === item.description);
      const subtotalWeight = (inventoryItem?.weight || 0) * item.quantity;
      const unitValue = inventoryItem?.unit || translations.piece;
      const displayUnit = (isDomestic && (unitValue === 'piece' || unitValue === 'pieces' || !unitValue)) 
        ? 'kom.' 
        : unitValue;
      
      return `
        <tr>
          <td class="text-left text-sm" style="vertical-align: middle;">${escapeHtml(item.description)}</td>
          <td class="text-left text-sm" style="vertical-align: middle;">${escapeHtml(inventoryItem?.part_number || '-')}</td>
          <td class="text-left text-sm" style="vertical-align: middle;">${escapeHtml(displayUnit)}</td>
          <td class="text-left text-sm" style="vertical-align: middle;">${item.quantity}</td>
          <td class="text-left text-sm" style="vertical-align: middle;">${subtotalWeight.toFixed(2)} kg</td>
          <td class="text-left text-sm" style="vertical-align: middle;">${formatCurrency(item.unit_price, invoice.currency)}</td>
          <td class="text-right text-sm" style="vertical-align: middle;">${formatCurrency(item.total, invoice.currency)}</td>
        </tr>
      `;
    }).join('');

    // Generate summary section (only on last page)
    let summaryHTML = '';
    if (isLastPage) {
      const subtotal = (invoice.amount || 0) / (1 + (invoice.vat_rate || 0) / 100);
      const vatAmount = (invoice.amount || 0) - subtotal;
      
      summaryHTML = `
        <div class="grid grid-cols-2 gap-6 no-page-break print:mt-2">
          <div style="width: 420px;">
            <h3 class="font-semibold mb-2 print-text-base">${translations.summary}</h3>
            <div class="space-y-1 text-sm print:space-y-2 print-text-sm">
              <p><span class="font-medium">${translations.totalQuantity}</span> ${invoice.total_quantity} ${translations.pieces}</p>
              <p><span class="font-medium">${translations.netWeight}</span> ${invoice.net_weight} kg</p>
              <p><span class="font-medium">${translations.totalWeight}</span> ${invoice.total_weight} kg</p>
              <p><span class="font-medium">${translations.packing}</span> ${invoice.packing} ${invoice.packing === 1 ? translations.package : translations.packages}</p>
            </div>
            ${invoice.customers?.country !== 'Bosnia and Herzegovina' && 
             invoice.currency === 'EUR' && 
             (invoice.amount || 0) < 6000 ? `
              <div class="mt-4 print:mt-6 text-sm print-text-sm space-y-2">
                <p class="leading-relaxed text-justify print:text-justify">
                  Izjava: Izvoznik proizvoda obuhvaćenih ovom ispravom izjavljuje da su, osim ako je to drugačije izričito navedeno, ovi proizvodi bosanskohercegovačkog preferencijalnog porijekla.
                </p>
                <p class="leading-relaxed">
                  Potpis izvoznika: ${invoiceSettings.signatory || 'Radmila Kuzmanović'} <span style="border-bottom: 1px solid #000; display: inline-block; min-width: 150px; margin-bottom: -0.2rem;"></span>
                </p>
              </div>
            ` : ''}
          </div>
          <div class="text-right w-3/5 ml-auto">
            <div class="space-y-2 print:space-y-3">
              <div class="flex justify-between print-text-sm">
                <span>${translations.subtotal}</span>
                <span>${formatCurrency(subtotal, invoice.currency)}</span>
              </div>
              <div class="flex justify-between print-text-sm">
                <span>${translations.vat} (${invoice.vat_rate}%):</span>
                <span>${formatCurrency(vatAmount, invoice.currency)}</span>
              </div>
              <div 
                id="invoice-total-amount"
                style="background-color: ${invoiceSettings.primaryColor}; position: absolute; width: 286px; padding-left: 50px; padding-right: 48px; height: 30px; right: 7px;" 
                class="flex justify-between font-bold text-lg print-invoice-bg h-[35px] items-center print-text-base total-amount-bg"
              >
                <span>${translations.total}</span>
                <span>${formatCurrency(invoice.amount || 0, invoice.currency)}</span>
              </div>
            </div>
            ${invoice.customers?.country !== 'Bosnia and Herzegovina' ? `
              <div 
                id="invoice-vat-exemption-statement"
                class="print-text-xs text-xs" 
                style="position: absolute; right: 7px; width: 286px; padding-left: 0px; padding-right: 0px; margin-top: 40px; text-align: left; color: #000000;"
              >
                <p class="mb-1 leading-tight">Oslobođeno od plaćanja PDV-a po članu 27. tačka 1. zakona o PDV-u, Službeni glasnik br. 91/05 i 35/05.</p>
                <p class="leading-tight">Exempt from VAT payment pursuant to Article 27, Item 1 of the VAT Law, Official Gazette No. 91/05 and 35/05.</p>
              </div>
            ` : ''}
            ${invoiceSettings.signatory ? `
              <div 
                id="invoice-signatory"
                class="text-center" 
                style="position: absolute; right: 7px; width: 286px; padding-left: 50px; padding-right: 48px; margin-top: ${invoice.customers?.country !== 'Bosnia and Herzegovina' ? '100px' : '45px'}; font-size: 0.7rem;"
              >
                <p style="margin-bottom: 1.8rem; margin-top: 1.8rem;">${escapeHtml(invoiceSettings.signatory)}</p>
                <div style="border-bottom: 1px solid #000; width: 100%; margin: 0 auto;"></div>
              </div>
            ` : ''}
          </div>
        </div>
        ${invoice.notes ? `
          <div class="no-page-break print:mt-6">
            <h3 class="font-semibold mb-2 print-text-base">${translations.notes}</h3>
            <p class="text-sm whitespace-pre-line print-text-sm">${escapeHtml(invoice.notes)}</p>
          </div>
        ` : ''}
      `;
    }

    // Generate incoterms address suffix
    let incotermsSuffix = '';
    if (invoice.incoterms === 'EXW' && companyInfo) {
      const parts = [];
      if (companyInfo.postal_code) parts.push(companyInfo.postal_code);
      if (companyInfo.city) parts.push(companyInfo.city);
      if (companyInfo.country) {
        const countryCode = getCountryCode(companyInfo.country);
        if (countryCode) parts.push(countryCode);
      }
      incotermsSuffix = parts.length > 0 ? `, ${parts.join(' ')}` : '';
    } else if (invoice.incoterms === 'DAP') {
      incotermsSuffix = invoice.customers?.dap_address ? `, ${invoice.customers.dap_address}` : '';
    } else if (invoice.incoterms === 'FCO') {
      incotermsSuffix = invoice.customers?.fco_address ? `, ${invoice.customers.fco_address}` : '';
    }

    return `
      <div 
        class="print-invoice-page print-invoice print:text-black print:bg-white print:min-h-[calc(100vh-1in)] print:flex print:flex-col invoice-preview-scale ${pageIndex > 0 ? 'page-break' : ''}"
        style="gap: 12px;"
      >
        ${companyInfo ? `
          <div class="company-header print:mb-6 flex justify-between items-end">
            <div>
              ${companyInfo.logo_url ? `
                <div class="mb-1">
                  <img src="${escapeHtml(companyInfo.logo_url)}" alt="Company Logo" class="h-11 print:h-14 object-contain invoice-logo" />
                </div>
              ` : ''}
              <div class="text-sm print-text-sm">
                <div class="inline-block">
                  <p class="font-medium border-b border-gray-600 print:border-black pb-1 inline-block text-xs">
                    ${escapeHtml(companyInfo.legal_name || companyInfo.company_name)} - ${escapeHtml(companyInfo.address)} - ${escapeHtml(companyInfo.postal_code)} ${escapeHtml(companyInfo.city)} - Bosnia and Herzegovina
                  </p>
                </div>
              </div>
            </div>
            <div 
              class="print-invoice-bg h-[30px] flex items-center invoice-title-bg" 
              style="background-color: ${invoiceSettings.primaryColor}; position: absolute; width: 286px; padding-left: 23px; right: 7px; justify-content: left;"
            >
              <span class="text-lg print-text-lg font-medium text-black">${translations.invoice}</span>
              ${totalPages > 1 ? `<span class="text-sm print-text-sm ml-2">(Page ${pageIndex + 1} of ${totalPages})</span>` : ''}
            </div>
          </div>
        ` : ''}
        <div class="invoice-header grid grid-cols-2 gap-6">
          <div>
            <h3 class="mb-2 print-text-sm text-sm font-normal">${translations.billTo}</h3>
            <p class="font-bold print-text-base print:font-bold">${escapeHtml(invoice.customers?.name || '')}</p>
            ${invoice.customers?.address ? `<p class="text-sm whitespace-pre-line print-text-sm">${escapeHtml(invoice.customers.address)}</p>` : ''}
            ${invoice.customers?.city ? `<p class="text-sm print-text-sm">${escapeHtml(invoice.customers.city)}</p>` : ''}
            ${invoice.customers?.country ? `<p class="text-sm print-text-sm">${escapeHtml(invoice.customers.country)}</p>` : ''}
            ${invoice.customers?.phone ? `<p class="text-sm print-text-sm">${escapeHtml(invoice.customers.phone)}</p>` : ''}
            ${invoice.contact_person_reference ? `<p class="text-sm print-text-sm"><span class="font-medium">Reference:</span> ${escapeHtml(invoice.contact_person_reference)}</p>` : ''}
          </div>
          <div class="text-right">
            <div class="space-y-1 print:space-y-2">
              <p class="print-text-sm"><span class="font-medium">${translations.invoiceNumber}</span> ${escapeHtml(invoice.invoice_number)}</p>
              ${invoice.order_number ? `<p class="print-text-sm"><span class="font-medium">${translations.orderNumber}</span> ${escapeHtml(invoice.order_number)}</p>` : ''}
              <p class="print-text-sm"><span class="font-medium">${translations.issueDate}</span> ${formatDate(invoice.issue_date)}</p>
              <p class="print-text-sm"><span class="font-medium">${translations.dueDate}</span> ${invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}</p>
              ${invoice.shipping_date ? `<p class="print-text-sm"><span class="font-medium">${translations.shippingDate}</span> ${formatDate(invoice.shipping_date)}</p>` : ''}
              ${invoice.incoterms ? `
                <p class="print-text-sm">
                  <span class="font-medium">${translations.incoterms}</span> ${escapeHtml(invoice.incoterms)}${incotermsSuffix}
                </p>
              ` : ''}
              ${invoice.declaration_number ? `<p class="print-text-sm"><span class="font-medium">${translations.declarationNumber}</span> ${escapeHtml(invoice.declaration_number)}</p>` : ''}
            </div>
          </div>
        </div>
        <div class="invoice-content-area">
          <div class="no-page-break">
            <table class="invoice-items-table w-full border-collapse print:border-black">
              <thead>
                <tr>
                  <th class="text-left text-sm" style="vertical-align: middle;">${translations.partName}</th>
                  <th class="text-left text-sm" style="vertical-align: middle;">${translations.partNumber}</th>
                  <th class="text-left text-sm" style="vertical-align: middle;">${translations.unit}</th>
                  <th class="text-left text-sm" style="vertical-align: middle;">${translations.quantity}</th>
                  <th class="text-left text-sm" style="vertical-align: middle;">${translations.subtotalWeight}</th>
                  <th class="text-left text-sm" style="vertical-align: middle;">${translations.price}</th>
                  <th class="text-right text-sm" style="vertical-align: middle;">${translations.amount}</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>
          ${summaryHTML}
        </div>
        ${isLastPage && invoice.customers?.country !== 'Bosnia and Herzegovina' && invoiceSettings.foreignNote && invoiceSettings.foreignNote.trim() ? `
          <div 
            class="invoice-foreign-note"
            style="position: absolute; bottom: 30mm; left: 15mm; right: 15mm; width: calc(100% - 30mm);"
          >
            <p class="text-xs print-text-xs leading-relaxed" style="color: #000000;">${escapeHtml(invoiceSettings.foreignNote)}</p>
          </div>
        ` : ''}
        ${isLastPage ? `
          <div style="position: absolute; bottom: 10mm; left: 15mm; right: 15mm; width: calc(100% - 30mm); border-top: 1px solid #000; padding-top: 4mm; margin-top: 4mm;">
            <div class="text-xs print-text-xs flex justify-between gap-6 invoice-footer-columns" style="color: #000000;">
              ${invoice.customers?.country === 'Bosnia and Herzegovina' && invoiceSettings.domesticFooter ? `
                ${invoiceSettings.domesticFooter.map(footer => footer ? `<div>${escapeHtml(footer)}</div>` : '<div></div>').join('')}
              ` : invoiceSettings.foreignFooter ? `
                ${invoiceSettings.foreignFooter.map(footer => footer ? `<div>${escapeHtml(footer)}</div>` : '<div></div>').join('')}
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Get print CSS (same as frontend)
  const printCSS = getPrintCSS();

  return `<!DOCTYPE html>
<html>
  <head>
    <title>Invoice ${escapeHtml(invoice.invoice_number)}</title>
    <meta charset="utf-8">
    <style>
      ${printCSS}
    </style>
  </head>
  <body>
    ${pagesHTML}
  </body>
</html>`;
};

const escapeHtml = (text) => {
  if (text == null) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
};

const getPrintCSS = () => {
  return `
    @media print {
      @page {
        margin: 0 !important;
        size: A4;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      .print-invoice-page {
        width: 210mm !important;
        height: 297mm !important;
        margin: 0 !important;
        padding: 15mm 15mm 10mm 15mm !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      .print-invoice-page:last-child {
        page-break-after: auto !important;
      }
      
      .print-invoice-page.page-break {
        page-break-before: always !important;
      }
      
      .print-invoice-page * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      .invoice-header {
        display: flex !important;
        justify-content: space-between !important;
        margin-bottom: 0mm !important;
      }
      
      .company-header {
        margin-bottom: 0.3rem !important;
      }
      
      .invoice-items-table {
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
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
      
      .invoice-items-table td {
        vertical-align: middle !important;
        border-top: 1px solid rgb(212, 212, 212) !important;
        border-bottom: none !important;
      }
      
      .invoice-items-table tbody tr:last-child td {
        border-bottom: 1px solid rgb(212, 212, 212) !important;
      }
      
      .invoice-items-table th:nth-child(1),
      .invoice-items-table td:nth-child(1) {
        width: 35% !important;
        max-width: 35% !important;
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
        width: 10% !important;
        max-width: 10% !important;
      }
      
      .invoice-items-table th:nth-child(7),
      .invoice-items-table td:nth-child(7) {
        width: 12% !important;
        max-width: 12% !important;
        text-align: right !important;
      }
      
      .grid.grid-cols-2 {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 1.5rem !important;
        position: relative !important;
      }
      
      .no-page-break {
        page-break-inside: avoid !important;
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
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: 'Lexend', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      font-weight: 300;
    }
    
    .print-invoice-page {
      width: 210mm;
      height: 297mm;
      background: white;
      margin: 0;
      padding: 15mm 15mm 10mm 15mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
  `;
};
