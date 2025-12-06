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
  Settings,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate, formatDateForInput } from "@/lib/dateUtils";
import { ocrService, OCRResult, OCRService } from "@/lib/ocrService";
import { extractValueAfterPattern, calculateSimilarity } from "@/lib/fuzzyMatch";
import { useToast } from "@/hooks/use-toast";

interface CostEntry {
  id: string;
  supplier_name: string;
  document_type: 'invoice' | 'quote' | 'receipt' | 'other';
  subtotal_tax_excluded: number;
  total_amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  description: string;
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
  const [detectedSupplier, setDetectedSupplier] = useState<any>(null);
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    tax_number: '',
    contact_person: '',
    payment_terms: 30
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CostEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<CostEntry | null>(null);
  const [isOCRDialogOpen, setIsOCRDialogOpen] = useState(false);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrResult, setOCRResult] = useState<OCRResult | null>(null);
  const [ocrFileName, setOCRFileName] = useState<string>("");
  const [ocrFile, setOCRFile] = useState<File | null>(null); // Store the OCR scanned file
  const [ocrSuggestions, setOCRSuggestions] = useState<Partial<CostEntry>>({});
  const [approvedFields, setApprovedFields] = useState<Set<string>>(new Set());
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>("");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isOCRSettingsOpen, setIsOCRSettingsOpen] = useState(false);
  const [ocrFieldMappings, setOCRFieldMappings] = useState<Record<string, string[]>>({
    document_type: [],
    subtotal_tax_excluded: [],
    total_amount: [],
    currency: [],
    issue_date: [],
    due_date: [],
    document_number: []
  });
  const [editingMapping, setEditingMapping] = useState<{ field: string; index: number; value: string } | null>(null);
  const [newMappingInputs, setNewMappingInputs] = useState<Record<string, string>>({
    document_type: '',
    subtotal_tax_excluded: '',
    total_amount: '',
    currency: '',
    issue_date: '',
    due_date: '',
    document_number: ''
  });

  const [formData, setFormData] = useState<Partial<CostEntry>>({
    supplier_name: '',
    document_type: 'invoice',
    subtotal_tax_excluded: 0,
    total_amount: 0,
    currency: 'BAM',
    issue_date: '',
    due_date: '',
    description: '',
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

    // Don't set default issue date - let OCR extract it or user enter it manually
    // setFormData(prev => ({
    //   ...prev,
    //   issue_date: formatDateForInput(new Date())
    // }));
  }, []);

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

  const saveOCRMappings = () => {
    try {
      localStorage.setItem('ocr_field_mappings', JSON.stringify(ocrFieldMappings));
      setIsOCRSettingsOpen(false);
    } catch (error) {
      console.error('Error saving OCR mappings:', error);
    }
  };

  const fetchCostEntries = async () => {
    try {
      // For now, use accounting_entries as a placeholder
      // In a real implementation, you would create a cost_entries table
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cost entries:', error);
        // Set empty array if table doesn't exist
        setCostEntries([]);
        return;
      }

      // Transform accounting entries to cost entries format
      const transformedData = data?.map(entry => ({
        id: entry.id,
        supplier_name: entry.description || 'Unknown Supplier',
        document_type: (entry.category || 'invoice') as any,
        subtotal_tax_excluded: entry.amount * 0.8, // Assume 20% VAT
        total_amount: entry.amount,
        currency: 'BAM',
        issue_date: entry.date,
        due_date: (entry as any).due_date || '',
        description: entry.description,
        document_number: entry.reference || '',
        status: ((entry as any).status || 'pending') as 'pending' | 'paid' | 'overdue',
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        document_url: (entry as any).document_url || ''
      })) || [];

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
      if (documentFile && !documentUrl) {
        const url = await uploadDocument(documentFile);
        if (url) {
          uploadedDocumentUrl = url;
        } else {
          // User can still save without document if upload fails
          console.warn('Document upload failed, but continuing with save');
        }
      }

      const entryData = {
        ...formData,
        subtotal_tax_excluded: formData.subtotal_tax_excluded || 0,
        total_amount: formData.total_amount || 0,
        currency: formData.currency || 'BAM',
        status: formData.status || 'pending'
      };

      if (isEditMode && editingEntry) {
        // Transform to accounting entry format for update
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
        // Transform to accounting entry format for insert
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
      }

      await fetchCostEntries();
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditingEntry(null);
      
      // Reset form (don't set today's date - let OCR or user set it)
      setFormData({
        supplier_name: '',
        document_type: 'invoice',
        subtotal_tax_excluded: 0,
        total_amount: 0,
        currency: 'BAM',
        issue_date: '', // Don't set default - let OCR extract or user enter
        due_date: '',
        description: '',
        document_number: '',
        status: 'pending'
      });
      setDocumentFile(null);
      setDocumentUrl('');
      setOCRFile(null);
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
        
        // Create OCR service with Serbian/Bosnian/Croatian languages
        // Note: Tesseract uses 'hrv' for Croatian, 'srp' for Serbian
        // Try multiple languages, fallback to English if language packs not available
        let result: OCRResult;
        let multiLangOCRService: OCRService;
        
        try {
          // Try with Serbian/Croatian/English
          multiLangOCRService = new OCRService({
            language: 'hrv+srp+eng', // Croatian + Serbian + English
            debug: true
          });
          
          if (file.type === 'application/pdf') {
            console.log('Processing as PDF with hrv+srp+eng...');
            result = await multiLangOCRService.processPDF(file);
        } else {
            console.log('Processing as image with hrv+srp+eng...');
            result = await multiLangOCRService.processImage(file);
          }
        } catch (langError: any) {
          console.warn('Multi-language OCR failed, trying English only:', langError);
          // Fallback to English if language packs not available
          multiLangOCRService = new OCRService({
            language: 'eng',
            debug: true
          });
          
          if (file.type === 'application/pdf') {
            console.log('Processing as PDF with eng...');
            result = await multiLangOCRService.processPDF(file);
          } else {
            console.log('Processing as image with eng...');
            result = await multiLangOCRService.processImage(file);
          }
        }

        console.log('OCR result received:', result);
        
        // Check if result indicates failure
        if (result.text.includes('Document Processing Failed') || result.confidence < 0.2) {
          console.warn('Low confidence or failure detected:', result);
          setIsOCRDialogOpen(true);
          setOCRResult(result);
        } else {
          // Extract suggestions from OCR result using field mappings
          const suggestions = extractDataFromOCR(result.text, ocrFieldMappings, result.extractedData);
          
          // Try to match supplier from OCR text
          const matchedSupplier = findSupplierFromOCRText(result.text, suppliers, companyInfo);
          if (matchedSupplier) {
            suggestions.supplier_name = matchedSupplier.name; // Use name, not ID, because Select uses name as value
            console.log('Matched supplier from OCR:', matchedSupplier.name, 'with ID:', matchedSupplier.id);
          } else {
            console.log('No supplier matched from OCR text');
          }
          
          console.log('OCR suggestions extracted:', suggestions);
          console.log('OCR text sample:', result.text.substring(0, 500));
          
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
              console.log('Setting due_date from OCR:', suggestions.due_date);
              updated.due_date = suggestions.due_date;
            }
            if (suggestions.supplier_name && !prev.supplier_name) {
              updated.supplier_name = suggestions.supplier_name;
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
            if (suggestions.description && !prev.description) {
              updated.description = suggestions.description;
            }
            return updated;
          });
          
          // Set the OCR file as the document file
          if (file) {
            setDocumentFile(file);
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
      description: ocrText.substring(0, 200) || '',
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
        } else if (lowerValue.includes('potvrda') || lowerValue.includes('receipt')) {
          return 'receipt';
        }
        return null;
      });
      if (value !== null) {
        suggestions.document_type = value;
      }
    }

    return suggestions;
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
          address: supplierFormData.address,
          phone: supplierFormData.phone,
          email: supplierFormData.email,
          tax_id: supplierFormData.tax_number,
          contact_person: supplierFormData.contact_person,
          payment_terms: supplierFormData.payment_terms.toString()
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
      
      // Close dialog and reset form
      setIsSupplierDialogOpen(false);
      setDetectedSupplier(null);
      setSupplierFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        tax_number: '',
        contact_person: '',
        payment_terms: 30
      });
      
      alert(`Supplier "${supplierFormData.name}" has been added to your database successfully!`);
      
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert(`Error saving supplier: ${error.message}`);
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
        <h1 className="text-3xl font-bold">Cost Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsOCRSettingsOpen(true)}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handleScanDocument} disabled={isOCRProcessing}>
            {isOCRProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <ScanLine className="w-4 h-4 mr-2" />
                Scan Doc
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costEntries.map((entry) => (
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
                        <Badge 
                          variant="outline" 
                          className={
                            entry.status === 'paid' ? 'bg-green-500/10 text-green-700 border-green-200' :
                            entry.status === 'overdue' ? 'bg-red-500/10 text-red-700 border-red-200' :
                            'bg-amber-500/10 text-amber-700 border-amber-200'
                          }
                        >
                          {entry.status}
                        </Badge>
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
            description: '',
            document_number: '',
            status: 'pending'
          });
          setOCRSuggestions({});
          setApprovedFields(new Set());
          setDocumentFile(null);
          setDocumentUrl('');
          setOCRFile(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Cost Entry' : 'Cost Entry'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Edit the cost entry details' 
                  : 'Add new cost entry'
              }
            </DialogDescription>
          </DialogHeader>

          {Object.keys(ocrSuggestions).length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">
                📄 Document scanned! Review and approve the recognized fields below.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <Label htmlFor="supplier">Supplier *</Label>
                {ocrSuggestions.supplier_name && !approvedFields.has('supplier_name') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApproveField('supplier_name')}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                )}
              </div>
              <Select 
                value={formData.supplier_name || ''} 
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, supplier_name: value }));
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
              <div className="flex items-center justify-between">
              <Label htmlFor="document_type">Document Type *</Label>
                {ocrSuggestions.document_type && !approvedFields.has('document_type') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApproveField('document_type')}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                )}
              </div>
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
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <Label htmlFor="subtotal">Subtotal (Tax Excluded)</Label>
                {ocrSuggestions.subtotal_tax_excluded && ocrSuggestions.subtotal_tax_excluded > 0 && !approvedFields.has('subtotal_tax_excluded') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApproveField('subtotal_tax_excluded')}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                )}
              </div>
              <div className="relative">
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={formData.subtotal_tax_excluded || ''}
                  placeholder={ocrSuggestions.subtotal_tax_excluded && ocrSuggestions.subtotal_tax_excluded > 0 && !formData.subtotal_tax_excluded ? ocrSuggestions.subtotal_tax_excluded.toString() : ''}
                  className={ocrSuggestions.subtotal_tax_excluded && ocrSuggestions.subtotal_tax_excluded > 0 && !formData.subtotal_tax_excluded ? 'placeholder:text-muted-foreground/50' : ''}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, subtotal_tax_excluded: parseFloat(e.target.value) || 0 }));
                    setApprovedFields(prev => new Set(prev).add('subtotal_tax_excluded'));
                  }}
                  onFocus={() => handleFieldFocus('subtotal_tax_excluded')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <Label htmlFor="total">Total Amount *</Label>
                {ocrSuggestions.total_amount && ocrSuggestions.total_amount > 0 && !approvedFields.has('total_amount') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApproveField('total_amount')}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                )}
              </div>
              <Input
                id="total"
                type="number"
                step="0.01"
                value={formData.total_amount || ''}
                placeholder={ocrSuggestions.total_amount && ocrSuggestions.total_amount > 0 && !formData.total_amount ? ocrSuggestions.total_amount.toString() : ''}
                className={ocrSuggestions.total_amount && ocrSuggestions.total_amount > 0 && !formData.total_amount ? 'placeholder:text-muted-foreground/50' : ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }));
                  setApprovedFields(prev => new Set(prev).add('total_amount'));
                }}
                onFocus={() => handleFieldFocus('total_amount')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <Label htmlFor="currency">Currency</Label>
                {ocrSuggestions.currency && !approvedFields.has('currency') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApproveField('currency')}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                )}
              </div>
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
              <div className="flex items-center justify-between">
              <Label htmlFor="issue_date">Issue Date *</Label>
                {ocrSuggestions.issue_date && !approvedFields.has('issue_date') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApproveField('issue_date')}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                )}
              </div>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date || ''}
                placeholder={ocrSuggestions.issue_date && !formData.issue_date ? ocrSuggestions.issue_date : ''}
                className={ocrSuggestions.issue_date && !formData.issue_date ? 'placeholder:text-muted-foreground/50' : ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, issue_date: e.target.value }));
                  setApprovedFields(prev => new Set(prev).add('issue_date'));
                }}
                onFocus={() => handleFieldFocus('issue_date')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <Label htmlFor="due_date">Due Date</Label>
                {ocrSuggestions.due_date && !approvedFields.has('due_date') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApproveField('due_date')}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                )}
              </div>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date || ''}
                placeholder={ocrSuggestions.due_date && !formData.due_date ? ocrSuggestions.due_date : ''}
                className={ocrSuggestions.due_date && !formData.due_date ? 'placeholder:text-muted-foreground/50' : ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, due_date: e.target.value }));
                  setApprovedFields(prev => new Set(prev).add('due_date'));
                }}
                onFocus={() => handleFieldFocus('due_date')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <Label htmlFor="document_number">Document Number</Label>
                {ocrSuggestions.document_number && !approvedFields.has('document_number') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApproveField('document_number')}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                )}
              </div>
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
                      setDocumentUrl(''); // Clear URL if new file is selected
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
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
            <Label htmlFor="description">Description</Label>
              {ocrSuggestions.description && !approvedFields.has('description') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleApproveField('description')}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Approve
                </Button>
              )}
            </div>
            <Textarea
              id="description"
              value={formData.description || ''}
              placeholder={ocrSuggestions.description && !formData.description ? ocrSuggestions.description : ''}
              className={ocrSuggestions.description && !formData.description ? 'placeholder:text-muted-foreground/50' : ''}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                setApprovedFields(prev => new Set(prev).add('description'));
              }}
              onFocus={() => handleFieldFocus('description')}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCostEntry}>
              {isEditMode ? 'Update' : 'Save'} Cost Entry
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
              <Label htmlFor="supplier_name">Supplier Name *</Label>
              <Input
                id="supplier_name"
                value={supplierFormData.name}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter supplier name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_address">Address</Label>
              <Input
                id="supplier_address"
                value={supplierFormData.address}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
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
              <Label htmlFor="supplier_email">Email</Label>
              <Input
                id="supplier_email"
                type="email"
                value={supplierFormData.email}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_tax">Tax Number</Label>
              <Input
                id="supplier_tax"
                value={supplierFormData.tax_number}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, tax_number: e.target.value }))}
                placeholder="Enter tax number"
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
              <Label htmlFor="supplier_payment">Payment Terms (days)</Label>
              <Input
                id="supplier_payment"
                type="number"
                value={supplierFormData.payment_terms}
                onChange={(e) => setSupplierFormData(prev => ({ ...prev, payment_terms: parseInt(e.target.value) || 30 }))}
                placeholder="30"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>
              Skip
            </Button>
            <Button onClick={saveNewSupplier} disabled={!supplierFormData.name.trim()}>
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

      {/* OCR Field Mapping Settings Dialog */}
      <Dialog open={isOCRSettingsOpen} onOpenChange={setIsOCRSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>OCR Field Mapping Settings</DialogTitle>
            <DialogDescription>
              Configure text patterns to look for when extracting data from scanned documents.
              You can add multiple patterns per field. The app will search for text that matches ~80% similarity and extract the value after it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {(['subtotal_tax_excluded', 'total_amount', 'currency', 'issue_date', 'due_date', 'document_number', 'document_type'] as const).map((fieldKey) => {
              const fieldLabels: Record<string, string> = {
                subtotal_tax_excluded: 'Subtotal (Tax Excluded)',
                total_amount: 'Total Amount',
                currency: 'Currency',
                issue_date: 'Issue Date',
                due_date: 'Due Date',
                document_number: 'Document Number',
                document_type: 'Document Type'
              };

              const fieldPlaceholders: Record<string, string> = {
                subtotal_tax_excluded: 'e.g., Iznos bez PDVa:',
                total_amount: 'e.g., Ukupno:',
                currency: 'e.g., Valuta:',
                issue_date: 'e.g., Datum izdavanja:',
                due_date: 'e.g., Datum dospijeća:',
                document_number: 'e.g., Broj fakture:',
                document_type: 'e.g., Vrsta dokumenta:'
              };

              return (
                <div key={fieldKey} className="space-y-2">
                  <Label>{fieldLabels[fieldKey]}</Label>
                  
                  {/* Existing patterns as chips */}
                  {ocrFieldMappings[fieldKey] && ocrFieldMappings[fieldKey].length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {ocrFieldMappings[fieldKey].map((pattern, index) => (
                        <div
                          key={index}
                          className="group relative inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md text-sm cursor-pointer hover:bg-blue-200 transition-colors"
                          onClick={() => setEditingMapping({ field: fieldKey, index, value: pattern })}
                        >
                          <span>{pattern}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOCRFieldMappings(prev => ({
                                ...prev,
                                [fieldKey]: prev[fieldKey].filter((_, i) => i !== index)
                              }));
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800 opacity-70 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new pattern input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={fieldPlaceholders[fieldKey]}
                      value={editingMapping?.field === fieldKey && editingMapping.index >= 0 
                        ? editingMapping.value 
                        : newMappingInputs[fieldKey] || ''}
                      onChange={(e) => {
                        if (editingMapping?.field === fieldKey && editingMapping.index >= 0) {
                          setEditingMapping({ ...editingMapping, value: e.target.value });
                        } else {
                          setNewMappingInputs(prev => ({ ...prev, [fieldKey]: e.target.value }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = editingMapping?.field === fieldKey && editingMapping.index >= 0
                            ? editingMapping.value
                            : newMappingInputs[fieldKey];
                          if (value && value.trim()) {
                            if (editingMapping?.field === fieldKey && editingMapping.index >= 0) {
                              // Update existing
                              const updated = [...ocrFieldMappings[fieldKey]];
                              updated[editingMapping.index] = value.trim();
                              setOCRFieldMappings(prev => ({ ...prev, [fieldKey]: updated }));
                              setEditingMapping(null);
                            } else {
                              // Add new
                              setOCRFieldMappings(prev => ({
                                ...prev,
                                [fieldKey]: [...(prev[fieldKey] || []), value.trim()]
                              }));
                              setNewMappingInputs(prev => ({ ...prev, [fieldKey]: '' }));
                            }
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const value = editingMapping?.field === fieldKey && editingMapping.index >= 0
                          ? editingMapping.value
                          : newMappingInputs[fieldKey];
                        if (value && value.trim()) {
                          if (editingMapping?.field === fieldKey && editingMapping.index >= 0) {
                            // Update existing
                            const updated = [...ocrFieldMappings[fieldKey]];
                            updated[editingMapping.index] = value.trim();
                            setOCRFieldMappings(prev => ({ ...prev, [fieldKey]: updated }));
                            setEditingMapping(null);
                          } else {
                            // Add new
                            setOCRFieldMappings(prev => ({
                              ...prev,
                              [fieldKey]: [...(prev[fieldKey] || []), value.trim()]
                            }));
                            setNewMappingInputs(prev => ({ ...prev, [fieldKey]: '' }));
                          }
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add multiple patterns. The app will try each one until it finds a match (~80% similarity).
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setIsOCRSettingsOpen(false);
              setEditingMapping(null);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              saveOCRMappings();
              setEditingMapping(null);
            }}>
              Save Settings
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
                <p className="text-lg font-medium">Processing document with Tesseract OCR...</p>
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
                  Powered by Tesseract OCR Engine ({ocrResult.engine})
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