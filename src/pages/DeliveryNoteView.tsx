import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileDown, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Image size for delivery note items (in pixels)
// Change this value to adjust the size of product images in the delivery note
const DELIVERY_NOTE_IMAGE_SIZE = 60; // pixels

// Function to calculate number of lines in notes text
const calculateNoteLines = (notes: string | null | undefined): number => {
  if (!notes || !notes.trim()) return 0;
  // Split by newlines and calculate lines
  const lines = notes.split('\n');
  let totalLines = 0;
  // Approximate characters per line (assuming ~80 chars per line for notes)
  const charsPerLine = 80;
  lines.forEach(line => {
    if (line.trim()) {
      totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
    } else {
      totalLines += 1; // Empty line still takes space
    }
  });
  return totalLines;
};

// Function to calculate items per page based on pixel heights
// Each item is ~70px high
// Max items per page: 10 (if no notes)
// If notes exist: Items per last page = (710 - 28 - (noteLines × 20)) / 70
const paginateDeliveryNoteItems = (items: any[], notes?: string | null) => {
  if (!items || items.length === 0) return [];
  
  // Constants
  const ITEM_HEIGHT_PX = 70;
  const MAX_ITEMS_PER_PAGE = 10;
  const AVAILABLE_SPACE_PX = 710;
  const NOTES_TITLE_HEIGHT_PX = 28;
  const NOTES_LINE_HEIGHT_PX = 20;
  
  // Calculate note lines
  const noteLines = calculateNoteLines(notes);
  
  // Calculate max items for last page if notes exist
  let maxItemsPerLastPage = MAX_ITEMS_PER_PAGE;
  if (noteLines > 0) {
    const notesHeight = NOTES_TITLE_HEIGHT_PX + (noteLines * NOTES_LINE_HEIGHT_PX);
    const availableForItems = AVAILABLE_SPACE_PX - notesHeight;
    maxItemsPerLastPage = Math.floor(availableForItems / ITEM_HEIGHT_PX);
    // Ensure at least 1 item can fit
    maxItemsPerLastPage = Math.max(1, maxItemsPerLastPage);
  }
  
  const pages: any[][] = [];
  let currentPageItems: any[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const remainingItems = items.length - i;
    const isLastPage = remainingItems <= maxItemsPerLastPage;
    
    // Determine max items for current page
    const maxItemsForCurrentPage = isLastPage ? maxItemsPerLastPage : MAX_ITEMS_PER_PAGE;
    
    if (currentPageItems.length < maxItemsForCurrentPage) {
      currentPageItems.push(items[i]);
    } else {
      // Current page is full, start new page
      pages.push(currentPageItems);
      currentPageItems = [items[i]];
    }
  }
  
  // Add remaining items
  if (currentPageItems.length > 0) {
    pages.push(currentPageItems);
  }
  
  return pages.length > 0 ? pages : [items];
};

interface DeliveryNoteViewProps {
  deliveryNoteId?: string;
  hideBackButton?: boolean;
  inDialog?: boolean;
}

