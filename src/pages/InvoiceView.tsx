import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileDown, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { getInvoiceTranslations } from "@/lib/translationUtils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  
  const linesPerFullPage = 35;
  const linesPerLastPage = 11;
  
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

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [invoiceSettings, setInvoiceSettings] = useState({
    primaryColor: '#000000',
    domesticFooter: ['', '', ''],
    foreignFooter: ['', '', ''],
    foreignNote: '',
    signatory: ''
  });
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfSettings, setPdfSettings] = useState({
    scale: 4, // Higher scale = better quality (2-5 recommended)
    quality: 0.98, // Image quality (0-1)
    dpi: 300 // DPI for PDF (72, 150, 300)
  });
  const [showPdfSettings, setShowPdfSettings] = useState(false);
  const invoiceContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchInvoiceData();
    }
    // Load PDF settings from localStorage
    const savedSettings = localStorage.getItem('pdfSettings');
    if (savedSettings) {
      try {
        setPdfSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Error loading PDF settings:', e);
      }
    }
  }, [id]);

  const savePdfSettings = (newSettings: typeof pdfSettings) => {
    setPdfSettings(newSettings);
    localStorage.setItem('pdfSettings', JSON.stringify(newSettings));
  };

  const fetchInvoiceData = async () => {
    try {
      // Fetch invoice with customer and items
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers!inner(id, name, country, address, city, phone, dap_address, fco_address, vat_rate),
          invoice_items!fk_invoice_items_invoice(*)
        `)
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      // Fetch inventory items
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .eq('category', 'Parts');
      if (inventoryData) setInventoryItems(inventoryData);

      // Fetch company info
      const { data: companyData } = await supabase
        .from('company_info')
        .select('*')
        .limit(1)
        .single();
      if (companyData) setCompanyInfo(companyData);

      // Fetch invoice settings
      const { data: settingsData } = await (supabase as any)
        .from('invoice_settings')
        .select('*')
        .maybeSingle();
      if (settingsData) {
        setInvoiceSettings({
          primaryColor: settingsData.primary_color || '#000000',
          domesticFooter: [
            settingsData.domestic_footer_column1 || '',
            settingsData.domestic_footer_column2 || '',
            settingsData.domestic_footer_column3 || ''
          ],
          foreignFooter: [
            settingsData.foreign_footer_column1 || '',
            settingsData.foreign_footer_column2 || '',
            settingsData.foreign_footer_column3 || ''
          ],
          foreignNote: settingsData.foreign_note || '',
          signatory: settingsData.signatory || ''
        });
      }
    } catch (error) {
      console.error('Error fetching invoice data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!invoiceContainerRef.current || !invoice) {
      return;
    }

    setGeneratingPDF(true);
    try {
      const container = invoiceContainerRef.current;
      const pages = container.querySelectorAll('.print-invoice-page');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Create a temporary container for this page
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '210mm';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.fontSize = '16px'; // Base font size for rem calculations
        tempContainer.appendChild(page.cloneNode(true));
        document.body.appendChild(tempContainer);

        // Calculate dimensions - use scale for quality, not DPI for html2canvas
        // html2canvas works best with pixel dimensions at 96 DPI base
        const mmToPixels = (mm: number) => (mm * 96) / 25.4; // Convert mm to pixels at 96 DPI
        const baseWidthPx = mmToPixels(210); // A4 width in pixels
        const baseHeightPx = mmToPixels(297); // A4 height in pixels

        const canvas = await html2canvas(tempContainer, {
          scale: pdfSettings.scale, // Higher scale = better quality
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: baseWidthPx,
          height: baseHeightPx,
          windowWidth: baseWidthPx,
          windowHeight: baseHeightPx,
          allowTaint: false,
          removeContainer: false,
          onclone: (clonedDoc) => {
            // Ensure all styles are applied in the cloned document
            const clonedContainer = clonedDoc.querySelector('.print-invoice-page');
            if (clonedContainer) {
              (clonedContainer as HTMLElement).style.transform = 'scale(1)';
            }
            
            // Fix img display to inline-block for proper vertical alignment
            const allImages = clonedDoc.querySelectorAll('img');
            allImages.forEach((img: any) => {
              if (img.style) {
                img.style.display = 'inline-block';
                img.style.verticalAlign = 'middle';
              }
            });
            
            // Force vertical-align middle on all table cells
            const allCells = clonedDoc.querySelectorAll('.invoice-items-table th, .invoice-items-table td');
            allCells.forEach((cell: any) => {
              if (cell.style) {
                cell.style.verticalAlign = 'middle';
                cell.setAttribute('valign', 'middle');
              }
            });
            
            // Also ensure table rows have proper display
            const allRows = clonedDoc.querySelectorAll('.invoice-items-table tr');
            allRows.forEach((row: any) => {
              if (row.style) {
                row.style.display = 'table-row';
              }
            });
            
            // Ensure table has proper display
            const tables = clonedDoc.querySelectorAll('.invoice-items-table');
            tables.forEach((table: any) => {
              if (table.style) {
                table.style.display = 'table';
                table.style.borderCollapse = 'collapse';
                table.style.borderSpacing = '0';
              }
            });
          }
        });

        // Use higher quality image format
        const imgData = canvas.toDataURL('image/png', pdfSettings.quality);
        
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate dimensions to fit A4 exactly (210mm x 297mm)
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width; // Maintain aspect ratio
        
        // Ensure height doesn't exceed A4 height
        const finalHeight = Math.min(imgHeight, 297);
        
        // Add image to PDF with exact A4 dimensions
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, finalHeight, undefined, 'FAST');

        // Clean up
        document.body.removeChild(tempContainer);
      }

      // Save PDF
      const fileName = `Invoice_${invoice.invoice_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Invoice not found</div>
      </div>
    );
  }

  const invoiceItems = invoice.invoice_items || [];
  const paginatedItems = paginateInvoiceItems(invoiceItems);
  const totalPages = paginatedItems.length;
  
  // Get translations based on customer country - recalculate when invoice changes
  const translations = useMemo(() => {
    if (!invoice) {
      return getInvoiceTranslations(undefined);
    }
    
    const customerCountry = invoice.customers?.country;
    console.log('TRANSLATION CHECK - Country:', customerCountry, '| Is Bosnia?', customerCountry === 'Bosnia and Herzegovina');
    
    return getInvoiceTranslations(customerCountry);
  }, [invoice]);

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:p-0 print:bg-white" ref={invoiceContainerRef}>
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
          
          .invoice-items-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
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
            margin-top: auto !important;
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
            width: 25% !important;
            max-width: 25% !important;
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
            width: 12% !important;
            max-width: 12% !important;
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
                </div>
                <div className="text-right">
                  <div className="space-y-1 print:space-y-2">
                    <p className="print-text-sm"><span className="font-medium">{translations.invoiceNumber}</span> {invoice.invoice_number}</p>
                    <p className="print-text-sm"><span className="font-medium">{translations.issueDate}</span> {formatDate(invoice.issue_date)}</p>
                    <p className="print-text-sm"><span className="font-medium">{translations.dueDate}</span> {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}</p>
                    {invoice.order_number && <p className="print-text-sm"><span className="font-medium">{translations.orderNumber}</span> {invoice.order_number}</p>}
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
                      return (
                        <tr key={itemIndex}>
                          <td className="text-left text-sm" style={{verticalAlign: 'middle'}}>{item.description}</td>
                          <td className="text-left text-sm" style={{verticalAlign: 'middle'}}>{inventoryItem?.part_number || '-'}</td>
                          <td className="text-left text-sm" style={{verticalAlign: 'middle'}}>{inventoryItem?.unit || translations.piece}</td>
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

              {/* Content wrapper that grows to push footer down */}
              <div className="flex-1" style={{minHeight: 0}}></div>

              {/* Foreign Customer Note - Above footer line */}
              {invoice.customers?.country !== 'Bosnia and Herzegovina' && invoiceSettings.foreignNote && invoiceSettings.foreignNote.trim() && (
                <div className="invoice-footer-wrapper mt-auto" style={{ marginBottom: 0 }}>
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

              {/* Footer with separator line - Always at bottom */}
              {(invoiceSettings.foreignFooter.some(col => col.trim()) || invoiceSettings.domesticFooter.some(col => col.trim())) && (
                <div className="invoice-footer-wrapper mt-auto">
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
        
        {/* Download PDF and Settings Buttons - Always visible after scrolling */}
        <div className="flex gap-2 pt-4 pb-4 print:hidden justify-center w-full">
          <Button onClick={generatePDF} disabled={generatingPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            {generatingPDF ? 'Generating PDF...' : 'Download PDF'}
          </Button>
          <Button onClick={() => setShowPdfSettings(true)} variant="outline" size="icon" title="PDF Settings">
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* PDF Settings Dialog */}
        <Dialog open={showPdfSettings} onOpenChange={setShowPdfSettings}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>PDF Quality Settings</DialogTitle>
              <DialogDescription>
                Adjust the quality and resolution of generated PDFs. Higher values = better quality but larger file size.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Scale Setting */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="scale">Resolution Scale</Label>
                  <span className="text-sm text-muted-foreground">{pdfSettings.scale}x</span>
                </div>
                <Slider
                  id="scale"
                  min={1}
                  max={5}
                  step={0.5}
                  value={[pdfSettings.scale]}
                  onValueChange={(value) => savePdfSettings({ ...pdfSettings, scale: value[0] })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher scale improves quality but increases generation time. Recommended: 3-4
                </p>
              </div>

              {/* Quality Setting */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="quality">Image Quality</Label>
                  <span className="text-sm text-muted-foreground">{(pdfSettings.quality * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  id="quality"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={[pdfSettings.quality]}
                  onValueChange={(value) => savePdfSettings({ ...pdfSettings, quality: value[0] })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Image compression quality. Higher = better quality, larger file size.
                </p>
              </div>

              {/* DPI Setting */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="dpi">DPI (Dots Per Inch)</Label>
                  <span className="text-sm text-muted-foreground">{pdfSettings.dpi} DPI</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={pdfSettings.dpi === 150 ? "default" : "outline"}
                    size="sm"
                    onClick={() => savePdfSettings({ ...pdfSettings, dpi: 150 })}
                    className="flex-1"
                  >
                    Standard (150)
                  </Button>
                  <Button
                    variant={pdfSettings.dpi === 300 ? "default" : "outline"}
                    size="sm"
                    onClick={() => savePdfSettings({ ...pdfSettings, dpi: 300 })}
                    className="flex-1"
                  >
                    High (300)
                  </Button>
                  <Button
                    variant={pdfSettings.dpi === 600 ? "default" : "outline"}
                    size="sm"
                    onClick={() => savePdfSettings({ ...pdfSettings, dpi: 600 })}
                    className="flex-1"
                  >
                    Ultra (600)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Higher DPI = sharper text and images. 300 DPI is recommended for professional documents.
                </p>
              </div>

              {/* Current Settings Summary */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-1">Current Settings:</p>
                <p className="text-xs text-muted-foreground">
                  Scale: {pdfSettings.scale}x | Quality: {(pdfSettings.quality * 100).toFixed(0)}% | DPI: {pdfSettings.dpi}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimated file size: ~{(pdfSettings.scale * pdfSettings.quality * pdfSettings.dpi / 100).toFixed(1)}MB per page
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

