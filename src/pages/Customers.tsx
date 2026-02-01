import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, Globe, MapPin, Phone, Plus, Trash2, FileText, Filter, X } from "lucide-react";
import jsPDF from 'jspdf';
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CountryAutocomplete } from "@/components/CountryAutocomplete";
import { countryToCurrency } from "@/lib/currencyUtils";
import { formatDate, formatDateForInput } from "@/lib/dateUtils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/NumericInput";

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "On Hold":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    case "Inactive":
      return "bg-gray-500/10 text-gray-700 border-gray-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

export default function Customers() {
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    industry: '',
    country: '',
    currency: 'EUR',
    webpage: '',
    vatNumber: '',
    notes: '',
    declarationNumbers: '',
    dueDate: '',
    dapAddress: '',
    fcoAddress: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  // Column header filters
  const [countryFilter, setCountryFilter] = useState({ search: "", selected: "all" });
  const [isCountryFilterOpen, setIsCountryFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    const { data } = await supabase.from('company_info').select('*').single();
    if (data) {
      setCompanyInfo(data);
    }
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*');
    if (data) {
      const formattedCustomers = data.map(customer => ({
        ...customer,
        contactPerson: customer.contact_person || customer.name,
        industry: customer.industry || "General",
        status: "Active", // Placeholder
        totalOrders: 0, // Would calculate from invoices
        totalValue: 0, // Would calculate from invoices
        lastOrderDate: formatDateForInput(new Date()),
        paymentTerms: "Net 30", // Placeholder
        notes: "", // Placeholder
        webpage: customer.webpage || "",
        declaration_numbers: customer.declaration_numbers || []
      }));
      setCustomers(formattedCustomers);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        console.error('Delete error:', error);
        toast({
          title: "Error",
          description: `Failed to delete customer: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
      toast({
        title: "Customer Deleted",
        description: "The customer has been successfully deleted.",
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the customer.",
        variant: "destructive"
      });
    }
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive"
      });
      return;
    }

    const declarationNumbersArray = newCustomer.declarationNumbers
      .split(',')
      .map(num => num.trim())
      .filter(num => num.length > 0);

    const { data, error } = await supabase
      .from('customers')
      .insert([{
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        address: newCustomer.address,
        city: newCustomer.city,
        country: newCustomer.country,
        currency: newCustomer.currency,
        contact_person: newCustomer.contactPerson,
        industry: newCustomer.industry,
        webpage: newCustomer.webpage,
        vat_number: newCustomer.vatNumber,
        payment_terms: newCustomer.dueDate ? parseInt(newCustomer.dueDate) : null,
        declaration_numbers: declarationNumbersArray.length > 0 ? declarationNumbersArray : null,
        dap_address: newCustomer.dapAddress || null,
        fco_address: newCustomer.fcoAddress || null
      }])
      .select();

    if (error) {
      console.error('Save customer error:', error);
      toast({
        title: "Error",
        description: `Failed to save customer: ${error.message}`,
        variant: "destructive"
      });
    } else {
      await fetchCustomers();
      setIsAddCustomerOpen(false);
      setNewCustomer({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        industry: '',
        country: '',
        currency: 'EUR',
        webpage: '',
        vatNumber: '',
        notes: '',
        declarationNumbers: '',
        dueDate: '',
        dapAddress: '',
        fcoAddress: ''
      });
      toast({
        title: "Success",
        description: "Customer saved successfully"
      });
    }
  };

  const handleCustomerClick = (customer: any) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(true);
  };

  const handleEditCustomer = () => {
    setNewCustomer({
      name: selectedCustomer.name,
      contactPerson: selectedCustomer.contactPerson || '',
      email: selectedCustomer.email || '',
      phone: selectedCustomer.phone || '',
      address: selectedCustomer.address || '',
      city: selectedCustomer.city || '',
      industry: selectedCustomer.industry || '',
      country: selectedCustomer.country || '',
      currency: selectedCustomer.currency || 'EUR',
      webpage: selectedCustomer.webpage || '',
      vatNumber: selectedCustomer.vat_number || '',
      notes: selectedCustomer.notes || '',
      declarationNumbers: selectedCustomer.declaration_numbers?.join(', ') || '',
      dueDate: selectedCustomer.payment_terms?.toString() || '',
      dapAddress: selectedCustomer.dap_address || '',
      fcoAddress: selectedCustomer.fco_address || ''
    });
    setIsCustomerDialogOpen(false);
    setIsEditCustomerOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive"
      });
      return;
    }

    const declarationNumbersArray = newCustomer.declarationNumbers
      .split(',')
      .map(num => num.trim())
      .filter(num => num.length > 0);

    const { error } = await supabase
      .from('customers')
      .update({
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        address: newCustomer.address,
        city: newCustomer.city,
        country: newCustomer.country,
        currency: newCustomer.currency,
        contact_person: newCustomer.contactPerson,
        industry: newCustomer.industry,
        webpage: newCustomer.webpage,
        vat_number: newCustomer.vatNumber,
        payment_terms: newCustomer.dueDate ? parseInt(newCustomer.dueDate) : null,
        declaration_numbers: declarationNumbersArray.length > 0 ? declarationNumbersArray : null,
        dap_address: newCustomer.dapAddress || null,
        fco_address: newCustomer.fcoAddress || null
      })
      .eq('id', selectedCustomer.id);

    if (!error) {
      toast({
        title: "Customer Updated",
        description: "The customer has been successfully updated.",
      });
      
      await fetchCustomers();
      setNewCustomer({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        industry: '',
        country: '',
        currency: 'EUR',
        webpage: '',
        vatNumber: '',
        notes: '',
        declarationNumbers: '',
        dueDate: '',
        dapAddress: '',
        fcoAddress: ''
      });
      setIsEditCustomerOpen(false);
    } else {
      console.error('Update customer error:', error);
      toast({
        title: "Error",
        description: `Failed to update customer: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const generateStockReport = async (customer: any) => {
    try {
      // Fetch inventory items for this customer (only Parts category)
      const { data: inventoryItems } = await supabase
        .from('inventory')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('category', 'Parts');

      if (!inventoryItems || inventoryItems.length === 0) {
        toast({
          title: "No Stock Items",
          description: `No parts found for ${customer.name}`,
          variant: "destructive"
        });
        return;
      }

      // Sort inventory items by part number
      inventoryItems.sort((a: any, b: any) => {
        const partA = (a.part_number || '').toLowerCase();
        const partB = (b.part_number || '').toLowerCase();
        return partA.localeCompare(partB);
      });

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const itemsPerPage = 12;
      const totalPages = Math.ceil(inventoryItems.length / itemsPerPage);
      const currentDate = formatDate(new Date());
      
      // Set narrow margins: 1.27cm (12.7mm) from each side
      const margin = 12.7;
      const contentLeft = margin;
      const contentRight = pageWidth - margin;
      const contentWidth = contentRight - contentLeft;
      
      let yPosition = margin;
      let itemCount = 0;
      let currentPage = 1;
      
      // Function to add footer with pagination and date
      const addFooter = (pageNum: number) => {
        // Move footer down by 0.5cm (5mm) - from 15mm to 20mm from bottom
        // Allow it to go behind margin if needed
        const footerY = pageHeight - 8;
        pdf.setFontSize(9);
        pdf.setFont(fontFamily, 'normal');
        pdf.setTextColor(128, 128, 128); // Gray color
        
        // Combine pagination and date with separator
        const paginationText = `Page ${pageNum} of ${totalPages}`;
        const footerText = `${paginationText} | ${currentDate}`;
        const footerWidth = pdf.getTextWidth(footerText);
        
        // Align with the end of the last column (Quantity column ends at right margin)
        // Allow footer to extend beyond margin if needed
        const tableRightEdge = contentRight;
        pdf.text(footerText, tableRightEdge - footerWidth, footerY);
        
        // Reset text color
        pdf.setTextColor(0, 0, 0);
      };
      
      // Function to convert image to base64 for PDF
      const getImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };
      
      // Helper function to split text into multiple lines
      const splitTextIntoLines = (text: string, maxWidth: number, maxLines: number = 4): string[] => {
        const lines = pdf.splitTextToSize(text, maxWidth);
        return lines.slice(0, maxLines);
      };
      
      // Helper function to pluralize units correctly
      const pluralizeUnit = (quantity: number, unit: string): string => {
        if (quantity === 1) {
          // Singular form for quantity of 1
          return unit;
        } else {
          // Plural form for quantity > 1
          // Handle common pluralization rules
          if (unit.toLowerCase() === 'piece') {
            return 'pieces';
          } else if (unit.toLowerCase() === 'set') {
            return 'sets';
          } else if (unit.toLowerCase() === 'pcs') {
            return 'pcs'; // "pcs" is already plural/abbreviation
          } else if (unit.toLowerCase().endsWith('s')) {
            return unit; // Already plural
          } else {
            return unit + 's'; // Default: add 's' for plural
          }
        }
      };
      
      // Load and register Lexend font for jsPDF from GitHub
      const loadLexendFont = async (): Promise<boolean> => {
        try {
          // Check if font is already loaded
          const fontList = pdf.getFontList();
          if (fontList && fontList['lexend']) {
            return true;
          }
          
          // Load Lexend Light TTF from GitHub raw content
          // Using the GitHub repository: https://github.com/googlefonts/lexend/tree/main/fonts/lexend/ttf
          const fontUrl = 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/lexend/ttf/Lexend-Light.ttf';
          
          const response = await fetch(fontUrl, { 
            method: 'GET',
            headers: { 'Accept': 'font/ttf,*/*' }
          });
          
          if (!response.ok) {
            throw new Error(`Font fetch failed: ${response.status} ${response.statusText}`);
          }
          
          const fontArrayBuffer = await response.arrayBuffer();
          
          // Convert to base64
          const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)));
          
          // Register font with jsPDF
          pdf.addFileToVFS('Lexend-Light.ttf', fontBase64);
          pdf.addFont('Lexend-Light.ttf', 'lexend', 'normal');
          
          // Verify font was registered
          const updatedFontList = pdf.getFontList();
          if (updatedFontList && updatedFontList['lexend']) {
            return true;
          }
          
          throw new Error('Font registration verification failed');
        } catch (error) {
          console.warn('Failed to load Lexend font from GitHub, falling back to helvetica:', error);
          return false;
        }
      };
      
      // Load Lexend font before generating report
      const lexendLoaded = await loadLexendFont();
      const fontFamily = lexendLoaded ? 'lexend' : 'helvetica';
      
      // Helper function to add rounded image using canvas for true rounded corners
      const addRoundedImage = async (imageBase64: string, x: number, y: number, width: number, height: number, radius: number = 3): Promise<void> => {
        return new Promise((resolve, reject) => {
          try {
            const img = new Image();
            img.onload = () => {
              // Create canvas to draw rounded image
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d', { willReadFrequently: false });
              if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
              }
              
              // Set canvas size at 300 PPI (300 pixels per inch = 300 DPI)
              // This renders at 300 PPI resolution but displays at the same size in cm
              const scale = 300 / 25.4; // pixels per mm at 300 PPI
              canvas.width = width * scale;
              canvas.height = height * scale;
              
              // Enable high-quality image rendering
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              
              // Fill with white background first to avoid black corners
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Draw rounded rectangle path
              ctx.beginPath();
              ctx.moveTo(radius * scale, 0);
              ctx.lineTo((width - radius) * scale, 0);
              ctx.quadraticCurveTo(width * scale, 0, width * scale, radius * scale);
              ctx.lineTo(width * scale, (height - radius) * scale);
              ctx.quadraticCurveTo(width * scale, height * scale, (width - radius) * scale, height * scale);
              ctx.lineTo(radius * scale, height * scale);
              ctx.quadraticCurveTo(0, height * scale, 0, (height - radius) * scale);
              ctx.lineTo(0, radius * scale);
              ctx.quadraticCurveTo(0, 0, radius * scale, 0);
              ctx.closePath();
              
              // Clip to rounded rectangle
              ctx.clip();
              
              // Draw image at 300 PPI resolution
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              // Convert canvas to base64 using JPEG compression to reduce file size
              // Quality 0.85 provides good balance between quality and file size
              const roundedImageBase64 = canvas.toDataURL('image/jpeg', 0.85);
              pdf.addImage(roundedImageBase64, 'JPEG', x, y, width, height);
              resolve();
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageBase64;
          } catch (error) {
            reject(error);
          }
        });
      };
      
      for (let i = 0; i < inventoryItems.length; i++) {
        const item = inventoryItems[i];
        
        // Check for new page (12 items per page)
        if (itemCount >= itemsPerPage) {
          // Add footer to current page before adding new one
          addFooter(currentPage);
          
          pdf.addPage();
          currentPage++;
          yPosition = margin;
          itemCount = 0;
        }
        
        // Image dimensions: 2cm high (20mm) x 2.67cm wide (26.7mm)
        const imageWidth = 26.7;
        const imageHeight = 20;
        const imageX = contentLeft;
        const imageY = yPosition;
        
        // Column positions and widths - calculated to end at right margin
        // 0.4cm gap between all columns (including between image and part name)
        const gap = 4; // 0.4cm = 4mm gap between columns
        
        // Calculate available width for text columns (excluding image and gaps)
        const imageEndX = imageX + imageWidth;
        const availableWidth = contentRight - imageEndX - gap; // Space after image
        
        // Fixed column widths
        const quantityWidth = 15; // Fixed quantity column width
        const partNumberWidth = 25;
        const partNameWidth = 37.5; // Increased by 25% from 30mm (30 * 1.25 = 37.5mm)
        
        // Calculate positions with proper gaps
        const partNameX = imageEndX + gap; // Start after image with gap
        const partNumberX = partNameX + partNameWidth + gap;
        const quantityX = contentRight - quantityWidth; // Quantity ends at right margin
        const productionStatusX = partNumberX + partNumberWidth + gap;
        
        // Production status gets remaining space (reduced due to part name increase)
        const productionStatusWidth = quantityX - productionStatusX - gap;
        
        // Ensure production status width is valid (at least 15mm - reduced minimum)
        const minProductionStatusWidth = 15;
        const actualProductionStatusWidth = Math.max(productionStatusWidth, minProductionStatusWidth);
        
        // Verify no overlap: ensure production status doesn't exceed available space
        if (productionStatusX + actualProductionStatusWidth + gap > quantityX) {
          // Adjust production status width if needed
          const adjustedProductionStatusWidth = quantityX - productionStatusX - gap;
          if (adjustedProductionStatusWidth < minProductionStatusWidth) {
            console.warn('Warning: Production status column may be too narrow');
          }
        }
        
        const lineHeight = 5; // Height per line of text
        const maxLines = 4;
        
        // Image section
        let imageBase64 = null;
        if (item.photo_url) {
          try {
            imageBase64 = await getImageAsBase64(item.photo_url);
          } catch (error) {
            console.log('Failed to load image:', item.photo_url);
          }
        }
        
        if (imageBase64) {
          try {
            await addRoundedImage(imageBase64, imageX, imageY, imageWidth, imageHeight, 3);
          } catch (error) {
            // Fallback to placeholder if image fails
            pdf.setFillColor(245, 245, 245);
            pdf.roundedRect(imageX, imageY, imageWidth, imageHeight, 3, 3, 'F');
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            const imgTextWidth = pdf.getTextWidth('IMG');
            pdf.text('IMG', imageX + (imageWidth - imgTextWidth) / 2, imageY + imageHeight / 2);
          }
        } else {
          // Image placeholder with rounded appearance
          pdf.setFillColor(245, 245, 245);
          pdf.roundedRect(imageX, imageY, imageWidth, imageHeight, 3, 3, 'F');
          pdf.setFontSize(8);
          pdf.setTextColor(120, 120, 120);
          const imgTextWidth = pdf.getTextWidth('IMG');
          pdf.text('IMG', imageX + (imageWidth - imgTextWidth) / 2, imageY + imageHeight / 2);
        }
        
        // Set font BEFORE splitting text so width calculations are correct
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        pdf.setFont(fontFamily, 'normal');
        
        // Calculate row height first to determine vertical centering
        const partName = item.name || '';
        const partNameLines = splitTextIntoLines(partName, partNameWidth, maxLines);
        const partNumber = item.part_number || '';
        const partNumberLines = partNumber ? splitTextIntoLines(partNumber, partNumberWidth, maxLines) : [];
        const status = item.production_status || '';
        const statusLines = status ? splitTextIntoLines(status, actualProductionStatusWidth, maxLines) : [];
        
        const maxTextHeight = Math.max(
          partNameLines.length * lineHeight,
          partNumberLines.length * lineHeight,
          statusLines.length * lineHeight
        );
        const contentHeight = Math.max(imageHeight, maxTextHeight);
        const rowHeight = contentHeight + 2.4; // Add 2.4mm padding (reduced by 20% from 3mm)
        
        // Calculate vertical center for text (based on content height, not row height)
        const textCenterY = yPosition + contentHeight / 2;
        
        // Part name (Description) - multi-line support, vertically centered
        // Trust the initial split - don't re-split during rendering to avoid overlap
        const partNameStartY = textCenterY - ((partNameLines.length - 1) * lineHeight) / 2;
        partNameLines.forEach((line, idx) => {
          // Render the line as-is (splitTextToSize already handled the width)
          // If it's still too wide, truncate with ellipsis to prevent overlap
          let displayLine = line;
          const textWidth = pdf.getTextWidth(line);
          if (textWidth > partNameWidth) {
            // Truncate with ellipsis if still too wide
            let truncated = line;
            while (pdf.getTextWidth(truncated + '...') > partNameWidth && truncated.length > 0) {
              truncated = truncated.slice(0, -1);
            }
            displayLine = truncated + '...';
          }
          pdf.text(displayLine, partNameX, partNameStartY + (idx * lineHeight));
        });
        
        // Part number - multi-line support, vertically centered
        // Only render if there's a value (leave blank if empty)
        if (partNumberLines.length > 0) {
          pdf.setFont(fontFamily, 'normal');
          const partNumberStartY = textCenterY - ((partNumberLines.length - 1) * lineHeight) / 2;
          partNumberLines.forEach((line, idx) => {
            // Render the line as-is (splitTextToSize already handled the width)
            // If it's still too wide, truncate with ellipsis to prevent overlap
            let displayLine = line;
            const textWidth = pdf.getTextWidth(line);
            if (textWidth > partNumberWidth) {
              // Truncate with ellipsis if still too wide
              let truncated = line;
              while (pdf.getTextWidth(truncated + '...') > partNumberWidth && truncated.length > 0) {
                truncated = truncated.slice(0, -1);
              }
              displayLine = truncated + '...';
            }
            pdf.text(displayLine, partNumberX, partNumberStartY + (idx * lineHeight));
          });
        }
        
        // Production status - multi-line support, vertically centered
        // Only render if there's a value (leave blank if empty)
        if (statusLines.length > 0) {
          const statusStartY = textCenterY - ((statusLines.length - 1) * lineHeight) / 2;
          statusLines.forEach((line, idx) => {
            // Render the line as-is (splitTextToSize already handled the width)
            // If it's still too wide, truncate with ellipsis to prevent overlap
            let displayLine = line;
            const textWidth = pdf.getTextWidth(line);
            if (textWidth > actualProductionStatusWidth) {
              // Truncate with ellipsis if still too wide
              let truncated = line;
              while (pdf.getTextWidth(truncated + '...') > actualProductionStatusWidth && truncated.length > 0) {
                truncated = truncated.slice(0, -1);
              }
              displayLine = truncated + '...';
            }
            
            // Highlight only the text (not the whole cell) with light orange
            const finalTextWidth = pdf.getTextWidth(displayLine);
            const highlightHeight = lineHeight * 1; // Height of highlight (60% of line height)
            const highlightY = statusStartY + (idx * lineHeight) - highlightHeight * 0.7; // Position highlight slightly below text baseline
            
            pdf.setFillColor(255, 251, 223); // Light orange color (peach/salmon)
            pdf.roundedRect(productionStatusX, highlightY, finalTextWidth, highlightHeight, 1, 1, 'F');
            
            // Draw text on top of highlight
            pdf.text(displayLine, productionStatusX, statusStartY + (idx * lineHeight));
          });
        }
        
        // Quantity - conditional styling based on minimum stock
        const quantity = item.quantity || 0;
        const minimumStock = item.minimum_stock || 0;
        
        if (quantity > 0) {
          // Determine background color based on quantity vs minimum stock
          let bgColor: [number, number, number];
          if (quantity > minimumStock) {
            // Green background for quantity > minimum stock
            bgColor = [213, 255, 182]; // Light green
          } else {
            // Yellow-orange background for quantity <= minimum stock but > 0
            bgColor = [255, 238, 182]; // Yellow-orange
          }
          
          // Draw rounded rectangle background (use content height, not including bottom padding)
          pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          pdf.roundedRect(quantityX, yPosition, quantityWidth, contentHeight, 2, 2, 'F');
          
          // Get unit text with proper pluralization (default to "pcs" if not specified)
          const baseUnit = item.unit || 'pcs';
          const unit = pluralizeUnit(quantity, baseUnit);
          
          // Draw quantity text - font size 10.5pt, light weight
          pdf.setFontSize(10.5);
          pdf.setFont(fontFamily, 'normal'); // 'normal' is lighter than 'bold'
          pdf.setTextColor(0, 0, 0); // Black text
          const quantityText = quantity.toString();
          const quantityTextWidth = pdf.getTextWidth(quantityText);
          const quantityTextX = quantityX + (quantityWidth - quantityTextWidth) / 2;
          
          // Draw unit text below quantity - font size 6.3pt, light weight
          pdf.setFontSize(6.3);
          pdf.setFont(fontFamily, 'normal');
          const unitTextWidth = pdf.getTextWidth(unit);
          const unitTextX = quantityX + (quantityWidth - unitTextWidth) / 2;
          
          // Calculate vertical positions: quantity above center, unit below center
          const lineSpacing = 2; // Space between quantity and unit
          const quantityTextY = textCenterY - lineSpacing / 2;
          const unitTextY = textCenterY + lineSpacing / 2 + 2; // Slight offset for better visual balance
          
          // Draw quantity value
          pdf.setFontSize(10.5);
          pdf.setFont(fontFamily, 'normal');
          pdf.text(quantityText, quantityTextX, quantityTextY);
          
          // Draw unit below quantity
          pdf.setFontSize(6.3);
          pdf.setFont(fontFamily, 'normal');
          pdf.text(unit, unitTextX, unitTextY);
        }
        // If quantity === 0, don't render anything (cell stays empty)
        
        yPosition += rowHeight;
        itemCount++;
      }
      
      // Add footer to the last page
      addFooter(currentPage);
      
      // Save PDF
      const fileName = `Stock_Report_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${formatDateForInput(new Date())}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "Report Generated",
        description: `Clean stock report for ${customer.name} has been generated with ${inventoryItems.length} items.`,
      });
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate stock report",
        variant: "destructive"
      });
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesCountry = countryFilter.selected === "all" || customer.country === countryFilter.selected;
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    return matchesCountry && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);
  
  // Get unique countries for filter
  const uniqueCountries = [...new Set(customers.map(c => c.country).filter(Boolean))].sort();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input 
                  placeholder="Enter company name" 
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input 
                  placeholder="Enter contact person" 
                  value={newCustomer.contactPerson}
                  onChange={(e) => setNewCustomer({...newCustomer, contactPerson: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email" 
                  placeholder="Enter email" 
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  placeholder="Enter phone number" 
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <Label>Country</Label>
                <CountryAutocomplete
                  value={newCustomer.country}
                  onChange={(value) => {
                    const currency = countryToCurrency[value] || 'EUR';
                    setNewCustomer({...newCustomer, country: value, currency});
                  }}
                  placeholder="Select country"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={newCustomer.currency} onValueChange={(value) => setNewCustomer({...newCustomer, currency: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                    <SelectItem value="CHF">CHF (₣)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                    <SelectItem value="AUD">AUD (A$)</SelectItem>
                    <SelectItem value="CNY">CNY (¥)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="BAM">KM (BAM)</SelectItem>
                    <SelectItem value="RSD">RSD (РСД)</SelectItem>
                    <SelectItem value="PLN">PLN (zł)</SelectItem>
                    <SelectItem value="CZK">CZK (Kč)</SelectItem>
                    <SelectItem value="SEK">SEK (kr)</SelectItem>
                    <SelectItem value="NOK">NOK (kr)</SelectItem>
                    <SelectItem value="DKK">DKK (kr)</SelectItem>
                    <SelectItem value="HUF">HUF (Ft)</SelectItem>
                    <SelectItem value="RON">RON (lei)</SelectItem>
                    <SelectItem value="BGN">BGN (лв)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Industry</Label>
                <Input 
                  placeholder="Enter industry" 
                  value={newCustomer.industry}
                  onChange={(e) => setNewCustomer({...newCustomer, industry: e.target.value})}
                />
              </div>
              <div>
                <Label>VAT Number</Label>
                <Input 
                  placeholder="Enter VAT number" 
                  value={newCustomer.vatNumber}
                  onChange={(e) => setNewCustomer({...newCustomer, vatNumber: e.target.value})}
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <NumericInput
                  value={newCustomer.dueDate ? parseFloat(newCustomer.dueDate) : 0}
                  onChange={(val) => setNewCustomer({...newCustomer, dueDate: val.toString()})}
                  min={0}
                  placeholder="Enter payment terms in days" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Payment terms in days (e.g., 30 for Net 30)
                </p>
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input 
                  placeholder="Enter full address" 
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input 
                  placeholder="Enter city" 
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>Website</Label>
                <Input 
                  placeholder="Enter website URL" 
                  value={newCustomer.webpage}
                  onChange={(e) => setNewCustomer({...newCustomer, webpage: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>Declaration Numbers</Label>
                <Input 
                  placeholder="Enter declaration numbers (comma-separated)" 
                  value={newCustomer.declarationNumbers}
                  onChange={(e) => setNewCustomer({...newCustomer, declarationNumbers: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter multiple declaration numbers separated by commas (e.g., "DEC001, DEC002")
                </p>
              </div>
              <div className="col-span-2">
                <Label>DAP Address</Label>
                <Input 
                  placeholder="Enter DAP delivery address" 
                  value={newCustomer.dapAddress}
                  onChange={(e) => setNewCustomer({...newCustomer, dapAddress: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Address to use when DAP incoterm is selected in invoices
                </p>
              </div>
              <div className="col-span-2">
                <Label>FCO Address</Label>
                <Input 
                  placeholder="Enter FCO delivery address" 
                  value={newCustomer.fcoAddress}
                  onChange={(e) => setNewCustomer({...newCustomer, fcoAddress: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Address to use when FCO incoterm is selected in invoices
                </p>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input 
                  placeholder="Enter any notes" 
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleSaveCustomer}>Save Customer</Button>
              <Button variant="outline" onClick={() => setIsAddCustomerOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-none bg-transparent text-foreground shadow-none md:rounded-lg md:bg-card md:text-card-foreground md:shadow-sm">
        <CardHeader className="md:p-6 p-4">
          <CardTitle>Customer Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {/* Desktop Table */}
          <div className="hidden md:block w-full max-w-full min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Country
                    <Popover open={isCountryFilterOpen} onOpenChange={setIsCountryFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Filter className={`h-3 w-3 ${countryFilter.selected !== "all" ? 'text-primary' : ''}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Filter by Country</Label>
                            {countryFilter.selected !== "all" && (
                              <Button variant="ghost" size="sm" onClick={() => {
                                setCountryFilter({ search: "", selected: "all" });
                              }}>
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <div>
                            <Label>Search</Label>
                            <Input
                              placeholder="Search countries..."
                              value={countryFilter.search}
                              onChange={(e) => setCountryFilter({ ...countryFilter, search: e.target.value })}
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            <Select value={countryFilter.selected} onValueChange={(value) => {
                              setCountryFilter({ ...countryFilter, selected: value });
                              setIsCountryFilterOpen(false);
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Countries</SelectItem>
                                {uniqueCountries
                                  .filter(c => !countryFilter.search || c.toLowerCase().includes(countryFilter.search.toLowerCase()))
                                  .map(country => (
                                    <SelectItem key={country} value={country}>{country}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Status
                    <Popover open={isStatusFilterOpen} onOpenChange={setIsStatusFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Filter className={`h-3 w-3 ${statusFilter !== "all" ? 'text-primary' : ''}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48" align="start">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Filter by Status</Label>
                            {statusFilter !== "all" && (
                              <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <Select value={statusFilter} onValueChange={(value) => {
                            setStatusFilter(value);
                            setIsStatusFilterOpen(false);
                          }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="On Hold">On Hold</SelectItem>
                              <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <button 
                        onClick={() => handleCustomerClick(customer)}
                        className="text-primary hover:underline font-medium text-left"
                      >
                        {customer.name}
                      </button>
                    </TableCell>
                    <TableCell>{customer.contactPerson}</TableCell>
                    <TableCell>{customer.country}</TableCell>
                    <TableCell>{customer.currency || 'EUR'}</TableCell>
                    <TableCell>{customer.industry}</TableCell>
                    <TableCell className="text-sm">
                      <a href={`mailto:${customer.email}`} className="hover:underline">
                        {customer.email}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">{customer.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(customer.status)}
                      >
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.totalOrders}</TableCell>
                    <TableCell className="font-medium">
                      ${customer.totalValue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => generateStockReport(customer)}
                          title="Generate Stock Report"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete Customer">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{customer.name}"? This action cannot be undone and will remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 w-full max-w-full min-w-0">
            {paginatedCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="p-4 border cursor-pointer hover:bg-muted/50 transition-colors rounded-lg"
                onClick={() => handleCustomerClick(customer)}
              >
                <div className="space-y-3">
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCustomerClick(customer);
                      }}
                      className="text-sm font-medium text-primary hover:underline text-left"
                    >
                      {customer.name}
                    </button>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Person</span>
                    <div className="text-sm font-medium">{customer.contactPerson}</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</span>
                    <div className="text-sm font-medium">{customer.country}</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Currency</span>
                    <div className="text-sm font-medium">{customer.currency || 'EUR'}</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Industry</span>
                    <div className="text-sm font-medium">{customer.industry}</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</span>
                    <a href={`mailto:${customer.email}`} className="text-sm font-medium hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                      {customer.email}
                    </a>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</span>
                    <div className="text-sm font-medium">{customer.phone}</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                    <Badge
                      variant="outline"
                      className={getStatusColor(customer.status)}
                    >
                      {customer.status}
                    </Badge>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Orders</span>
                    <div className="text-sm font-medium">{customer.totalOrders}</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Value</span>
                    <div className="text-sm font-medium">${customer.totalValue.toLocaleString()}</div>
                  </div>
                  <div className="pt-2 border-t flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => generateStockReport(customer)}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Report
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex-1">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{customer.name}"? This action cannot be undone and will remove all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} customers
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{selectedCustomer.contactPerson}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{selectedCustomer.industry}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{selectedCustomer.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">City</p>
                      <p className="font-medium">{selectedCustomer.city}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Country</p>
                      <p className="font-medium">{selectedCustomer.country}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Terms</p>
                      <p className="font-medium">
                        {selectedCustomer.payment_terms 
                          ? `Net ${selectedCustomer.payment_terms} days`
                          : 'Not set'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge
                        variant="outline"
                        className={getStatusColor(selectedCustomer.status)}
                      >
                        {selectedCustomer.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Contact Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${selectedCustomer.email}`} className="hover:underline">
                        {selectedCustomer.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a href={selectedCustomer.webpage} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {selectedCustomer.webpage}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Declaration Numbers */}
              {selectedCustomer.declaration_numbers && selectedCustomer.declaration_numbers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Declaration Numbers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {selectedCustomer.declaration_numbers.map((number, index) => (
                        <Badge key={index} variant="secondary">
                          {number}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{selectedCustomer.totalOrders}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${selectedCustomer.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Average Order</p>
                      <p className="text-2xl font-bold">
                        ${(selectedCustomer.totalValue / selectedCustomer.totalOrders).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Last Order</p>
                      <p className="text-lg font-medium">{selectedCustomer.lastOrderDate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedCustomer.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={handleEditCustomer}>
                  Edit Customer
                </Button>
                <Button variant="outline" className="flex-1">
                  View Order History
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input
                id="edit-name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contact">Contact Person</Label>
              <Input
                id="edit-contact"
                value={newCustomer.contactPerson}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, contactPerson: e.target.value }))}
                placeholder="Enter contact person name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={newCustomer.city}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Enter city"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-industry">Industry</Label>
              <Input
                id="edit-industry"
                value={newCustomer.industry}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, industry: e.target.value }))}
                placeholder="Enter industry"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-country">Country</Label>
              <CountryAutocomplete
                id="edit-country"
                value={newCustomer.country}
                onChange={(value) => {
                  const currency = countryToCurrency[value] || 'EUR';
                  setNewCustomer(prev => ({ ...prev, country: value, currency }));
                }}
                placeholder="Select country"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-currency">Currency</Label>
              <Select value={newCustomer.currency} onValueChange={(value) => setNewCustomer(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger id="edit-currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="CHF">CHF (₣)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                  <SelectItem value="CNY">CNY (¥)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="BAM">KM (BAM)</SelectItem>
                  <SelectItem value="RSD">RSD (РСД)</SelectItem>
                  <SelectItem value="PLN">PLN (zł)</SelectItem>
                  <SelectItem value="CZK">CZK (Kč)</SelectItem>
                  <SelectItem value="SEK">SEK (kr)</SelectItem>
                  <SelectItem value="NOK">NOK (kr)</SelectItem>
                  <SelectItem value="DKK">DKK (kr)</SelectItem>
                  <SelectItem value="HUF">HUF (Ft)</SelectItem>
                  <SelectItem value="RON">RON (lei)</SelectItem>
                  <SelectItem value="BGN">BGN (лв)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-webpage">Website</Label>
              <Input
                id="edit-webpage"
                value={newCustomer.webpage}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, webpage: e.target.value }))}
                placeholder="Enter website URL"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-vat">VAT Number</Label>
              <Input
                id="edit-vat"
                value={newCustomer.vatNumber}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, vatNumber: e.target.value }))}
                placeholder="Enter VAT number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-payment-terms">Payment Terms</Label>
              <NumericInput
                id="edit-payment-terms"
                value={newCustomer.dueDate ? parseFloat(newCustomer.dueDate) : 0}
                onChange={(val) => setNewCustomer(prev => ({ ...prev, dueDate: val.toString() }))}
                min={0}
                placeholder="Enter payment terms in days"
              />
              <p className="text-xs text-muted-foreground">
                Payment terms in days (e.g., 30 for Net 30)
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-dap-address">DAP Address</Label>
              <Input
                id="edit-dap-address"
                value={newCustomer.dapAddress}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, dapAddress: e.target.value }))}
                placeholder="Enter DAP delivery address"
              />
              <p className="text-xs text-muted-foreground">
                Address to use when DAP incoterm is selected in invoices
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-fco-address">FCO Address</Label>
              <Input
                id="edit-fco-address"
                value={newCustomer.fcoAddress}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, fcoAddress: e.target.value }))}
                placeholder="Enter FCO delivery address"
              />
              <p className="text-xs text-muted-foreground">
                Address to use when FCO incoterm is selected in invoices
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-declaration-numbers">Declaration Numbers</Label>
              <Input
                id="edit-declaration-numbers"
                value={newCustomer.declarationNumbers}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, declarationNumbers: e.target.value }))}
                placeholder="Enter declaration numbers (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Enter multiple declaration numbers separated by commas
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter any additional notes"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditCustomerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCustomer}>
              Update Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}