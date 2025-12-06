import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate } from "@/lib/dateUtils";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  invoice_id: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  customers: {
    name: string;
  };
  invoice_items: InvoiceItem[];
}

interface InventoryItem {
  id: string;
  name: string;
  part_number: string | null;
  photo_url: string | null;
  weight: number | null;
  category: string;
}

interface PackageInfo {
  packageCount: number;
  piecesPerPackage: number[];
}

export default function Labels() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [packageInfo, setPackageInfo] = useState<Record<string, PackageInfo>>({});
  const [savedPackageInfo, setSavedPackageInfo] = useState<Record<string, Record<string, PackageInfo>>>({});

  useEffect(() => {
    fetchInvoices();
    fetchInventoryItems();
  }, []);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        issue_date,
        customers!inner(name),
        invoice_items!fk_invoice_items_invoice(*)
      `)
      .order('created_at', { ascending: false });
    
    if (data) {
      setInvoices(data as Invoice[]);
    }
  };

  const fetchInventoryItems = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('id, name, part_number, photo_url, weight, category');
    
    if (data) {
      setInventoryItems(data as InventoryItem[]);
    }
  };

  const generateLabels = (invoice: Invoice) => {
    const labels = [];
    
    invoice.invoice_items.forEach(item => {
      const inventoryItem = inventoryItems.find(inv => inv.name === item.description);
      const weightPerPiece = inventoryItem?.weight || 0;
      const itemKey = `${item.id}-${item.description}`;
      const pkgInfo = packageInfo[itemKey] || { packageCount: 1, piecesPerPackage: [item.quantity] };
      
      for (let i = 0; i < pkgInfo.packageCount; i++) {
        const piecesInThisPackage = pkgInfo.piecesPerPackage[i] || 1;
        const packageWeight = weightPerPiece * piecesInThisPackage;
        
        labels.push({
        ...item,
        inventoryItem,
        weightPerPiece,
          totalWeight: packageWeight,
          quantity: piecesInThisPackage,
          packageNumber: i + 1,
          totalPackages: pkgInfo.packageCount,
        invoice
        });
      }
    });
    
    return labels;
  };

  const adjustTextSize = (element: HTMLElement, maxWidth: number, maxHeight: number) => {
    if (!element) return;
    
    const text = element.textContent || '';
    if (!text.trim()) return;
    
    // Reset transform first
    element.style.transform = 'scale(1)';
    
    let scale = 1;
    const minScale = 0.3;
    
    // Check if text overflows
    while (scale > minScale) {
      element.style.transform = `scale(${scale})`;
      const rect = element.getBoundingClientRect();
      
      if (rect.width <= maxWidth && rect.height <= maxHeight) {
        break;
      }
      
      scale -= 0.05;
    }
    
    element.style.transform = `scale(${Math.max(scale, minScale)})`;
  };

  const adjustAllTextSizes = () => {
    setTimeout(() => {
      const labels = document.querySelectorAll('.label');
      labels.forEach(label => {
        const title = label.querySelector('.label-title') as HTMLElement;
        const subtitle = label.querySelector('.label-subtitle') as HTMLElement;
        
        if (title) {
          // Get the actual container dimensions, accounting for photo space
          const container = label.querySelector('.label-text-container') as HTMLElement;
          if (container) {
            const containerRect = container.getBoundingClientRect();
            // Reserve space for photo (1.5in) and subtitle, use remaining width
            const availableWidth = containerRect.width - 20; // 20px margin
            const availableHeight = containerRect.height * 0.4; // 40% for title (2 lines max)
            adjustTextSize(title, availableWidth, availableHeight);
          }
        }
        
        if (subtitle) {
          const container = label.querySelector('.label-text-container') as HTMLElement;
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const availableWidth = containerRect.width - 20; // 20px margin
            const availableHeight = containerRect.height * 0.2; // 20% for subtitle (1 line)
            adjustTextSize(subtitle, availableWidth, availableHeight);
          }
        }
      });
    }, 200);
  };

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDialogOpen(true);
    
    // Load saved package info for this invoice, or initialize with defaults
    const invoiceKey = invoice.id;
    const savedInfo = savedPackageInfo[invoiceKey];
    
    if (savedInfo) {
      setPackageInfo(savedInfo);
    } else {
      // Initialize package info for all items
      const initialPackageInfo: Record<string, PackageInfo> = {};
      invoice.invoice_items.forEach(item => {
        const itemKey = `${item.id}-${item.description}`;
        initialPackageInfo[itemKey] = {
          packageCount: 1,
          piecesPerPackage: [item.quantity]
        };
      });
      setPackageInfo(initialPackageInfo);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open && selectedInvoice) {
      // Save package info when dialog closes
      const invoiceKey = selectedInvoice.id;
      setSavedPackageInfo(prev => ({
        ...prev,
        [invoiceKey]: packageInfo
      }));
    }
    setIsDialogOpen(open);
  };

  const updatePackageCount = (itemKey: string, count: number, totalQuantity: number) => {
    // Don't allow more packages than total pieces
    const maxPackages = Math.min(count, totalQuantity);
    
    // Calculate equal distribution
    const basePiecesPerPackage = Math.floor(totalQuantity / maxPackages);
    const remainder = totalQuantity % maxPackages;
    
    const newPiecesPerPackage = [];
    for (let i = 0; i < maxPackages; i++) {
      // First 'remainder' packages get one extra piece
      const pieces = basePiecesPerPackage + (i < remainder ? 1 : 0);
      newPiecesPerPackage.push(pieces);
    }
    
    setPackageInfo(prev => ({
      ...prev,
      [itemKey]: {
        packageCount: maxPackages,
        piecesPerPackage: newPiecesPerPackage
      }
    }));
  };

  const updatePiecesPerPackage = (itemKey: string, packageIndex: number, pieces: number, totalQuantity: number) => {
    setPackageInfo(prev => {
      const current = prev[itemKey] || { packageCount: 1, piecesPerPackage: [1] };
      const newPiecesPerPackage = [...current.piecesPerPackage];
      
      // Set the new value directly (allow any value)
      newPiecesPerPackage[packageIndex] = Math.max(1, pieces);
      
      // Calculate current total pieces
      const currentTotal = newPiecesPerPackage.reduce((sum, p) => sum + p, 0);
      const remainingPieces = totalQuantity - currentTotal;
      
      // Distribute remaining pieces to maintain total
      if (remainingPieces !== 0) {
        if (packageIndex < newPiecesPerPackage.length - 1) {
          // Adjust next package
          const nextPackageIndex = packageIndex + 1;
          const currentNextPackage = newPiecesPerPackage[nextPackageIndex] || 0;
          const newNextPackageValue = Math.max(1, currentNextPackage + remainingPieces);
          newPiecesPerPackage[nextPackageIndex] = newNextPackageValue;
        } else {
          // If it's the last package, adjust the first package
          const firstPackageIndex = 0;
          const currentFirstPackage = newPiecesPerPackage[firstPackageIndex] || 0;
          const newFirstPackageValue = Math.max(1, currentFirstPackage + remainingPieces);
          newPiecesPerPackage[firstPackageIndex] = newFirstPackageValue;
        }
      }
      
      return {
        ...prev,
        [itemKey]: {
          ...current,
          piecesPerPackage: newPiecesPerPackage
        }
      };
    });
  };

  useEffect(() => {
    if (isDialogOpen && selectedInvoice) {
      adjustAllTextSizes();
    }
  }, [isDialogOpen, selectedInvoice]);

  const labels = selectedInvoice ? generateLabels(selectedInvoice) : [];
  
  const openLabelsInNewTab = () => {
    if (!selectedInvoice) return;
    
    const labels = generateLabels(selectedInvoice);
  const labelsPerPage = 12;
  const paginatedLabels = [];
  for (let i = 0; i < labels.length; i += labelsPerPage) {
    paginatedLabels.push(labels.slice(i, i + labelsPerPage));
  }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Labels - Invoice ${selectedInvoice.invoice_number}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300&display=swap" rel="stylesheet" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <style>
                @media print {
                  @page {
                    margin: 0 !important;
                    size: A4 landscape;
                  }
                  
                  html, body {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  
                  /* Hide everything except the labels container so there is no blank first page */
                  body > *:not(#labelsContainer) {
                    display: none !important;
                  }
                  
                  .label-page {
                    width: 297mm !important;
                    height: 210mm !important;
                    page-break-after: always !important;
                    page-break-inside: avoid !important;
                    display: grid !important;
                    grid-template-columns: repeat(4, 1fr) !important;
                    grid-template-rows: repeat(3, 1fr) !important;
                    gap: 0.08in !important;
                    padding: 0.08in !important;
                    margin: 0 !important;
                    box-sizing: border-box !important;
                    position: relative !important;
                    background: white !important;
                  }
                  
                  .label-page:last-child {
                    page-break-after: auto !important;
                  }
                  
                  .label-grid {
                    display: contents !important;
                  }
                  
                  .label-empty {
                    visibility: hidden !important;
                  }
                  
                  .label {
                    border: 1px solid #d3d3d3 !important;
                    border-radius: 0.1in !important;
                    padding: 0.05in !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: flex-start !important;
                    gap: 0.05in !important;
                    width: 100% !important;
                    height: 100% !important;
                    min-width: 0 !important;
                    min-height: 0 !important;
                    font-family: 'Lexend', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif !important;
                    font-size: 9pt !important;
                    background: white !important;
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                    word-wrap: break-word !important;
                    position: relative !important;
                  }
                  
                  .label-photo {
                    width: 2in !important;
                    height: auto !important;
                    max-height: 1.5in !important;
                    object-fit: contain !important;
                    border: 1px solid #ffffff !important;
                    border-radius: 0.05in !important;
                    position: absolute !important;
                    bottom: 0.25in !important;
                    left: 0.05in !important;
                  }
                  
                  .label-text-container {
                    flex: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-start !important;
                    height: 1.5in !important;
                    min-width: 0 !important;
                    padding-bottom: 1.6in !important;
                  }
                  
                  .label-info-right {
                    position: absolute !important;
                    bottom: 0.5in !important;
                    right: 0.05in !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: flex-end !important;
                    text-align: right !important;
                    max-width: 1.5in !important;
                    border-radius: 0.05in !important;
                    padding: 0.05in !important;
                  }
                  
                  .label-title {
                    font-size: 16pt !important;
                    font-weight: normal !important;
                    margin-bottom: 0.06in !important;
                    line-height: 1.1 !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    display: -webkit-box !important;
                    -webkit-line-clamp: 2 !important;
                    -webkit-box-orient: vertical !important;
                    text-align: left !important;
                    word-wrap: break-word !important;
                    max-width: 100% !important;
                    white-space: normal !important;
                    transform-origin: left top !important;
                    transform: scale(1) !important;
                    transition: transform 0.1s ease !important;
                  }
                  
                  .label-subtitle {
                    font-size: 16pt !important;
                    font-weight: normal !important;
                    color: #000 !important;
                    margin-bottom: 0.02in !important;
                    line-height: 1.1 !important;
                    overflow: visible !important;
                    text-overflow: unset !important;
                    white-space: normal !important;
                    text-align: left !important;
                    max-width: 100% !important;
                    word-wrap: break-word !important;
                    transform-origin: left top !important;
                    transform: scale(1) !important;
                    transition: transform 0.1s ease !important;
                  }
                  
                  .label .label-quantity {
                    font-size: 16pt !important;
                    font-weight: normal !important;
                    color: #000 !important;
                    margin: 0.02in 0 !important;
                    flex-shrink: 0 !important;
                    border-radius: 0.05in !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    text-align: center !important;
                    width: auto !important;
                    min-width: fit-content !important;
                      padding: 0.05in !important;
                  }
                  
                  .label-quantity-unit {
                    font-size: 7pt !important;
                    color: #666 !important;
                    font-weight: normal !important;
                    margin-top: -4px !important;
                  }
                  
                  .label-footer {
                    font-size: 7pt !important;
                    color: #666 !important;
                    line-height: 1.1 !important;
                    position: absolute !important;
                    left: 50% !important;
                    bottom: 0.03in !important;
                    transform: translateX(-50%) !important;
                    display: flex !important;
                    gap: 0.08in !important;
                    white-space: nowrap !important;
                    text-align: center !important;
                    text-shadow: 
                      2px 2px 3px rgba(255, 255, 255, 1),
                      2px -2px 3px rgba(255, 255, 255, 1),
                      2px 2px 3px rgba(255, 255, 255, 1),
                      -2px 2px 3px rgba(255, 255, 255, 1) !important;
                  }
                }
    
    @media screen {
      .label-page {
        width: 297mm;
        height: 210mm;
        page-break-after: always;
        page-break-inside: avoid;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 0.08in;
        padding: 0.08in;
        margin: 0 auto 20px;
        box-sizing: border-box;
        position: relative;
        background: white;
        border: 1px solid #ccc;
      }
     
      .label-page:last-child {
        page-break-after: auto;
      }
      
      .label-grid {
        display: contents;
      }
      
      .label-empty {
        visibility: hidden;
      }
      
      .label {
        border: 1px solid #d3d3d3;
        border-radius: 0.1in;
        padding: 0.05in;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.05in;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        font-family: 'Lexend', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
        font-size: 9pt;
        background: white;
        box-sizing: border-box;
        overflow: hidden;
        word-wrap: break-word;
        position: relative;
      }
      
      .label-photo {
        width: 2in;
        height: auto;
        max-height: 1.5in;
        object-fit: contain;
        border: 1px solid #ffffff;
        border-radius: 0.05in;
        position: absolute;
        bottom: 0.25in;
        left: 0.05in;
      }
      
      .label-text-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        height: 1.5in;
        min-width: 0;
        padding-bottom: 1.6in;
      }
      
      .label-info-right {
        position: absolute;
        bottom: 0.5in;
        right: 0.05in;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        text-align: right;
        max-width: 1.5in;
        border-radius: 0.05in;
        padding: 0.05in;
      }
      
      .label-title {
        font-size: 16pt;
        font-weight: normal;
        margin-bottom: 0.06in;
        line-height: 1.1;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        text-align: left;
        word-wrap: break-word;
        max-width: 100%;
        white-space: normal;
        transform-origin: left top;
        transform: scale(1);
        transition: transform 0.1s ease;
      }
      
      .label-subtitle {
        font-size: 16pt;
        font-weight: normal;
        color: #000;
        margin-bottom: 0.02in;
        line-height: 1.1;
        overflow: visible;
        text-overflow: unset;
        white-space: normal;
        text-align: left;
        max-width: 100%;
        word-wrap: break-word;
        transform-origin: left top;
        transform: scale(1);
        transition: transform 0.1s ease;
      }
      
      .label .label-quantity {
        font-size: 16pt;
        font-weight: normal;
        color: #000;
        margin: 0.02in 0;
        flex-shrink: 0;
        border-radius: 0.05in;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        width: auto;
        min-width: fit-content;
        padding: 0.05in;
      }
      
      .label-quantity-unit {
        font-size: 7pt;
        color: #666;
        font-weight: normal;
        margin-top: -4px;
      }
      
      .label-footer {
        font-size: 7pt;
        color: #666;
        line-height: 1.1;
        position: absolute;
        left: 50%;
        bottom: 0.03in;
        transform: translateX(-50%);
        display: flex;
        gap: 0.08in;
        white-space: nowrap;
        text-align: center;
        text-shadow: 
          2px 2px 3px rgba(255, 255, 255, 1),
          2px -2px 3px rgba(255, 255, 255, 1),
          2px 2px 3px rgba(255, 255, 255, 1),
          -2px 2px 3px rgba(255, 255, 255, 1);
      }
      
      body {
        background: #f5f5f5;
        padding: 20px;
      }
      
      .controls {
        position: sticky;
        top: 0;
        z-index: 1000;
        background: white;
        padding: 16px;
        margin: -20px -20px 20px -20px;
        border-bottom: 1px solid #e5e5e5;
        display: flex;
        gap: 8px;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .btn {
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      
      .btn:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }
      
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .btn-primary {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }
      
      .btn-primary:hover {
        background: #2563eb;
        border-color: #2563eb;
      }
      
      .btn-icon {
        padding: 8px;
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2000;
        display: none;
        align-items: center;
        justify-content: center;
      }
      
      .dialog-overlay.open {
        display: flex;
      }
      
      .dialog-content {
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }
      
      .dialog-header {
        margin-bottom: 16px;
      }
      
      .dialog-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      
      .dialog-description {
        font-size: 14px;
        color: #6b7280;
      }
      
      .dialog-body {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      
      .setting-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .setting-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .setting-label {
        font-size: 14px;
        font-weight: 500;
      }
      
      .setting-value {
        font-size: 14px;
        color: #6b7280;
      }
      
      .slider {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: #e5e7eb;
        outline: none;
        -webkit-appearance: none;
      }
      
      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
      }
      
      .slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        border: none;
      }
      
      .setting-help {
        font-size: 12px;
        color: #6b7280;
      }
      
      .dpi-buttons {
        display: flex;
        gap: 8px;
      }
      
      .dpi-btn {
        flex: 1;
        padding: 6px 12px;
        font-size: 12px;
      }
      
      .dpi-btn.active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }
      
      .settings-summary {
        padding: 12px;
        background: #f9fafb;
        border-radius: 6px;
        font-size: 12px;
      }
      
      .settings-summary-title {
        font-weight: 500;
        margin-bottom: 4px;
      }
      
      .settings-summary-text {
        color: #6b7280;
        margin-top: 4px;
      }
      
      .print:hidden {
        display: none;
      }
      
      @media print {
        .controls, .dialog-overlay {
          display: none !important;
        }
      }
    }
  </style>
</head>
<body>
  <div class="controls print:hidden">
    <button class="btn btn-primary" id="downloadBtn" onclick="generatePDF()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span id="downloadText">Download Labels</span>
    </button>
    <button class="btn btn-primary" id="printBtn" onclick="printLabels()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      <span id="printText">Print Labels</span>
    </button>
    <button class="btn btn-icon" onclick="toggleSettings()" title="PDF Settings">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
      </svg>
    </button>
  </div>
  
  <div class="dialog-overlay" id="settingsDialog" onclick="if(event.target===this) toggleSettings()">
    <div class="dialog-content" onclick="event.stopPropagation()">
      <div class="dialog-header">
        <div class="dialog-title">PDF Quality Settings</div>
        <div class="dialog-description">
          Adjust the quality and resolution of generated PDFs. Higher values = better quality but larger file size.
        </div>
      </div>
      <div class="dialog-body">
        <div class="setting-group">
          <div class="setting-header">
            <label class="setting-label" for="scale">Resolution Scale</label>
            <span class="setting-value" id="scaleValue">4x</span>
          </div>
          <input type="range" id="scale" class="slider" min="1" max="5" step="0.5" value="4" oninput="updateScale(this.value)">
          <p class="setting-help">Higher scale improves quality but increases generation time. Recommended: 3-4</p>
        </div>
        
        <div class="setting-group">
          <div class="setting-header">
            <label class="setting-label" for="quality">Image Quality</label>
            <span class="setting-value" id="qualityValue">98%</span>
          </div>
          <input type="range" id="quality" class="slider" min="0.5" max="1" step="0.01" value="0.98" oninput="updateQuality(this.value)">
          <p class="setting-help">Image compression quality. Higher = better quality, larger file size.</p>
        </div>
        
        <div class="setting-group">
          <div class="setting-header">
            <label class="setting-label">DPI (Dots Per Inch)</label>
            <span class="setting-value" id="dpiValue">300 DPI</span>
          </div>
          <div class="dpi-buttons">
            <button class="btn dpi-btn" onclick="setDPI(150)">Standard (150)</button>
            <button class="btn dpi-btn active" onclick="setDPI(300)">High (300)</button>
            <button class="btn dpi-btn" onclick="setDPI(600)">Ultra (600)</button>
          </div>
          <p class="setting-help">Higher DPI = sharper text and images. 300 DPI is recommended for professional documents.</p>
        </div>
        
        <div class="settings-summary">
          <p class="settings-summary-title">Current Settings:</p>
          <p class="settings-summary-text" id="settingsSummary">Scale: 4x | Quality: 98% | DPI: 300</p>
          <p class="settings-summary-text" id="fileSizeEstimate">Estimated file size: ~11.8MB per page</p>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
        <button class="btn" onclick="toggleSettings()">Close</button>
      </div>
    </div>
  </div>
  
  <div id="labelsContainer">
  ${paginatedLabels.map((pageLabels, pageIndex) => {
                const gridCells = Array.from({ length: labelsPerPage }, (_, index) => {
                  return pageLabels[index] || null;
                });
                
    return `
      <div class="label-page">
        <div class="label-grid">
          ${gridCells.map((label, index) => {
                        if (!label) {
              return `<div class="label label-empty"></div>`;
            }
            
            return `
              <div class="label">
                <div class="label-text-container">
                  <div class="label-title">${label.description}</div>
                  ${label.inventoryItem?.part_number ? `<div class="label-subtitle">${label.inventoryItem.part_number}</div>` : ''}
                            </div>
                            
                ${label.inventoryItem?.photo_url ? `<img src="${label.inventoryItem.photo_url}" alt="${label.description}" class="label-photo" />` : ''}
                
                <div class="label-info-right">
                  <div class="label-quantity">
                                <div>Qty:</div>
                    <div style="font-size: 16pt; font-weight: normal">${label.quantity}</div>
                    <div class="label-quantity-unit">${label.quantity === 1 ? 'piece' : 'pieces'}</div>
                    ${label.totalPackages > 1 ? `<div class="label-quantity-unit" style="font-size: 6pt; margin-top: 4px">pkg ${label.packageNumber}/${label.totalPackages}</div>` : ''}
                                  </div>
                              </div>

                <div class="label-footer">
                  <span>Date: ${formatDate(label.invoice.issue_date)}</span>
                  <span>Weight: ${label.weightPerPiece.toFixed(2)} kg/pc</span>
                  <span>Total: ${label.totalWeight.toFixed(2)} kg</span>
                              </div>
                            </div>
            `;
          }).join('')}
                          </div>
                    </div>
    `;
  }).join('')}
            </div>

  <script>
    let pdfSettings = {
      scale: 4,
      quality: 0.98,
      dpi: 300
    };
    
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('pdfSettings');
    if (savedSettings) {
      try {
        pdfSettings = JSON.parse(savedSettings);
        updateUIFromSettings();
      } catch (e) {
        console.error('Error loading PDF settings:', e);
      }
    }
    
    function updateUIFromSettings() {
      document.getElementById('scale').value = pdfSettings.scale;
      document.getElementById('scaleValue').textContent = pdfSettings.scale + 'x';
      document.getElementById('quality').value = pdfSettings.quality;
      document.getElementById('qualityValue').textContent = Math.round(pdfSettings.quality * 100) + '%';
      document.getElementById('dpiValue').textContent = pdfSettings.dpi + ' DPI';
      
      // Update DPI buttons
      document.querySelectorAll('.dpi-btn').forEach(btn => {
        btn.classList.remove('active');
        const match = btn.textContent.match(/\\\\d+/);
        if (match) {
          const dpi = parseInt(match[0]);
          if (dpi === pdfSettings.dpi) {
            btn.classList.add('active');
          }
        }
      });
      
      updateSummary();
    }
    
    function updateScale(value) {
      pdfSettings.scale = parseFloat(value);
      document.getElementById('scaleValue').textContent = pdfSettings.scale + 'x';
      saveSettings();
      updateSummary();
    }
    
    function updateQuality(value) {
      pdfSettings.quality = parseFloat(value);
      document.getElementById('qualityValue').textContent = Math.round(pdfSettings.quality * 100) + '%';
      saveSettings();
      updateSummary();
    }
    
    function setDPI(dpi) {
      pdfSettings.dpi = dpi;
      document.getElementById('dpiValue').textContent = dpi + ' DPI';
      document.querySelectorAll('.dpi-btn').forEach(btn => {
        btn.classList.remove('active');
        const match = btn.textContent.match(/\\\\d+/);
        if (match) {
          const btnDPI = parseInt(match[0]);
          if (btnDPI === dpi) {
            btn.classList.add('active');
          }
        }
      });
      saveSettings();
      updateSummary();
    }
    
    function saveSettings() {
      localStorage.setItem('pdfSettings', JSON.stringify(pdfSettings));
    }
    
    function updateSummary() {
      const summary = \`Scale: \${pdfSettings.scale}x | Quality: \${Math.round(pdfSettings.quality * 100)}% | DPI: \${pdfSettings.dpi}\`;
      document.getElementById('settingsSummary').textContent = summary;
      const fileSize = (pdfSettings.scale * pdfSettings.quality * pdfSettings.dpi / 100).toFixed(1);
      document.getElementById('fileSizeEstimate').textContent = \`Estimated file size: ~\${fileSize}MB per page\`;
    }
    
    function toggleSettings() {
      const dialog = document.getElementById('settingsDialog');
      dialog.classList.toggle('open');
    }
    
    async function generatePDF() {
      const btn = document.getElementById('downloadBtn');
      const text = document.getElementById('downloadText');
      const originalText = text.textContent;
      
      btn.disabled = true;
      text.textContent = 'Generating PDF...';
      
      try {
        const { jsPDF } = window.jspdf;
        const container = document.getElementById('labelsContainer');
        const pages = container.querySelectorAll('.label-page');
        
        if (!pages || pages.length === 0) {
          alert('No labels to generate');
          return;
        }
        
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });
        
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          
          // Create a temporary container for this page
          const tempContainer = document.createElement('div');
          tempContainer.style.position = 'absolute';
          tempContainer.style.left = '-9999px';
          tempContainer.style.width = '297mm';
          tempContainer.style.height = '210mm';
          tempContainer.style.backgroundColor = 'white';
          tempContainer.style.fontSize = '16px';
          tempContainer.appendChild(page.cloneNode(true));
          document.body.appendChild(tempContainer);
          
          // Calculate dimensions
          const mmToPixels = (mm) => (mm * 96) / 25.4;
          const baseWidthPx = mmToPixels(297);
          const baseHeightPx = mmToPixels(210);
          
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
            removeContainer: false
          });
          
          document.body.removeChild(tempContainer);
          
          const imgData = canvas.toDataURL('image/png', pdfSettings.quality);
          
          if (i > 0) {
            pdf.addPage();
          }
          
          // Calculate dimensions to fit A4 landscape exactly (297mm x 210mm)
          const imgWidth = 297;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Ensure height doesn't exceed A4 height
          if (imgHeight > 210) {
            const adjustedWidth = (canvas.width * 210) / canvas.height;
            pdf.addImage(imgData, 'PNG', 0, 0, adjustedWidth, 210);
          } else {
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          }
        }
        
        pdf.save('Labels-Invoice-${selectedInvoice.invoice_number}.pdf');
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
      } finally {
        btn.disabled = false;
        text.textContent = originalText;
      }
    }
    
    function printLabels() {
      // Use the existing @media print styles for .label-page in this document
      // This prints only the A4 pages that contain labels, with no extra blank page
      window.print();
    }
    
    // Initialize UI
    updateUIFromSettings();
  </script>
</body>
</html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  return (
    <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Labels</h1>
          <p className="text-muted-foreground">
            Generate printable labels for invoice items
          </p>
                  </div>
                          </div>
                          
      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow 
                  key={invoice.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleInvoiceClick(invoice)}
                >
                  <TableCell className="font-medium">
                    <button className="text-primary hover:underline text-left">
                      {invoice.invoice_number}
                    </button>
                  </TableCell>
                  <TableCell>{invoice.customers.name}</TableCell>
                  <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {invoice.invoice_items.length} items
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(
                      invoice.invoice_items.reduce((sum, item) => sum + item.total, 0),
                      'EUR'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInvoiceClick(invoice);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Labels
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Labels Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="!max-w-[240mm] !w-auto max-h-[90vh] overflow-y-auto print:!max-w-none print:!w-full print:!h-full print:!max-h-none print:!p-0 print:!m-0 print:!shadow-none print:!border-none print:!rounded-none">
          <DialogHeader>
            <DialogTitle>
              Labels for Invoice {selectedInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              Generate printable labels for {selectedInvoice?.customers.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Package Configuration */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Package Configuration</h3>
              {selectedInvoice?.invoice_items.map((item) => {
                const itemKey = `${item.id}-${item.description}`;
                const pkgInfo = packageInfo[itemKey] || { packageCount: 1, piecesPerPackage: [item.quantity] };
                
                return (
                  <div key={itemKey} className="border rounded-lg p-3 space-y-2">
                    <div className="font-medium">{item.description}</div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm">Packages:</label>
                        <input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={pkgInfo.packageCount}
                          onChange={(e) => updatePackageCount(itemKey, parseInt(e.target.value) || 1, item.quantity)}
                          className="w-16 px-2 py-1 border rounded text-sm"
                        />
                                </div>
                      <div className="text-sm text-muted-foreground">
                        Total: {item.quantity} pieces
                            </div>
                            </div>
                    
                    {pkgInfo.packageCount > 1 && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Pieces per package:</div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: pkgInfo.packageCount }, (_, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <label className="text-xs">Pkg {i + 1}:</label>
                              <input
                                type="number"
                                min="1"
                                value={pkgInfo.piecesPerPackage[i] || 1}
                                onChange={(e) => updatePiecesPerPackage(itemKey, i, parseInt(e.target.value) || 1, item.quantity)}
                                className="w-12 px-1 py-1 border rounded text-xs"
                              />
                          </div>
                          ))}
                        </div>
                      </div>
                    )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {labels.length} label{labels.length !== 1 ? 's' : ''} will be generated
                </div>
              <Button onClick={openLabelsInNewTab}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Generate Labels
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}