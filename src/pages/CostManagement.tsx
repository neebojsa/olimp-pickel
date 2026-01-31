import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { 
  Building2,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  FileText,
  ScanLine,
  AlertCircle,
  Check,
  Edit,
  X,
  Filter,
  Calendar as CalendarIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate, formatDateForInput } from "@/lib/dateUtils";
import { NumericInput } from "@/components/NumericInput";
import { OCRResult } from "@/lib/ocrService";
import { geminiOCRService } from "@/lib/geminiOCRService";
import { extractValueAfterPattern, calculateSimilarity } from "@/lib/fuzzyMatch";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CountryAutocomplete } from "@/components/CountryAutocomplete";
import { getCurrencyForCountry } from "@/lib/currencyUtils";

// Helper function to get status color classes
const getStatusColor = (status: string): string => {
  switch (status) {
    case "paid":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "pending":
      return "bg-amber-500/10 text-amber-700 border-amber-200";
    case "overdue":
      return "bg-red-500/10 text-red-700 border-red-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

// Calculate effective status based on due_date and current status
const getEffectiveStatus = (entry: CostEntry): 'pending' | 'paid' | 'overdue' => {
  // If status is "paid", always return "paid"
  if (entry.status === "paid") {
    return "paid";
  }
  
  // For other statuses, check if overdue based on due_date
  if (entry.due_date) {
    const dueDate = new Date(entry.due_date);
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

// Cost Status Badge Component
const CostStatusBadge = ({ entry, onStatusChange }: { entry: CostEntry; onStatusChange: (status: 'pending' | 'paid' | 'overdue') => Promise<void> }) => {
  const [isOpen, setIsOpen] = useState(false);
  const effectiveStatus = getEffectiveStatus(entry);
  
  const handleStatusChange = async (newStatus: 'pending' | 'paid' | 'overdue') => {
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
              {entry.due_date && new Date(entry.due_date) < new Date() ? (
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

interface CostEntry {
  id: string;
  supplier_name: string;
  document_type: 'invoice' | 'quote' | 'credit_note' | 'other';
  subtotal_tax_excluded: number;
  total_amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  notes: string;
  document_number: string;
  status: 'pending' | 'paid' | 'overdue';
  created_at: string;
  updated_at: string;
  document_url?: string;
}

interface Supplier {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  contact_person: string;
  payment_terms: string;
}

export default function CostManagement() {
  const { toast } = useToast();
  const [costEntries, setCostEntries] = useState<CostEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isAIAddSupplierDialogOpen, setIsAIAddSupplierDialogOpen] = useState(false);
  const [detectedSupplier, setDetectedSupplier] = useState<any>(null);
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    website: '',
    tax_id: '',
    payment_terms: 'Net 30',
    notes: '',
    country: '',
    currency: 'EUR'
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CostEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<CostEntry | null>(null);
  const [isOCRDialogOpen, setIsOCRDialogOpen] = useState(false);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrResult, setOCRResult] = useState<OCRResult | null>(null);
  // Always use Gemini AI for OCR
  const [ocrFileName, setOCRFileName] = useState<string>("");
  const [ocrFile, setOCRFile] = useState<File | null>(null); // Store the OCR scanned file
  const [ocrSuggestions, setOCRSuggestions] = useState<Partial<CostEntry>>({});
  const [approvedFields, setApprovedFields] = useState<Set<string>>(new Set());
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>("");
  const [supplierOCRData, setSupplierOCRData] = useState<any>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [ocrFieldMappings, setOCRFieldMappings] = useState<Record<string, string[]>>({
    document_type: [],
    subtotal_tax_excluded: [],
    total_amount: [],
    currency: [],
    issue_date: [],
    due_date: [],
    document_number: []
  });
  // Column header filters
  const [supplierFilter, setSupplierFilter] = useState({ search: "", selected: "all" });
  const [isSupplierFilterOpen, setIsSupplierFilterOpen] = useState(false);
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [isDocumentTypeFilterOpen, setIsDocumentTypeFilterOpen] = useState(false);
  const [amountFilter, setAmountFilter] = useState({ from: "", to: "" });
  const [isAmountFilterOpen, setIsAmountFilterOpen] = useState(false);
  const [issueDateFilter, setIssueDateFilter] = useState<{ from?: Date; to?: Date }>({});
  const [isIssueDateFilterOpen, setIsIssueDateFilterOpen] = useState(false);
  const [dueDateFilter, setDueDateFilter] = useState<{ from?: Date; to?: Date }>({});
  const [isDueDateFilterOpen, setIsDueDateFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  // Date picker popovers for form
  const [isIssueDatePickerOpen, setIsIssueDatePickerOpen] = useState(false);
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<CostEntry>>({
    supplier_name: '',
    document_type: 'invoice',
    subtotal_tax_excluded: 0,
    total_amount: 0,
    currency: 'BAM',
    issue_date: '',
    due_date: '',
    notes: '',
    document_number: '',
    status: 'pending'
  });

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 10000)
        );

        await Promise.race([
          Promise.all([
            fetchCostEntries(),
            fetchSuppliers(),
            fetchCompanyInfo(),
            testDatabaseConnection(),
            loadOCRMappings()
          ]),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
        // Even if there's an error, we should stop loading
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();

    // Clean up document URL when component unmounts
    return () => {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, []);

  // Clean up document URL when it changes
  useEffect(() => {
    return () => {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [documentUrl]);

    // Don't set default issue date - let OCR extract it or user enter it manually
    // setFormData(prev => ({
    //   ...prev,
    //   issue_date: formatDateForInput(new Date())
    // }));

  const loadOCRMappings = () => {
    try {
      const saved = localStorage.getItem('ocr_field_mappings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert old format (single string) to new format (array)
        const converted: Record<string, string[]> = {};
        Object.keys(parsed).forEach(key => {
          if (Array.isArray(parsed[key])) {
            converted[key] = parsed[key];
          } else if (parsed[key]) {
            converted[key] = [parsed[key]];
          } else {
            converted[key] = [];
          }
        });
        setOCRFieldMappings(converted);
      }
    } catch (error) {
      console.error('Error loading OCR mappings:', error);
    }
  };


  const fetchCostEntries = async () => {
    try {
      // For now, use accounting_entries as a placeholder
      // In a real implementation, you would create a cost_entries table
      // Filter out income entries (outgoing invoices) - only show expenses (costs)
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('*')
        .eq('type', 'expense') // Only fetch expense entries (costs), exclude income (outgoing invoices)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cost entries:', error);
        // Set empty array if table doesn't exist
        setCostEntries([]);
        return;
      }

      // Transform accounting entries to cost entries format
      const transformedData = data?.map(entry => {
        const costEntry: CostEntry = {
          id: entry.id,
          supplier_name: entry.description || 'Unknown Supplier',
          document_type: (entry.category || 'invoice') as any,
          subtotal_tax_excluded: entry.amount * 0.8, // Assume 20% VAT
          total_amount: entry.amount,
          currency: 'BAM',
          issue_date: entry.date,
          due_date: (entry as any).due_date || '',
          notes: (entry as any).notes || '',
          document_number: entry.reference || '',
          status: ((entry as any).status || 'pending') as 'pending' | 'paid' | 'overdue',
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          document_url: (entry as any).document_url || ''
        };
        // Auto-calculate effective status based on due_date
        const effectiveStatus = getEffectiveStatus(costEntry);
        // Only update status if it's not manually set to "paid" and differs from effective
        // Also update in database if status needs to change
        if (costEntry.status !== 'paid' && effectiveStatus !== costEntry.status) {
          costEntry.status = effectiveStatus;
          // Update status in database asynchronously (don't await to avoid blocking)
          supabase
            .from('accounting_entries')
            .update({ status: effectiveStatus })
            .eq('id', entry.id)
            .then(({ error }) => {
              if (error) {
                console.error('Error auto-updating status:', error);
              }
            });
        }
        return costEntry;
      }) || [];

      setCostEntries(transformedData);
    } catch (error) {
      console.error('Error fetching cost entries:', error);
      setCostEntries([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching suppliers:', error);
        return;
      }

      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching company info:', error);
        return;
      }

      if (data) {
        setCompanyInfo(data);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...');
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Database connection test failed:', error);
        return false;
      } else {
        console.log('Database connection successful');
        return true;
      }
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  };

  const uploadDocument = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingDocument(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cost-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Document upload error:', uploadError);
        toast({
          title: "Upload Failed",
          description: "Failed to upload document. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      const { data } = supabase.storage.from('cost-documents').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload Failed",
        description: "An error occurred while uploading the document.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const saveCostEntry = async () => {
    try {
      if (!formData.supplier_name || !formData.total_amount || !formData.issue_date) {
        alert('Please fill in all required fields');
        return;
      }

      // Upload document if present
      let uploadedDocumentUrl = documentUrl;
      
      // Check if we have a file that needs to be uploaded (either from OCR or manual upload)
      const fileToUpload = ocrFile || documentFile;
      
      // Check if documentUrl is a blob URL (local) or a Vercel temporary URL
      const isBlobUrl = documentUrl?.startsWith('blob:');
      const isVercelTempUrl = documentUrl?.includes('vercel.app') || documentUrl?.includes('localhost');
      const isSupabaseUrl = documentUrl?.includes('supabase.co') || documentUrl?.includes('supabase');
      
      // If documentUrl is a blob URL (local) or Vercel temp URL, or we have a file but no valid URL, upload to Supabase
      if (fileToUpload && (isBlobUrl || isVercelTempUrl || (!documentUrl && fileToUpload))) {
        console.log('Uploading document to Supabase storage...');
        const url = await uploadDocument(fileToUpload);
        if (url) {
          uploadedDocumentUrl = url;
          // Update the documentUrl state to the Supabase URL
          setDocumentUrl(url);
          // Clean up blob URL if it was a blob URL
          if (isBlobUrl && documentUrl) {
            URL.revokeObjectURL(documentUrl);
          }
        } else {
          // User can still save without document if upload fails
          console.warn('Document upload failed, but continuing with save');
          uploadedDocumentUrl = null; // Don't save blob URLs or failed uploads
        }
      } else if (isSupabaseUrl) {
        // Already a Supabase URL, use it as-is
        uploadedDocumentUrl = documentUrl;
      } else if (documentUrl && !isBlobUrl && !isSupabaseUrl && !isVercelTempUrl) {
        // If documentUrl exists but is not a valid URL format, don't save it
        console.warn('Invalid document URL format, not saving:', documentUrl);
        uploadedDocumentUrl = null;
      }

      // Auto-calculate status based on due_date if not manually set to "paid"
      let finalStatus = formData.status || 'pending';
      if (finalStatus !== 'paid' && formData.due_date) {
        const tempEntry: CostEntry = {
          id: '',
          supplier_name: formData.supplier_name || '',
          document_type: formData.document_type || 'invoice',
          subtotal_tax_excluded: formData.subtotal_tax_excluded || 0,
          total_amount: formData.total_amount || 0,
          currency: formData.currency || 'BAM',
          issue_date: formData.issue_date || '',
          due_date: formData.due_date || '',
          notes: formData.notes || '',
          document_number: formData.document_number || '',
          status: finalStatus,
          created_at: '',
          updated_at: ''
        };
        finalStatus = getEffectiveStatus(tempEntry);
      }

      const entryData = {
        ...formData,
        subtotal_tax_excluded: formData.subtotal_tax_excluded || 0,
        total_amount: formData.total_amount || 0,
        currency: formData.currency || 'BAM',
        status: finalStatus
      };

      // Only sync invoices and credit notes to accounting_entries
      const isInvoiceOrCreditNote = entryData.document_type === 'invoice' || entryData.document_type === 'credit_note';

      if (isEditMode && editingEntry) {
        // Always update in accounting_entries (quotes/other stay there but Accounting filters them out)
        const accountingData = {
          amount: entryData.total_amount || 0,
          description: `${entryData.supplier_name} - ${entryData.document_number}`,
          reference: entryData.document_number || '',
          date: entryData.issue_date || '',
          category: entryData.document_type || 'invoice',
          type: 'expense',
          document_url: uploadedDocumentUrl || null,
          status: entryData.status || 'pending',
          due_date: entryData.due_date || null
        };

        console.log('Updating accounting entry:', accountingData);
        const { error, data } = await supabase
          .from('accounting_entries')
          .update(accountingData)
          .eq('id', editingEntry.id)
          .select();

        if (error) {
          console.error('Error updating cost entry:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          toast({
            title: "Error Updating Cost Entry",
            description: error.message || "Failed to update cost entry. Please check the console for details.",
            variant: "destructive",
          });
          return;
        }
        
        console.log('Successfully updated cost entry:', data);
      } else {
        // Only insert invoices and credit notes into accounting_entries
        if (isInvoiceOrCreditNote) {
          // Convert amount to BAM if currency is EUR (1 EUR = 1.955 BAM)
          const entryAmount = entryData.total_amount || 0;
          const entryCurrency = entryData.currency || 'BAM';
          const amountInBAM = entryCurrency.toUpperCase() === 'EUR' 
            ? entryAmount * 1.955 
            : entryAmount;
          
          const accountingData = {
            amount: amountInBAM,
            description: `${entryData.supplier_name} - ${entryData.document_number}`,
            reference: entryData.document_number || '',
            date: entryData.issue_date || '',
            category: entryData.document_type || 'invoice',
            type: 'expense',
            document_url: uploadedDocumentUrl || null,
            status: entryData.status || 'pending',
            due_date: entryData.due_date || null
          };

        console.log('Inserting accounting entry:', accountingData);
        const { error, data } = await supabase
          .from('accounting_entries')
          .insert([accountingData])
          .select();

        if (error) {
          console.error('Error creating cost entry:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          toast({
            title: "Error Creating Cost Entry",
            description: error.message || "Failed to create cost entry. Please check the console for details.",
            variant: "destructive",
          });
          return;
        }
        
        console.log('Successfully created cost entry:', data);
        } else {
          // For quotes and other, save to accounting_entries but they won't show in Accounting page
          // (Accounting page filters to only show invoices and credit_notes)
          const accountingData = {
            amount: entryData.total_amount || 0,
            description: `${entryData.supplier_name} - ${entryData.document_number}`,
            reference: entryData.document_number || '',
            date: entryData.issue_date || '',
            category: entryData.document_type || 'quote',
            type: 'expense',
            document_url: uploadedDocumentUrl || null,
            status: entryData.status || 'pending',
            due_date: entryData.due_date || null
          };

          console.log('Inserting quote/other entry (not synced to Accounting):', accountingData);
          const { error, data } = await supabase
            .from('accounting_entries')
            .insert([accountingData])
            .select();

          if (error) {
            console.error('Error creating cost entry:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            toast({
              title: "Error Creating Cost Entry",
              description: error.message || "Failed to create cost entry. Please check the console for details.",
              variant: "destructive",
            });
            return;
          }
          
          console.log('Successfully created cost entry (quote/other):', data);
        }
      }

      await fetchCostEntries();
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditingEntry(null);
      
      // Clean up blob URLs before resetting
      if (documentUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(documentUrl);
      }
      
      // Reset form (don't set today's date - let OCR or user set it)
      setFormData({
        supplier_name: '',
        document_type: 'invoice',
        subtotal_tax_excluded: 0,
        total_amount: 0,
        currency: 'BAM',
        issue_date: '', // Don't set default - let OCR extract or user enter
        due_date: '',
        notes: '',
        document_number: '',
        status: 'pending'
      });
      setDocumentFile(null);
      setDocumentUrl('');
      setOCRFile(null);
      setOCRFileName('');
    } catch (error) {
      console.error('Error saving cost entry:', error);
      alert('Error saving cost entry');
    }
  };

  const deleteCostEntry = async () => {
    if (!deletingEntry) return;

    try {
      const { error } = await supabase
        .from('accounting_entries')
        .delete()
        .eq('id', deletingEntry.id);

      if (error) {
        console.error('Error deleting cost entry:', error);
        alert('Error deleting cost entry');
        return;
      }

      await fetchCostEntries();
      setDeletingEntry(null);
    } catch (error) {
      console.error('Error deleting cost entry:', error);
      alert('Error deleting cost entry');
    }
  };

  const checkSupplierExists = async (supplierName: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .ilike('name', `%${supplierName}%`)
        .limit(1);
      
      if (error) {
        console.error('Error checking supplier:', error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking supplier:', error);
      return false;
    }
  };

  const handleScanDocument = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.jpg,.jpeg,.png,.gif,.tiff,.bmp';
    
    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsOCRProcessing(true);
      setOCRFileName(file.name);
      setOCRFile(file); // Store the file for later upload
      setOCRResult(null);
      setOCRSuggestions({});
      setApprovedFields(new Set());

      try {
        console.log('Starting OCR processing for file:', file.name, file.type, file.size);
          console.log('Using Gemini AI for OCR...');
        
        // Always use Gemini AI
        if (!geminiOCRService.isAvailable()) {
            toast({
              title: "Gemini AI Not Available",
            description: "Please configure your Gemini API key to use AI scanning.",
            variant: "destructive"
          });
          setIsOCRProcessing(false);
          return;
        }
        
        const result = await geminiOCRService.processFile(file);

        console.log('OCR result received:', result);
        
        // Check if result indicates failure
        if (result.text.includes('Document Processing Failed') || result.confidence < 0.2) {
          console.warn('Low confidence or failure detected:', result);
          setIsOCRDialogOpen(true);
          setOCRResult(result);
        } else {
          // Extract suggestions from OCR result using field mappings
          const suggestions = extractDataFromOCR(result.text, ocrFieldMappings, result.extractedData);
          
          // Prioritize Gemini-extracted supplier name over text matching
          // Only use text matching if Gemini didn't extract a supplier name
          let matchedSupplier: any | null = null;
          
          if (suggestions.supplier_name && suggestions.supplier_name.trim()) {
            console.log('Using Gemini-extracted supplier name:', suggestions.supplier_name);
            // Verify the extracted supplier exists in database
            const extractedSupplier = suppliers.find(s => 
              s.name.toLowerCase() === suggestions.supplier_name!.toLowerCase()
            );
            if (extractedSupplier) {
              matchedSupplier = extractedSupplier;
              console.log('Verified Gemini-extracted supplier exists in database:', extractedSupplier.name);
            } else {
              console.warn('Gemini-extracted supplier not found in database, trying text matching:', suggestions.supplier_name);
              // Fallback to text matching if extracted name doesn't exist in database
              matchedSupplier = findSupplierFromOCRText(result.text, suppliers, companyInfo);
              if (matchedSupplier) {
                suggestions.supplier_name = matchedSupplier.name;
                console.log('Using text-matched supplier:', matchedSupplier.name);
              }
            }
          } else {
            // Only use text matching if Gemini didn't extract a supplier name
            console.log('No supplier extracted by Gemini, trying text matching...');
            matchedSupplier = findSupplierFromOCRText(result.text, suppliers, companyInfo);
            if (matchedSupplier) {
              suggestions.supplier_name = matchedSupplier.name; // Use name, not ID, because Select uses name as value
              console.log('Matched supplier from OCR text:', matchedSupplier.name, 'with ID:', matchedSupplier.id);
            } else {
              console.log('No supplier matched from OCR text');
            }
          }
          
          // Calculate due_date from payment_terms if supplier is matched and due_date not extracted by OCR
          if (matchedSupplier && suggestions.issue_date && !suggestions.due_date) {
            const calculatedDueDate = calculateDueDate(matchedSupplier.payment_terms, suggestions.issue_date);
            if (calculatedDueDate) {
              suggestions.due_date = calculatedDueDate;
              console.log(`Calculated due_date from payment_terms (${matchedSupplier.payment_terms}):`, calculatedDueDate);
            }
          }
          
          console.log('OCR suggestions extracted:', suggestions);
          console.log('OCR text sample:', result.text.substring(0, 500));
           
           // Extract supplier information from OCR result
           // Check if supplierInfo was stored in the result object by Gemini service
           const supplierInfo = (result as any).supplierInfo || null;
           if (supplierInfo) {
             setSupplierOCRData(supplierInfo);
           } else if (result.text) {
             // Fallback: extract supplier info from OCR text using pattern matching
             const extractedSupplierInfo = extractSupplierInfoFromText(result.text);
             setSupplierOCRData(extractedSupplierInfo);
           }
          
          setOCRSuggestions(suggestions);
          setOCRResult(result);
          
          // Pre-populate form with suggestions - ALWAYS use OCR extracted dates
          setFormData(prev => {
            const updated = { ...prev };
            // ALWAYS use OCR extracted dates if they exist - don't check for today's date
            if (suggestions.issue_date) {
              console.log('Setting issue_date from OCR:', suggestions.issue_date);
              updated.issue_date = suggestions.issue_date;
            }
            if (suggestions.due_date) {
              console.log('Setting due_date:', suggestions.due_date);
              updated.due_date = suggestions.due_date;
            }
            if (suggestions.supplier_name && !prev.supplier_name) {
              updated.supplier_name = suggestions.supplier_name;
              
              // If supplier is set and issue_date exists but due_date doesn't, calculate from payment_terms
              if (updated.issue_date && !updated.due_date) {
                const supplier = suppliers.find(s => 
                  s.name.toLowerCase() === suggestions.supplier_name!.toLowerCase()
                );
                if (supplier && supplier.payment_terms) {
                  const calculatedDueDate = calculateDueDate(supplier.payment_terms, updated.issue_date);
                  if (calculatedDueDate) {
                    updated.due_date = calculatedDueDate;
                    console.log(`Calculated due_date from supplier payment_terms (${supplier.payment_terms}):`, calculatedDueDate);
                  }
                }
              }
            }
            if (suggestions.document_type && !prev.document_type) {
              updated.document_type = suggestions.document_type;
            }
            if (suggestions.subtotal_tax_excluded && !prev.subtotal_tax_excluded) {
              updated.subtotal_tax_excluded = suggestions.subtotal_tax_excluded;
            }
            if (suggestions.total_amount && !prev.total_amount) {
              updated.total_amount = suggestions.total_amount;
            }
            if (suggestions.currency && !prev.currency) {
              updated.currency = suggestions.currency;
            }
            if (suggestions.document_number && !prev.document_number) {
              updated.document_number = suggestions.document_number;
            }
            return updated;
          });
          
          // Set the OCR file as the document file and create preview URL
          if (file) {
            setDocumentFile(file);
            // Create object URL for preview
            const url = URL.createObjectURL(file);
            setDocumentUrl(url);
          }
          
          // Open the cost entry dialog with suggestions
          setIsDialogOpen(true);
        }
      } catch (error: any) {
        console.error('OCR processing error:', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
        console.error('Full error details:', error);
        
        setIsOCRDialogOpen(true);
        setOCRResult({
          text: `OCR Processing Error\n\nFile: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(1)} KB\n\nError Details:\n${errorMessage}\n\nPlease check:\n- The file is not corrupted\n- The file format is supported (PDF, JPG, PNG)\n- Your browser console for more details`,
          confidence: 0,
          processingTime: 0,
          engine: 'error',
          extractedData: {}
        });
      } finally {
        setIsOCRProcessing(false);
      }
    };
    
    fileInput.click();
  };

  const handleApproveField = (fieldName: keyof CostEntry) => {
    const suggestion = ocrSuggestions[fieldName];
    if (suggestion !== undefined && suggestion !== null && suggestion !== '') {
      setFormData(prev => ({ ...prev, [fieldName]: suggestion }));
      setApprovedFields(prev => new Set(prev).add(fieldName));
    }
  };

  const handleFieldFocus = (fieldName: keyof CostEntry) => {
    // If field hasn't been approved yet, clear the suggestion when user focuses
    if (!approvedFields.has(fieldName)) {
      // Don't clear if user is just clicking to approve
      // The input will handle this naturally
    }
  };

  // Helper function to extract supplier information from OCR text
  const extractSupplierInfoFromText = (text: string): any => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let supplierName = '';
    let address = '';
    let city = '';
    let country = '';
    let phone = '';
    let email = '';
    let website = '';
    let tax_id = '';
    
    // Look for supplier name in first few lines (similar to OCR service logic)
    const supplierLines = lines.slice(0, 8);
    for (const line of supplierLines) {
      if (line.length > 3 && 
          !line.match(/^\d/) && 
          !line.match(/[€$£]/) && 
          !line.match(/^\d+[.,]\d{2}/) &&
          !line.match(/^(datum|total|ukupno|iznos|faktura|račun|invoice)/i) &&
          !line.match(/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/) &&
          line.length < 100) {
        supplierName = line.trim();
        break;
      }
    }
    
    // Look for address patterns
    const addressPatterns = [
      /(?:adresa|address|ulica|street)[:\s]*(.+)/i,
      /^[A-Za-z\s]+,\s*\d+[A-Za-z]?\s*,\s*\d{5}\s*[A-Za-z\s]+$/,
      /^\d+\s+[A-Za-z\s]+,\s*\d{5}\s*[A-Za-z\s]+$/
    ];
    
    for (const line of lines) {
      for (const pattern of addressPatterns) {
        const match = line.match(pattern);
        if (match) {
          address = match[1] || line;
          break;
        }
      }
      if (address) break;
    }
    
    // Look for phone numbers
    const phonePatterns = [
      /(?:tel|phone|telefon|mob|mobile)[:\s]*(\+?\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4})/i,
      /(\+?\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4})/
    ];
    
    for (const line of lines) {
      for (const pattern of phonePatterns) {
        const match = line.match(pattern);
        if (match) {
          phone = match[1];
          break;
        }
      }
      if (phone) break;
    }
    
    // Look for email addresses
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    for (const line of lines) {
      const match = line.match(emailPattern);
      if (match) {
        email = match[1];
        break;
      }
    }
    
    // Look for website URLs
    const websitePatterns = [
      /(?:www\.|https?:\/\/)([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /(?:website|web|site)[:\s]*(?:www\.|https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ];
    
    for (const line of lines) {
      for (const pattern of websitePatterns) {
        const match = line.match(pattern);
        if (match) {
          website = match[1] || match[0];
          if (!website.startsWith('http')) {
            website = 'https://' + website;
          }
          break;
        }
      }
      if (website) break;
    }
    
    // Look for tax ID/VAT number
    const taxPatterns = [
      /(?:pib|tax|vat|pdv|id|jmbg|mb)[:\s]*([A-Z0-9\-]+)/i,
      /(?:porezni|tax\s*id|vat\s*number)[:\s]*([A-Z0-9\-]+)/i
    ];
    
    for (const line of lines) {
      for (const pattern of taxPatterns) {
        const match = line.match(pattern);
        if (match) {
          tax_id = match[1];
          break;
        }
      }
      if (tax_id) break;
    }
    
    // Try to extract city and country from address
    if (address) {
      const addressParts = address.split(',').map(p => p.trim());
      if (addressParts.length > 1) {
        city = addressParts[addressParts.length - 2] || '';
        // Last part might be country or postal code + city
        const lastPart = addressParts[addressParts.length - 1];
        if (lastPart && !lastPart.match(/^\d{5}/)) {
          country = lastPart;
        }
      }
    }
    
    return {
      name: supplierName || ocrSuggestions.supplier_name || '',
      address,
      city,
      country,
      phone,
      email,
      website,
      tax_id
    };
  };

  const extractDataFromOCR = (
    ocrText: string, 
    mappings: Record<string, string[]>,
    fallbackData: OCRResult['extractedData']
  ): Partial<CostEntry> => {
    const suggestions: Partial<CostEntry> = {
      supplier_name: fallbackData.supplier_name || '',
      document_type: (fallbackData.document_type as any) || 'invoice',
      subtotal_tax_excluded: fallbackData.subtotal_tax_excluded || 0,
      total_amount: fallbackData.total_amount || 0,
      currency: fallbackData.currency || 'BAM',
      issue_date: fallbackData.issue_date || '', // USE OCR extracted date directly!
      due_date: fallbackData.due_date || '', // USE OCR extracted date directly!
      document_number: fallbackData.document_number || '',
      notes: '',
      status: 'pending'
    };

    // Helper function to extract numeric value from text
    const parseNumericValue = (val: string): number | null => {
      const numValue = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
      return (!isNaN(numValue) && numValue > 0) ? numValue : null;
    };

    // Helper function to try multiple patterns for a field
    const tryExtractWithPatterns = (patterns: string[], extractor: (value: string) => any): any => {
      for (const pattern of patterns) {
        if (!pattern || pattern.trim().length === 0) continue;
        const value = extractValueAfterPattern(ocrText, pattern, 80);
        if (value) {
          const result = extractor(value);
          if (result !== null && result !== undefined) {
            return result;
          }
        }
      }
      return null;
    };

    // Extract all candidate amounts from patterns for tax excluded and total
    const taxExcludedCandidates: number[] = [];
    const totalCandidates: number[] = [];

    // Collect all candidate values for tax excluded
    if (mappings.subtotal_tax_excluded && mappings.subtotal_tax_excluded.length > 0) {
      for (const pattern of mappings.subtotal_tax_excluded) {
        if (!pattern || pattern.trim().length === 0) continue;
        const value = extractValueAfterPattern(ocrText, pattern, 80);
        if (value) {
          const numValue = parseNumericValue(value);
          if (numValue !== null) {
            taxExcludedCandidates.push(numValue);
          }
        }
      }
    }

    // Collect all candidate values for total
    if (mappings.total_amount && mappings.total_amount.length > 0) {
      for (const pattern of mappings.total_amount) {
        if (!pattern || pattern.trim().length === 0) continue;
        const value = extractValueAfterPattern(ocrText, pattern, 80);
        if (value) {
          const numValue = parseNumericValue(value);
          if (numValue !== null) {
            totalCandidates.push(numValue);
          }
        }
      }
    }

    // Use relationship logic to identify correct amounts
    // In Bosnia, tax is 17%, so Total ≈ Tax Excluded * 1.17
    // Total must always be > Tax Excluded
    const TAX_RATE = 1.17; // 17% tax
    const TOLERANCE = 0.05; // 5% tolerance for rounding/OCR errors

    // If we have candidates for both fields, use relationship logic
    if (taxExcludedCandidates.length > 0 && totalCandidates.length > 0) {
      let bestTaxExcluded: number | null = null;
      let bestTotal: number | null = null;
      let bestMatch = false;

      // Try all combinations to find the best match
      for (const taxExc of taxExcludedCandidates) {
        for (const total of totalCandidates) {
          // Check: Total must be greater than Tax Excluded
          if (total > taxExc) {
            // Check: Total should be approximately Tax Excluded * 1.17
            const expectedTotal = taxExc * TAX_RATE;
            const ratio = total / expectedTotal;
            
            // If ratio is between 0.95 and 1.05, it's a good match
            if (ratio >= (1 - TOLERANCE) && ratio <= (1 + TOLERANCE)) {
              bestTaxExcluded = taxExc;
              bestTotal = total;
              bestMatch = true;
              break; // Found a good match, use it
            } else if (!bestMatch) {
              // If no perfect match yet, at least ensure Total > Tax Excluded
              bestTaxExcluded = taxExc;
              bestTotal = total;
            }
          }
        }
        if (bestMatch) break;
      }

      // If we found matching values, use them
      if (bestTaxExcluded !== null && bestTotal !== null) {
        suggestions.subtotal_tax_excluded = bestTaxExcluded;
        suggestions.total_amount = bestTotal;
      } else if (taxExcludedCandidates.length > 0) {
        // Fallback: use first tax excluded candidate
        suggestions.subtotal_tax_excluded = taxExcludedCandidates[0];
      } else if (totalCandidates.length > 0) {
        // Fallback: use first total candidate
        suggestions.total_amount = totalCandidates[0];
      }
          } else {
      // If we only have one type of candidate, use it directly
      if (taxExcludedCandidates.length > 0) {
        suggestions.subtotal_tax_excluded = taxExcludedCandidates[0];
      }
      if (totalCandidates.length > 0) {
        suggestions.total_amount = totalCandidates[0];
      }
    }

    if (mappings.currency && mappings.currency.length > 0) {
      const value = tryExtractWithPatterns(mappings.currency, (val) => {
        const upperValue = val.toUpperCase().trim();
        return ['BAM', 'EUR', 'USD', 'RSD'].includes(upperValue) ? upperValue : null;
      });
      if (value !== null) {
        suggestions.currency = value;
      }
    }

    // Helper function to extract date with pattern matching
    const tryExtractDateWithPatterns = (patterns: string[]): string | null => {
      for (const pattern of patterns) {
        if (!pattern || pattern.trim().length === 0) continue;
        // Use preferDate=true to prioritize date extraction
        const value = extractValueAfterPattern(ocrText, pattern, 80, true);
        if (value) {
          const formattedDate = formatDateFromOCR(value);
          if (formattedDate) {
            return formattedDate;
          }
        }
      }
      return null;
    };

    // Only use mappings if OCR didn't extract a date (prioritize OCR extracted dates)
    if (mappings.issue_date && mappings.issue_date.length > 0 && !suggestions.issue_date) {
      const value = tryExtractDateWithPatterns(mappings.issue_date);
      if (value !== null) {
        suggestions.issue_date = value;
      }
    }

    if (mappings.due_date && mappings.due_date.length > 0 && !suggestions.due_date) {
      const value = tryExtractDateWithPatterns(mappings.due_date);
      if (value !== null) {
        suggestions.due_date = value;
      }
    }
    
    // Log what dates we're using
    console.log('Final date suggestions:', {
      issue_date: suggestions.issue_date,
      due_date: suggestions.due_date,
      fromFallback: {
        issue_date: fallbackData.issue_date,
        due_date: fallbackData.due_date
      }
    });

    // Helper function to score how much a value looks like a document number
    const scoreDocumentNumber = (value: string): number => {
      let score = 0;
      const cleaned = value.trim();
      
      // Must have at least one character
      if (cleaned.length === 0) return 0;
      
      // Prefer values with numbers (document numbers almost always have numbers)
      if (/\d/.test(cleaned)) {
        score += 10;
        // More numbers = better
        const digitCount = (cleaned.match(/\d/g) || []).length;
        score += Math.min(digitCount, 10);
      } else {
        // No numbers at all - very unlikely to be a document number
        return 0;
      }
      
      // Prefer values with separators (dashes, slashes, dots) - common in document numbers
      if (/[-/.]/.test(cleaned)) {
        score += 5;
      }
      
      // Prefer alphanumeric sequences (letters + numbers)
      if (/[A-Za-z]/.test(cleaned) && /\d/.test(cleaned)) {
        score += 5;
      }
      
      // Penalize if it's just a word (no numbers or separators)
      if (/^[A-Za-z]+$/.test(cleaned)) {
        score = 0; // Pure words are not document numbers
      }
      
      // Penalize if it looks like a date (has date-like patterns)
      if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(cleaned)) {
        score -= 10; // Looks like a date, not a document number
      }
      
      // Prefer reasonable length (3-30 characters is typical for document numbers)
      if (cleaned.length >= 3 && cleaned.length <= 30) {
        score += 2;
      } else if (cleaned.length > 50) {
        score -= 5; // Too long, probably not a document number
      }
      
      return score;
    };

    // Helper function to extract document number with pattern matching
    const tryExtractDocumentNumberWithPatterns = (patterns: string[]): string | null => {
      const candidates: Array<{ value: string; score: number; pattern: string }> = [];
      
      // Collect all candidate values from all patterns
      for (const pattern of patterns) {
        if (!pattern || pattern.trim().length === 0) continue;
        // Use preferDocumentNumber=true to prioritize document number extraction
        const value = extractValueAfterPattern(ocrText, pattern, 80, false, true);
        if (value) {
          // Clean up the extracted value - remove extra whitespace, keep alphanumeric and separators
          const cleaned = value
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/^[^\w\d]+|[^\w\d]+$/g, '') // Remove leading/trailing non-alphanumeric
            .trim();
          
          // Must contain at least one digit or letter
          if (cleaned.length >= 2 && /[\dA-Za-z]/.test(cleaned)) {
            const score = scoreDocumentNumber(cleaned);
            if (score > 0) {
              candidates.push({ value: cleaned, score, pattern });
              console.log('Document number candidate:', cleaned, 'score:', score, 'from pattern:', pattern);
            }
          }
        }
      }
      
      // If we have multiple candidates, choose the one with highest score
      if (candidates.length > 0) {
        // Sort by score (highest first)
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        console.log('Selected document number:', best.value, 'with score:', best.score);
        return best.value;
      }
      
      return null;
    };

    if (mappings.document_number && mappings.document_number.length > 0) {
      const value = tryExtractDocumentNumberWithPatterns(mappings.document_number);
      if (value !== null) {
        suggestions.document_number = value;
      }
    }

    if (mappings.document_type && mappings.document_type.length > 0) {
      const value = tryExtractWithPatterns(mappings.document_type, (val) => {
        const lowerValue = val.toLowerCase().trim();
        if (lowerValue.includes('faktura') || lowerValue.includes('invoice') || lowerValue.includes('račun')) {
          return 'invoice';
        } else if (lowerValue.includes('ponuda') || lowerValue.includes('quote')) {
          return 'quote';
        } else if (lowerValue.includes('credit') || lowerValue.includes('credit note') || lowerValue.includes('creditnote')) {
          return 'credit_note';
        }
        return null;
      });
      if (value !== null) {
        suggestions.document_type = value;
      }
    }

    return suggestions;
  };

  // Helper function to calculate due date from payment terms
  const calculateDueDate = (paymentTerms: string | number | null | undefined, issueDate: string): string => {
    if (!paymentTerms && paymentTerms !== 0) return '';
    if (!issueDate) return '';
    
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
      try {
        const issueDateObj = new Date(issueDate);
        if (isNaN(issueDateObj.getTime())) {
          return '';
        }
        const dueDate = new Date(issueDateObj);
        dueDate.setDate(dueDate.getDate() + days);
        return dueDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      } catch (error) {
        console.error('Error calculating due date:', error);
        return '';
      }
    }
    
    return '';
  };

  // Function to find supplier from OCR text by matching against supplier data
  const findSupplierFromOCRText = (ocrText: string, suppliersList: any[], companyData: any): any | null => {
    if (!suppliersList || suppliersList.length === 0) {
      console.log('No suppliers available for matching');
      return null;
    }

    if (!ocrText || ocrText.trim().length === 0) {
      console.log('OCR text is empty');
      return null;
    }

    console.log(`Matching suppliers against OCR text (${suppliersList.length} suppliers, ${ocrText.length} chars)`);
    const normalizedOCRText = ocrText.toLowerCase();
    const candidates: Array<{ supplier: any; score: number; matchedFields: string[] }> = [];

    // Get company data fields to exclude
    const companyFields: string[] = [];
    if (companyData) {
      if (companyData.company_name) companyFields.push(companyData.company_name.toLowerCase());
      if (companyData.legal_name) companyFields.push(companyData.legal_name.toLowerCase());
      if (companyData.tax_id) companyFields.push(companyData.tax_id.toLowerCase());
      if (companyData.address) companyFields.push(companyData.address.toLowerCase());
      if (companyData.city) companyFields.push(companyData.city.toLowerCase());
      if (companyData.email) companyFields.push(companyData.email.toLowerCase());
      if (companyData.phone) companyFields.push(companyData.phone.toLowerCase());
    }

    // Check each supplier
    for (const supplier of suppliersList) {
      let score = 0;
      const matchedFields: string[] = [];

      // Check supplier name - try both full name and partial matches
      if (supplier.name) {
        const supplierNameLower = supplier.name.toLowerCase();
        
        // Check for exact substring match (very strong signal)
        if (normalizedOCRText.includes(supplierNameLower)) {
          score += 150;
          matchedFields.push('name (exact substring)');
        } else {
          // Try fuzzy matching
          const similarity = calculateSimilarity(normalizedOCRText, supplierNameLower);
          if (similarity >= 60) { // Lowered threshold from 70
            score += similarity * 2; // Name is very important
            matchedFields.push(`name (${similarity.toFixed(1)}%)`);
          }
          
          // Also check if supplier name words appear in OCR text
          const supplierWords = supplierNameLower.split(/\s+/).filter(w => w.length > 2);
          let matchingWords = 0;
          for (const word of supplierWords) {
            if (normalizedOCRText.includes(word)) {
              matchingWords++;
            }
          }
          if (matchingWords >= Math.ceil(supplierWords.length * 0.6)) {
            score += 80;
            matchedFields.push(`name (${matchingWords}/${supplierWords.length} words)`);
          }
        }
      }

      // Check tax ID (very specific, high weight)
      if (supplier.tax_id) {
        const taxIdLower = supplier.tax_id.toLowerCase();
        // Check for exact or near-exact match
        if (normalizedOCRText.includes(taxIdLower)) {
          score += 100;
          matchedFields.push('tax_id (exact)');
        } else {
          const similarity = calculateSimilarity(normalizedOCRText, taxIdLower);
          if (similarity >= 80) {
            score += similarity * 1.5;
            matchedFields.push(`tax_id (${similarity.toFixed(1)}%)`);
          }
        }
      }

      // Check address
      if (supplier.address) {
        const addressLower = supplier.address.toLowerCase();
        // Check for substring match first
        if (normalizedOCRText.includes(addressLower) && addressLower.length > 5) {
          score += 60;
          matchedFields.push('address (exact substring)');
        } else {
          const similarity = calculateSimilarity(normalizedOCRText, addressLower);
          if (similarity >= 65) { // Lowered threshold
            score += similarity * 0.8;
            matchedFields.push(`address (${similarity.toFixed(1)}%)`);
          }
        }
      }

      // Check city
      if (supplier.city) {
        const similarity = calculateSimilarity(normalizedOCRText, supplier.city.toLowerCase());
        if (similarity >= 75) {
          score += similarity * 0.6;
          matchedFields.push(`city (${similarity.toFixed(1)}%)`);
        }
      }

      // Check email
      if (supplier.email) {
        const emailLower = supplier.email.toLowerCase();
        if (normalizedOCRText.includes(emailLower)) {
          score += 50;
          matchedFields.push('email (exact)');
        }
      }

      // Check phone
      if (supplier.phone) {
        // Normalize phone numbers (remove spaces, dashes, etc.)
        const normalizedPhone = supplier.phone.replace(/[\s\-()]/g, '');
        const normalizedOCRPhone = normalizedOCRText.replace(/[\s\-()]/g, '');
        if (normalizedOCRPhone.includes(normalizedPhone) && normalizedPhone.length >= 6) {
          score += 40;
          matchedFields.push('phone (exact)');
        }
      }

      // Check website
      if (supplier.website) {
        const websiteLower = supplier.website.toLowerCase().replace(/^https?:\/\//, '');
        if (normalizedOCRText.includes(websiteLower)) {
          score += 30;
          matchedFields.push('website (exact)');
        }
      }

      // Check contact person
      if (supplier.contact_person) {
        const similarity = calculateSimilarity(normalizedOCRText, supplier.contact_person.toLowerCase());
        if (similarity >= 75) {
          score += similarity * 0.5;
          matchedFields.push(`contact_person (${similarity.toFixed(1)}%)`);
        }
      }

      // Exclude if matches company data
      let isCompanyMatch = false;
      for (const companyField of companyFields) {
        if (companyField && normalizedOCRText.includes(companyField) && companyField.length > 3) {
          // Check if this supplier field matches company data
          const supplierNameLower = supplier.name?.toLowerCase() || '';
          if (supplierNameLower.includes(companyField) || companyField.includes(supplierNameLower)) {
            isCompanyMatch = true;
            break;
          }
        }
      }

      // Only add if score is significant and not a company match
      // Lowered threshold from 50 to 30 to catch more matches
      if (score > 30 && !isCompanyMatch && matchedFields.length > 0) {
        candidates.push({ supplier, score, matchedFields });
        console.log(`Supplier candidate: ${supplier.name}, score: ${score.toFixed(1)}, matched: ${matchedFields.join(', ')}`);
      } else if (isCompanyMatch) {
        console.log(`Excluded supplier ${supplier.name} - matches company data`);
      }
    }

    // Sort by score and return the best match
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const bestMatch = candidates[0];
      console.log(`Best supplier match: ${bestMatch.supplier.name} with score ${bestMatch.score.toFixed(1)}`);
      return bestMatch.supplier;
    }

    return null;
  };

  const formatDateFromOCR = (dateStr: string): string => {
    try {
      if (!dateStr || !dateStr.trim()) {
        console.log('formatDateFromOCR: Empty date string');
        return '';
      }

      console.log('formatDateFromOCR: Processing date string:', dateStr);

      // Clean the date string - keep digits, dots, slashes, and dashes
      // Handle common OCR errors
      let cleaned = dateStr
        .replace(/[Oo]/g, '0') // Replace O with 0 (common OCR error)
        .replace(/[Il]/g, '1') // Replace I/l with 1 (common OCR error)
        .replace(/[^\d./-]/g, ' ') // Replace non-date chars with space
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();

      console.log('formatDateFromOCR: Cleaned date string:', cleaned);

      // Try various date formats in order of likelihood
      
      // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY (most common in Bosnia)
      const ddmmyyyy = cleaned.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        console.log('formatDateFromOCR: Found DD.MM.YYYY format:', { day: dayNum, month: monthNum, year: yearNum });
        
        // Validate date components
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
          const date = new Date(yearNum, monthNum - 1, dayNum);
          if (!isNaN(date.getTime()) && date.getDate() === dayNum && date.getMonth() === monthNum - 1) {
            const formatted = formatDateForInput(date);
            console.log('formatDateFromOCR: Successfully formatted as:', formatted);
            return formatted;
          }
        }
      }
      
      // DD.MM.YY or DD/MM/YY or DD-MM-YY (2-digit year)
      const ddmmyy = cleaned.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2})(?!\d)/);
      if (ddmmyy) {
        const [, day, month, year] = ddmmyy;
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        const fullYear = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
        
        console.log('formatDateFromOCR: Found DD.MM.YY format:', { day: dayNum, month: monthNum, year: yearNum, fullYear });
        
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
          const date = new Date(fullYear, monthNum - 1, dayNum);
          if (!isNaN(date.getTime()) && date.getDate() === dayNum && date.getMonth() === monthNum - 1) {
            const formatted = formatDateForInput(date);
            console.log('formatDateFromOCR: Successfully formatted as:', formatted);
            return formatted;
          }
        }
      }
      
      // YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD
      const yyyymmdd = cleaned.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
      if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        console.log('formatDateFromOCR: Found YYYY-MM-DD format:', { day: dayNum, month: monthNum, year: yearNum });
        
        // Validate date components
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
          const date = new Date(yearNum, monthNum - 1, dayNum);
          if (!isNaN(date.getTime()) && date.getDate() === dayNum && date.getMonth() === monthNum - 1) {
            const formatted = formatDateForInput(date);
            console.log('formatDateFromOCR: Successfully formatted as:', formatted);
            return formatted;
          }
        }
      }

      // Try more flexible patterns - any sequence of digits with separators
      const flexibleDate = cleaned.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
      if (flexibleDate) {
        const [, day, month, year] = flexibleDate;
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        let yearNum = parseInt(year);
        
        // If 2-digit year, convert to 4-digit
        if (year.length === 2) {
          yearNum = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
        }
        
        console.log('formatDateFromOCR: Found flexible format:', { day: dayNum, month: monthNum, year: yearNum });
        
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
          const date = new Date(yearNum, monthNum - 1, dayNum);
          if (!isNaN(date.getTime()) && date.getDate() === dayNum && date.getMonth() === monthNum - 1) {
            const formatted = formatDateForInput(date);
            console.log('formatDateFromOCR: Successfully formatted as:', formatted);
            return formatted;
          }
        }
      }
      
      console.log('formatDateFromOCR: Could not parse date:', dateStr);
      return '';
    } catch (error) {
      console.error('Error formatting date from OCR:', dateStr, error);
      return '';
    }
  };

  const saveNewSupplier = async () => {
    try {
      console.log('Saving new supplier:', supplierFormData);
      
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: supplierFormData.name,
          contact_person: supplierFormData.contact_person,
          email: supplierFormData.email,
          phone: supplierFormData.phone,
          address: supplierFormData.address,
          city: supplierFormData.city,
          website: supplierFormData.website,
          tax_id: supplierFormData.tax_id,
          payment_terms: supplierFormData.payment_terms,
          notes: supplierFormData.notes,
          country: supplierFormData.country,
          currency: supplierFormData.currency
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving supplier:', error);
        alert(`Error saving supplier: ${error.message}`);
        return;
      }
      
      console.log('Supplier saved successfully:', data);
      
      // Refresh suppliers list
      await fetchSuppliers();
      
      toast({
        title: "Success",
        description: "Supplier added successfully"
      });
      
      return data;
      
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save supplier",
        variant: "destructive"
      });
      throw error;
    }
  };


  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
      <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
                <div className="flex gap-2">
          <Button variant="outline" onClick={handleScanDocument} disabled={isOCRProcessing || !geminiOCRService.isAvailable()}>
            {isOCRProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <ScanLine className="w-4 h-4 mr-2" />
                AI Scan Doc
              </>
            )}
          </Button>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Cost Entry
        </Button>
        </div>
      </div>

      <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table View - Hidden below 1280px */}
              <div className="hidden xl:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Supplier
                          <Popover open={isSupplierFilterOpen} onOpenChange={setIsSupplierFilterOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Filter className={`h-3 w-3 ${supplierFilter.selected !== "all" || supplierFilter.search ? 'text-primary' : ''}`} />
                              </Button>
                            </PopoverTrigger>
                          <PopoverContent className="w-80" align="start">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label>Filter by Supplier</Label>
                                {(supplierFilter.search || supplierFilter.selected !== "all") && (
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setSupplierFilter({ search: "", selected: "all" });
                                  }}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <div>
                                <Label>Search</Label>
                                <Input
                                  placeholder="Search suppliers..."
                                  value={supplierFilter.search}
                                  onChange={(e) => setSupplierFilter({ ...supplierFilter, search: e.target.value })}
                                />
                              </div>
                              <div className="max-h-60 overflow-y-auto">
                                <Select value={supplierFilter.selected} onValueChange={(value) => {
                                  setSupplierFilter({ ...supplierFilter, selected: value });
                                  setIsSupplierFilterOpen(false);
                                }}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Suppliers</SelectItem>
                                    {suppliers
                                      .filter(s => !supplierFilter.search || s.name.toLowerCase().includes(supplierFilter.search.toLowerCase()))
                                      .map(supplier => (
                                        <SelectItem key={supplier.id} value={supplier.name}>{supplier.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Document Type
                        <Popover open={isDocumentTypeFilterOpen} onOpenChange={setIsDocumentTypeFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${documentTypeFilter !== "all" ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48" align="start">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Filter by Document Type</Label>
                                {documentTypeFilter !== "all" && (
                                  <Button variant="ghost" size="sm" onClick={() => setDocumentTypeFilter("all")}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <Select value={documentTypeFilter} onValueChange={(value) => {
                                setDocumentTypeFilter(value);
                                setIsDocumentTypeFilterOpen(false);
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Types</SelectItem>
                                  <SelectItem value="invoice">Invoice</SelectItem>
                                  <SelectItem value="quote">Quote</SelectItem>
                                  <SelectItem value="credit_note">Credit note</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Amount
                        <Popover open={isAmountFilterOpen} onOpenChange={setIsAmountFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${amountFilter.from || amountFilter.to ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="start">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label>Filter by Amount</Label>
                                {(amountFilter.from || amountFilter.to) && (
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setAmountFilter({ from: "", to: "" });
                                  }}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label>From</Label>
                                  <NumericInput
                                    value={amountFilter.from ? parseFloat(amountFilter.from) : 0}
                                    onChange={(val) => setAmountFilter({ ...amountFilter, from: val.toString() })}
                                    min={0}
                                    placeholder="Min amount"
                                  />
                                </div>
                                <div>
                                  <Label>To</Label>
                                  <NumericInput
                                    value={amountFilter.to ? parseFloat(amountFilter.to) : 0}
                                    onChange={(val) => setAmountFilter({ ...amountFilter, to: val.toString() })}
                                    min={0}
                                    placeholder="Max amount"
                                  />
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Issue Date
                        <Popover open={isIssueDateFilterOpen} onOpenChange={setIsIssueDateFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${issueDateFilter.from || issueDateFilter.to ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="range"
                              selected={{ from: issueDateFilter.from, to: issueDateFilter.to }}
                              onSelect={(range) => {
                                setIssueDateFilter({
                                  from: range?.from,
                                  to: range?.to
                                });
                                if (range?.from && range?.to) {
                                  setIsIssueDateFilterOpen(false);
                                }
                              }}
                              numberOfMonths={2}
                              className="rounded-md border"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Due Date
                        <Popover open={isDueDateFilterOpen} onOpenChange={setIsDueDateFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${dueDateFilter.from || dueDateFilter.to ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="range"
                              selected={{ from: dueDateFilter.from, to: dueDateFilter.to }}
                              onSelect={(range) => {
                                setDueDateFilter({
                                  from: range?.from,
                                  to: range?.to
                                });
                                if (range?.from && range?.to) {
                                  setIsDueDateFilterOpen(false);
                                }
                              }}
                              numberOfMonths={2}
                              className="rounded-md border"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
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
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="overdue">Overdue</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costEntries
                    .filter((entry) => {
                      // Supplier filter
                      const matchesSupplier = supplierFilter.selected === "all" || 
                        entry.supplier_name === supplierFilter.selected;
                      const matchesSupplierSearch = !supplierFilter.search || 
                        entry.supplier_name?.toLowerCase().includes(supplierFilter.search.toLowerCase());
                      
                      // Document type filter
                      const matchesDocumentType = documentTypeFilter === "all" || 
                        entry.document_type === documentTypeFilter;
                      
                      // Amount filter
                      const amount = entry.total_amount || 0;
                      const amountFrom = amountFilter.from ? parseFloat(amountFilter.from) : undefined;
                      const amountTo = amountFilter.to ? parseFloat(amountFilter.to) : undefined;
                      const matchesAmount = (!amountFrom || amount >= amountFrom) && 
                        (!amountTo || amount <= amountTo);
                      
                      // Issue date filter
                      const issueDateStr = entry.issue_date;
                      const issueDateTime = issueDateStr ? new Date(issueDateStr).getTime() : undefined;
                      const issueFromTime = issueDateFilter.from ? issueDateFilter.from.getTime() : undefined;
                      const issueToTime = issueDateFilter.to ? (() => {
                        const toDate = new Date(issueDateFilter.to);
                        toDate.setHours(23, 59, 59, 999);
                        return toDate.getTime();
                      })() : undefined;
                      const matchesIssueDate = (!issueFromTime || (issueDateTime !== undefined && issueDateTime >= issueFromTime)) &&
                        (!issueToTime || (issueDateTime !== undefined && issueDateTime <= issueToTime));
                      
                      // Due date filter - only filter if both dates are set, otherwise include entries without due dates
                      const dueDateStr = entry.due_date;
                      const dueDateTime = dueDateStr ? new Date(dueDateStr).getTime() : undefined;
                      const dueFromTime = dueDateFilter.from ? dueDateFilter.from.getTime() : undefined;
                      const dueToTime = dueDateFilter.to ? (() => {
                        const toDate = new Date(dueDateFilter.to);
                        toDate.setHours(23, 59, 59, 999);
                        return toDate.getTime();
                      })() : undefined;
                      const matchesDueDate = (!dueFromTime && !dueToTime) || // No filter set
                        (dueDateTime !== undefined && (!dueFromTime || dueDateTime >= dueFromTime) && (!dueToTime || dueDateTime <= dueToTime));
                      
                      // Status filter
                      const effectiveStatus = getEffectiveStatus(entry);
                      const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;
                      
                      return matchesSupplier && matchesSupplierSearch && matchesDocumentType && 
                        matchesAmount && matchesIssueDate && matchesDueDate && matchesStatus;
                    })
                    .map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.supplier_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.document_type}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(entry.total_amount, entry.currency)}</TableCell>
                      <TableCell>{formatDate(entry.issue_date)}</TableCell>
                      <TableCell>
                        {entry.due_date ? formatDate(entry.due_date) : <span className="text-muted-foreground text-sm">-</span>}
                      </TableCell>
                      <TableCell>
                        <CostStatusBadge 
                          entry={entry} 
                          onStatusChange={async (newStatus) => {
                            try {
                              const { error } = await supabase
                                .from('accounting_entries')
                                .update({ status: newStatus })
                                .eq('id', entry.id);
                              
                              if (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to update cost entry status",
                                  variant: "destructive"
                                });
                              } else {
                                await fetchCostEntries();
                                toast({
                                  title: "Status Updated",
                                  description: `Cost entry status changed to ${newStatus}`
                                });
                              }
                            } catch (error) {
                              console.error('Error updating status:', error);
                              toast({
                                title: "Error",
                                description: "Failed to update cost entry status",
                                variant: "destructive"
                              });
                            }
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        {entry.document_url ? (
                          <a
                            href={entry.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingEntry(entry);
                              setIsEditMode(true);
                              setFormData(entry);
                              setDocumentUrl(entry.document_url || '');
                              setDocumentFile(null);
                              setIsDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingEntry(entry)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Card View - Visible below 1280px (xl:hidden) */}
              <div className="xl:hidden space-y-3 w-full max-w-full min-w-0">
                {costEntries
                  .filter((entry) => {
                    // Supplier filter
                    const matchesSupplier = supplierFilter.selected === "all" || 
                      entry.supplier_name === supplierFilter.selected;
                    const matchesSupplierSearch = !supplierFilter.search || 
                      entry.supplier_name?.toLowerCase().includes(supplierFilter.search.toLowerCase());
                    
                    // Document type filter
                    const matchesDocumentType = documentTypeFilter === "all" || 
                      entry.document_type === documentTypeFilter;
                    
                    // Amount filter
                    const amount = entry.total_amount || 0;
                    const amountFrom = amountFilter.from ? parseFloat(amountFilter.from) : undefined;
                    const amountTo = amountFilter.to ? parseFloat(amountFilter.to) : undefined;
                    const matchesAmount = (!amountFrom || amount >= amountFrom) && 
                      (!amountTo || amount <= amountTo);
                    
                    // Issue date filter
                    const issueDateStr = entry.issue_date;
                    const issueDateTime = issueDateStr ? new Date(issueDateStr).getTime() : undefined;
                    const issueFromTime = issueDateFilter.from ? issueDateFilter.from.getTime() : undefined;
                    const issueToTime = issueDateFilter.to ? (() => {
                      const toDate = new Date(issueDateFilter.to);
                      toDate.setHours(23, 59, 59, 999);
                      return toDate.getTime();
                    })() : undefined;
                    const matchesIssueDate = (!issueFromTime || (issueDateTime !== undefined && issueDateTime >= issueFromTime)) &&
                      (!issueToTime || (issueDateTime !== undefined && issueDateTime <= issueToTime));
                    
                    // Due date filter - only filter if both dates are set, otherwise include entries without due dates
                    const dueDateStr = entry.due_date;
                    const dueDateTime = dueDateStr ? new Date(dueDateStr).getTime() : undefined;
                    const dueFromTime = dueDateFilter.from ? dueDateFilter.from.getTime() : undefined;
                    const dueToTime = dueDateFilter.to ? (() => {
                      const toDate = new Date(dueDateFilter.to);
                      toDate.setHours(23, 59, 59, 999);
                      return toDate.getTime();
                    })() : undefined;
                    const matchesDueDate = (!dueFromTime && !dueToTime) || // No filter set
                      (dueDateTime !== undefined && (!dueFromTime || dueDateTime >= dueFromTime) && (!dueToTime || dueDateTime <= dueToTime));
                    
                    // Status filter
                    const effectiveStatus = getEffectiveStatus(entry);
                    const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;
                    
                    return matchesSupplier && matchesSupplierSearch && matchesDocumentType && 
                      matchesAmount && matchesIssueDate && matchesDueDate && matchesStatus;
                  })
                  .map((entry) => {
                    const effectiveStatus = getEffectiveStatus(entry);
                    return (
                      <Card 
                        key={entry.id} 
                        className={`p-4 border cursor-pointer hover:bg-muted/50 transition-colors w-full ${
                          effectiveStatus === 'overdue' ? 'border-red-200 bg-red-50/50' :
                          effectiveStatus === 'paid' ? 'border-green-200 bg-green-50/50' :
                          'border-amber-200 bg-amber-50/50'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Header Row - Supplier Name and Actions */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Supplier</span>
                                <div className="text-sm font-semibold break-words">{entry.supplier_name}</div>
                              </div>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">{entry.document_type}</Badge>
                                <CostStatusBadge 
                                  entry={entry} 
                                  onStatusChange={async (newStatus) => {
                                    try {
                                      const { error } = await supabase
                                        .from('accounting_entries')
                                        .update({ status: newStatus })
                                        .eq('id', entry.id);
                                      
                                      if (error) {
                                        toast({
                                          title: "Error",
                                          description: "Failed to update cost entry status",
                                          variant: "destructive"
                                        });
                                      } else {
                                        await fetchCostEntries();
                                        toast({
                                          title: "Status Updated",
                                          description: `Cost entry status changed to ${newStatus}`
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error updating status:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to update cost entry status",
                                        variant: "destructive"
                                      });
                                    }
                                  }} 
                                />
                              </div>
                            </div>
                          </div>

                          {/* Details - Responsive Grid */}
                          {/* 375-640px: Single column, 641-1024px: 2 columns, 1025-1280px: 2 columns */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</span>
                              <div className="text-sm font-medium break-words">{formatCurrency(entry.total_amount, entry.currency)}</div>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issue Date</span>
                              <div className="text-sm font-medium break-words">{formatDate(entry.issue_date)}</div>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</span>
                              <div className="text-sm font-medium break-words">
                                {entry.due_date ? formatDate(entry.due_date) : <span className="text-muted-foreground">-</span>}
                              </div>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Document</span>
                              <div className="text-sm font-medium">
                                {entry.document_url ? (
                                  <a
                                    href={entry.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1 break-words"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <FileText className="w-4 h-4 flex-shrink-0" />
                                    <span className="break-words">View Document</span>
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Notes - Below View Document */}
                          {entry.notes && entry.notes.trim() && (
                            <div className="flex flex-col space-y-1 pt-1 border-t">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</span>
                              <p className="text-sm break-words whitespace-pre-wrap">{entry.notes}</p>
                            </div>
                          )}

                          {/* Action Buttons - Bottom of Card */}
                          <div className="flex justify-end gap-2 pt-3 border-t mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEntry(entry);
                                setIsEditMode(true);
                                setFormData(entry);
                                setDocumentUrl(entry.document_url || '');
                                setDocumentFile(null);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingEntry(entry);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
              </div>

      {/* Cost Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDialogOpen(false);
          setIsEditMode(false);
          setEditingEntry(null);
          
          // Reset form (don't set today's date - let OCR extract or user enter)
          setFormData({
            supplier_name: '',
            document_type: 'invoice',
            subtotal_tax_excluded: 0,
            total_amount: 0,
            currency: 'BAM',
            issue_date: '', // Don't set default - let OCR extract or user enter
            due_date: '',
            notes: '',
            document_number: '',
            status: 'pending'
          });
          setOCRSuggestions({});
          setApprovedFields(new Set());
          setDocumentFile(null);
          // Clean up object URL
          if (documentUrl) {
            URL.revokeObjectURL(documentUrl);
          }
          setDocumentUrl('');
          setOCRFile(null);
          setSupplierFormData({
            name: '',
            contact_person: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            website: '',
            tax_id: '',
            payment_terms: 'Net 30',
            notes: '',
            country: '',
            currency: 'EUR'
          });
        }
      }}>
        <DialogContent className={documentUrl || documentFile ? "max-w-6xl max-h-[95vh] flex flex-col overflow-hidden" : "max-w-2xl max-h-[95vh] flex flex-col overflow-hidden"}>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
            <DialogTitle>{isEditMode ? 'Edit Cost Entry' : 'Cost Entry'}</DialogTitle>
            <DialogDescription>
                  {(ocrFileName || documentFile?.name || (editingEntry?.document_url && editingEntry.document_url.split('/').pop())) ? (ocrFileName || documentFile?.name || (editingEntry?.document_url && editingEntry.document_url.split('/').pop())) : (isEditMode ? 'Edit the cost entry details' : 'Add new cost entry')}
            </DialogDescription>
            </div>
              {!isEditMode && (documentUrl || documentFile) && (
                  <Button
                  variant="default"
                  onClick={() => {
                    // Pre-populate supplier form with OCR data if available
                    const supplierData = supplierOCRData || {};
                    const currency = supplierData.country ? getCurrencyForCountry(supplierData.country) : 'EUR';
                    
                    setSupplierFormData({
                      name: supplierData.name || ocrSuggestions.supplier_name || '',
                      contact_person: '',
                      email: supplierData.email || '',
                      phone: supplierData.phone || '',
                      address: supplierData.address || '',
                      city: supplierData.city || '',
                      website: supplierData.website || '',
                      tax_id: supplierData.tax_id || '',
                      payment_terms: 'Net 30',
                      notes: '',
                      country: supplierData.country || '',
                      currency: currency || 'EUR'
                    });
                    setIsAIAddSupplierDialogOpen(true);
                  }}
                  className="bg-primary text-primary-foreground"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  AI Add Supplier
                  </Button>
                )}
              </div>
          </DialogHeader>

          <div className={(documentUrl || documentFile) ? "flex flex-col sm:flex-row gap-6 overflow-y-auto flex-1 min-h-0" : "flex-1 overflow-y-auto min-h-0"}>
            {/* Document Preview - Mobile: First, Desktop: Right Side */}
            {(documentUrl || documentFile) && (
              <div className="w-full sm:w-2/3 border-b sm:border-b-0 sm:border-l pb-6 sm:pb-0 pl-0 sm:pl-6 overflow-y-auto flex flex-col flex-shrink-0 order-first sm:order-last">
                <div className="flex justify-center items-start pt-0 sm:pt-4">
                  {(() => {
                    const file = ocrFile || documentFile;
                    let url = documentUrl;
                    
                    // If we have a file but no URL, create one
                    if (file && !url) {
                      url = URL.createObjectURL(file);
                    }
                    
                    if (!url) return null;
                    
                    // Determine file type
                    let isPDF = false;
                    if (file) {
                      isPDF = file.type === 'application/pdf';
                    } else if (editingEntry?.document_url) {
                      const docUrl = editingEntry.document_url.toLowerCase();
                      isPDF = docUrl.endsWith('.pdf') || docUrl.includes('pdf');
                    } else if (url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf')) {
                      isPDF = true;
                    }
                    
                    return isPDF ? (
                      <iframe
                        src={`${url}#toolbar=0&navpanes=0`}
                        className="w-full min-h-[400px] sm:min-h-[800px] rounded-lg shadow-sm border-0"
                        title="Document Preview"
                        style={{ border: 'none' }}
                      />
                    ) : (
                      <img
                        src={url}
                        alt="Document Preview"
                        className="max-w-full h-auto rounded-lg shadow-sm object-contain"
                      />
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Form Section - Mobile: Below Preview, Desktop: Left Side */}
            <div className={(documentUrl || documentFile) ? "w-full sm:w-1/3 overflow-y-auto sm:pr-4 flex-shrink-0 min-w-0" : "w-full"}>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select 
                value={formData.supplier_name || ''} 
                onValueChange={(value) => {
                  const supplier = suppliers.find(s => s.name === value);
                  setFormData(prev => {
                    const updated = { ...prev, supplier_name: value };
                    // Calculate due_date from payment_terms if issue_date exists and due_date not manually set
                    if (supplier && prev.issue_date && !prev.due_date) {
                      const calculatedDueDate = calculateDueDate(supplier.payment_terms, prev.issue_date);
                      if (calculatedDueDate) {
                        updated.due_date = calculatedDueDate;
                        console.log(`Calculated due_date from supplier payment_terms (${supplier.payment_terms}):`, calculatedDueDate);
                      }
                    }
                    return updated;
                  });
                  setApprovedFields(prev => new Set(prev).add('supplier_name'));
                }}
              >
                <SelectTrigger className={ocrSuggestions.supplier_name && !formData.supplier_name ? 'placeholder:text-muted-foreground/50' : ''}>
                  <SelectValue placeholder={ocrSuggestions.supplier_name && !formData.supplier_name ? ocrSuggestions.supplier_name : "Select supplier"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type *</Label>
              <Select 
                value={formData.document_type || ocrSuggestions.document_type || 'invoice'} 
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, document_type: value as any }));
                  setApprovedFields(prev => new Set(prev).add('document_type'));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="credit_note">Credit note</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtotal">Subtotal (Tax Excluded)</Label>
              <div className="relative">
              <NumericInput
                id="subtotal"
                value={formData.subtotal_tax_excluded || 0}
                onChange={(val) => {
                  setFormData(prev => ({ ...prev, subtotal_tax_excluded: val }));
                    setApprovedFields(prev => new Set(prev).add('subtotal_tax_excluded'));
                  }}
                min={0}
                step={0.01}
                placeholder={ocrSuggestions.subtotal_tax_excluded && ocrSuggestions.subtotal_tax_excluded > 0 && !formData.subtotal_tax_excluded ? ocrSuggestions.subtotal_tax_excluded.toString() : ''}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total">Total Amount *</Label>
              <NumericInput
                id="total"
                value={formData.total_amount || 0}
                onChange={(val) => {
                  setFormData(prev => ({ ...prev, total_amount: val }));
                  setApprovedFields(prev => new Set(prev).add('total_amount'));
                }}
                min={0}
                step={0.01}
                placeholder={ocrSuggestions.total_amount && ocrSuggestions.total_amount > 0 && !formData.total_amount ? ocrSuggestions.total_amount.toString() : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={formData.currency || ocrSuggestions.currency || 'BAM'} 
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, currency: value }));
                  setApprovedFields(prev => new Set(prev).add('currency'));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAM">BAM</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date *</Label>
              <Popover open={isIssueDatePickerOpen} onOpenChange={setIsIssueDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.issue_date && "text-muted-foreground",
                      ocrSuggestions.issue_date && !formData.issue_date && 'border-green-300'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.issue_date ? format(new Date(formData.issue_date), "PPP") : ocrSuggestions.issue_date ? ocrSuggestions.issue_date : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.issue_date ? new Date(formData.issue_date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const newIssueDate = formatDateForInput(date);
                  setFormData(prev => {
                    const updated = { ...prev, issue_date: newIssueDate };
                    // Recalculate due_date from payment_terms if supplier is selected and due_date not manually set
                    if (prev.supplier_name && newIssueDate && !prev.due_date) {
                      const supplier = suppliers.find(s => s.name === prev.supplier_name);
                      if (supplier && supplier.payment_terms) {
                        const calculatedDueDate = calculateDueDate(supplier.payment_terms, newIssueDate);
                        if (calculatedDueDate) {
                          updated.due_date = calculatedDueDate;
                          console.log(`Recalculated due_date from supplier payment_terms (${supplier.payment_terms}):`, calculatedDueDate);
                        }
                      }
                    }
                    return updated;
                  });
                  setApprovedFields(prev => new Set(prev).add('issue_date'));
                        setIsIssueDatePickerOpen(false);
                      }
                }}
                    initialFocus
              />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Popover open={isDueDatePickerOpen} onOpenChange={setIsDueDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-muted-foreground",
                      ocrSuggestions.due_date && !formData.due_date && 'border-green-300'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(new Date(formData.due_date), "PPP") : ocrSuggestions.due_date ? ocrSuggestions.due_date : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date ? new Date(formData.due_date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const newDueDate = formatDateForInput(date);
                  setFormData(prev => {
                    const updated = { ...prev, due_date: newDueDate };
                    // Auto-update status based on due_date if status is not "paid"
                    if (prev.status !== 'paid' && newDueDate) {
                      const tempEntry: CostEntry = {
                        id: prev.id || '',
                        supplier_name: prev.supplier_name || '',
                        document_type: prev.document_type || 'invoice',
                        subtotal_tax_excluded: prev.subtotal_tax_excluded || 0,
                        total_amount: prev.total_amount || 0,
                        currency: prev.currency || 'BAM',
                        issue_date: prev.issue_date || '',
                        due_date: newDueDate,
                        notes: prev.notes || '',
                        document_number: prev.document_number || '',
                        status: prev.status || 'pending',
                        created_at: prev.created_at || '',
                        updated_at: prev.updated_at || ''
                      };
                      updated.status = getEffectiveStatus(tempEntry);
                    }
                    return updated;
                  });
                  setApprovedFields(prev => new Set(prev).add('due_date'));
                        setIsDueDatePickerOpen(false);
                      }
                }}
                    initialFocus
              />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document_number">Document Number</Label>
              <Input
                id="document_number"
                value={formData.document_number || ''}
                placeholder={ocrSuggestions.document_number && !formData.document_number ? ocrSuggestions.document_number : ''}
                className={ocrSuggestions.document_number && !formData.document_number ? 'placeholder:text-muted-foreground/50' : ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, document_number: e.target.value }));
                  setApprovedFields(prev => new Set(prev).add('document_number'));
                }}
                onFocus={() => handleFieldFocus('document_number')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status || 'pending'} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document_upload">Document Attachment</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="document_upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.tiff,.bmp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setDocumentFile(file);
                      // Create object URL for preview
                      const url = URL.createObjectURL(file);
                      setDocumentUrl(url);
                    }
                  }}
                  className="cursor-pointer"
                />
                {documentFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>{documentFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDocumentFile(null);
                        setDocumentUrl('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {documentUrl && !documentFile && (
                  <div className="flex items-center gap-2">
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      View Document
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocumentUrl('')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              {isUploadingDocument && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading document...</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                placeholder="Add any notes about this cost entry..."
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, notes: e.target.value }));
                }}
                rows={3}
              />
            </div>
            </div>
          </div>
            </div>

          <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCostEntry}>
              {isEditMode ? 'Update' : 'Save'} Cost Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Add Supplier Dialog */}
      <Dialog open={isAIAddSupplierDialogOpen} onOpenChange={setIsAIAddSupplierDialogOpen}>
        <DialogContent className={(documentUrl || documentFile) ? "max-w-6xl max-h-[95vh] flex flex-col" : "max-w-2xl max-h-[95vh] flex flex-col"}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              AI Add Supplier
            </DialogTitle>
            <DialogDescription>
              {ocrFileName || documentFile?.name || 'Add new supplier from scanned document'}
            </DialogDescription>
          </DialogHeader>

          <div className={(documentUrl || documentFile) ? "flex gap-6 overflow-hidden flex-1 min-h-0" : "flex-1 overflow-y-auto min-h-0"}>
            <div className={(documentUrl || documentFile) ? "w-1/3 overflow-y-auto pr-4 flex-shrink-0" : "w-full"}>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_name">Company Name *</Label>
                  <Input
                    id="ai_supplier_name"
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_contact">Contact Person</Label>
                  <Input
                    id="ai_supplier_contact"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                    placeholder="Enter contact person"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_email">Email</Label>
                  <Input
                    id="ai_supplier_email"
                    type="email"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_phone">Phone</Label>
                  <Input
                    id="ai_supplier_phone"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_tax">Tax ID</Label>
                  <Input
                    id="ai_supplier_tax"
                    value={supplierFormData.tax_id}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                    placeholder="Enter tax ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_payment">Payment Terms</Label>
                  <Input
                    id="ai_supplier_payment"
                    value={supplierFormData.payment_terms}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                    placeholder="e.g., Net 30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_country">Country</Label>
                  <CountryAutocomplete
                    value={supplierFormData.country}
                    onChange={(country) => {
                      const currency = getCurrencyForCountry(country);
                      setSupplierFormData(prev => ({ ...prev, country, currency: currency || prev.currency }));
                    }}
                    placeholder="Select country"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_currency">Currency</Label>
                  <Input
                    id="ai_supplier_currency"
                    value={supplierFormData.currency}
                    disabled
                    placeholder="Currency (auto-set from country)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_address">Address</Label>
                  <Input
                    id="ai_supplier_address"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter full address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_city">City</Label>
                  <Input
                    id="ai_supplier_city"
                    value={supplierFormData.city}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Enter city"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_website">Website</Label>
                  <Input
                    id="ai_supplier_website"
                    value={supplierFormData.website}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="Enter website URL"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_supplier_notes">Notes</Label>
                  <Input
                    id="ai_supplier_notes"
                    value={supplierFormData.notes}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter any notes"
                  />
                </div>
              </div>
            </div>

            {/* Document Preview - Right Side */}
            {(documentUrl || documentFile) && (
              <div className="w-2/3 border-l pl-6 overflow-y-auto flex flex-col flex-shrink-0">
                <div className="flex justify-center items-start pt-4">
                  {(() => {
                    const file = ocrFile || documentFile;
                    let url = documentUrl;
                    
                    if (file && !url) {
                      url = URL.createObjectURL(file);
                    }
                    
                    if (!url) return null;
                    
                    let isPDF = false;
                    if (file) {
                      isPDF = file.type === 'application/pdf';
                    } else if (url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf')) {
                      isPDF = true;
                    }
                    
                    return isPDF ? (
                      <iframe
                        src={url}
                        className="w-full min-h-[800px] rounded-lg shadow-sm"
                        title="Document Preview"
                      />
                    ) : (
                      <img
                        src={url}
                        alt="Document Preview"
                        className="max-w-full h-auto rounded-lg shadow-sm"
                      />
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0 mt-4">
            <Button variant="outline" onClick={() => setIsAIAddSupplierDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              try {
                const savedSupplier = await saveNewSupplier();
                setIsAIAddSupplierDialogOpen(false);
                // Update the supplier dropdown in the cost entry form
                if (savedSupplier) {
                  // Wait a bit for suppliers list to refresh
                  setTimeout(() => {
                    const updatedSupplier = suppliers.find(s => s.name.toLowerCase() === supplierFormData.name.toLowerCase()) || savedSupplier;
                    setFormData(prev => ({ ...prev, supplier_name: updatedSupplier.name || supplierFormData.name }));
                  }, 100);
                }
              } catch (error) {
                // Error already handled in saveNewSupplier
              }
            }} disabled={!supplierFormData.name.trim()}>
              Save Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Addition Dialog */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>Add New Supplier</span>
            </DialogTitle>
            <DialogDescription>
              We detected a new supplier in your document. Please review and add the supplier details to your database.
            </DialogDescription>
          </DialogHeader>

          {detectedSupplier && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Supplier Detected from Document
                </span>
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Confidence:</strong> {(detectedSupplier.confidence * 100).toFixed(0)}%</p>
                <p><strong>Detected Name:</strong> {detectedSupplier.supplierName}</p>
                {detectedSupplier.address && <p><strong>Address:</strong> {detectedSupplier.address}</p>}
                {detectedSupplier.phone && <p><strong>Phone:</strong> {detectedSupplier.phone}</p>}
                {detectedSupplier.email && <p><strong>Email:</strong> {detectedSupplier.email}</p>}
                {detectedSupplier.taxNumber && <p><strong>Tax Number:</strong> {detectedSupplier.taxNumber}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_name">Company Name *</Label>
              <Input
                id="supplier_name"
                value={supplierFormData.name}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_contact">Contact Person</Label>
              <Input
                id="supplier_contact"
                value={supplierFormData.contact_person}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                placeholder="Enter contact person"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_email">Email</Label>
              <Input
                id="supplier_email"
                type="email"
                value={supplierFormData.email}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_phone">Phone</Label>
              <Input
                id="supplier_phone"
                value={supplierFormData.phone}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_tax">Tax ID</Label>
              <Input
                id="supplier_tax"
                value={supplierFormData.tax_id}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                placeholder="Enter tax ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_payment">Payment Terms</Label>
              <Input
                id="supplier_payment"
                value={supplierFormData.payment_terms}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                placeholder="e.g., Net 30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_country">Country</Label>
              <CountryAutocomplete
                value={supplierFormData.country}
                onChange={(country) => {
                  const currency = getCurrencyForCountry(country);
                  setSupplierFormData(prev => ({ ...prev, country, currency: currency || prev.currency }));
                }}
                placeholder="Select country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_currency">Currency</Label>
              <Input
                id="supplier_currency"
                value={supplierFormData.currency}
                disabled
                placeholder="Currency (auto-set from country)"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="supplier_address">Address</Label>
              <Input
                id="supplier_address"
                value={supplierFormData.address}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter full address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_city">City</Label>
              <Input
                id="supplier_city"
                value={supplierFormData.city}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Enter city"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="supplier_website">Website</Label>
              <Input
                id="supplier_website"
                value={supplierFormData.website}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="Enter website URL"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="supplier_notes">Notes</Label>
              <Input
                id="supplier_notes"
                value={supplierFormData.notes}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter any notes"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>
              Skip
            </Button>
            <Button onClick={async () => {
              await saveNewSupplier();
              setIsSupplierDialogOpen(false);
              setDetectedSupplier(null);
              setSupplierFormData({
                name: '',
                contact_person: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                website: '',
                tax_id: '',
                payment_terms: 'Net 30',
                notes: '',
                country: '',
                currency: 'EUR'
              });
            }} disabled={!supplierFormData.name.trim()}>
              Add Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cost Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this cost entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeletingEntry(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteCostEntry}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* OCR Results Dialog */}
      <Dialog open={isOCRDialogOpen} onOpenChange={setIsOCRDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              OCR Test Results
            </DialogTitle>
            <DialogDescription>
              {ocrFileName && `Processing: ${ocrFileName}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {isOCRProcessing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Processing document with Gemini AI...</p>
                <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
              </div>
            ) : ocrResult ? (
              <>
                {/* Check if this is an error result */}
                {ocrResult.text.includes('Document Processing Failed') || 
                 ocrResult.text.includes('OCR Processing Error') || 
                 ocrResult.confidence < 0.2 ? (
                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="text-lg text-destructive flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        OCR Processing Failed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-destructive/10 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-mono text-destructive">
                          {ocrResult.text}
                        </pre>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        <strong>Tips for better OCR results:</strong>
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                        <li>Ensure the document/image is clear and high resolution</li>
                        <li>Make sure text is not rotated or skewed</li>
                        <li>Try scanning at 300 DPI or higher</li>
                        <li>Ensure good contrast between text and background</li>
                        <li>Check the browser console (F12) for detailed error messages</li>
                      </ul>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* OCR Statistics */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{(ocrResult.confidence * 100).toFixed(1)}%</div>
                          <p className="text-xs text-muted-foreground">Confidence</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{(ocrResult.processingTime / 1000).toFixed(1)}s</div>
                          <p className="text-xs text-muted-foreground">Processing Time</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{ocrResult.text.length}</div>
                          <p className="text-xs text-muted-foreground">Characters</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Extracted Text */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Extracted Text</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm font-mono">
                            {ocrResult.text || 'No text extracted'}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Extracted Data (if available) */}
                {ocrResult.extractedData && Object.keys(ocrResult.extractedData).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Parsed Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
                        <pre className="text-sm font-mono">
                          {JSON.stringify(ocrResult.extractedData, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Engine Info */}
                <div className="text-xs text-muted-foreground text-center">
                  Powered by Gemini AI
                </div>
              </>
            ) : null}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOCRDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}