import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FileText, Plus, Search, DollarSign, Calendar as CalendarIcon, Send, Trash2, Download, Eye, Edit, Settings, Check, ChevronsUpDown, Printer } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "pending":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    case "overdue":
      return "bg-red-500/10 text-red-700 border-red-200";
    case "draft":
      return "bg-gray-500/10 text-gray-700 border-gray-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

// Calculate effective status based on due_date and current status
const getEffectiveStatus = (invoice: any): string => {
  // If status is "paid", always return "paid"
  if (invoice.status === "paid") {
    return "paid";
  }
  
  // If status is "draft", return "draft"
  if (invoice.status === "draft") {
    return "draft";
  }
  
  // For other statuses, check if overdue based on due_date
  if (invoice.due_date) {
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      return "overdue";
    }
  }
  
  // Default to pending if not overdue and not paid
  return "pending";
};

// Invoice Status Badge Component
const InvoiceStatusBadge = ({ invoice, onStatusChange }: { invoice: any; onStatusChange: (status: string) => Promise<void> }) => {
  const [isOpen, setIsOpen] = useState(false);
  const effectiveStatus = getEffectiveStatus(invoice);
  
  const handleStatusChange = async (newStatus: string) => {
    await onStatusChange(newStatus);
    setIsOpen(false);
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Paid";
      case "pending":
        return "Pending";
      case "overdue":
        return "Overdue";
      case "draft":
        return "Draft";
      default:
        return status;
    }
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button>
          <Badge variant="outline" className={cn(getStatusColor(effectiveStatus), "cursor-pointer hover:opacity-80")}>
            {getStatusLabel(effectiveStatus)}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="start">
        <div className="space-y-1">
          {effectiveStatus !== "paid" && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleStatusChange("paid")}
            >
              <Check className="mr-2 h-4 w-4" />
              Paid
            </Button>
          )}
          {effectiveStatus === "paid" && (
            <>
              {/* Only show Overdue if due_date is in the past */}
              {invoice.due_date && new Date(invoice.due_date) < new Date() ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange("overdue")}
                >
                  Overdue
                </Button>
              ) : (
                /* Only show Pending if due_date is in the future or doesn't exist */
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange("pending")}
                >
                  Pending
                </Button>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function Invoicing() {
  const {
    toast
  } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerId: '',
    orderNumber: '',
    issueDate: '',
    shippingDate: '',
    shippingAddress: '',
    incoterms: '',
    declarationNumber: '',
    packing: 1,
    taraWeight: 0,
    notes: '',
    dueDate: ''
  });
  const [invoiceItems, setInvoiceItems] = useState([{
    inventoryId: '',
    quantity: 1,
    unitPrice: 0
  }]);
  const [productSearchOpen, setProductSearchOpen] = useState<Record<number, boolean>>({});
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [invoiceSettings, setInvoiceSettings] = useState({
    primaryColor: '#000000',
    domesticFooter: ['', '', ''],
    foreignFooter: ['', '', ''],
    foreignNote: '',
    signatory: ''
  });
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfSettings, setPdfSettings] = useState({
    scale: 4, // Higher scale = better quality (2-5 recommended)
    quality: 0.98, // Image quality (0-1)
    dpi: 300 // DPI for PDF (72, 150, 300)
  });
  const [showPdfSettings, setShowPdfSettings] = useState(false);
  const invoiceContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchInventoryItems();
    fetchCompanyInfo();
    fetchInvoiceSettings();
    // Load PDF settings from localStorage
    const savedSettings = localStorage.getItem('pdfSettings');
    if (savedSettings) {
      try {
        setPdfSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Error loading PDF settings:', e);
      }
    }
  }, []);

  const savePdfSettings = (newSettings: typeof pdfSettings) => {
    setPdfSettings(newSettings);
    localStorage.setItem('pdfSettings', JSON.stringify(newSettings));
  };
  const fetchInvoices = async () => {
    try {
    const {
        data,
        error
    } = await supabase.from('invoices').select(`
        *,
        customers!inner(id, name, country, address, city, phone, dap_address, fco_address),
        invoice_items!fk_invoice_items_invoice(*)
      `).order('created_at', {
      ascending: false
    });
      
      if (error) {
        console.error('Error fetching invoices:', error);
        toast({
          title: "Error",
          description: "Failed to load invoices. Please refresh the page.",
          variant: "destructive"
        });
        return;
      }
      
    if (data) {
      setInvoices(data);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices. Please refresh the page.",
        variant: "destructive"
      });
    }
  };
  const fetchCustomers = async () => {
    const {
      data
    } = await supabase.from('customers').select('*, dap_address, fco_address, payment_terms');
    if (data) setCustomers(data);
  };
  const fetchInventoryItems = async () => {
    const {
      data
    } = await supabase.from('inventory').select('*').eq('category', 'Parts');
    if (data) setInventoryItems(data);
  };
  const fetchCompanyInfo = async () => {
    const {
      data
    } = await supabase.from('company_info').select('*').limit(1).single();
    if (data) setCompanyInfo(data);
  };
  const fetchInvoiceSettings = async () => {
    try {
      // Temporary workaround until types are updated
      const {
        data
      } = await (supabase as any).from('invoice_settings').select('*').maybeSingle();
      if (data) {
        setInvoiceSettings({
          primaryColor: data.primary_color || '#000000',
          domesticFooter: [data.domestic_footer_column1 || '', data.domestic_footer_column2 || '', data.domestic_footer_column3 || ''],
          foreignFooter: [data.foreign_footer_column1 || '', data.foreign_footer_column2 || '', data.foreign_footer_column3 || ''],
          foreignNote: data.foreign_note || '',
          signatory: data.signatory || ''
        });
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
    }
  };
  const saveInvoiceSettings = async () => {
    try {
      // Temporary workaround until types are updated
      const {
        data: existingSettings
      } = await (supabase as any).from('invoice_settings').select('id').maybeSingle();
      const settingsData = {
        primary_color: invoiceSettings.primaryColor,
        domestic_footer_column1: invoiceSettings.domesticFooter[0],
        domestic_footer_column2: invoiceSettings.domesticFooter[1],
        domestic_footer_column3: invoiceSettings.domesticFooter[2],
        foreign_footer_column1: invoiceSettings.foreignFooter[0],
        foreign_footer_column2: invoiceSettings.foreignFooter[1],
        foreign_footer_column3: invoiceSettings.foreignFooter[2],
        foreign_note: invoiceSettings.foreignNote,
        signatory: invoiceSettings.signatory
      };
      let error;
      if (existingSettings) {
        ({
          error
        } = await (supabase as any).from('invoice_settings').update(settingsData).eq('id', existingSettings.id));
      } else {
        ({
          error
        } = await (supabase as any).from('invoice_settings').insert(settingsData));
      }
      if (error) throw error;
      toast({
        title: "Settings saved",
        description: "Invoice settings have been updated successfully."
      });
    } catch (error) {
      console.error('Error saving invoice settings:', error);
      toast({
        title: "Error",
        description: "Failed to save invoice settings. Please try again.",
        variant: "destructive"
      });
    }
  };
  const getSelectedCustomer = () => {
    return customers.find(c => c.id === newInvoice.customerId);
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
  
  // Calculate due date from payment terms
  const calculateDueDate = (paymentTerms: string | number | null | undefined, issueDate: Date = new Date()): string => {
    if (!paymentTerms && paymentTerms !== 0) return '';
    
    let days = 0;
    
    // Handle integer values directly
    if (typeof paymentTerms === 'number') {
      days = paymentTerms;
    } else if (typeof paymentTerms === 'string') {
      // Parse payment terms - could be "Net 30", "30", "Net 15", etc.
      const match = paymentTerms.match(/(\d+)/);
      if (match) {
        days = parseInt(match[1], 10);
      } else {
        return '';
      }
    } else {
      return '';
    }
    
    if (days > 0) {
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + days);
      return dueDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }
    
    return '';
  };
  const generateInvoiceNumber = async () => {
    const {
      data
    } = await supabase.rpc('generate_invoice_number');
    return data;
  };
  const calculateTotals = () => {
    const customer = getSelectedCustomer();
    let totalQuantity = 0;
    let netWeight = 0;
    let subtotal = 0;
    invoiceItems.forEach(item => {
      const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryId);
      if (inventoryItem) {
        totalQuantity += item.quantity;
        netWeight += (inventoryItem.weight || 0) * item.quantity;
        subtotal += item.quantity * item.unitPrice;
      }
    });
    const totalWeight = netWeight + newInvoice.taraWeight;
    const vatRate = customer?.country === 'Bosnia and Herzegovina' ? 17 : 0;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    const currency = customer?.country === 'Bosnia and Herzegovina' ? 'BAM' : 'EUR';
    return {
      totalQuantity,
      netWeight,
      totalWeight,
      subtotal,
      vatRate,
      vatAmount,
      total,
      currency
    };
  };
  const handleCreateInvoice = async () => {
    if (!newInvoice.customerId) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive"
      });
      return;
    }
    const invoiceNumber = await generateInvoiceNumber();
    const totals = calculateTotals();
    const customer = getSelectedCustomer();
    const todayDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    const issueDate = newInvoice.issueDate || todayDate; // Use today's date if empty
    const shippingDate = newInvoice.shippingDate || todayDate; // Use today's date if empty
    // Calculate due_date if not already set, using customer's payment_terms
    const issueDateObj = newInvoice.issueDate ? new Date(newInvoice.issueDate) : new Date();
    const dueDate = newInvoice.dueDate || (customer ? calculateDueDate((customer as any).payment_terms, issueDateObj) : null);
    
    // For EXW, use company address format
    let finalShippingAddress = newInvoice.shippingAddress || customer?.address;
    if (newInvoice.incoterms === 'EXW' && companyInfo) {
      const parts: string[] = [];
      if (companyInfo.postal_code) parts.push(companyInfo.postal_code);
      if (companyInfo.city) parts.push(companyInfo.city);
      if (companyInfo.country) {
        const countryCode = getCountryCode(companyInfo.country);
        if (countryCode) parts.push(countryCode);
      }
      finalShippingAddress = parts.join(', ') || finalShippingAddress;
    }
    
    const {
      data: invoiceData,
      error: invoiceError
    } = await supabase.from('invoices').insert([{
      invoice_number: invoiceNumber,
      customer_id: newInvoice.customerId,
      order_number: newInvoice.orderNumber,
      shipping_date: shippingDate,
      shipping_address: finalShippingAddress,
      incoterms: newInvoice.incoterms,
      declaration_number: newInvoice.declarationNumber,
      packing: newInvoice.packing,
      tara_weight: newInvoice.taraWeight,
      total_quantity: totals.totalQuantity,
      net_weight: totals.netWeight,
      total_weight: totals.totalWeight,
      amount: totals.total,
      currency: totals.currency,
      vat_rate: totals.vatRate,
      notes: newInvoice.notes,
      issue_date: issueDate,
      due_date: dueDate || null,
      status: 'pending'
    }]).select().single();
    if (invoiceError) {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive"
      });
      return;
    }

    // Insert invoice items
    const itemsData = invoiceItems.map(item => {
      const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryId);
      const itemData: any = {
        invoice_id: invoiceData.id,
        description: inventoryItem?.name || '',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice
      };
      // Only include inventory_id if item.inventoryId exists and is not empty
      // This allows the code to work even if the migration hasn't been run yet
      if (item.inventoryId && item.inventoryId.trim() !== '') {
        itemData.inventory_id = item.inventoryId;
        console.log('Saving invoice item with inventory_id:', item.inventoryId, 'Part number:', inventoryItem?.part_number);
      } else {
        console.warn('Invoice item missing inventoryId:', item);
      }
      return itemData;
    });
    
    const {
      error: itemsError
    } = await supabase.from('invoice_items').insert(itemsData);
    
    if (itemsError) {
      console.error('Error inserting invoice items:', itemsError);
      // If error is about inventory_id column not existing, try without it
      if (itemsError.message && itemsError.message.includes('inventory_id')) {
        // Retry without inventory_id (migration not run yet)
        const itemsDataWithoutInventoryId = itemsData.map(({ inventory_id, ...rest }) => rest);
        const { error: retryError } = await supabase.from('invoice_items').insert(itemsDataWithoutInventoryId);
        if (retryError) {
          toast({
            title: "Error",
            description: `Failed to create invoice items: ${retryError.message}`,
            variant: "destructive"
          });
          return;
        }
      } else {
        toast({
          title: "Error",
          description: `Failed to create invoice items: ${itemsError.message}`,
          variant: "destructive"
        });
        return;
      }
    }
    await fetchInvoices();
    setIsAddInvoiceOpen(false);
    resetForm();
    toast({
      title: "Success",
      description: "Invoice created successfully"
    });
  };
  const handleUpdateInvoice = async () => {
    if (!newInvoice.customerId || !selectedInvoice) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive"
      });
      return;
    }
    const totals = calculateTotals();
    const customer = getSelectedCustomer();
    const todayDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    const issueDate = newInvoice.issueDate || todayDate; // Use today's date if empty
    const shippingDate = newInvoice.shippingDate || todayDate; // Use today's date if empty

    // For EXW, use company address format
    let finalShippingAddress = newInvoice.shippingAddress || customer?.address;
    if (newInvoice.incoterms === 'EXW' && companyInfo) {
      const parts: string[] = [];
      if (companyInfo.postal_code) parts.push(companyInfo.postal_code);
      if (companyInfo.city) parts.push(companyInfo.city);
      if (companyInfo.country) {
        const countryCode = getCountryCode(companyInfo.country);
        if (countryCode) parts.push(countryCode);
      }
      finalShippingAddress = parts.join(', ') || finalShippingAddress;
    }

    // Update the invoice
    const {
      error: invoiceError
    } = await supabase.from('invoices').update({
      customer_id: newInvoice.customerId,
      order_number: newInvoice.orderNumber,
      shipping_date: shippingDate,
      shipping_address: finalShippingAddress,
      incoterms: newInvoice.incoterms,
      declaration_number: newInvoice.declarationNumber,
      packing: newInvoice.packing,
      tara_weight: newInvoice.taraWeight,
      total_quantity: totals.totalQuantity,
      net_weight: totals.netWeight,
      total_weight: totals.totalWeight,
      amount: totals.total,
      currency: totals.currency,
      vat_rate: totals.vatRate,
      notes: newInvoice.notes,
      issue_date: issueDate,
      due_date: newInvoice.dueDate || null
    }).eq('id', selectedInvoice.id);
    if (invoiceError) {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive"
      });
      return;
    }

    // Delete existing invoice items
    await supabase.from('invoice_items').delete().eq('invoice_id', selectedInvoice.id);

    // Insert updated invoice items
    const itemsData = invoiceItems.map(item => {
      const itemData: any = {
        invoice_id: selectedInvoice.id,
        description: inventoryItems.find(inv => inv.id === item.inventoryId)?.name || '',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice
      };
      // Only include inventory_id if item.inventoryId exists and is not empty
      // This allows the code to work even if the migration hasn't been run yet
      if (item.inventoryId && item.inventoryId.trim() !== '') {
        itemData.inventory_id = item.inventoryId;
      }
      return itemData;
    });
    
    const {
      error: itemsError
    } = await supabase.from('invoice_items').insert(itemsData);
    
    if (itemsError) {
      console.error('Error inserting invoice items:', itemsError);
      // If error is about inventory_id column not existing, try without it
      if (itemsError.message && itemsError.message.includes('inventory_id')) {
        // Retry without inventory_id (migration not run yet)
        const itemsDataWithoutInventoryId = itemsData.map(({ inventory_id, ...rest }) => rest);
        const { error: retryError } = await supabase.from('invoice_items').insert(itemsDataWithoutInventoryId);
        if (retryError) {
          toast({
            title: "Error",
            description: `Failed to update invoice items: ${retryError.message}`,
            variant: "destructive"
          });
          return;
        }
      } else {
        toast({
          title: "Error",
          description: `Failed to update invoice items: ${itemsError.message}`,
          variant: "destructive"
        });
        return;
      }
    }
    await fetchInvoices();
    setIsAddInvoiceOpen(false);
    resetForm();
    toast({
      title: "Success",
      description: "Invoice updated successfully"
    });
  };
  const handleSubmitInvoice = () => {
    if (isEditMode) {
      handleUpdateInvoice();
    } else {
      handleCreateInvoice();
    }
  };
  const resetForm = () => {
    setNewInvoice({
      customerId: '',
      orderNumber: '',
      issueDate: '',
      shippingDate: '',
      shippingAddress: '',
      incoterms: '',
      declarationNumber: '',
      packing: 1,
      taraWeight: 0,
      notes: '',
      dueDate: ''
    });
    setInvoiceItems([{
      inventoryId: '',
      quantity: 1,
      unitPrice: 0
    }]);
    setIsEditMode(false);
  };
  const handleDeleteInvoice = async (invoiceId: string) => {
    const {
      error
    } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (!error) {
      setInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
      toast({
        title: "Invoice Deleted",
        description: "The invoice has been successfully deleted."
      });
    }
  };
  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsPrintDialogOpen(true);
  };
  const handleEditInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setNewInvoice({
      customerId: invoice.customer_id,
      orderNumber: invoice.order_number || '',
      issueDate: invoice.issue_date || '',
      shippingDate: invoice.shipping_date || '',
      shippingAddress: invoice.shipping_address || '',
      incoterms: invoice.incoterms || '',
      declarationNumber: invoice.declaration_number || '',
      packing: invoice.packing || 1,
      taraWeight: invoice.tara_weight || 0,
      notes: invoice.notes || '',
      dueDate: invoice.due_date || ''
    });
    setInvoiceItems(invoice.invoice_items?.map(item => ({
      // Use inventory_id if available, otherwise fallback to name lookup for backward compatibility
      inventoryId: item.inventory_id 
        ? item.inventory_id 
        : inventoryItems.find(inv => inv.name === item.description)?.id || '',
      quantity: item.quantity,
      unitPrice: item.unit_price
    })) || [{
      inventoryId: '',
      quantity: 1,
      unitPrice: 0
    }]);
    setIsEditMode(true);
    setIsAddInvoiceOpen(true);
  };
  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, {
      inventoryId: '',
      quantity: 1,
      unitPrice: 0
    }]);
  };
  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };
  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const updated = [...invoiceItems];
    updated[index] = {
      ...updated[index],
      [field]: value
    };

    // Auto-fill unit price when inventory item is selected
    if (field === 'inventoryId') {
      const inventoryItem = inventoryItems.find(item => item.id === value);
      if (inventoryItem) {
        updated[index].unitPrice = inventoryItem.unit_price;
      }
    }
    setInvoiceItems(updated);
  };
  // Function to estimate lines an item will take based on description length
  const estimateItemLines = (item: any) => {
    const description = item.description || '';
    // Part name column is 25% of content width (180mm - 15mm padding each side = 150mm effective)
    // At 0.7rem font size (11.2px), average char width ~6.5px
    // Column width: 25% of 150mm ≈ 37.5mm ≈ 142px ≈ 22 characters per line
    // Using conservative estimate of 25 characters per line for safety
    const charsPerLine = 25;
    const descriptionLines = Math.max(1, Math.ceil(description.length / charsPerLine));
    // Each row takes at least 1 line (for the row itself), but description can wrap
    return descriptionLines;
  };

  // Function to calculate items per page based on lines and split into pages
  const paginateInvoiceItems = (items: any[]) => {
    if (!items || items.length === 0) return [];
    
    // Calculate available lines per page
    // Page height: 297mm - 25mm padding (15mm top + 10mm bottom) = 272mm
    // Header section: ~80mm (company header + invoice header)
    // Footer section: ~30mm
    // Line height: ~16.8px (0.7rem * 1.5 line-height) ≈ 4.4mm per line
    // Available for items on full pages: (272mm - 80mm - 30mm) / 4.4mm ≈ 37 lines
    // Available for items on last page (with summary ~60mm): (272mm - 80mm - 30mm - 60mm) / 4.4mm ≈ 23 lines
    const linesPerFullPage = 35; // Conservative estimate
    const linesPerLastPage = 11; // Conservative estimate for last page with summary
    
    // Calculate lines for each item
    const itemsWithLines = items.map(item => ({
      item,
      lines: estimateItemLines(item)
    }));
    
    const pages: any[][] = [];
    let currentIndex = 0;
    let currentLines = 0;
    let currentPageItems: any[] = [];
    const isLastPage = (remainingItems: typeof itemsWithLines) => {
      // Check if remaining items can fit on last page
      const remainingLines = remainingItems.reduce((sum, { lines }) => sum + lines, 0);
      return remainingLines <= linesPerLastPage;
    };
    
    while (currentIndex < itemsWithLines.length) {
      const { item, lines } = itemsWithLines[currentIndex];
      const remainingItems = itemsWithLines.slice(currentIndex);
      const willBeLastPage = isLastPage(remainingItems);
      const maxLinesForCurrentPage = willBeLastPage ? linesPerLastPage : linesPerFullPage;
      
      if (currentLines + lines <= maxLinesForCurrentPage) {
        // Item fits on current page
        currentPageItems.push(item);
        currentLines += lines;
        currentIndex++;
      } else {
        // Item doesn't fit, start new page
        if (currentPageItems.length > 0) {
          pages.push(currentPageItems);
          currentPageItems = [];
          currentLines = 0;
        } else {
          // Item is too large for even a single page, add it anyway
          currentPageItems.push(item);
          currentLines += lines;
          currentIndex++;
        }
      }
    }
    
    // Add remaining items as last page
    if (currentPageItems.length > 0) {
      pages.push(currentPageItems);
    }
    
    return pages.length > 0 ? pages : [items];
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm || invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) || invoice.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const effectiveStatus = getEffectiveStatus(invoice);
    const matchesStatus = selectedStatus === "all" || effectiveStatus === selectedStatus;
    const matchesCustomer = selectedCustomerFilter === "all" || invoice.customer_id === selectedCustomerFilter;
    const invoiceDateStr = invoice.issue_date || invoice.created_at;
    const invoiceTime = invoiceDateStr ? new Date(invoiceDateStr).getTime() : undefined;
    const fromTime = dateRange.from ? dateRange.from.getTime() : undefined;
    const toTime = dateRange.to ? (() => {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      return toDate.getTime();
    })() : undefined;
    const matchesDateRange =
      (!fromTime || (invoiceTime !== undefined && invoiceTime >= fromTime)) &&
      (!toTime || (invoiceTime !== undefined && invoiceTime <= toTime));
    return matchesSearch && matchesStatus && matchesCustomer && matchesDateRange;
  });
  const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  const paidInvoices = invoices.filter(inv => getEffectiveStatus(inv) === "paid");
  const pendingInvoices = invoices.filter(inv => getEffectiveStatus(inv) === "pending");
  const overdueInvoices = invoices.filter(inv => getEffectiveStatus(inv) === "overdue");
  const totals = calculateTotals();
  const selectedCustomer = getSelectedCustomer();

  const [printingInvoice, setPrintingInvoice] = useState(false);

  const printInvoice = async () => {
    if (!invoiceContainerRef.current || !selectedInvoice) {
      toast({
        title: "Error",
        description: "Invoice not found. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setPrintingInvoice(true);
    try {
      const container = invoiceContainerRef.current;
      const pages = container.querySelectorAll('.print-invoice-page');
      
      if (pages.length === 0) {
        toast({
          title: "Error",
          description: "No invoice pages found to print.",
          variant: "destructive"
        });
        setPrintingInvoice(false);
        return;
      }

      // Create a hidden iframe for printing
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'absolute';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';
      printIframe.style.left = '-9999px';
      document.body.appendChild(printIframe);

      // Calculate dimensions for A4
      const mmToPixels = (mm: number) => (mm * 96) / 25.4;
      const baseWidthPx = mmToPixels(210);
      const baseHeightPx = mmToPixels(297);

      // Process each page
      const imageDataArray: string[] = [];
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Create a temporary container for this page
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '210mm';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.fontSize = '16px';
        tempContainer.appendChild(page.cloneNode(true));
        document.body.appendChild(tempContainer);

        // Convert to canvas
        const canvas = await html2canvas(tempContainer, {
          scale: 2, // Good quality for printing
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
            const clonedContainer = clonedDoc.querySelector('.print-invoice-page');
            if (clonedContainer) {
              (clonedContainer as HTMLElement).style.transform = 'scale(1)';
            }
            
            const allImages = clonedDoc.querySelectorAll('img');
            allImages.forEach((img: any) => {
              if (img.style) {
                img.style.display = 'inline-block';
                img.style.verticalAlign = 'middle';
              }
            });
            
            const allCells = clonedDoc.querySelectorAll('.invoice-items-table th, .invoice-items-table td');
            allCells.forEach((cell: any) => {
              if (cell.style) {
                cell.style.verticalAlign = 'middle';
                cell.setAttribute('valign', 'middle');
              }
            });
          }
        });

        // Get image data
        const imgData = canvas.toDataURL('image/png');
        imageDataArray.push(imgData);

        // Clean up
        document.body.removeChild(tempContainer);
      }

      // Wait for iframe to be ready
      printIframe.onload = () => {
        const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
        if (!iframeDoc) {
          toast({
            title: "Error",
            description: "Failed to prepare print content.",
            variant: "destructive"
          });
          setPrintingInvoice(false);
          document.body.removeChild(printIframe);
          return;
        }

        // Build HTML with all pages
        let imagesHTML = '';
        imageDataArray.forEach((imgData, index) => {
          if (index > 0) {
            imagesHTML += '<div style="page-break-before: always;"></div>';
          }
          imagesHTML += `<img src="${imgData}" style="width: 210mm; height: auto; display: block; ${index < imageDataArray.length - 1 ? 'page-break-after: always;' : ''}" />`;
        });

        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invoice ${selectedInvoice.invoice_number}</title>
              <style>
                @media print {
                  @page {
                    size: A4;
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                  }
                  img {
                    width: 210mm;
                    height: auto;
                    display: block;
                  }
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                img {
                  width: 210mm;
                  height: auto;
                  display: block;
                }
              </style>
            </head>
            <body>
              ${imagesHTML}
            </body>
          </html>
        `);
        iframeDoc.close();

        // Wait for images to load, then print
        const iframeWindow = printIframe.contentWindow;
        if (iframeWindow) {
          iframeWindow.onload = () => {
            setTimeout(() => {
              iframeWindow.focus();
              iframeWindow.print();
              setPrintingInvoice(false);
              // Clean up iframe after a delay
              setTimeout(() => {
                if (printIframe.parentNode) {
                  document.body.removeChild(printIframe);
                }
              }, 1000);
            }, 500);
          };
          // Trigger load event if already loaded
          if (iframeDoc.readyState === 'complete') {
            iframeWindow.onload?.({} as Event);
          }
        }
      };

      // Set iframe src to trigger onload
      printIframe.src = 'about:blank';

    } catch (error) {
      console.error('Error printing invoice:', error);
      toast({
        title: "Error",
        description: "Failed to print invoice. Please try again.",
        variant: "destructive"
      });
      setPrintingInvoice(false);
    }
  };

  const printInvoiceWithMediaPrint = () => {
    if (!invoiceContainerRef.current || !selectedInvoice) {
      toast({
        title: "Error",
        description: "Invoice not found. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setPrintingInvoice(true);
    try {
      const container = invoiceContainerRef.current;
      const pages = container.querySelectorAll('.print-invoice-page');
      
      if (pages.length === 0) {
        toast({
          title: "Error",
          description: "No invoice pages found to print.",
          variant: "destructive"
        });
        setPrintingInvoice(false);
        return;
      }

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Please allow popups to print the invoice.",
          variant: "destructive"
        });
        setPrintingInvoice(false);
        return;
      }

      // Clone all pages with deep cloning to preserve styles
      const pagesHTML: string[] = [];
      pages.forEach((page) => {
        const clonedPage = page.cloneNode(true) as HTMLElement;
        // Remove any print:hidden elements
        const hiddenElements = clonedPage.querySelectorAll('.print\\:hidden, [class*="print:hidden"]');
        hiddenElements.forEach(el => el.remove());
        pagesHTML.push(clonedPage.outerHTML);
      });

      // Get all inline styles from the document
      const inlineStyles = Array.from(document.querySelectorAll('style')).map(style => style.innerHTML).join('\n');
      
      // Get all linked stylesheets
      const stylesheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => `<link rel="stylesheet" href="${(link as HTMLLinkElement).href}">`)
        .join('\n');
      
      // Get CSS variables from root
      const rootStyles = window.getComputedStyle(document.documentElement);
      const cssVariables = Array.from(rootStyles).filter(prop => prop.startsWith('--'))
        .map(prop => `  ${prop}: ${rootStyles.getPropertyValue(prop)};`)
        .join('\n');
      
      // Write the HTML with all styles
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${selectedInvoice.invoice_number}</title>
            <meta charset="utf-8">
            ${stylesheetLinks}
            <style>
              :root {
${cssVariables}
              }
              
              ${inlineStyles}
              
              /* Ensure @media print styles are applied */
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
                
                /* Reduce gap between company header and invoice header */
                .company-header {
                  margin-bottom: 0.3rem !important;
                }
                
                /* Ensure consistent line-height for customer details, invoice details, and summary sections */
                /* Customer details section (Bill To) */
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
                
                /* Add spacing between customer detail lines to match invoice details */
                .invoice-header > div:first-child p:not(:last-child) {
                  margin-bottom: 0.5rem !important;
                }
                
                /* Invoice details section (Invoice Number, Issue Date, etc.) */
                .invoice-header > div:last-child,
                .invoice-header .text-right,
                .invoice-header .text-right p,
                .invoice-header .text-right div,
                .invoice-header .text-right div p,
                .invoice-header .text-right .space-y-1 p,
                .invoice-header .text-right .space-y-2 p {
                  line-height: 1.4 !important;
                }
                
                /* Summary section */
                .grid.grid-cols-2,
                .grid.grid-cols-2 h3,
                .grid.grid-cols-2 p,
                .grid.grid-cols-2 .space-y-1,
                .grid.grid-cols-2 .space-y-1 p,
                .grid.grid-cols-2 .space-y-2,
                .grid.grid-cols-2 .space-y-2 p,
                .grid.grid-cols-2 > div,
                .grid.grid-cols-2 > div p,
                .grid.grid-cols-2 > div > div,
                .grid.grid-cols-2 > div > div p {
                  line-height: 1.4 !important;
                }
                
                .invoice-items-table thead {
                  background-color: transparent !important;
                  background: transparent !important;
                  margin-top: 0mm !important;
                 
                }
                
                .invoice-items-table thead th {
                  background-color: transparent !important;
                  background: transparent !important;
                  border-top: none !important;
                  border-bottom: none !important;
                  border-left: none !important;
                  border-right: none !important;
                  border: none !important;
                }
                
                .invoice-items-table td {
                  vertical-align: top !important;
                  border-top: 1px solid rgb(212, 212, 212) !important;
                  border-bottom: none !important;
                  border-left: none !important;
                  border-right: none !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                /* Add border-bottom only to the last row */
                .invoice-items-table tbody tr:last-child td {
                  border-bottom: 1px solid rgb(212, 212, 212) !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                /* Column widths for proper wrapping - match screen widths */
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
                
                /* Summary section grid layout */
                .grid.grid-cols-2 {
                  display: grid !important;
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  gap: 1.5rem !important;
                  position: relative !important;
                }
                
                /* Total amount background styling */
                .total-amount-bg {
                  position: absolute !important;
                  width: 286px !important;
                  padding-left: 50px !important;
                  padding-right: 48px !important;
                  right: 7px !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                   .invoice-title-bg {
                     position: absolute !important;
                     width: 286px !important;
                     padding-left: 23px !important;
                     right: 7px !important;
                     justify-content: left !important;
                     -webkit-print-color-adjust: exact !important;
                     print-color-adjust: exact !important;
                     color-adjust: exact !important;
                   }

                   .total-amount-bg {
                     position: absolute !important;
                     width: 286px !important;
                     padding-left: 23px !important;
                     right: 7px !important;
                     -webkit-print-color-adjust: exact !important;
                     print-color-adjust: exact !important;
                     color-adjust: exact !important;
                   }
                
                .print-invoice-bg {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                /* Spacing for Subtotal, VAT labels and values */
                .grid.grid-cols-2 > div:last-child .flex.justify-between {
                  display: flex !important;
                  justify-content: space-between !important;
                  width: 100% !important;
                  gap: 1rem !important;
                }
                
                /* Total row spacing - reduce gap to match Subtotal/VAT visual spacing */
                #invoice-total-amount.flex.justify-between {
                  display: flex !important;
                  justify-content: space-between !important;
                  
                  gap: 0.5rem !important;
                }
                
                /* Total amount div with gray background - specific ID for PDF print */
                #invoice-total-amount {
                  position: absolute !important;
                  width: 286px !important;
                  padding-left: 50px !important;
                  padding-right: 48px !important;
                  padding-top: 2px !important;
                  height: 30px !important;
                  right: -50px !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                /* VAT Exemption Statement - specific ID for PDF print */
                #invoice-vat-exemption-statement {
                  position: absolute !important;
                  right: -50px !important;
                  width: 286px !important;
                  padding-left: 0px !important;
                  padding-right: 0px !important;
                  margin-top: 46px !important;
                  text-align: left !important;
                  color: #303030 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                /* Signatory - specific ID for PDF print */
                #invoice-signatory {
                  position: absolute !important;
                  right: -50px !important;
                  width: 286px !important;
                  padding-left: 50px !important;
                  padding-right: 48px !important;
                  text-align: center !important;
                  font-size: 0.7rem !important;
                  /* margin-top is set dynamically based on customer country */
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
              }
              
              /* Screen styles for preview */
              body {
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
              }
              
              .print-invoice-page {
                width: 210mm;
                height: 297mm;
                background: white;
                margin: 0 auto 20px;
                padding: 15mm 15mm 10mm 15mm;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                box-sizing: border-box;
              }
            </style>
          </head>
          <body>
            ${pagesHTML.join('')}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content and stylesheets to load, then print
      const printWhenReady = () => {
        // Wait for stylesheets to load
        const stylesheets = printWindow.document.querySelectorAll('link[rel="stylesheet"]');
        let loadedStylesheets = 0;
        
        if (stylesheets.length === 0) {
          // No external stylesheets, proceed immediately
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            setPrintingInvoice(false);
            // Close the window after printing (user can cancel)
            setTimeout(() => {
              printWindow.close();
            }, 1000);
          }, 500);
        } else {
          // Wait for all stylesheets to load
          stylesheets.forEach((link) => {
            const linkEl = link as HTMLLinkElement;
            if (linkEl.sheet || linkEl.href === '') {
              loadedStylesheets++;
            } else {
              linkEl.onload = () => {
                loadedStylesheets++;
                if (loadedStylesheets === stylesheets.length) {
                  setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    setPrintingInvoice(false);
                    setTimeout(() => {
                      printWindow.close();
                    }, 1000);
                  }, 500);
                }
              };
              linkEl.onerror = () => {
                loadedStylesheets++;
                if (loadedStylesheets === stylesheets.length) {
                  setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    setPrintingInvoice(false);
                    setTimeout(() => {
                      printWindow.close();
                    }, 1000);
                  }, 500);
                }
              };
            }
          });
          
          // If all stylesheets are already loaded
          if (loadedStylesheets === stylesheets.length) {
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
              setPrintingInvoice(false);
              setTimeout(() => {
                printWindow.close();
              }, 1000);
            }, 500);
          }
        }
      };
      
      // Wait for window to be ready
      if (printWindow.document.readyState === 'complete') {
        printWhenReady();
      } else {
        printWindow.onload = printWhenReady;
      }
      
    } catch (error) {
      console.error('Error printing invoice with media print:', error);
      toast({
        title: "Error",
        description: "Failed to print invoice. Please try again.",
        variant: "destructive"
      });
      setPrintingInvoice(false);
    }
  };

  const generatePDF = async () => {
    if (!invoiceContainerRef.current || !selectedInvoice) {
      toast({
        title: "Error",
        description: "Invoice not found. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingPDF(true);
    try {
      const container = invoiceContainerRef.current;
      const pages = container.querySelectorAll('.print-invoice-page');
      
      if (pages.length === 0) {
        toast({
          title: "Error",
          description: "No invoice pages found to generate PDF.",
          variant: "destructive"
        });
        return;
      }

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

        // Calculate dimensions - use scale for quality
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
            
            // Force vertical-align middle on all table cells and fix borders
            const allCells = clonedDoc.querySelectorAll('.invoice-items-table th, .invoice-items-table td');
            allCells.forEach((cell: any) => {
              if (cell.style) {
                cell.style.verticalAlign = 'middle';
                cell.setAttribute('valign', 'middle');
              }
            });
            
            // Fix table cell borders - remove border-bottom from all cells
            const allTdCells = clonedDoc.querySelectorAll('.invoice-items-table tbody td');
            allTdCells.forEach((cell: any) => {
              if (cell.style) {
                cell.style.borderBottom = 'none';
              }
            });
            
            // Add border-bottom only to last row cells
            const lastRow = clonedDoc.querySelector('.invoice-items-table tbody tr:last-child');
            if (lastRow) {
              const lastRowCells = lastRow.querySelectorAll('td');
              lastRowCells.forEach((cell: any) => {
                if (cell.style) {
                  cell.style.borderBottom = '1px solid #6b7280';
                }
              });
            }
            
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
      const fileName = `Invoice_${selectedInvoice.invoice_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "Success",
        description: "PDF generated successfully!"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  return <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoicing</h1>
          <p className="text-muted-foreground">
            Manage invoices and track payments
          </p>
        </div>
        <Button size="icon" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-4 h-4" />
        </Button>
        <Dialog open={isAddInvoiceOpen} onOpenChange={open => {
        setIsAddInvoiceOpen(open);
        if (!open) resetForm();
      }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
              <DialogDescription>
                Fill in the invoice details and add products
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Customer and Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer *</Label>
                  <Select value={newInvoice.customerId} onValueChange={value => {
                  setNewInvoice({
                    ...newInvoice,
                    customerId: value
                  });
                  const customer = customers.find(c => c.id === value);
                  if (customer) {
                    // Use issue_date from newInvoice if set, otherwise use today
                    const issueDate = newInvoice.issueDate 
                      ? new Date(newInvoice.issueDate) 
                      : new Date();
                    const paymentTerms = (customer as any).payment_terms;
                    // Only recalculate due date if payment_terms exists
                    let dueDate = '';
                    if (paymentTerms !== null && paymentTerms !== undefined) {
                      dueDate = calculateDueDate(paymentTerms, issueDate);
                    } else if (isEditMode && newInvoice.dueDate) {
                      // Keep existing due date if no payment terms
                      dueDate = newInvoice.dueDate;
                    }
                    
                    // Determine shipping address based on incoterm if already selected
                    let shippingAddress = customer.address || '';
                    if (newInvoice.incoterms === 'DAP' && (customer as any).dap_address) {
                      shippingAddress = (customer as any).dap_address;
                    } else if (newInvoice.incoterms === 'FCO' && (customer as any).fco_address) {
                      shippingAddress = (customer as any).fco_address;
                    }
                    
                    setNewInvoice(prev => ({
                      ...prev,
                      shippingAddress: shippingAddress,
                      declarationNumber: customer.declaration_numbers?.[0] || '',
                      dueDate: dueDate
                    }));
                  }
                }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Order Number</Label>
                  <Input value={newInvoice.orderNumber} onChange={e => setNewInvoice({
                  ...newInvoice,
                  orderNumber: e.target.value
                })} placeholder="Enter order number" />
                </div>

                <div>
                  <Label>Issue Date</Label>
                  <Input type="date" value={newInvoice.issueDate} onChange={e => {
                    const newIssueDate = e.target.value;
                    const customer = getSelectedCustomer();
                    let dueDate = newInvoice.dueDate;
                    
                    // Recalculate due date if customer has payment terms
                    if (customer && (customer as any).payment_terms !== null && (customer as any).payment_terms !== undefined) {
                      const issueDateObj = newIssueDate ? new Date(newIssueDate) : new Date();
                      dueDate = calculateDueDate((customer as any).payment_terms, issueDateObj);
                    }
                    
                    setNewInvoice({
                      ...newInvoice,
                      issueDate: newIssueDate,
                      dueDate: dueDate
                    });
                  }} />
                </div>

                <div>
                  <Label>Shipping Date</Label>
                  <Input type="date" value={newInvoice.shippingDate} onChange={e => setNewInvoice({
                  ...newInvoice,
                  shippingDate: e.target.value
                })} />
                </div>

                <div>
                  <Label>Incoterms</Label>
                  <Select value={newInvoice.incoterms} onValueChange={value => {
                    const customer = getSelectedCustomer();
                    let shippingAddress = newInvoice.shippingAddress;
                    
                    // Auto-populate shipping address based on incoterm
                    if (value === 'EXW' && companyInfo) {
                      // For EXW, use company's postal code, city, and country code
                      const parts: string[] = [];
                      if (companyInfo.postal_code) parts.push(companyInfo.postal_code);
                      if (companyInfo.city) parts.push(companyInfo.city);
                      if (companyInfo.country) {
                        const countryCode = getCountryCode(companyInfo.country);
                        if (countryCode) parts.push(countryCode);
                      }
                      shippingAddress = parts.join(', ') || shippingAddress;
                    } else if (customer) {
                      if (value === 'DAP' && (customer as any).dap_address) {
                        shippingAddress = (customer as any).dap_address;
                      } else if (value === 'FCO' && (customer as any).fco_address) {
                        shippingAddress = (customer as any).fco_address;
                      }
                    }
                    
                    setNewInvoice({
                  ...newInvoice,
                      incoterms: value,
                      shippingAddress: shippingAddress
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select incoterms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                      <SelectItem value="DAP">DAP - Delivered At Place</SelectItem>
                      <SelectItem value="FCO">FCO - Free Carrier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <Label>Shipping Address *</Label>
                <Textarea value={newInvoice.shippingAddress} onChange={e => setNewInvoice({
                ...newInvoice,
                shippingAddress: e.target.value
              })} placeholder="Shipping address (auto-filled from customer)" rows={3} />
              </div>

              {/* Declaration Number and Packing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Declaration Number *</Label>
                  <Select value={newInvoice.declarationNumber} onValueChange={value => setNewInvoice({
                  ...newInvoice,
                  declarationNumber: value
                })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select declaration number" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCustomer?.declaration_numbers?.map((number, index) => <SelectItem key={index} value={number}>
                          {number}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Packing (packages)</Label>
                  <Input type="number" value={newInvoice.packing} onChange={e => setNewInvoice({
                  ...newInvoice,
                  packing: parseInt(e.target.value) || 1
                })} min="1" />
                </div>

                <div>
                  <Label>TARA Weight (kg)</Label>
                  <Input type="number" step="0.01" value={newInvoice.taraWeight} onChange={e => setNewInvoice({
                  ...newInvoice,
                  taraWeight: parseFloat(e.target.value) || 0
                })} min="0" />
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="mb-4">
                  <Label className="text-lg font-semibold">Invoice Items</Label>
                </div>

                <div className="space-y-3">
                  {invoiceItems.map((item, index) => <div key={index} className="grid gap-2 p-3 border rounded-lg" style={{ gridTemplateColumns: '2fr 0.8fr 0.8fr 0.8fr 0.8fr' }}>
                      <div>
                        <Label className="text-xs">Product</Label>
                        <Popover 
                          open={productSearchOpen[index] || false} 
                          onOpenChange={(open) => setProductSearchOpen(prev => ({ ...prev, [index]: open }))}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between text-left font-normal"
                            >
                              {item.inventoryId ? (() => {
                                const selectedItem = inventoryItems.find(invItem => invItem.id === item.inventoryId);
                                return selectedItem ? (
                                  <div className="flex flex-col items-start flex-1">
                                    <span>{selectedItem.name}</span>
                                    {selectedItem.part_number && (
                                      <span className="text-xs text-muted-foreground">Part #: {selectedItem.part_number}</span>
                                    )}
                                  </div>
                                ) : "Select product...";
                              })() : "Select product..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput 
                                placeholder="Search products..." 
                                value={productSearchTerms[index] || ''}
                                onValueChange={(value) => {
                                  setProductSearchTerms(prev => ({ ...prev, [index]: value }));
                                }}
                              />
                              <CommandList>
                                <CommandEmpty>No products found.</CommandEmpty>
                                <CommandGroup>
                                  {inventoryItems
                                    .filter(invItem => {
                                      const searchTerm = (productSearchTerms[index] || '').toLowerCase();
                                      if (!searchTerm) return true;
                                      const nameMatch = invItem.name.toLowerCase().includes(searchTerm);
                                      const partNumberMatch = (invItem.part_number || '').toLowerCase().includes(searchTerm);
                                      return nameMatch || partNumberMatch;
                                    })
                                    .map((invItem) => (
                                      <CommandItem
                                        key={invItem.id}
                                        value={`${invItem.name} ${invItem.part_number || ''}`}
                                        onSelect={() => {
                                          updateInvoiceItem(index, 'inventoryId', invItem.id);
                                          setProductSearchOpen(prev => ({ ...prev, [index]: false }));
                                          setProductSearchTerms(prev => ({ ...prev, [index]: '' }));
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            item.inventoryId === invItem.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span>{invItem.name}</span>
                                          {invItem.part_number && (
                                            <span className="text-xs text-muted-foreground">Part #: {invItem.part_number}</span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" value={item.quantity} onChange={e => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)} min="1" />
                      </div>

                      <div>
                        <Label className="text-xs">Unit Price</Label>
                        <Input type="number" step="0.01" value={item.unitPrice} onChange={e => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} min="0" />
                      </div>

                      <div>
                        <Label className="text-xs">Total</Label>
                        <Input value={(item.quantity * item.unitPrice).toFixed(2)} disabled className="bg-muted" />
                      </div>

                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeInvoiceItem(index)} disabled={invoiceItems.length === 1}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>)}
                </div>
                
                <div className="mt-3">
                  <Button type="button" onClick={addInvoiceItem} size="sm" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Calculations Display */}
              {selectedCustomer && <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Quantity:</span>
                      <span className="font-medium">{totals.totalQuantity} pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Weight:</span>
                      <span className="font-medium">{totals.netWeight.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Weight:</span>
                      <span className="font-medium">{totals.totalWeight.toFixed(2)} kg</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatCurrency(totals.subtotal, totals.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT ({totals.vatRate}%):</span>
                      <span className="font-medium">{formatCurrency(totals.vatAmount, totals.currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(totals.total, totals.currency)}</span>
                    </div>
                  </div>
                </div>}

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Textarea value={newInvoice.notes} onChange={e => setNewInvoice({
                ...newInvoice,
                notes: e.target.value
              })} placeholder="Additional notes..." rows={3} />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleSubmitInvoice}>
                {isEditMode ? 'Update Invoice' : 'Create Invoice'}
              </Button>
              <Button variant="outline" onClick={() => setIsAddInvoiceOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice Settings</DialogTitle>
              <DialogDescription>
                Configure invoice appearance and content
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General Settings</TabsTrigger>
                <TabsTrigger value="domestic">Domestic Invoices</TabsTrigger>
                <TabsTrigger value="foreign">Foreign Invoices</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" value={invoiceSettings.primaryColor} onChange={e => setInvoiceSettings(prev => ({
                    ...prev,
                    primaryColor: e.target.value
                  }))} className="w-16 h-10 p-1 border rounded" />
                    <Input type="text" value={invoiceSettings.primaryColor} onChange={e => setInvoiceSettings(prev => ({
                    ...prev,
                    primaryColor: e.target.value
                  }))} placeholder="#000000" className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Signatory</Label>
                  <Input 
                    type="text" 
                    value={invoiceSettings.signatory} 
                    onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      signatory: e.target.value
                    }))} 
                    placeholder="Enter signatory name" 
                    className="w-full" 
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="domestic" className="space-y-4">
                <div className="space-y-4">
                  <Label>Footer Content for Domestic Invoices (3 Columns)</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Column 1</Label>
                      <Textarea value={invoiceSettings.domesticFooter[0]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      domesticFooter: [e.target.value, prev.domesticFooter[1], prev.domesticFooter[2]]
                    }))} placeholder="Enter content for column 1..." rows={4} />
                    </div>
                    <div>
                      <Label className="text-sm">Column 2</Label>
                      <Textarea value={invoiceSettings.domesticFooter[1]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      domesticFooter: [prev.domesticFooter[0], e.target.value, prev.domesticFooter[2]]
                    }))} placeholder="Enter content for column 2..." rows={4} />
                    </div>
                    <div>
                      <Label className="text-sm">Column 3</Label>
                      <Textarea value={invoiceSettings.domesticFooter[2]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      domesticFooter: [prev.domesticFooter[0], prev.domesticFooter[1], e.target.value]
                    }))} placeholder="Enter content for column 3..." rows={4} />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="foreign" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Note for Foreign Invoices</Label>
                    <Textarea 
                      value={invoiceSettings.foreignNote} 
                      onChange={e => setInvoiceSettings(prev => ({
                        ...prev,
                        foreignNote: e.target.value
                      }))} 
                      placeholder="Enter note text (will appear above footer, justified). Use {invoice_number} to insert invoice number." 
                      rows={3} 
                    />
                    <p className="text-xs text-muted-foreground mt-1">This note will appear above the footer line with justified text alignment. Use <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{invoice_number}"}</code> to automatically insert the invoice number.</p>
                  </div>
                  <Label>Footer Content for Foreign Invoices (3 Columns)</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Column 1</Label>
                      <Textarea value={invoiceSettings.foreignFooter[0]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      foreignFooter: [e.target.value, prev.foreignFooter[1], prev.foreignFooter[2]]
                    }))} placeholder="Enter content for column 1..." rows={4} />
                    </div>
                    <div>
                      <Label className="text-sm">Column 2</Label>
                      <Textarea value={invoiceSettings.foreignFooter[1]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      foreignFooter: [prev.foreignFooter[0], e.target.value, prev.foreignFooter[2]]
                    }))} placeholder="Enter content for column 2..." rows={4} />
                    </div>
                    <div>
                      <Label className="text-sm">Column 3</Label>
                      <Textarea value={invoiceSettings.foreignFooter[2]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      foreignFooter: [prev.foreignFooter[0], prev.foreignFooter[1], e.target.value]
                    }))} placeholder="Enter content for column 3..." rows={4} />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={async () => {
              await saveInvoiceSettings();
              setIsSettingsOpen(false);
            }}>
                Save Settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time invoiced amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0).toLocaleString()} collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0).toLocaleString()} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {overdueInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0).toLocaleString()} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Search invoices..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedCustomerFilter} onValueChange={setSelectedCustomerFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from && dateRange.to 
                ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                : dateRange.from 
                ? `From ${format(dateRange.from, "MMM dd, yyyy")}`
                : "Date Range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                setDateRange({
                  from: range?.from,
                  to: range?.to
                });
                // Close popover when both dates are selected
                if (range?.from && range?.to) {
                  setIsDateRangeOpen(false);
                }
              }}
              numberOfMonths={2}
              className="rounded-md border"
            />
          </PopoverContent>
        </Popover>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          <Button onClick={() => setIsAddInvoiceOpen(true)}>
            + Add Invoice
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredInvoices.map(invoice => <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors min-h-[80px]">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="min-w-[120px]">
                    <button onClick={() => handleViewInvoice(invoice)} className="text-primary hover:underline font-medium text-left">
                      {invoice.invoice_number}
                    </button>
                  </div>
                  <div className="min-w-[100px]">
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-medium">{formatDate(invoice.issue_date)}</p>
                  </div>
                  <div className="min-w-[100px]">
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">{invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}</p>
                  </div>
                  <div className="min-w-[150px]">
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{invoice.customers?.name}</p>
                  </div>
                  <div className="min-w-[100px]">
                    <InvoiceStatusBadge invoice={invoice} onStatusChange={async (newStatus) => {
                      const { error } = await supabase
                        .from('invoices')
                        .update({ status: newStatus })
                        .eq('id', invoice.id);
                      
                      if (error) {
                        toast({
                          title: "Error",
                          description: "Failed to update invoice status",
                          variant: "destructive"
                        });
                      } else {
                        await fetchInvoices();
                        toast({
                          title: "Status Updated",
                          description: `Invoice status changed to ${newStatus}`
                        });
                      }
                    }} />
                  </div>
                   <div className="min-w-[120px] text-right">
                     <p className="text-sm text-muted-foreground">Total</p>
                     <p className="font-bold text-lg">{formatCurrency(invoice.amount || 0, invoice.currency)}</p>
                   </div>
                </div>
                
                <div className="flex gap-1 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => handleViewInvoice(invoice)} title="View Invoice">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEditInvoice(invoice)} title="Edit Invoice">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete invoice "{invoice.invoice_number}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>)}
          </div>
        </CardContent>
      </Card>

      {/* Printable Invoice Dialog */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="!max-w-[240mm] !w-auto max-h-[90vh] overflow-y-auto print:!max-w-none print:!w-full print:!h-full print:!max-h-none print:!p-0 print:!m-0 print:!shadow-none print:!border-none print:!rounded-none invoice-dialog-content">
          
          <div ref={invoiceContainerRef}>
          {selectedInvoice && <>
              <style>{`
                /* Screen preview styles - A4 dimensions */
                @media screen {
                  .invoice-dialog-content,
                  [data-radix-dialog-content].invoice-dialog-content {
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
                  
                  .print-invoice-page {
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

                  /* Scale invoice preview typography to 80% */
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
                    gap: 24px !important;
                  }

                  .invoice-footer-columns > div {
                    flex: 1 1 0 !important;
                  }
                  
                  /* Invoice items table - screen preview */
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
                    vertical-align: bottom !important;
                  }
                  
                  .invoice-items-table td {
                    vertical-align: top !important;
                    border-top: 1px solid rgb(212, 212, 212) !important;
                    border-bottom: none !important;
                  }
                  
                  /* Add border-bottom only to the last row */
                  .invoice-items-table tbody tr:last-child td {
                    border-bottom: 1px solid rgb(212, 212, 212) !important;
                  }
                  
                  /* Column widths for proper wrapping - screen */
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
                  /* Hide all overlays, backdrops, buttons, and dialog wrappers */
                  [data-radix-dialog-overlay],
                  [data-radix-dialog-overlay] *,
                  [class*="bg-black/80"],
                  [class*="bg-black/50"],
                  [class*="overlay"],
                  .fixed.inset-0.z-50,
                  .print\\:hidden,
                  button,
                  [role="button"],
                  [type="button"],
                  a[role="button"],
                  [data-radix-dialog-content] > div:not(.print-invoice-page),
                  [role="dialog"] > *:not(.print-invoice-page),
                  [data-radix-dialog-content] > div:has(button),
                  [data-radix-dialog-content] > div:has([role="button"]),
                  /* Hide any container with buttons (but not if it contains invoice page) */
                  [data-radix-dialog-content] > div:has(> button):not(:has(.print-invoice-page)),
                  [data-radix-dialog-content] > div:has(> [role="button"]):not(:has(.print-invoice-page)) {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    height: 0 !important;
                    width: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  
                  /* Reset body and html for print */
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 210mm !important;
                    height: 297mm !important;
                    background: white !important;
                    overflow: visible !important;
                  }
                  
                  /* Reset dialog content for print */
                  [data-radix-dialog-content],
                  [role="dialog"],
                  [data-radix-portal] > div:last-child {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: transparent !important;
                    background-color: transparent !important;
                    max-width: none !important;
                    width: 210mm !important;
                    height: 297mm !important;
                    box-shadow: none !important;
                    border: none !important;
                    position: relative !important;
                    opacity: 1 !important;
                  }
                  
                  /* A4 page with no margins */
                  @page {
                    margin: 0 !important;
                    size: A4;
                  }
                  
                  /* White paper page - exact A4 dimensions */
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
                  
                  /* Page break before all pages except first */
                  .print-invoice-page.page-break {
                    page-break-before: always !important;
                  }
                  
                  /* No page break after last page */
                  .print-invoice-page:last-child {
                    page-break-after: auto !important;
                  }
                  
                  /* Page break after all pages except last */
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

                  /* Keep print typography aligned with preview (80% scale) */
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
                    margin-bottom: 30px !important;
                  }
                  
                   .invoice-items-table {
                     width: 100% !important;
                     border-collapse: collapse !important;
                     margin: 0 0 !important;
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
                      vertical-align: bottom !important;
                      background-color: #f5f5f5 !important;
                      font-weight: bold !important;
                      border-top: 1px solid #000 !important;
                      border-bottom: 1px solid #000 !important;
                    }
                    
                    .invoice-items-table thead {
                      background-color: transparent !important;
                      background: transparent !important;
                    }
                    
                    .invoice-items-table thead th {
                      background-color: transparent !important;
                      background: transparent !important;
                      border-top: none !important;
                      border-bottom: none !important;
                      border-left: none !important;
                      border-right: none !important;
                      border: none !important;
                    }
                    
                    .invoice-items-table td {
                      vertical-align: top !important;
                      border-top: 1px solid #6b7280 !important;
                      border-bottom: none !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                      color-adjust: exact !important;
                    }
                    
                    /* Add border-bottom only to the last row */
                    .invoice-items-table tbody tr:last-child td {
                      border-bottom: 1px solid #6b7280 !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                      color-adjust: exact !important;
                    }
                    
                    /* Column widths for proper wrapping - match screen widths */
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
                      .total-amount-bg {
                     position: absolute !important;
                     width: 286px !important;
                     padding-left: 23px !important;
                     right: 77px !important;
                     -webkit-print-color-adjust: exact !important;
                     print-color-adjust: exact !important;
                     color-adjust: exact !important;
                   }
                   
                    /* Preserve all colors, backgrounds, and fonts exactly as shown */
                    .print-invoice-page,
                    .print-invoice-page * {
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                      color-adjust: exact !important;
                    }
                    
                    /* Don't override font sizes - preserve screen appearance */
                    .print-text-lg,
                    .print-text-base,
                    .print-text-sm {
                      /* Font sizes preserved from screen styles */
                    }
                    
                    .page-break {
                     page-break-before: always !important;
                   }
                   
                   .no-page-break {
                     page-break-inside: avoid !important;
                   }

                   .invoice-title-bg {
                     position: absolute !important;
                     width: 286px !important;
                     padding-left: 23px !important;
                     right: 7px !important;
                     justify-content: left !important;
                     -webkit-print-color-adjust: exact !important;
                     print-color-adjust: exact !important;
                     color-adjust: exact !important;
                   }

                   .total-amount-bg {
                     position: absolute !important;
                     width: 286px !important;
                     padding-left: 23px !important;
                     right: 7px !important;
                     -webkit-print-color-adjust: exact !important;
                     print-color-adjust: exact !important;
                     color-adjust: exact !important;
                   }
                }
              `}</style>
              
              {(() => {
                const invoiceItems = selectedInvoice.invoice_items || [];
                const paginatedItems = paginateInvoiceItems(invoiceItems);
                const totalPages = paginatedItems.length;
                
                return paginatedItems.map((pageItems, pageIndex) => {
                  const isFirstPage = pageIndex === 0;
                  const isLastPage = pageIndex === totalPages - 1;
                  
                  return (
                    <div 
                      key={pageIndex} 
                      className={`print-invoice-page print-invoice print:text-black print:bg-white print:min-h-[calc(100vh-1in)] print:flex print:flex-col invoice-preview-scale ${pageIndex > 0 ? 'page-break' : ''}`}
                      style={{gap: '12px'}}
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
                             <span className="text-lg print-text-lg font-medium text-black">INVOICE</span>
                             {totalPages > 1 && (
                               <span className="text-sm print-text-sm ml-2">(Page {pageIndex + 1} of {totalPages})</span>
                             )}
                          </div>
                        </div>
                      )}

                      {/* Invoice Header */}
                      <div className="invoice-header grid grid-cols-2 gap-6">
                        <div>
                          <h3 className="mb-2 print-text-sm text-sm font-normal">Bill To:</h3>
                          <p className="font-bold print-text-base print:font-bold">{selectedInvoice.customers?.name}</p>
                          {selectedInvoice.customers?.address && (
                            <p className="text-sm whitespace-pre-line print-text-sm">{selectedInvoice.customers.address}</p>
                          )}
                          {selectedInvoice.customers?.city && (
                            <p className="text-sm print-text-sm">{selectedInvoice.customers.city}</p>
                          )}
                          {selectedInvoice.customers?.country && (
                            <p className="text-sm print-text-sm">{selectedInvoice.customers.country}</p>
                          )}
                          {selectedInvoice.customers?.phone && (
                            <p className="text-sm print-text-sm">{selectedInvoice.customers.phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="space-y-1 print:space-y-2">
                            <p className="print-text-sm"><span className="font-medium">Invoice Number:</span> {selectedInvoice.invoice_number}</p>
                            <p className="print-text-sm"><span className="font-medium">Issue Date:</span> {formatDate(selectedInvoice.issue_date)}</p>
                            <p className="print-text-sm"><span className="font-medium">Due Date:</span> {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : 'N/A'}</p>
                            {selectedInvoice.order_number && <p className="print-text-sm"><span className="font-medium">Order Number:</span> {selectedInvoice.order_number}</p>}
                            {selectedInvoice.shipping_date && <p className="print-text-sm"><span className="font-medium">Shipping Date:</span> {formatDate(selectedInvoice.shipping_date)}</p>}
                            {selectedInvoice.incoterms && (
                              <p className="print-text-sm">
                                <span className="font-medium">Incoterms:</span>{' '}
                                {selectedInvoice.incoterms}
                                {(() => {
                                  // For EXW, use company address
                                  if (selectedInvoice.incoterms === 'EXW' && companyInfo) {
                                    const parts: string[] = [];
                                    if (companyInfo.postal_code) parts.push(companyInfo.postal_code);
                                    if (companyInfo.city) parts.push(companyInfo.city);
                                    if (companyInfo.country) {
                                      const countryCode = getCountryCode(companyInfo.country);
                                      if (countryCode) parts.push(countryCode);
                                    }
                                    return parts.length > 0 ? `, ${parts.join(' ')}` : '';
                                  } else if (selectedInvoice.incoterms === 'DAP') {
                                    // For DAP, use customer's DAP address
                                    const dapAddress = (selectedInvoice.customers as any)?.dap_address;
                                    return dapAddress ? `, ${dapAddress}` : '';
                                  } else if (selectedInvoice.incoterms === 'FCO') {
                                    // For FCO, use customer's FCO address
                                    const fcoAddress = (selectedInvoice.customers as any)?.fco_address;
                                    return fcoAddress ? `, ${fcoAddress}` : '';
                                  }
                                  return '';
                                })()}
                              </p>
                            )}
                            {selectedInvoice.declaration_number && <p className="print-text-sm"><span className="font-medium">Declaration Number:</span> {selectedInvoice.declaration_number}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Invoice Items */}
                      <div className="no-page-break">
                        <table className="invoice-items-table w-full border-collapse print:border-black">
                          <thead>
                            <tr>
                              <th className="text-left text-sm">Part name</th>
                              <th className="text-left text-sm">Part number</th>
                              <th className="text-left text-sm">Unit</th>
                              <th className="text-left text-sm">Qty</th>
                              <th className="text-left text-sm">Weight</th>
                              <th className="text-left text-sm">Price</th>
                              <th className="text-right text-sm">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageItems.map((item, itemIndex) => {
                              // Use inventory_id if available, otherwise fallback to name lookup for backward compatibility
                              // Debug: log the item to see what fields are available
                              if (itemIndex === 0) {
                                console.log('Invoice item data:', item);
                                console.log('Has inventory_id?', !!item.inventory_id, item.inventory_id);
                              }
                              const inventoryItem = item.inventory_id 
                                ? inventoryItems.find(inv => inv.id === item.inventory_id)
                                : inventoryItems.find(inv => inv.name === item.description);
                              const subtotalWeight = (inventoryItem?.weight || 0) * item.quantity;
                              return (
                                <tr key={itemIndex}>
                                  <td className="text-left text-sm">{item.description}</td>
                                  <td className="text-left text-sm">{inventoryItem?.part_number || '-'}</td>
                                  <td className="text-left text-sm">{inventoryItem?.unit || 'piece'}</td>
                                  <td className="text-left text-sm">{item.quantity}</td>
                                  <td className="text-left text-sm">{subtotalWeight.toFixed(2)} kg</td>
                                  <td className="text-left text-sm">{formatCurrency(item.unit_price, selectedInvoice.currency)}</td>
                                  <td className="text-right text-sm">{formatCurrency(item.total, selectedInvoice.currency)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Invoice Summary - Only on last page */}
                      {isLastPage && (
                        <>
                          <div className="grid grid-cols-2 gap-6 no-page-break print:mt-2">
                         
                            <div style={{ width: '420px' }}>
                              <h3 className="font-semibold mb-2 print-text-base">Summary</h3>
                              <div className="space-y-1 text-sm print:space-y-2 print-text-sm">
                                <p><span className="font-medium">Total Quantity:</span> {selectedInvoice.total_quantity} pcs</p>
                                <p><span className="font-medium">Net Weight:</span> {selectedInvoice.net_weight} kg</p>
                                <p><span className="font-medium">Total Weight:</span> {selectedInvoice.total_weight} kg</p>
                                <p><span className="font-medium">Packing:</span> {selectedInvoice.packing} {selectedInvoice.packing === 1 ? 'package' : 'packages'}</p>
                              </div>
                              {/* Declaration for foreign invoices under 6000€ */}
                              {selectedInvoice.customers?.country !== 'Bosnia and Herzegovina' && 
                               selectedInvoice.currency === 'EUR' && 
                               (selectedInvoice.amount || 0) < 6000 && (
                                <div className="mt-4 print:mt-6 text-sm print-text-sm space-y-2">
                                  <p className="leading-relaxed text-justify print:text-justify">
                                    Izjava: Izvoznik proizvoda obuhvaćenih ovom ispravom izjavljuje da su, osim ako je to drugačije izričito navedeno, ovi proizvodi bosanskohercegovačkog preferencijalnog porijekla.
                                  </p>
                                  <p className="leading-relaxed">
                                    Potpis izvoznika: {invoiceSettings.signatory || 'Radmila Kuzmanović'} <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '150px', marginBottom: '-0.2rem' }}></span>
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right w-3/5 ml-auto">
                              <div className="space-y-2 print:space-y-3">
                                <div className="flex justify-between print-text-sm">
                                  <span>Subtotal:</span>
                                  <span>{formatCurrency((selectedInvoice.amount || 0) / (1 + (selectedInvoice.vat_rate || 0) / 100), selectedInvoice.currency)}</span>
                                </div>
                                <div className="flex justify-between print-text-sm">
                                  <span>VAT ({selectedInvoice.vat_rate}%):</span>
                                  <span>{formatCurrency((selectedInvoice.amount || 0) - (selectedInvoice.amount || 0) / (1 + (selectedInvoice.vat_rate || 0) / 100), selectedInvoice.currency)}</span>
                                </div>
                                <div 
                                  id="invoice-total-amount"
                                  style={{
                                    backgroundColor: invoiceSettings.primaryColor,
                                    position: 'absolute',
                                    width: '286px',
                                    paddingLeft: '50px',
                                    paddingRight: '48px',
                                    height: '30px',
                                    right: '7px'
                                  }} 
                                  className="flex justify-between font-bold text-lg print-invoice-bg h-[35px] items-center print-text-base total-amount-bg"
                                >
                                  <span>Total:</span>
                                  <span>{formatCurrency(selectedInvoice.amount || 0, selectedInvoice.currency)}</span>
                                </div>
                              </div>
                              {/* VAT Exemption Notice for Foreign Customers - Positioned below Total */}
                              {selectedInvoice.customers?.country !== 'Bosnia and Herzegovina' && (
                                <div 
                                  id="invoice-vat-exemption-statement"
                                  className="print-text-xs text-xs" 
                                  style={{ 
                                    position: 'absolute',
                                    right: '7px',
                                    width: '286px',
                                    paddingLeft: '0px',
                                    paddingRight: '0px',
                                    marginTop: '40px',
                                    textAlign: 'left',
                                    color: '#303030'
                                  }}
                                >
                                  <p className="mb-1 leading-tight">Oslobođeno od plaćanja PDV-a po članu 27. tačka 1. zakona o PDV-u, Službeni glasnik br. 91/05 i 35/05.</p>
                                  <p className="leading-tight">Exempt from VAT payment pursuant to Article 27, Item 1 of the VAT Law, Official Gazette No. 91/05 and 35/05.</p>
                                </div>
                              )}
                              {/* Signatory - Positioned below VAT Exemption Notice */}
                              {invoiceSettings.signatory && (
                                <div 
                                  id="invoice-signatory"
                                  className="text-center" 
                                  style={{ 
                                    position: 'absolute',
                                    right: '7px',
                                    width: '286px',
                                    paddingLeft: '50px',
                                    paddingRight: '48px',
                                    marginTop: selectedInvoice.customers?.country !== 'Bosnia and Herzegovina' ? '100px' : '45px',
                                    fontSize: '0.7rem'
                                  }}
                                >
                                  <p style={{ marginBottom: '1.8rem', marginTop: '1.8rem'}}>{invoiceSettings.signatory}</p>
                                  <div style={{ borderBottom: '1px solid #000', width: '100%', margin: '0 auto' }}></div>
                                </div>
                              )}
                            </div>
                          </div>

                          {selectedInvoice.notes && (
                            <div className="no-page-break print:mt-6">
                              <h3 className="font-semibold mb-2 print-text-base">Notes</h3>
                              <p className="text-sm whitespace-pre-line print-text-sm">{selectedInvoice.notes}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Content wrapper that grows to push footer down */}
                      <div className="flex-1" style={{minHeight: 0}}></div>

                      {/* Foreign Customer Note - Above footer line */}
                      {selectedInvoice.customers?.country !== 'Bosnia and Herzegovina' && invoiceSettings.foreignNote && invoiceSettings.foreignNote.trim() && (
                        <div className="invoice-footer-wrapper mt-auto" style={{ marginBottom: 0 }}>
                          <p 
                            className="print-text-xs text-xs leading-relaxed" 
                            style={{ 
                              color: '#303030',
                              textAlign: 'justify',
                              marginBottom: 0
                            }}
                          >
                            {invoiceSettings.foreignNote.replace(/\{invoice_number\}/g, selectedInvoice.invoice_number || '')}
                          </p>
                        </div>
                      )}

                      {/* Footer with separator line - Always at bottom */}
                      {(invoiceSettings.foreignFooter.some(col => col.trim()) || invoiceSettings.domesticFooter.some(col => col.trim())) && (
                        <div className="invoice-footer-wrapper mt-auto">
                          <Separator className="print:border-black print:border-t print:mt-4 print:mb-2 border-t border-gray-600 mt-4 mb-2" />
                          <div className="text-xs print-text-xs flex justify-between gap-6 invoice-footer-columns" style={{ color: '#303030' }}>
                            {selectedInvoice.customers?.country === 'Bosnia and Herzegovina' ? (
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
                });
              })()}
              
              {/* Buttons outside the white paper page - Always visible after scrolling */}
              <div className="flex gap-2 pt-4 pb-4 print:hidden justify-center w-full">
                <Button onClick={printInvoice} disabled={printingInvoice || generatingPDF}>
                  <Printer className="w-4 h-4 mr-2" />
                  {printingInvoice ? 'Preparing Print...' : 'Print Invoice'}
                </Button>
                <Button onClick={printInvoiceWithMediaPrint} disabled={printingInvoice || generatingPDF} variant="secondary">
                  <Printer className="w-4 h-4 mr-2" />
                  {printingInvoice ? 'Preparing Print...' : 'PDF print in development'}
                </Button>
                <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </>}
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
        </DialogContent>
      </Dialog>
    </div>;
}