export default function DeliveryNoteView({ deliveryNoteId, hideBackButton = false, inDialog = false }: DeliveryNoteViewProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = deliveryNoteId || routeId;
  const navigate = useNavigate();
  const [deliveryNote, setDeliveryNote] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [inventoryMap, setInventoryMap] = useState<Record<string, any>>({});
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
    scale: 4,
    quality: 0.98,
    dpi: 300
  });
  const deliveryNoteContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchDeliveryNoteData();
    }
    const savedSettings = localStorage.getItem('pdfSettings');
    if (savedSettings) {
      try {
        setPdfSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Error loading PDF settings:', e);
      }
    }
  }, [id]);

  const fetchDeliveryNoteData = async () => {
    try {
      const { data: noteData, error: noteError } = await supabase
        .from('delivery_notes')
        .select('*')
        .eq('id', id)
        .single();

      if (noteError) throw noteError;

      // Fetch entity (customer or supplier)
      let entity = null;
      if (noteData.to_type === "customer") {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, name, country, address, city, phone, dap_address, fco_address')
          .eq('id', noteData.to_id)
          .single();
        entity = customerData;
      } else {
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('id, name, address, city, phone, country')
          .eq('id', noteData.to_id)
          .single();
        entity = supplierData;
      }

      const { data: itemsData } = await supabase
        .from('delivery_note_items')
        .select('*')
        .eq('delivery_note_id', id);
      
      // Fetch inventory items to get photo URLs
      const inventoryIds = itemsData?.map(item => item.inventory_id).filter(Boolean) || [];
      let invMap: Record<string, any> = {};
      if (inventoryIds.length > 0) {
        const { data: inventoryData } = await supabase
          .from('inventory')
          .select('id, photo_url, unit')
          .in('id', inventoryIds);
        if (inventoryData) {
          invMap = inventoryData.reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      setInventoryMap(invMap);
      
      setDeliveryNote({ 
        ...noteData, 
        items: itemsData || [],
        entity: entity
      });

      const { data: companyData } = await supabase
        .from('company_info')
        .select('*')
        .limit(1)
        .single();
      if (companyData) setCompanyInfo(companyData);

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
      console.error('Error fetching delivery note data:', error);
    } finally {
      setLoading(false);
    }
  };

  const preparePagesForRender = async (pages: NodeListOf<Element>) => {
    const preparedPages: string[] = [];

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '210mm';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.fontSize = '16px';
        tempContainer.appendChild(page.cloneNode(true));
        document.body.appendChild(tempContainer);

        const mmToPixels = (mm: number) => (mm * 96) / 25.4;
        const baseWidthPx = mmToPixels(210);
        const baseHeightPx = mmToPixels(297);

        const canvas = await html2canvas(tempContainer, {
          scale: pdfSettings.scale,
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
            const clonedContainer = clonedDoc.querySelector('.print-delivery-note-page');
            if (clonedContainer) {
              (clonedContainer as HTMLElement).style.transform = 'scale(1)';
            }
            
            // Fix img display for proper vertical alignment
            const allImages = clonedDoc.querySelectorAll('.delivery-note-items-table img');
            allImages.forEach((img: any) => {
              if (img.style) {
                img.style.display = 'block';
                img.style.margin = '0 auto';
                img.style.verticalAlign = 'middle';
              }
            });
            
            // Force vertical-align middle on all table cells and fix borders
            const allCells = clonedDoc.querySelectorAll('.delivery-note-items-table th, .delivery-note-items-table td');
            allCells.forEach((cell: any) => {
              if (cell.style) {
                cell.style.verticalAlign = 'middle';
                cell.setAttribute('valign', 'middle');
              }
            });
            
            // Fix table cell borders - remove border-bottom from all cells
            const allTdCells = clonedDoc.querySelectorAll('.delivery-note-items-table tbody td');
            allTdCells.forEach((cell: any) => {
              if (cell.style) {
                cell.style.borderBottom = 'none';
              }
            });
            
            // Add border-bottom only to last row cells
            const lastRow = clonedDoc.querySelector('.delivery-note-items-table tbody tr:last-child');
            if (lastRow) {
              const lastRowCells = lastRow.querySelectorAll('td');
              lastRowCells.forEach((cell: any) => {
                if (cell.style) {
                  cell.style.borderBottom = '1px solid #6b7280';
                }
              });
            }
            
            // Also ensure table rows have proper display
            const allRows = clonedDoc.querySelectorAll('.delivery-note-items-table tr');
            allRows.forEach((row: any) => {
              if (row.style) {
                row.style.display = 'table-row';
              }
            });
            
            // Ensure table has proper display
            const tables = clonedDoc.querySelectorAll('.delivery-note-items-table');
            tables.forEach((table: any) => {
              if (table.style) {
                table.style.display = 'table';
                table.style.borderCollapse = 'collapse';
                table.style.borderSpacing = '0';
              }
            });
          }
        });

        const imgData = canvas.toDataURL('image/png', pdfSettings.quality);
      preparedPages.push(imgData);

      document.body.removeChild(tempContainer);
    }

    return preparedPages;
  };

  const generatePDF = async () => {
    if (!deliveryNoteContainerRef.current || !deliveryNote) {
      return;
    }

    setGeneratingPDF(true);
    try {
      const container = deliveryNoteContainerRef.current;
      const pages = container.querySelectorAll('.print-delivery-note-page');
      const preparedPages = await preparePagesForRender(pages);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < preparedPages.length; i++) {
        const imgData = preparedPages[i];
        
        if (i > 0) {
          pdf.addPage();
        }

        const img = new Image();
        img.src = imgData;
        await new Promise((resolve) => {
          img.onload = () => {
        const imgWidth = 210;
            const imgHeight = (img.height * imgWidth) / img.width;
        const finalHeight = Math.min(imgHeight, 297);
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, finalHeight, undefined, 'FAST');
            resolve(null);
          };
        });
      }

      const fileName = `DeliveryNote_${deliveryNote.delivery_note_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handlePrint = async () => {
    if (!deliveryNoteContainerRef.current || !deliveryNote) {
      return;
    }

    try {
      const container = deliveryNoteContainerRef.current;
      const pages = container.querySelectorAll('.print-delivery-note-page');
      const preparedPages = await preparePagesForRender(pages);

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print the delivery note');
        return;
      }

      // Create HTML content with all pages as images
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Delivery Note ${deliveryNote.delivery_note_number}</title>
            <style>
              @page {
                margin: 0;
                size: A4;
              }
              body {
                margin: 0;
                padding: 0;
                background: white;
              }
              .print-page {
                width: 210mm;
                height: 297mm;
                page-break-after: always;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .print-page:last-child {
                page-break-after: auto;
              }
              .print-page img {
                width: 210mm;
                height: auto;
                display: block;
              }
            </style>
          </head>
          <body>
            ${preparedPages.map((imgData, index) => `
              <div class="print-page">
                <img src="${imgData}" alt="Page ${index + 1}" />
              </div>
            `).join('')}
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for images to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // Close window after printing (optional)
          // printWindow.close();
        }, 250);
      };
    } catch (error) {
      console.error('Error preparing print:', error);
      alert('Failed to prepare print. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading delivery note...</div>
      </div>
    );
  }

  if (!deliveryNote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Delivery note not found</div>
      </div>
    );
  }

  const items = deliveryNote.items || [];
  const paginatedItems = paginateDeliveryNoteItems(items, deliveryNote.notes);
  const totalPages = paginatedItems.length;
  
  const entity = deliveryNote.entity;
  const isForeign = entity?.country !== 'Bosnia and Herzegovina';
  const footerColumns = isForeign ? invoiceSettings.foreignFooter : invoiceSettings.domesticFooter;

  // Determine visible columns
  const hasMaterial = items.some((item: any) => item.material);
  const hasRequest = items.some((item: any) => item.request);
  const customColumns = deliveryNote.custom_columns || [];

  // Translate packing type from Serbian to English
  const getPackingTypeLabel = (type: string) => {
    const packingTypeMap: Record<string, string> = {
      "paketi": "Packages",
      "palete": "Pallets",
      "koleta": "Parcels"
    };
    return packingTypeMap[type] || type;
  };

  // Remove "Company: " prefix from delivery address if present
  const formatDeliveryAddress = (address: string) => {
    if (!address) return address;
    return address.startsWith("Company: ") ? address.replace("Company: ", "") : address;
  };

  return (
    <div className={inDialog ? "bg-gray-100 print:p-0 print:bg-white" : "min-h-screen bg-gray-100 p-6 print:p-0 print:bg-white"} ref={deliveryNoteContainerRef}>
      <style>{`
        /* Screen preview styles - A4 dimensions */
        @media screen {
          .delivery-note-container {
            max-width: 240mm !important;
            width: auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: center !important;
            padding: 20px !important;
            overflow-y: auto !important;
            max-height: 90vh !important;
          }
          
          ${inDialog ? `
          .delivery-note-container {
            padding: 0px !important;
            overflow-y: visible !important;
            max-height: none !important;
          }
          ` : ''}
          
          .print-delivery-note-page {
            /* A4 dimensions: 210mm x 297mm */
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            aspect-ratio: 210 / 297 !important;
            background: white !important;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
            margin: 0 auto 20px auto !important;
            padding: 15mm 15mm 10mm 15mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            overflow: visible !important;
            flex-shrink: 0 !important;
          }
          
          .print-delivery-note-page:last-of-type {
            margin-bottom: 0 !important;
          }
          
          .print-delivery-note {
            width: 100% !important;
            min-height: 100% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
          }

          /* Scale delivery note preview typography to 80% */
          .delivery-note-preview-scale .text-xs,
          .delivery-note-preview-scale .print-text-xs {
            font-size: 0.642rem !important;
          }

          .delivery-note-preview-scale .text-sm,
          .delivery-note-preview-scale .print-text-sm {
            font-size: 0.749rem !important;
          }

          .delivery-note-preview-scale .text-base,
          .delivery-note-preview-scale .print-text-base {
            font-size: 0.856rem !important;
          }

          .delivery-note-preview-scale .text-lg,
          .delivery-note-preview-scale .print-text-lg {
            font-size: 0.963rem !important;
          }

          .delivery-note-preview-scale .invoice-logo {
            height: calc(2.75rem * 0.8) !important;
          }

          .invoice-footer-columns {
            width: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            gap: 24px !important;
          }

          .invoice-footer-columns > div {
            flex: 1 1 0 !important;
          }
          
          /* Delivery note items table - screen preview */
          .delivery-note-items-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          
          .delivery-note-items-table th,
          .delivery-note-items-table td {
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
            padding: 0.3rem !important;
          }
          
          .delivery-note-items-table th {
            vertical-align: bottom !important;
          }
          
          .delivery-note-items-table td {
            vertical-align: middle !important;
            border-top: 1px solid rgb(212, 212, 212) !important;
            border-bottom: none !important;
          }
          
          .delivery-note-items-table td:first-child img {
            display: block;
            margin: 0 auto;
          }
          
          /* Add border-bottom only to the last row */
          .delivery-note-items-table tbody tr:last-child td {
            border-bottom: 1px solid rgb(212, 212, 212) !important;
          }
          
          /* Column widths for proper wrapping - screen */
          /* Column 1: Picture */
          .delivery-note-items-table th:nth-child(1),
          .delivery-note-items-table td:nth-child(1) {
            width: 10% !important;
            max-width: 10% !important;
            text-align: center !important;
          }
          
          /* Column 2: Part name */
          .delivery-note-items-table th:nth-child(2),
          .delivery-note-items-table td:nth-child(2) {
            width: 30% !important;
            max-width: 30% !important;
          }
          
          /* Column 3: Part number */
          .delivery-note-items-table th:nth-child(3),
          .delivery-note-items-table td:nth-child(3) {
            width: 17% !important;
            max-width: 17% !important;
          }
          
          /* Column 4: Quantity */
          .delivery-note-items-table th:nth-child(4),
          .delivery-note-items-table td:nth-child(4) {
            width: 12% !important;
            max-width: 12% !important;
            text-align: center !important;
          }
          
          /* Column 5: Weight */
          .delivery-note-items-table th:nth-child(5),
          .delivery-note-items-table td:nth-child(5) {
            width: 10% !important;
            max-width: 10% !important;
            text-align: right !important;
          }
        }
        
        @media print {
          /* Reset body and html for print */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            background: white !important;
            overflow: visible !important;
          }
          
          .delivery-note-container {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            max-width: none !important;
            width: 210mm !important;
            height: 297mm !important;
            box-shadow: none !important;
          }
          
          /* A4 page with no margins */
          @page {
            margin: 0 !important;
            size: A4;
          }
          
          /* White paper page - exact A4 dimensions */
          .print-delivery-note-page {
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
          
          /* Page break before all pages except first */
          .print-delivery-note-page.page-break {
            page-break-before: always !important;
          }
          
          /* No page break after last page */
          .print-delivery-note-page:last-child {
            page-break-after: auto !important;
          }
          
          /* Page break after all pages except last */
          .print-delivery-note-page:not(:last-child) {
            page-break-after: always !important;
          }
          
          .print-delivery-note {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Keep print typography aligned with preview (80% scale) */
          .delivery-note-preview-scale .text-xs,
          .delivery-note-preview-scale .print-text-xs {
            font-size: 0.642rem !important;
          }

          .delivery-note-preview-scale .text-sm,
          .delivery-note-preview-scale .print-text-sm {
            font-size: 0.749rem !important;
          }

          .delivery-note-preview-scale .text-base,
          .delivery-note-preview-scale .print-text-base {
            font-size: 0.856rem !important;
          }

          .delivery-note-preview-scale .text-lg,
          .delivery-note-preview-scale .print-text-lg {
            font-size: 0.963rem !important;
          }

          .delivery-note-preview-scale .invoice-logo {
            height: calc(2.75rem * 0.8) !important;
          }

          .invoice-footer-columns {
            width: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            gap: 24px !important;
            flex-wrap: nowrap !important;
          }

          .invoice-footer-columns > div {
            flex: 1 1 0 !important;
          }
           
           /* Footer positioning for print */
           .invoice-footer-wrapper {
             margin-top: auto !important;
           }
          
          .invoice-header {
            display: flex !important;
            justify-content: space-between !important;
            margin-bottom: 0mm !important;
          }
          
          /* Reduce gap between company header and delivery note header */
          .company-header {
            margin-bottom: 0.3rem !important;
          }
          
          /* Ensure consistent line-height for entity details, delivery note details, and summary sections */
          /* Entity details section (To) */
          .invoice-header > div:first-child,
          .invoice-header > div:first-child p,
          .invoice-header > div:first-child h3,
          .invoice-header > div:first-child p.text-sm,
          .invoice-header > div:first-child p.print-text-sm,
          .invoice-header > div:first-child p.print-text-base,
          .invoice-header > div:first-child p.font-bold,
          .invoice-header > div:first-child p.whitespace-pre-line {
            line-height: 1.4 !important;
          }
          
          /* Add spacing between entity detail lines to match delivery note details */
          .invoice-header > div:first-child p:not(:last-child) {
            margin-bottom: 0.5rem !important;
          }
          
          /* Delivery note details section (Delivery note number, Issue date, etc.) */
          .invoice-header > div:last-child,
          .invoice-header .text-right,
          .invoice-header .text-right p,
          .invoice-header .text-right div,
          .invoice-header .text-right div p,
          .invoice-header .text-right .space-y-1 p,
          .invoice-header .text-right .space-y-2 p {
            line-height: 1.4 !important;
          }
          
           .delivery-note-items-table {
             width: 100% !important;
             border-collapse: collapse !important;
             margin: 0 0 !important;
             table-layout: fixed !important;
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
             color-adjust: exact !important;
           }
           
             .delivery-note-items-table th,
             .delivery-note-items-table td {
               border-left: none !important;
               border-right: none !important;
               padding: 0.3rem !important;
               text-align: left !important;
               word-wrap: break-word !important;
               word-break: break-word !important;
               overflow-wrap: break-word !important;
               white-space: normal !important;
               -webkit-print-color-adjust: exact !important;
               print-color-adjust: exact !important;
               color-adjust: exact !important;
             }
             
             .delivery-note-items-table th {
               vertical-align: bottom !important;
               background-color: transparent !important;
               font-weight: bold !important;
               border-top: none !important;
               border-bottom: none !important;
             }
             
             .delivery-note-items-table thead {
               background-color: transparent !important;
               background: transparent !important;
             }
             
             .delivery-note-items-table thead th {
               background-color: transparent !important;
               background: transparent !important;
               border-top: none !important;
               border-bottom: none !important;
               border-left: none !important;
               border-right: none !important;
               border: none !important;
             }
             
             .delivery-note-items-table td {
               vertical-align: middle !important;
               border-top: 1px solid #6b7280 !important;
               border-bottom: none !important;
               -webkit-print-color-adjust: exact !important;
               print-color-adjust: exact !important;
               color-adjust: exact !important;
             }
             
             .delivery-note-items-table td:first-child img {
               display: block;
               margin: 0 auto;
               -webkit-print-color-adjust: exact !important;
               print-color-adjust: exact !important;
               color-adjust: exact !important;
             }
             
             /* Add border-bottom only to the last row */
             .delivery-note-items-table tbody tr:last-child td {
               border-bottom: 1px solid #6b7280 !important;
               -webkit-print-color-adjust: exact !important;
               print-color-adjust: exact !important;
               color-adjust: exact !important;
             }
             
             /* Column widths for proper wrapping - match screen widths */
             /* Column 1: Picture */
             .delivery-note-items-table th:nth-child(1),
             .delivery-note-items-table td:nth-child(1) {
               width: 10% !important;
               max-width: 10% !important;
               text-align: center !important;
             }
             
             /* Column 2: Part name */
             .delivery-note-items-table th:nth-child(2),
             .delivery-note-items-table td:nth-child(2) {
               width: 30% !important;
               max-width: 30% !important;
             }
             
             /* Column 3: Part number */
             .delivery-note-items-table th:nth-child(3),
             .delivery-note-items-table td:nth-child(3) {
               width: 17% !important;
               max-width: 17% !important;
             }
             
             /* Column 4: Quantity */
             .delivery-note-items-table th:nth-child(4),
             .delivery-note-items-table td:nth-child(4) {
               width: 12% !important;
               max-width: 12% !important;
               text-align: center !important;
             }
             
             /* Column 5: Weight */
             .delivery-note-items-table th:nth-child(5),
             .delivery-note-items-table td:nth-child(5) {
               width: 10% !important;
               max-width: 10% !important;
               text-align: right !important;
             }
             
             /* Preserve all colors, backgrounds, and fonts exactly as shown */
             .print-delivery-note-page,
             .print-delivery-note-page * {
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
        }
      `}</style>

      {/* Action Buttons */}
      {!hideBackButton && (
      <div className="mb-4 flex gap-2 print:hidden">
        <Button variant="outline" onClick={() => navigate('/other-docs')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={generatePDF} disabled={generatingPDF}>
          <FileDown className="w-4 h-4 mr-2" />
          {generatingPDF ? 'Generating PDF...' : 'Download PDF'}
        </Button>
          <Button variant="outline" onClick={handlePrint}>
          Print
        </Button>
      </div>
      )}
      {hideBackButton && (
        <div className="mb-4 flex gap-2 print:hidden">
          <Button onClick={generatePDF} disabled={generatingPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            {generatingPDF ? 'Generating PDF...' : 'Download PDF'}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            Print
          </Button>
        </div>
      )}

      <div className="delivery-note-container">
        {paginatedItems.map((pageItems, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === totalPages - 1;
          
          return (
            <div 
              key={pageIndex} 
              className={`print-delivery-note-page print-delivery-note print:text-black print:bg-white print:min-h-[calc(100vh-1in)] print:flex print:flex-col delivery-note-preview-scale ${pageIndex > 0 ? 'page-break' : ''}`}
              style={{gap: '12px'}}
            >
              {/* Company Header with Delivery Note Title */}
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
                    className="print-invoice-bg h-[30px] flex items-center invoice-title-bg" 
                    style={{
                      backgroundColor: invoiceSettings.primaryColor,
                      position: 'absolute',
                      width: '286px',
                      paddingLeft: '23px',
                      right: '7px',
                      justifyContent: 'left'
                    }}
                  >
                    <span className="text-lg print-text-lg font-medium text-black">Delivery Note</span>
                    {totalPages > 1 && (
                      <span className="text-sm print-text-sm ml-2">(Page {pageIndex + 1} of {totalPages})</span>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Note Header */}
              <div className="invoice-header grid grid-cols-2 gap-6">
                <div>
                  <h3 className="mb-2 print-text-sm text-sm font-normal">To:</h3>
                  <p className="font-bold print-text-base print:font-bold">{entity?.name}</p>
                  {entity?.address && (
                    <p className="text-sm whitespace-pre-line print-text-sm">{entity.address}</p>
                  )}
                  {entity?.city && (
                    <p className="text-sm print-text-sm">{entity.city}</p>
                  )}
                  {entity?.country && (
                    <p className="text-sm print-text-sm">{entity.country}</p>
                  )}
                  {entity?.phone && (
                    <p className="text-sm print-text-sm">{entity.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="space-y-1 print:space-y-2">
                    <p className="print-text-sm"><span className="font-medium">Delivery note number:</span> {deliveryNote.delivery_note_number}</p>
                    <p className="print-text-sm"><span className="font-medium">Issue date:</span> {formatDate(deliveryNote.issue_date)}</p>
                    {(isFirstPage || isLastPage) && (
                      <>
                        <p className="print-text-sm"><span className="font-medium">Total weight:</span> {deliveryNote.total_weight?.toFixed(2) || "0.00"} kg</p>
                        <p className="print-text-sm"><span className="font-medium">Packing:</span> {deliveryNote.packing_number} {getPackingTypeLabel(deliveryNote.packing_type)}</p>
                        <p className="print-text-sm"><span className="font-medium">Delivery address:</span> {formatDeliveryAddress(deliveryNote.delivery_address)}</p>
                        {deliveryNote.carrier && (
                          <p className="print-text-sm"><span className="font-medium">Carrier:</span> {deliveryNote.carrier}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery Note Items */}
              <div className="no-page-break">
                <table className="delivery-note-items-table w-full border-collapse print:border-black">
                  <thead>
                    <tr>
                      <th className="text-center text-sm"></th>
                      <th className="text-left text-sm">Part name</th>
                      <th className="text-left text-sm">Part number</th>
                      <th className="text-center text-sm">Quantity</th>
                      <th className="text-right text-sm">Weight</th>
                      {hasMaterial && <th className="text-left text-sm">Material</th>}
                      {hasRequest && <th className="text-left text-sm">Request</th>}
                      {customColumns.map((col: string) => (
                        <th key={col} className="text-left text-sm">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item: any, itemIndex: number) => {
                      const inventoryItem = inventoryMap[item.inventory_id];
                      const unit = inventoryItem?.unit || item.unit || 'pcs';
                      return (
                        <tr key={itemIndex}>
                          <td className="text-center" style={{ verticalAlign: 'middle', padding: '0.3rem' }}>
                            {inventoryItem?.photo_url ? (
                              <img 
                                src={inventoryItem.photo_url} 
                                alt={item.part_name}
                                style={{ 
                                  height: `${DELIVERY_NOTE_IMAGE_SIZE}px`, 
                                  width: 'auto', 
                                  objectFit: 'contain', 
                                  maxWidth: '100%', 
                                  margin: '0 auto', 
                                  display: 'block' 
                                }}
                              />
                            ) : (
                              <div style={{ height: `${DELIVERY_NOTE_IMAGE_SIZE}px`, width: `${DELIVERY_NOTE_IMAGE_SIZE}px`, display: 'block', margin: '0 auto' }}></div>
                            )}
                          </td>
                          <td className="text-left text-sm" style={{ verticalAlign: 'middle' }}>{item.part_name}</td>
                          <td className="text-left text-sm" style={{ verticalAlign: 'middle' }}>{item.part_number || '-'}</td>
                          <td className="text-center text-sm" style={{ verticalAlign: 'middle' }}>{item.quantity} {unit}</td>
                          <td className="text-right text-sm" style={{ verticalAlign: 'middle' }}>{item.weight?.toFixed(2) || '0.00'} kg</td>
                          {hasMaterial && <td className="text-left text-sm" style={{ verticalAlign: 'middle' }}>{item.material || '-'}</td>}
                          {hasRequest && <td className="text-left text-sm" style={{ verticalAlign: 'middle' }}>{item.request || '-'}</td>}
                          {customColumns.map((col: string) => (
                            <td key={col} className="text-left text-sm" style={{ verticalAlign: 'middle' }}>
                              {item.custom_fields?.[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Notes - Only on last page */}
              {isLastPage && deliveryNote.notes && (
                <div className="no-page-break print:mt-6">
                  <h3 className="font-semibold mb-2 print-text-base">Notes</h3>
                  <p className="text-sm whitespace-pre-line print-text-sm">{deliveryNote.notes}</p>
                </div>
              )}

              {/* Content wrapper that grows to push footer down */}
              <div className="flex-1" style={{minHeight: 0}}></div>

              {/* Foreign Customer Note - Above footer line */}
              {isLastPage && isForeign && invoiceSettings.foreignNote && invoiceSettings.foreignNote.trim() && (
                <div className="invoice-footer-wrapper mt-auto" style={{ marginBottom: 0 }}>
                  <p 
                    className="print-text-xs text-xs leading-relaxed" 
                    style={{ 
                      color: '#000000',
                      textAlign: 'justify',
                      marginBottom: 0
                    }}
                  >
                    {invoiceSettings.foreignNote.replace(/\{invoice_number\}/g, deliveryNote.delivery_note_number || '')}
                  </p>
                </div>
              )}

              {/* Footer with separator line - Always at bottom, show on all pages */}
              {(invoiceSettings.foreignFooter.some((col: string) => col.trim()) || invoiceSettings.domesticFooter.some((col: string) => col.trim())) && (
                <div className="invoice-footer-wrapper mt-auto">
                  <Separator className="print:border-black print:border-t print:mt-4 print:mb-2 border-t border-gray-600 mt-4 mb-2" />
                  <div className="text-xs print-text-xs flex justify-between gap-6 invoice-footer-columns" style={{ color: '#000000' }}>
                    {isForeign ? (
                      <>
                        <div className="whitespace-pre-line text-left flex-1 min-w-0">{invoiceSettings.foreignFooter[0]}</div>
                        <div className="whitespace-pre-line text-center flex-1 min-w-0">{invoiceSettings.foreignFooter[1]}</div>
                        <div className="whitespace-pre-line text-right flex-1 min-w-0">{invoiceSettings.foreignFooter[2]}</div>
                      </>
                    ) : (
                      <>
                        <div className="whitespace-pre-line text-left flex-1 min-w-0">{invoiceSettings.domesticFooter[0]}</div>
                        <div className="whitespace-pre-line text-center flex-1 min-w-0">{invoiceSettings.domesticFooter[1]}</div>
                        <div className="whitespace-pre-line text-right flex-1 min-w-0">{invoiceSettings.domesticFooter[2]}</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

