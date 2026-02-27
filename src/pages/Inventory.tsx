import { useState, useEffect } from "react";
import { Plus, Search, Package, AlertTriangle, Wrench, Trash2, Settings, Cog, Upload, X, Edit, MapPin, Building2, ClipboardList, Users, History, FileText, Calendar as CalendarIcon, Clock, Eye, Download, Circle, Square, Hexagon, Cylinder, PlayCircle, Minus, ShoppingCart, Calculator, ChevronsUpDown, Check, FilePlus, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { ShapeImage } from "@/components/ShapeImage";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatToolName } from "@/lib/toolSpecUtils";
import { useToast } from "@/hooks/use-toast";
import { resizeImageForPartPhoto, validateImageFile } from "@/lib/imageUtils";
import PartHistoryDialog from "@/components/PartHistoryDialog";
import { MaterialForm, MaterialData } from "@/components/MaterialForm";
import { ProductionStatusDialog } from "@/components/ProductionStatusDialog";
import { formatDate } from "@/lib/dateUtils";
import { getCurrencyForCountry, formatCurrency, getCurrencySymbol, formatCurrencyWithUnit } from "@/lib/currencyUtils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ToolManagementDialog } from "@/components/ToolManagementDialog";
import { ToolCategorySelector } from "@/components/ToolCategorySelector";
import { MaterialManagementDialog } from "@/components/MaterialManagementDialog";
import { NumericInput } from "@/components/NumericInput";
import { DragDropImageUpload } from "@/components/DragDropImageUpload";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MaterialAdjustmentDialog } from "@/components/MaterialAdjustmentDialog";
import { ComponentAdjustmentDialog } from "@/components/ComponentAdjustmentDialog";
import { MaterialHistoryDialog } from "@/components/MaterialHistoryDialog";
import { MaterialReorderDialog } from "@/components/MaterialReorderDialog";
import { MaterialReorderSummaryDialog } from "@/components/MaterialReorderSummaryDialog";
import { PriceCalculatorDialog } from "@/components/PriceCalculatorDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { DuplicateWarningDialog } from "@/components/DuplicateWarningDialog";
import { SortSelect, SortOption } from "@/components/SortSelect";
import { useSortPreference } from "@/hooks/useSortPreference";
import { sortItems } from "@/lib/sortUtils";
import { CreateWorkOrderDialog } from "@/components/work-orders/CreateWorkOrderDialog";
import { UnitSelect } from "@/components/UnitSelect";
import { PartRequestsDialog } from "@/components/PartRequestsDialog";
import { notifyAdminsOfNewPO } from "@/lib/notifications";

function pluralizeUnit(unit: string, qty: number): string {
  if (qty === 1) return unit;
  if (unit === "piece" || unit === "pcs") return "pieces";
  if (unit.endsWith("s")) return unit;
  return unit + "s";
}

function ProductionStatusWithRequests({
  productionStatus,
  requests,
  className = "",
}: {
  productionStatus?: string | null;
  requests: { requester_first_name: string; request_text: string; status?: string | null }[];
  className?: string;
}) {
  const hasStatus = productionStatus && productionStatus.trim() !== "";
  // Only show active requests in the list (hide processed and cancelled)
  const activeRequests = requests?.filter((r) => !r.status || r.status === "active") || [];
  const hasRequests = activeRequests.length > 0;
  if (!hasStatus && !hasRequests) return <p className={cn("text-sm font-medium text-black break-words", className)}>{"\u00A0"}</p>;
  return (
    <div className={cn("flex flex-col gap-1 text-sm font-medium text-black break-words leading-tight", className)}>
      {hasStatus && <p>{productionStatus}</p>}
      {hasRequests && activeRequests.map((r, i) => (
        <p key={i} className="text-muted-foreground font-normal bg-pink-50 px-2 py-1 rounded">
          {r.requester_first_name}: {r.request_text}
        </p>
      ))}
    </div>
  );
}

export default function Inventory() {
  const {
    toast
  } = useToast();
  const { canSeePrices, staff, isCustomerUser, customerId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [shapes, setShapes] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [currentCategory, setCurrentCategory] = useState("Parts");
  
  // Sort preferences for each category
  const partsSortPreference = useSortPreference("inventory:parts");
  const materialsSortPreference = useSortPreference("inventory:materials");
  const componentsSortPreference = useSortPreference("inventory:components");
  const toolsSortPreference = useSortPreference("inventory:tools");
  const machinesSortPreference = useSortPreference("inventory:machines");
  const [formData, setFormData] = useState({
    part_number: "",
    name: "",
    description: "",
    quantity: "",
    unit_price: "",
    weight: "",
    location: "",
    category: "Parts",
    customer_id: "",
    supplier_id: "",
    minimum_stock: "",
    currency: "EUR",
    unit: "piece",
    photo: null as File | null
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isWorkOrderDialogOpen, setIsWorkOrderDialogOpen] = useState(false);
  const [selectedItemForWorkOrder, setSelectedItemForWorkOrder] = useState<any>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [addToPoOpen, setAddToPoOpen] = useState(false);
  const [addToPoItem, setAddToPoItem] = useState<any>(null);
  const [addToPoQty, setAddToPoQty] = useState(1);
  const [justAddedToPoItemId, setJustAddedToPoItemId] = useState<string | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedItemForRequest, setSelectedItemForRequest] = useState<any>(null);
  const [requestText, setRequestText] = useState("");
  const [partRequests, setPartRequests] = useState<{ [inventoryId: string]: { id?: string; requester_first_name: string; request_text: string; status?: string | null }[] }>({});
  const [isPartRequestsDialogOpen, setIsPartRequestsDialogOpen] = useState(false);
  const [selectedItemForPartRequests, setSelectedItemForPartRequests] = useState<any>(null);
  const [materialsUsed, setMaterialsUsed] = useState([{
    name: "",
    notes: "",
    lengthPerPiece: ""
  }]);
  const [toolsUsed, setToolsUsed] = useState([{
    name: "",
    notes: ""
  }]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [toolsList, setToolsList] = useState<any[]>([]);
  const [componentsList, setComponentsList] = useState<any[]>([]);
  const [componentsUsed, setComponentsUsed] = useState([{
    name: "",
    quantity: 1
  }]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState<any>(null);
  const [materialViewAdditions, setMaterialViewAdditions] = useState<any[]>([]);
  const [editingLocationForAddition, setEditingLocationForAddition] = useState<string | null>(null);
  const [newLocationValue, setNewLocationValue] = useState<string>('');
  const [materialProfile, setMaterialProfile] = useState<any>(null);
  const [materialData, setMaterialData] = useState<MaterialData | null>(null);
  const [isProductionStatusDialogOpen, setIsProductionStatusDialogOpen] = useState(false);
  const [selectedItemForProductionStatus, setSelectedItemForProductionStatus] = useState<any>(null);
  const [isToolManagementDialogOpen, setIsToolManagementDialogOpen] = useState(false);
  const [isMaterialManagementDialogOpen, setIsMaterialManagementDialogOpen] = useState(false);
  const [isMaterialAdjustmentDialogOpen, setIsMaterialAdjustmentDialogOpen] = useState(false);
  const [selectedMaterialForAdjustment, setSelectedMaterialForAdjustment] = useState<any>(null);
  const [isComponentAdjustmentDialogOpen, setIsComponentAdjustmentDialogOpen] = useState(false);
  const [selectedComponentForAdjustment, setSelectedComponentForAdjustment] = useState<any>(null);
  const [componentAdjustmentType, setComponentAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [isMaterialHistoryDialogOpen, setIsMaterialHistoryDialogOpen] = useState(false);
  const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState<any>(null);
  const [isMaterialReorderDialogOpen, setIsMaterialReorderDialogOpen] = useState(false);
  const [selectedMaterialForReorder, setSelectedMaterialForReorder] = useState<any>(null);
  const [isMaterialReorderSummaryDialogOpen, setIsMaterialReorderSummaryDialogOpen] = useState(false);
  const [isPriceCalculatorDialogOpen, setIsPriceCalculatorDialogOpen] = useState(false);
  const [selectedPartForPriceCalculator, setSelectedPartForPriceCalculator] = useState<any>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState<{ id: string; name: string; part_number?: string | null; created_at: string } | null>(null);
  const [pendingSaveAction, setPendingSaveAction] = useState<(() => Promise<void>) | null>(null);
  const [materialReorders, setMaterialReorders] = useState<{ [key: string]: any }>({});
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>("");
  const [showOnlyWithProductionStatus, setShowOnlyWithProductionStatus] = useState(false);
  const [materialStockQuantities, setMaterialStockQuantities] = useState<{ [key: string]: number }>({});
  const [toolCategorySelection, setToolCategorySelection] = useState<{
    categoryPath: string[];
    categoryId: string;
    categoryTitle: string;
    specFields: { [key: string]: string };
  } | null>(null);
  useEffect(() => {
    fetchInventoryItems();
    fetchSuppliers();
    fetchCustomers();
    fetchStockLocations();
    fetchStaff();
    fetchShapes();
    fetchMaterialsAndTools();
  }, []);
  const fetchMaterialStockQuantities = async () => {
    // Fetch all material adjustments
    const { data: adjustments } = await supabase
      .from('material_adjustments' as any)
      .select('inventory_id, adjustment_type, length_mm, quantity_pieces');
    
    if (adjustments) {
      // Calculate total stock for each material
      const stockByMaterial: { [key: string]: number } = {};
      
      (adjustments as any[]).forEach((adj: any) => {
        const totalMm = adj.length_mm * adj.quantity_pieces;
        if (!stockByMaterial[adj.inventory_id]) {
          stockByMaterial[adj.inventory_id] = 0;
        }
        
        if (adj.adjustment_type === 'add') {
          stockByMaterial[adj.inventory_id] += totalMm;
        } else if (adj.adjustment_type === 'subtract') {
          stockByMaterial[adj.inventory_id] -= totalMm;
        }
      });
      
      setMaterialStockQuantities(stockByMaterial);
    }
  };

  const fetchMaterialReorders = async () => {
    // Fetch all pending reorders
    const { data: reorders } = await supabase
      .from('material_reorders' as any)
      .select('id, inventory_id, length_mm, notes, status')
      .eq('status', 'pending');
    
    if (reorders) {
      const reordersByMaterial: { [key: string]: any } = {};
      (reorders as any[]).forEach((reorder: any) => {
        reordersByMaterial[reorder.inventory_id] = reorder;
      });
      setMaterialReorders(reordersByMaterial);
    }
  };

  // Fetch material additions when view dialog opens for a material
  useEffect(() => {
    if (isViewDialogOpen && selectedViewItem?.category === "Materials" && selectedViewItem?.id) {
      fetchMaterialViewAdditions(selectedViewItem.id);
    }
  }, [isViewDialogOpen, selectedViewItem?.id]);

  const fetchInventoryItems = async () => {
    try {
      let query = supabase.from('inventory').select('*');
      if (isCustomerUser() && customerId()) {
        query = query.eq('category', 'Parts').eq('customer_id', customerId()!);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching inventory items:', error);
        return;
      }
      if (data) {
        const formattedItems = data.map(item => ({
          ...item,
          sku: `SKU-${item.id}`,
          currentQuantity: item.quantity,
          minimumQuantity: 5,
          unitOfMeasure: item.unit || "piece",
          unitCost: item.unit_price,
          image: item.photo_url || null
        }));
        setInventoryItems(formattedItems);

        if (!isCustomerUser()) {
          await fetchMaterialStockQuantities();
          await fetchMaterialReorders();
        }
        await fetchPartRequests(formattedItems.map((i: any) => i.id));
      }
    } catch (error: any) {
      console.error('Error fetching inventory items:', error);
    }
  };

  const fetchPartRequests = async (inventoryIds: string[]) => {
    if (inventoryIds.length === 0) {
      setPartRequests({});
      return;
    }
    try {
      const { data } = await supabase
        .from('part_requests' as any)
        .select('id, inventory_id, requester_first_name, request_text, status')
        .in('inventory_id', inventoryIds)
        .order('created_at', { ascending: true });
      if (data) {
        const byPart: { [k: string]: { id?: string; requester_first_name: string; request_text: string; status?: string | null }[] } = {};
        (data as any[]).forEach((r: any) => {
          if (!byPart[r.inventory_id]) byPart[r.inventory_id] = [];
          byPart[r.inventory_id].push({
            id: r.id,
            requester_first_name: r.requester_first_name,
            request_text: r.request_text,
            status: r.status ?? "active",
          });
        });
        setPartRequests(byPart);
      }
    } catch {
      setPartRequests({});
    }
  };

  const fetchSuppliers = async () => {
    const {
      data
    } = await supabase.from('suppliers').select('id, name, country, currency');
    if (data) {
      setSuppliers(data);
    }
  };
  const fetchCustomers = async () => {
    const {
      data
    } = await supabase.from('customers').select('id, name, country, currency, photo_url');
    if (data) {
      setCustomers(data);
    }
  };
  const fetchStockLocations = async () => {
    const {
      data
    } = await supabase.from('stock_locations').select('id, name, description').eq('is_active', true);
    if (data) {
      setStockLocations(data);
    }
  };
  const fetchStaff = async () => {
    const {
      data
    } = await supabase.from('staff').select('id, name, position').eq('is_active', true);
    if (data) {
      setStaffList(data);
    }
  };
  const fetchShapes = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('shapes' as any).select('id, name, image_url, updated_at');
      if (error) {
        console.error('Error fetching shapes:', error);
        return;
      }
      if (data) {
        setShapes(data);
      }
    } catch (error: any) {
      console.error('Error fetching shapes:', error);
    }
  };
  const fetchMaterialsAndTools = async () => {
    const {
      data: materials
    } = await supabase.from('inventory').select('id, name, part_number').eq('category', 'Materials');
    const {
      data: tools
    } = await supabase.from('inventory').select('id, name, part_number, category, materials_used').eq('category', 'Tools');
    const {
      data: components
    } = await supabase.from('inventory').select('id, name, part_number').eq('category', 'Components');
    if (materials) setMaterialsList(materials);
    if (tools) setToolsList(tools);
    if (components) setComponentsList(components);
  };
  const handleDeleteInventoryItem = async (itemId: string) => {
    const {
      error
    } = await supabase.from('inventory').delete().eq('id', itemId);
    if (!error) {
      setInventoryItems(prev => prev.filter(item => item.id !== itemId));
      // Clear the selected view item if it's the deleted item and close the dialog
      if (selectedViewItem?.id === itemId) {
        setSelectedViewItem(null);
        setIsViewDialogOpen(false);
      }
    }
  };
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file)) {
      toast({
        title: "Invalid File",
        description: "Please select a valid image file (JPEG, PNG).",
        variant: "destructive"
      });
      return;
    }
    try {
      const resizedFile = await resizeImageForPartPhoto(file);
      setFormData(prev => ({
        ...prev,
        photo: resizedFile
      }));
      setPhotoPreview(URL.createObjectURL(resizedFile));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleRemovePhoto = () => {
    setFormData(prev => ({
      ...prev,
      photo: null
    }));
    setPhotoPreview(null);
  };
  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    const {
      error: uploadError
    } = await supabase.storage.from('inventory-photos').upload(filePath, file);
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }
    const {
      data
    } = supabase.storage.from('inventory-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };
  const uploadPartFile = async (file: File): Promise<{
    name: string;
    url: string;
    size: number;
  } | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${fileName}`;
    const {
      error: uploadError
    } = await supabase.storage.from('part-files').upload(filePath, file);
    if (uploadError) {
      console.error('File upload error:', uploadError);
      return null;
    }
    const {
      data
    } = supabase.storage.from('part-files').getPublicUrl(filePath);
    return {
      name: file.name,
      url: data.publicUrl,
      size: file.size
    };
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = [];
    setIsUploading(true);
    for (const file of files) {
      const uploadedFile = await uploadPartFile(file);
      if (uploadedFile) {
        newFiles.push(uploadedFile);
      }
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsUploading(false);
  };
  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
  const handleSaveItem = async () => {
    // For materials, validate material data instead of name
    if (currentCategory === "Materials") {
      if (!materialData || !materialData.surfaceFinish || !materialData.shape || !materialData.material) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required material fields.",
          variant: "destructive"
        });
        return;
      }
    } else if (currentCategory === "Tools") {
      if (!toolCategorySelection || !formData.quantity || (canSeePrices() && !formData.unit_price)) {
        toast({
          title: "Validation Error", 
          description: "Please select a tool category and fill in all required fields.",
          variant: "destructive"
        });
        return;
      }
    } else if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Please fill in the part name.",
        variant: "destructive"
      });
      return;
    }
    setIsUploading(true);
    let photoUrl = null;
    if (formData.photo) {
      photoUrl = await uploadPhoto(formData.photo);
      if (!photoUrl) {
        toast({
          title: "Error",
          description: "Failed to upload photo. Please try again.",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }
    }
    const itemName = (currentCategory === "Materials" || currentCategory === "Components") && materialData ? materialData.generatedName : 
                     currentCategory === "Tools" && toolCategorySelection ? 
                     toolCategorySelection.categoryPath.join(" - ") :
                     formData.name;
    
    // Check for duplicates (only for Parts, Materials, and Components)
    if (currentCategory === "Parts" || currentCategory === "Materials" || currentCategory === "Components") {
      const materialsUsedData = currentCategory === "Materials" && materialData ? {
        surfaceFinish: materialData.surfaceFinish,
        shape: materialData.shape,
        shapeId: materialData.shapeId,
        calculationType: materialData.calculationType,
        material: materialData.material,
        materialNumber: materialData.materialNumber,
        dimensions: materialData.dimensions,
        profileId: materialData.profileId,
        profileDesignation: materialData.profileDesignation,
        priceUnit: materialData.priceUnit,
        supplier: materialData.supplier,
        supplierId: materialData.supplierId,
        currency: materialData.currency,
        location: materialData.location
      } : null;
      
      const { data: duplicateData, error: duplicateError } = await (supabase as any).rpc('check_inventory_duplicate', {
        p_category: currentCategory,
        p_id: null, // New item, no ID to exclude
        p_name: itemName,
        p_part_number: (currentCategory === "Parts" || currentCategory === "Components") ? (formData.part_number || null) : null,
        p_description: currentCategory === "Materials" && materialData ? (materialData.description || null) : (formData.description || null),
        p_customer_id: currentCategory === "Parts" ? (formData.customer_id || null) : null,
        p_unit_price: currentCategory === "Parts" ? (canSeePrices() ? parseFloat(formData.unit_price) || 0 : 0) : null,
        p_currency: currentCategory === "Parts" ? formData.currency : null,
        p_weight: (currentCategory === "Parts" || currentCategory === "Components") ? (parseFloat(formData.weight) || 0) : null,
        p_location: currentCategory === "Components" ? null : (formData.location || null),
        p_unit: (currentCategory === "Parts" || currentCategory === "Components") ? formData.unit : null,
        p_minimum_stock: (currentCategory === "Parts" || currentCategory === "Components") ? (parseInt(formData.minimum_stock) || 0) : null,
        p_materials_used: currentCategory === "Materials" ? materialsUsedData : null
      });
      
      if (!duplicateError && duplicateData && Array.isArray(duplicateData) && duplicateData.length > 0) {
        const duplicate = duplicateData[0];
        setDuplicateItem({
          id: duplicate.duplicate_id,
          name: duplicate.duplicate_name,
          part_number: duplicate.duplicate_part_number,
          created_at: duplicate.created_at
        });
        // Store the save action to execute if user chooses "Save Anyway"
        setPendingSaveAction(async () => {
          await performSave();
        });
        setIsDuplicateDialogOpen(true);
        setIsUploading(false);
        return;
      }
    }
    
    await performSave();
  };
  
  const performSave = async () => {
    setIsUploading(true);
    let photoUrl = null;
    if (formData.photo) {
      photoUrl = await uploadPhoto(formData.photo);
      if (!photoUrl) {
        toast({
          title: "Error",
          description: "Failed to upload photo. Please try again.",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }
    }
    const itemName = currentCategory === "Materials" && materialData ? materialData.generatedName : 
                     currentCategory === "Tools" && toolCategorySelection ? 
                     toolCategorySelection.categoryPath.join(" - ") :
                     formData.name;
    
    const {
      error
    } = await supabase.from('inventory').insert({
      part_number: formData.part_number,
      name: itemName,
      description: currentCategory === "Materials" && materialData ? (materialData.description || null) : (formData.description || null),
      quantity: currentCategory === "Materials" || currentCategory === "Components" ? 0 : (parseInt(formData.quantity) || 0),
      unit_price: currentCategory === "Materials" || currentCategory === "Components" ? 0 : (canSeePrices() ? (parseFloat(formData.unit_price) || 0) : 0),
      currency: currentCategory === "Components" ? null : formData.currency,
      unit: formData.unit,
      weight: (formData.category === "Parts" || formData.category === "Machines" || formData.category === "Components") ? (parseFloat(formData.weight) || 0) : 0,
      location: currentCategory === "Components" ? null : formData.location,
      category: formData.category,
      customer_id: formData.category === "Parts" ? (formData.customer_id || null) : null,
      supplier: formData.category !== "Parts" && formData.category !== "Components" ? (suppliers.find(s => s.id === formData.supplier_id)?.name || null) : null,
      minimum_stock: formData.category === "Machines" ? 0 : (parseInt(formData.minimum_stock) || 0),
      photo_url: photoUrl,
      created_by_staff_id: staff?.id || null,
      materials_used: currentCategory === "Materials" && materialData ? {
        surfaceFinish: materialData.surfaceFinish,
        shape: materialData.shape,
        shapeId: materialData.shapeId,
        calculationType: materialData.calculationType,
        material: materialData.material,
        dimensions: materialData.dimensions,
        profileId: materialData.profileId,
        profileDesignation: materialData.profileDesignation,
        priceUnit: materialData.priceUnit,
        supplier: materialData.supplier,
        supplierId: materialData.supplierId,
        currency: materialData.currency,
        location: materialData.location
      } : currentCategory === "Tools" && toolCategorySelection ? {
        toolCategory: toolCategorySelection.categoryPath,
        toolCategoryId: toolCategorySelection.categoryId,
        specifications: toolCategorySelection.specFields
      } : null
    });
    setIsUploading(false);
    if (!error) {
      setFormData({
        part_number: "",
        name: "",
        description: "",
        quantity: "",
        unit_price: "",
        weight: "",
        location: "",
        category: currentCategory,
        customer_id: "",
        supplier_id: "",
        minimum_stock: "",
        currency: "EUR",
        unit: "piece",
        photo: null
      });
      setPhotoPreview(null);
      setMaterialData(null);
      setToolCategorySelection(null);
      setIsAddDialogOpen(false);
      fetchInventoryItems();
      toast({
        title: "Item Added",
        description: "The inventory item has been successfully added."
      });
    } else {
      // Check if error is a duplicate key violation
      const isDuplicateError = error.code === '23505' || 
                                error.message?.includes('duplicate key') ||
                                error.message?.includes('duplicate') ||
                                error.message?.includes('unique constraint');
      
      toast({
        title: "Error",
        description: isDuplicateError 
          ? "An item with the same values has already been added."
          : "Failed to add item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleOpenAddDialog = (category: string) => {
    setCurrentCategory(category);
    setFormData(prev => ({
      ...prev,
      category,
      unit: "piece"
    }));
    setIsAddDialogOpen(true);
  };
  const handleOpenEditDialog = (item: any) => {
    setEditingItem(item);
    setFormData({
      part_number: item.part_number || "",
      name: item.name,
      description: item.description || "",
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      weight: item.weight?.toString() || "",
      location: item.location || "",
      category: item.category,
      customer_id: item.customer_id || "",
      supplier_id: item.supplier ? (suppliers.find(s => s.name === item.supplier)?.id || "") : "",
      minimum_stock: item.minimum_stock?.toString() || "",
      currency: item.currency || "EUR",
      unit: item.unit || "piece",
      photo: null
    });

    // For materials, parse the structured data from materials_used
    if (item?.category === "Materials" && item.materials_used) {
      const materialInfo = item.materials_used;
      // Don't set generatedName - let MaterialForm regenerate it with new format
      setMaterialData({
        surfaceFinish: materialInfo.surfaceFinish || "",
        shape: materialInfo.shape || "",
        shapeId: materialInfo.shapeId,
        calculationType: materialInfo.calculationType,
        material: materialInfo.material || "",
        materialNumber: materialInfo.materialNumber || "",
        dimensions: materialInfo.dimensions || {},
        profileId: materialInfo.profileId,
        profileDesignation: materialInfo.profileDesignation,
        generatedName: "", // Will be regenerated by MaterialForm
        priceUnit: materialInfo.priceUnit || "per_meter",
        supplier: materialInfo.supplier,
        supplierId: materialInfo.supplierId,
        currency: materialInfo.currency,
        location: materialInfo.location,
        description: item.description || ""
      });
    } else {
      // Reset material data for non-materials
      setMaterialData(null);
    }

    // Populate tool category selection for tools
    if (item.category === "Tools" && item.materials_used && typeof item.materials_used === 'object' && item.materials_used.toolCategory) {
      setToolCategorySelection({
        categoryPath: item.materials_used.toolCategory,
        categoryId: item.materials_used.toolCategoryId,
        categoryTitle: item.materials_used.toolCategory[item.materials_used.toolCategory.length - 1],
        specFields: item.materials_used.specifications || {}
      });
    } else {
      setToolCategorySelection(null);
    }
    if (item.photo_url) {
      setPhotoPreview(item.photo_url);
    }

    // Populate materials used
    if (item.materials_used && Array.isArray(item.materials_used)) {
      // Ensure each material has lengthPerPiece field
      setMaterialsUsed(item.materials_used.map((m: any) => ({
        name: m.name || "",
        notes: m.notes || "",
        lengthPerPiece: m.lengthPerPiece || ""
      })));
    } else {
      setMaterialsUsed([{
        name: "",
        notes: "",
        lengthPerPiece: ""
      }]);
    }

    // Populate tools used
    if (item.tools_used && Array.isArray(item.tools_used)) {
      setToolsUsed(item.tools_used);
    } else {
      setToolsUsed([{
        name: "",
        notes: ""
      }]);
    }

    // Populate components used
    if (item.components_used && Array.isArray(item.components_used)) {
      setComponentsUsed(item.components_used.map((c: any) => ({
        name: c.name || "",
        quantity: c.quantity || 1
      })));
    } else {
      setComponentsUsed([{
        name: "",
        quantity: 1
      }]);
    }

    // Populate uploaded files
    if (item.drawings_files && Array.isArray(item.drawings_files)) {
      setUploadedFiles(item.drawings_files);
    } else {
      setUploadedFiles([]);
    }
    setIsEditDialogOpen(true);
  };
  const performUpdate = async () => {
    setIsUploading(true);
    try {
      let photoUrl = editingItem.photo_url;

      // Upload new photo if selected
      if (formData.photo) {
        photoUrl = await uploadPhoto(formData.photo);
      } else if (editingItem.photo_url && !photoPreview) {
        // User explicitly removed the photo (had one, now preview is cleared)
        photoUrl = null;
      }
      const itemName = editingItem?.category === "Materials" && materialData ? materialData.generatedName : 
                       editingItem?.category === "Tools" && toolCategorySelection ? 
                       toolCategorySelection.categoryPath.join(" - ") :
                       formData.name;
      
      const {
        error
      } = await supabase.from('inventory').update({
        part_number: formData.part_number,
        name: itemName,
        description: editingItem?.category === "Materials" && materialData ? (materialData.description || null) : formData.description,
        quantity: editingItem?.category === "Components" ? (editingItem?.quantity ?? 0) : (parseInt(formData.quantity) || 0),
        unit_price: editingItem?.category === "Components" ? (editingItem?.unit_price ?? 0) : (canSeePrices() ? (parseFloat(formData.unit_price) || 0) : (editingItem?.unit_price || 0)),
        currency: editingItem?.category === "Components" ? (editingItem?.currency ?? null) : formData.currency,
        unit: formData.unit,
        weight: (formData.category === "Parts" || formData.category === "Machines" || formData.category === "Components") ? (parseFloat(formData.weight) || 0) : editingItem.weight || 0,
        location: editingItem?.category === "Components" ? (editingItem?.location ?? null) : formData.location,
        category: formData.category,
        customer_id: formData.category === "Parts" ? (formData.customer_id || null) : null,
        supplier: formData.category !== "Parts" && formData.category !== "Components" ? (suppliers.find(s => s.id === formData.supplier_id)?.name || null) : null,
        minimum_stock: formData.category === "Machines" ? 0 : (parseInt(formData.minimum_stock) || 0),
        photo_url: photoUrl,
        materials_used: editingItem?.category === "Materials" && materialData ? {
          surfaceFinish: materialData.surfaceFinish,
          shape: materialData.shape,
          shapeId: materialData.shapeId,
          calculationType: materialData.calculationType,
          material: materialData.material,
          materialNumber: materialData.materialNumber,
          dimensions: materialData.dimensions,
          profileId: materialData.profileId,
          profileDesignation: materialData.profileDesignation,
          priceUnit: materialData.priceUnit,
          supplier: materialData.supplier,
          supplierId: materialData.supplierId,
          currency: materialData.currency,
          location: materialData.location
        } : editingItem?.category === "Tools" && toolCategorySelection ? {
          toolCategory: toolCategorySelection.categoryPath,
          toolCategoryId: toolCategorySelection.categoryId,
          specifications: toolCategorySelection.specFields
        } : materialsUsed.filter(m => m.name),
        tools_used: toolsUsed.filter(t => t.name),
        components_used: componentsUsed.filter(c => c.name).map(c => ({
          name: c.name,
          quantity: c.quantity || 1
        })),
        drawings_files: uploadedFiles
      }).eq('id', editingItem.id);
      if (error) {
        // Check if error is a duplicate key violation
        const isDuplicateError = error.code === '23505' || 
                                  error.message?.includes('duplicate key') ||
                                  error.message?.includes('duplicate') ||
                                  error.message?.includes('unique constraint');
        
        if (isDuplicateError) {
          toast({
            title: "Error",
            description: "An item with the same values has already been added.",
            variant: "destructive"
          });
          setIsUploading(false);
          return;
        }
        throw error;
      }
      toast({
        title: "Item Updated",
        description: `${formData.name} has been successfully updated.`
      });

      // Refresh the list
      await fetchInventoryItems();

      // Reset form
      setFormData({
        part_number: "",
        name: "",
        description: "",
        quantity: "",
        unit_price: "",
        weight: "",
        location: "",
        category: "Parts",
        customer_id: "",
        supplier_id: "",
        minimum_stock: "",
        currency: "EUR",
        unit: "piece",
        photo: null
      });
      setPhotoPreview(null);
      setEditingItem(null);
      setMaterialsUsed([{
        name: "",
        notes: "",
        lengthPerPiece: ""
      }]);
      setToolsUsed([{
        name: "",
        notes: ""
      }]);
      setComponentsUsed([{
        name: "",
        quantity: 1
      }]);
      setUploadedFiles([]);
      setMaterialData(null);
      setToolCategorySelection(null);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating item:', error);
      // Check if error is a duplicate key violation
      const isDuplicateError = error?.code === '23505' || 
                                error?.message?.includes('duplicate key') ||
                                error?.message?.includes('duplicate') ||
                                error?.message?.includes('unique constraint');
      
      toast({
        title: "Error",
        description: isDuplicateError 
          ? "An item with the same values has already been added."
          : "Failed to update item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleUpdateItem = async () => {
    // For materials, validate material data instead of name
    if (editingItem?.category === "Materials") {
      if (!materialData || !materialData.surfaceFinish || !materialData.shape || !materialData.material) {
        toast({
          title: "Error",
          description: "Please fill in all required material fields",
          variant: "destructive"
        });
        return;
      }
    } else if (editingItem?.category === "Tools") {
      if (!toolCategorySelection) {
        toast({
          title: "Error",
          description: "Please select a tool category",
          variant: "destructive"
        });
        return;
      }
    } else if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Item name is required",
        variant: "destructive"
      });
      return;
    }
    
    const itemName = (editingItem?.category === "Materials" || editingItem?.category === "Components") && materialData ? materialData.generatedName : 
                     editingItem?.category === "Tools" && toolCategorySelection ? 
                     toolCategorySelection.categoryPath.join(" - ") :
                     formData.name;
    
    // Check for duplicates (only for Parts, Materials, and Components)
    if (editingItem?.category === "Parts" || editingItem?.category === "Materials" || editingItem?.category === "Components") {
      const materialsUsedData = (editingItem?.category === "Materials" || editingItem?.category === "Components") && materialData ? {
        surfaceFinish: materialData.surfaceFinish,
        shape: materialData.shape,
        shapeId: materialData.shapeId,
        calculationType: materialData.calculationType,
        material: materialData.material,
        materialNumber: materialData.materialNumber,
        dimensions: materialData.dimensions,
        profileId: materialData.profileId,
        profileDesignation: materialData.profileDesignation,
        priceUnit: materialData.priceUnit,
        supplier: materialData.supplier,
        supplierId: materialData.supplierId,
        currency: materialData.currency,
        location: materialData.location
      } : null;
      
      const { data: duplicateData, error: duplicateError } = await (supabase as any).rpc('check_inventory_duplicate', {
        p_category: editingItem.category,
        p_id: editingItem.id, // Exclude current item
        p_name: itemName,
        p_part_number: (editingItem.category === "Parts" || editingItem.category === "Components") ? (formData.part_number || null) : null,
        p_description: editingItem?.category === "Materials" && materialData ? (materialData.description || null) : formData.description,
        p_customer_id: editingItem.category === "Parts" ? (formData.customer_id || null) : null,
        p_unit_price: editingItem.category === "Parts" ? (canSeePrices() ? parseFloat(formData.unit_price) || 0 : (editingItem?.unit_price || 0)) : null,
        p_currency: editingItem.category === "Parts" ? formData.currency : null,
        p_weight: (editingItem.category === "Parts" || editingItem.category === "Components") ? (parseFloat(formData.weight) || 0) : null,
        p_location: editingItem.category === "Components" ? null : (formData.location || null),
        p_unit: (editingItem.category === "Parts" || editingItem.category === "Components") ? formData.unit : null,
        p_minimum_stock: (editingItem.category === "Parts" || editingItem.category === "Components") ? (parseInt(formData.minimum_stock) || 0) : null,
        p_materials_used: editingItem?.category === "Materials" ? materialsUsedData : null
      });
      
      if (!duplicateError && duplicateData && Array.isArray(duplicateData) && duplicateData.length > 0) {
        const duplicate = duplicateData[0];
        setDuplicateItem({
          id: duplicate.duplicate_id,
          name: duplicate.duplicate_name,
          part_number: duplicate.duplicate_part_number,
          created_at: duplicate.created_at
        });
        // Store the update action to execute if user chooses "Save Anyway"
        setPendingSaveAction(async () => {
          await performUpdate();
        });
        setIsDuplicateDialogOpen(true);
        return;
      }
    }
    
    await performUpdate();
  };
  
  const getFilteredItems = (category: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/75cf3fad-9e2e-4472-b4c3-e606cf8f2f9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Inventory.tsx:935',message:'getFilteredItems called',data:{category,inventoryItemsLength:inventoryItems.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    let items = inventoryItems.filter(item => {
      if (!item || item?.category !== category || !item.name) return false;
      
      // Search term filter
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.part_number && item.part_number.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Customer filter (only for Parts)
      if (category === "Parts" && selectedCustomerFilter && selectedCustomerFilter !== "all") {
        const matchesCustomer = item.customer_id === selectedCustomerFilter;
        const matchesProductionStatus = showOnlyWithProductionStatus ? (item.production_status && item.production_status.trim() !== "") : true;
        return matchesSearch && matchesCustomer && matchesProductionStatus;
      }
      
      // Production status filter (only for Parts)
      if (category === "Parts" && showOnlyWithProductionStatus) {
        return matchesSearch && item.production_status && item.production_status.trim() !== "";
      }
      
      return matchesSearch;
    });
    
    // Get sort preference for this category
    let sortPreference = null;
    if (category === "Parts") {
      sortPreference = partsSortPreference.sortPreference;
    } else if (category === "Materials") {
      sortPreference = materialsSortPreference.sortPreference;
    } else if (category === "Components") {
      sortPreference = componentsSortPreference.sortPreference;
    } else if (category === "Tools") {
      sortPreference = toolsSortPreference.sortPreference;
    } else if (category === "Machines") {
      sortPreference = machinesSortPreference.sortPreference;
    }
    
    // Apply sorting
    if (sortPreference) {
      items = sortItems(items, sortPreference, (item, field) => {
        switch (field) {
          case "created_at":
            return item.created_at ? new Date(item.created_at) : null;
          case "name":
            return item.name || "";
          case "part_number":
            return item.part_number || "";
          case "unit_price":
            return item.unit_price || 0;
          case "total_value":
            const qty = item.quantity || 0;
            const price = item.unit_price || 0;
            return qty * price;
          case "best_seller":
            // TODO: Implement best seller calculation based on sales data
            // For now, return 0 as placeholder
            return 0;
          default:
            return null;
        }
      });
    } else {
      // Default sort: Parts by part_number, others by name
      if (category === "Parts") {
        items = items.sort((a, b) => {
          const partA = a.part_number || "";
          const partB = b.part_number || "";
          return partA.localeCompare(partB);
        });
      } else {
        items = items.sort((a, b) => {
          const nameA = a.name || "";
          const nameB = b.name || "";
          return nameA.localeCompare(nameB);
        });
      }
    }
    
    return items;
  };
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Parts":
        return Package;
      case "Materials":
        return Settings;
      case "Components":
        return Settings;
      case "Tools":
        return Wrench;
      case "Machines":
        return Cog;
      default:
        return Package;
    }
  };

  // Helper functions for materials
  const getMaterialColor = (material: string) => {
    const colors = {
      's355': 'hsl(var(--chart-1))',
      // Blue
      's235': 'hsl(var(--chart-2))',
      // Green  
      'C45': 'hsl(var(--chart-3))',
      // Purple
      'AlSiMg1': 'hsl(var(--chart-4))',
      // Orange
      'X153CrMoV12': 'hsl(var(--chart-5))',
      // Pink
      '16MnCr5': 'hsl(var(--chart-6))',
      // Cyan
      '1.4305': 'hsl(var(--chart-7))',
      // Amber
      '1.4301': 'hsl(var(--chart-8))' // Indigo
    };
    return colors[material] || 'hsl(var(--muted-foreground))';
  };
  // Removed getMaterialShapeIcon - now using ShapeIcon component directly
  const calculateMaterialWeight = (materialInfo: any) => {
    if (!materialInfo?.material || !materialInfo?.dimensions) return 0;

    // For profile-based shapes, use kg/m from profile table
    // kg_per_meter should be stored in dimensions when material is saved
    if (materialInfo.calculationType === 'profile_table' && materialInfo.dimensions.kg_per_meter) {
      const lengthInMeters = parseFloat(materialInfo.dimensions.length) || 0;
      const kgPerMeter = parseFloat(materialInfo.dimensions.kg_per_meter) || 0;
      return kgPerMeter * lengthInMeters;
    }

    // For simple formula shapes, calculate using geometric formulas + density
    // Material densities (kg/m³)
    const densities = {
      's355': 7850,
      's235': 7850,
      'C45': 7850,
      // Steel
      'AlSiMg1': 2700,
      // Aluminum
      'X153CrMoV12': 7700,
      '16MnCr5': 7850,
      // Tool steel
      '1.4305': 8000,
      '1.4301': 8000 // Stainless steel
    };
    const density = densities[materialInfo.material] || 7850;
    const dims = materialInfo.dimensions;
    let volume = 0; // in m³

    // Convert mm to m and calculate volume
    const toMeters = mm => (parseFloat(mm) || 0) / 1000;
    switch (materialInfo.shape) {
      case "Round bar":
        if (dims.diameter && dims.length) {
          const radius = toMeters(dims.diameter) / 2;
          volume = Math.PI * radius * radius * toMeters(dims.length);
        }
        break;
      case "Square bar":
        if (dims.side && dims.length) {
          volume = toMeters(dims.side) * toMeters(dims.side) * toMeters(dims.length);
        }
        break;
      case "Rectangular bar":
        if (dims.width && dims.height && dims.length) {
          volume = toMeters(dims.width) * toMeters(dims.height) * toMeters(dims.length);
        }
        break;
      case "Hex bar":
        if (dims.diameter && dims.length) {
          // Hexagon area = 3√3/2 * (diameter/2)²
          const s = toMeters(dims.diameter) / 2;
          const area = 3 * Math.sqrt(3) / 2 * s * s;
          volume = area * toMeters(dims.length);
        }
        break;
      case "Round tube":
        if (dims.outerDiameter && dims.wallThickness && dims.length) {
          const outerRadius = toMeters(dims.outerDiameter) / 2;
          const innerRadius = outerRadius - toMeters(dims.wallThickness);
          volume = Math.PI * (outerRadius * outerRadius - innerRadius * innerRadius) * toMeters(dims.length);
        }
        break;
      case "Square tube":
        if (dims.side && dims.wallThickness && dims.length) {
          const outer = toMeters(dims.side);
          const inner = outer - 2 * toMeters(dims.wallThickness);
          volume = (outer * outer - inner * inner) * toMeters(dims.length);
        }
        break;
      case "Rectangular tube":
        if (dims.width && dims.height && dims.wallThickness && dims.length) {
          const w = toMeters(dims.width);
          const h = toMeters(dims.height);
          const t = toMeters(dims.wallThickness);
          volume = (w * h - (w - 2 * t) * (h - 2 * t)) * toMeters(dims.length);
        }
        break;
      case "Sheet":
        if (dims.thickness && dims.width && dims.length) {
          volume = toMeters(dims.thickness) * toMeters(dims.width) * toMeters(dims.length);
        }
        break;
    }
    return volume * density; // kg
  };
  const formatMaterialQuantity = (materialInfo: any, quantity: number) => {
    if (!materialInfo?.shape || !materialInfo?.dimensions) return `${quantity} pcs`;
    const dims = materialInfo.dimensions;
    if (materialInfo.shape === "Sheet") {
      const width = dims.width || 0;
      const length = dims.length || 0;
      return `${quantity} pieces ${width}×${length} mm`;
    } else if (materialInfo.shape?.includes("bar") || materialInfo.shape?.includes("tube")) {
      const lengthInMm = parseFloat(dims.length) || 0;
      const lengthInMeters = lengthInMm / 1000;
      const totalMeters = (lengthInMeters * quantity).toFixed(2);
      return `${totalMeters} m`;
    }
    return `${quantity} pcs`;
  };
  const lowStockItems = inventoryItems.filter(item => item.quantity <= (item.minimum_stock || 0));
  const totalValue = inventoryItems.reduce((total, item) => total + (item.quantity || 0) * (item.unit_price || 0), 0);
  const allLowStockCount = lowStockItems.length;
  const handleViewHistory = async (item: any) => {
    setSelectedItemForHistory(item);
    try {
      // Fetch history data from different sources
      const historyEntries = [];

      // 1. Created in system - fetch staff member who created it
      let createdByStaffName = null;
      if (item.created_by_staff_id) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('name')
          .eq('id', item.created_by_staff_id)
          .single();
        if (staffData) {
          createdByStaffName = staffData.name;
        }
      }
      
      const createdDetails = createdByStaffName 
        ? `Initial quantity: ${item.quantity} | Added by: ${createdByStaffName}`
        : `Initial quantity: ${item.quantity}`;
      
      historyEntries.push({
        date: formatDate(item.created_at),
        time: format(new Date(item.created_at), 'HH:mm'),
        activity: 'Created in system',
        details: createdDetails,
        reference: item.id,
        createdBy: createdByStaffName
      });

      // 2. Work orders for this part (using inventory_id foreign key)
      const {
        data: workOrders
      } = await supabase.from('work_orders').select('*').eq('inventory_id', item.id);
      if (workOrders) {
        workOrders.forEach(wo => {
          historyEntries.push({
            date: formatDate(wo.created_at),
            time: format(new Date(wo.created_at), 'HH:mm'),
            activity: 'Work Order Created',
            details: wo.title,
            reference: `WO-${wo.id.slice(-8)}`
          });
          if (wo.status === 'completed') {
            historyEntries.push({
              date: formatDate(wo.updated_at),
              time: format(new Date(wo.updated_at), 'HH:mm'),
              activity: 'Work Order Completed',
              details: wo.title,
              reference: `WO-${wo.id.slice(-8)}`
            });
          }
        });
      }

      // 3. Sales from invoice items (search by description)
      const {
        data: invoiceItems
      } = await supabase.from('invoice_items').select(`
          *,
          invoices (
            invoice_number,
            issue_date,
            status
          )
        `).ilike('description', `%${item.name}%`);
      if (invoiceItems) {
        invoiceItems.forEach((invoiceItem: any) => {
          if (invoiceItem.invoices) {
            historyEntries.push({
              date: formatDate(invoiceItem.invoices.issue_date),
              time: '09:00',
              // Default time since we don't have time in date field
              activity: 'Sold',
              details: `Quantity: ${invoiceItem.quantity}, Unit Price: ${formatCurrency(invoiceItem.unit_price, invoiceItem.invoices.currency || 'EUR')}`,
              reference: invoiceItem.invoices.invoice_number
            });
          }
        });
      }

      // Sort by date/time (newest first)
      historyEntries.sort((a, b) => {
        const dateTimeA = new Date(`${a.date.split('/').reverse().join('-')} ${a.time}`);
        const dateTimeB = new Date(`${b.date.split('/').reverse().join('-')} ${b.time}`);
        return dateTimeB.getTime() - dateTimeA.getTime();
      });
      setHistoryData(historyEntries);
      setIsHistoryDialogOpen(true);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: "Error",
        description: "Failed to load part history. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddToPO = async (item: any, quantity: number) => {
    if (!item?.customer_id) {
      toast({ title: "Error", description: "Part must be assigned to a customer to add to PO.", variant: "destructive" });
      return;
    }
    const qty = Math.max(1, Math.floor(quantity));
    try {
      const customerId = item.customer_id;
      const { data: recentPO } = await supabase
        .from("purchase_orders")
        .select("id, status, purchase_order_number")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let poId: string;
      if (recentPO && recentPO.status === "draft") {
        poId = recentPO.id;
        const unitPrice = item.unit_price ?? 0;
        const { data: existingItem } = await supabase
          .from("purchase_order_items" as any)
          .select("id, quantity, total")
          .eq("purchase_order_id", poId)
          .eq("inventory_id", item.id)
          .maybeSingle();
        if (existingItem) {
          const newQty = (existingItem.quantity || 0) + qty;
          const newTotal = unitPrice * newQty;
          const { error: updateErr } = await supabase
            .from("purchase_order_items" as any)
            .update({ quantity: newQty, total: newTotal })
            .eq("id", existingItem.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: itemErr } = await supabase.from("purchase_order_items" as any).insert({
            purchase_order_id: poId,
            inventory_id: item.id,
            description: item.name || "",
            quantity: qty,
            unit_price: unitPrice,
            total: unitPrice * qty,
          });
          if (itemErr) throw itemErr;
        }
        const { data: allItems } = await supabase.from("purchase_order_items").select("quantity, unit_price, total").eq("purchase_order_id", poId);
        const customer = customers.find((c) => c.id === customerId);
        const vatRate = customer?.country === "Bosnia and Herzegovina" ? 17 : 0;
        const subtotal = (allItems || []).reduce((s, i) => s + (i.total || 0), 0);
        const vatAmount = subtotal * (vatRate / 100);
        const amount = subtotal + vatAmount;
        const totalQuantity = (allItems || []).reduce((s, i) => s + (i.quantity || 0), 0);
        const itemWeight = (item.weight || 0) * qty;
        const { data: existingPO } = await supabase.from("purchase_orders").select("net_weight").eq("id", poId).single();
        const netWeight = (existingPO?.net_weight || 0) + itemWeight;
        await supabase.from("purchase_orders").update({ amount, total_quantity: totalQuantity, net_weight: netWeight, total_weight: netWeight, vat_rate: vatRate }).eq("id", poId);
        const { data: inv } = await supabase.from("inventory").select("quantity").eq("id", item.id).single();
        const newQty = Math.max(0, (inv?.quantity ?? 0) - qty);
        await supabase.from("inventory").update({ quantity: newQty }).eq("id", item.id);
        await fetchInventoryItems();
        setAddToPoOpen(false);
        setAddToPoItem(null);
        setJustAddedToPoItemId(item.id);
        setTimeout(() => setJustAddedToPoItemId(null), 1500);
        toast({ title: "Added to PO", description: `${qty} added to ${recentPO.purchase_order_number}` });
      } else {
        const { data: poNum } = await supabase.rpc("generate_purchase_order_number");
        if (!poNum) throw new Error("Failed to generate PO number");
        const customer = customers.find((c) => c.id === customerId);
        const vatRate = customer?.country === "Bosnia and Herzegovina" ? 17 : 0;
        const unitPrice = item.unit_price ?? 0;
        const total = unitPrice * qty;
        const vatAmount = total * (vatRate / 100);
        const amount = total + vatAmount;
        const netWeight = (item.weight || 0) * qty;
        const today = new Date().toISOString().split("T")[0];
        const currency = customer?.currency || (customer?.country === "Bosnia and Herzegovina" ? "BAM" : "EUR");
        const { data: newPO, error: poErr } = await supabase
          .from("purchase_orders")
          .insert({
            purchase_order_number: poNum,
            customer_id: customerId,
            issue_date: today,
            status: "draft",
            total_quantity: qty,
            net_weight: netWeight,
            total_weight: netWeight,
            amount,
            currency,
            vat_rate: vatRate,
          })
          .select()
          .single();
        if (poErr) throw poErr;
        poId = newPO.id;
        const { error: itemErr } = await supabase.from("purchase_order_items").insert({
          purchase_order_id: poId,
          inventory_id: item.id,
          description: item.name || "",
          quantity: qty,
          unit_price: unitPrice,
          total,
        });
        if (itemErr) throw itemErr;
        const { data: inv } = await supabase.from("inventory").select("quantity").eq("id", item.id).single();
        const newQty = Math.max(0, (inv?.quantity ?? 0) - qty);
        await supabase.from("inventory").update({ quantity: newQty }).eq("id", item.id);
        notifyAdminsOfNewPO(poId, poNum, customer?.name || "Unknown", staff?.id);
        await fetchInventoryItems();
        setAddToPoOpen(false);
        setAddToPoItem(null);
        setJustAddedToPoItemId(item.id);
        setTimeout(() => setJustAddedToPoItemId(null), 1500);
        toast({ title: "New PO Created", description: `${qty} added to new PO ${poNum}` });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to add part to PO", variant: "destructive" });
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedItemForRequest || !requestText.trim() || !staff) return;
    const firstName = (staff.name || "").split(/\s+/)[0] || "User";
    try {
      const { error } = await supabase.from("part_requests" as any).insert({
        inventory_id: selectedItemForRequest.id,
        contact_person_id: staff.id,
        requester_first_name: firstName,
        request_text: requestText.trim(),
      });
      if (error) throw error;
      setPartRequests(prev => {
        const list = prev[selectedItemForRequest.id] || [];
        return { ...prev, [selectedItemForRequest.id]: [...list, { requester_first_name: firstName, request_text: requestText.trim(), status: "active" }] };
      });
      setIsRequestDialogOpen(false);
      setSelectedItemForRequest(null);
      setRequestText("");
      toast({ title: "Request sent", description: "Your question has been submitted." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to submit request", variant: "destructive" });
    }
  };

  const handleSaveProductionStatus = async (status: string) => {
    if (!selectedItemForProductionStatus) return;
    
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ production_status: status } as any)
        .eq('id', selectedItemForProductionStatus.id);
        
      if (error) throw error;
      
      // Update local state
      setInventoryItems(prev => 
        prev.map(item => 
          item.id === selectedItemForProductionStatus.id 
            ? { ...item, production_status: status }
            : item
        )
      );
      
      toast({
        title: "Production Status Updated",
        description: `Status updated for ${selectedItemForProductionStatus.name}.`
      });
    } catch (error) {
      console.error('Error updating production status:', error);
      toast({
        title: "Error",
        description: "Failed to update production status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancelReorder = async (inventoryId: string) => {
    try {
      const { error } = await supabase
        .from('material_reorders' as any)
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('inventory_id', inventoryId)
        .eq('status', 'pending');
        
      if (error) throw error;
      
      // Update local state
      const updatedReorders = { ...materialReorders };
      delete updatedReorders[inventoryId];
      setMaterialReorders(updatedReorders);
      
      toast({
        title: "Reorder Cancelled",
        description: "Reorder has been cancelled successfully."
      });
    } catch (error) {
      console.error('Error cancelling reorder:', error);
      toast({
        title: "Error",
        description: "Failed to cancel reorder.",
        variant: "destructive"
      });
    }
  };

  const formatMaterialNameWithUnit = (name: string): string => {
    // Extract dimension numbers and add "mm" unit
    // Pattern: "C45 - 80 - Round bar - Cold Drawn" -> "C45 - 80 mm - Round bar - Cold Drawn"
    // Or: "C45 - 80x3000L - Round bar - Cold Drawn" -> "C45 - 80mmx3000L - Round bar - Cold Drawn"
    // Split by " - " to get parts
    const parts = name.split(' - ');
    if (parts.length < 2) return name; // If format is unexpected, return as is
    
    // The dimension part is usually the second part (index 1)
    let dimensionPart = parts[1];
    
    // If already contains 'mm', return as is
    if (dimensionPart.includes('mm')) {
      return name;
    }
    
    // Replace numbers with "number mm" or "numbermm" if followed by 'x' or 'L'
    // Match numbers that are standalone (not part of a larger number)
    dimensionPart = dimensionPart.replace(/(\d+)(?=\s*-|\s*$|(?=\s*x)|(?=\s*L))/g, (match, num, offset, string) => {
      const afterMatch = string.substring(offset + match.length);
      // If followed by 'x' or 'L', add 'mm' without space
      if (afterMatch.trim().startsWith('x') || afterMatch.trim().startsWith('L')) {
        return `${match}mm`;
      }
      // Otherwise add ' mm' with space
      return `${match} mm`;
    });
    
    parts[1] = dimensionPart;
    return parts.join(' - ');
  };

  const calculateKgPerMeter = (materialInfo: any): number => {
    if (!materialInfo) return 0;
    
    // For profile-based shapes, check if kg_per_meter is stored in dimensions
    if (materialInfo.calculationType === 'profile_table') {
      if (materialInfo.dimensions?.kg_per_meter) {
        return parseFloat(materialInfo.dimensions.kg_per_meter) || 0;
      }
      // If not in dimensions, we'll fetch from profile table separately
      return 0;
    }
    
    // For simple formula shapes, calculate using geometric formulas + density
    // Material densities (kg/m³)
    const densities: { [key: string]: number } = {
      's355': 7850,
      's235': 7850,
      'C45': 7850,
      'C60': 7850,
      '42CrMo4': 7850,
      '16MnCr5': 7850,
      // Tool steel
      '1.4305': 8000,
      '1.4301': 8000 // Stainless steel
    };
    
    const materialGrade = (materialInfo.material || '').toString().toLowerCase();
    const density = densities[materialGrade] || 7850;
    const dims = materialInfo.dimensions || {};
    let crossSectionalArea = 0; // in m²
    
    // Convert mm to m and calculate cross-sectional area (for 1 meter length)
    const toMeters = (mm: any) => (parseFloat(mm) || 0) / 1000;
    
    switch (materialInfo.shape) {
      case "Round bar":
        if (dims.diameter) {
          const r = toMeters(dims.diameter) / 2;
          crossSectionalArea = Math.PI * r * r;
        }
        break;
      case "Square bar":
        if (dims.side) {
          const side = toMeters(dims.side);
          crossSectionalArea = side * side;
        }
        break;
      case "Rectangular bar":
        if (dims.width && dims.height) {
          crossSectionalArea = toMeters(dims.width) * toMeters(dims.height);
        }
        break;
      case "Hex bar":
        if (dims.diameter) {
          // Hex bar: area = (3 * sqrt(3) / 2) * a² where a is across flats / 2
          const a = toMeters(dims.diameter) / 2;
          crossSectionalArea = (3 * Math.sqrt(3) / 2) * a * a;
        }
        break;
      case "Round tube":
        if (dims.outerDiameter && dims.wallThickness) {
          const outerR = toMeters(dims.outerDiameter) / 2;
          const innerR = outerR - toMeters(dims.wallThickness);
          crossSectionalArea = Math.PI * (outerR * outerR - innerR * innerR);
        }
        break;
      case "Square tube":
        if (dims.side && dims.wallThickness) {
          const outer = toMeters(dims.side);
          const inner = outer - 2 * toMeters(dims.wallThickness);
          crossSectionalArea = outer * outer - inner * inner;
        }
        break;
      case "Rectangular tube":
        if (dims.width && dims.height && dims.wallThickness) {
          const outerW = toMeters(dims.width);
          const outerH = toMeters(dims.height);
          const innerW = outerW - 2 * toMeters(dims.wallThickness);
          const innerH = outerH - 2 * toMeters(dims.wallThickness);
          crossSectionalArea = outerW * outerH - innerW * innerH;
        }
        break;
    }
    
    // kg_per_meter = cross-sectional area (m²) × density (kg/m³) × 1 meter
    return crossSectionalArea * density;
  };

  const fetchMaterialViewAdditions = async (inventoryId: string) => {
    try {
      // Fetch full material data including materials_used for weight calculation
      const { data: materialData, error: materialError } = await supabase
        .from('inventory')
        .select('materials_used')
        .eq('id', inventoryId)
        .single() as any;
      
      if (!materialError && materialData) {
        let kgPerMeter = 0;
        
        // First, try to calculate from materials_used (works for both profile and simple formula)
        if (materialData.materials_used) {
          kgPerMeter = calculateKgPerMeter(materialData.materials_used);
        }
        
        // If calculation returned 0 and materials_used has profileId, fetch from database
        const materialsUsed = materialData.materials_used as any;
        if (kgPerMeter === 0 && materialsUsed?.profileId) {
          const { data: profile, error: profileError } = await supabase
            .from('standardized_profiles' as any)
            .select('kg_per_meter')
            .eq('id', materialsUsed.profileId)
            .single() as any;
          
          if (!profileError && profile?.kg_per_meter) {
            kgPerMeter = profile.kg_per_meter;
          }
        }
        
        // Set the profile if we have a valid kg_per_meter
        if (kgPerMeter > 0) {
          setMaterialProfile({ kg_per_meter: kgPerMeter });
        }
      }

      // Fetch all additions
      const { data: additions, error: additionsError } = await supabase
        .from('material_adjustments' as any)
        .select('*')
        .eq('inventory_id', inventoryId)
        .eq('adjustment_type', 'add')
        .order('created_at', { ascending: true });

      if (additionsError) throw additionsError;

      // Fetch all subtractions
      const { data: subtractions, error: subtractionsError } = await supabase
        .from('material_adjustments' as any)
        .select('*')
        .eq('inventory_id', inventoryId)
        .eq('adjustment_type', 'subtract')
        .order('created_at', { ascending: true });

      if (subtractionsError) throw subtractionsError;

      // Calculate remaining quantity for each addition using FIFO
      const additionsWithRemaining = (additions || []).map((add: any) => {
        const addTotalMm = add.length_mm * add.quantity_pieces;
        return {
          ...add,
          originalTotalMm: addTotalMm,
          remainingMm: addTotalMm
        };
      });

      // Apply FIFO logic: subtract from oldest additions first
      const sortedSubtractions = [...(subtractions || [])].sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      let remainingToSubtract = sortedSubtractions.reduce((sum: number, sub: any) => 
        sum + (sub.length_mm * sub.quantity_pieces), 0
      );
      
      // Subtract from additions in FIFO order (oldest first)
      for (const add of additionsWithRemaining) {
        if (remainingToSubtract <= 0) break;
        
        const addTotal = add.originalTotalMm;
        if (remainingToSubtract >= addTotal) {
          // This addition is completely consumed
          add.remainingMm = 0;
          remainingToSubtract -= addTotal;
        } else {
          // Partial consumption
          add.remainingMm = addTotal - remainingToSubtract;
          remainingToSubtract = 0;
        }
      }

      // Filter out additions with no remaining quantity
      const available = additionsWithRemaining.filter((add: any) => add.remainingMm > 0);
      setMaterialViewAdditions(available);
    } catch (error) {
      console.error('Error fetching material view additions:', error);
      setMaterialViewAdditions([]);
    }
  };

  const handleUpdateAdditionLocation = async (additionId: string, newLocation: string) => {
    try {
      const { error } = await supabase
        .from('material_adjustments' as any)
        .update({ location: newLocation || null })
        .eq('id', additionId);

      if (error) throw error;

      // Update local state
      setMaterialViewAdditions(prev => 
        prev.map(add => 
          add.id === additionId 
            ? { ...add, location: newLocation || null }
            : add
        )
      );

      setEditingLocationForAddition(null);
      setNewLocationValue('');

      toast({
        title: "Success",
        description: "Location updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating addition location:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold break-words">Inventory Management</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
        </div>
      </div>

      {/* Main Content - customer users see only Parts */}
      <Tabs defaultValue="Parts" className="space-y-4 w-full max-w-full min-w-0" onValueChange={setCurrentCategory}>
        <TabsList className={cn("grid w-full min-w-0", isCustomerUser() ? "grid-cols-1" : "grid-cols-5")}>
          <TabsTrigger value="Parts">Parts</TabsTrigger>
          {!isCustomerUser() && (
            <>
              <TabsTrigger value="Materials">Materials</TabsTrigger>
              <TabsTrigger value="Components">
                <span className="hidden min-[480px]:inline">Components</span>
                <span className="min-[480px]:hidden">Comp.</span>
              </TabsTrigger>
              <TabsTrigger value="Tools">Tools</TabsTrigger>
              <TabsTrigger value="Machines">Machines</TabsTrigger>
            </>
          )}
        </TabsList>

        {(isCustomerUser() ? ["Parts"] : ["Parts", "Materials", "Components", "Tools", "Machines"]).map(category => {
        const CategoryIcon = getCategoryIcon(category);
        const filteredItems = getFilteredItems(category);
        
        // Get sort options for this category
        const getSortOptions = (): SortOption[] => {
          const baseOptions: SortOption[] = [
            { id: "created_at:desc", label: "Recently added (Newest → Oldest)", field: "created_at", direction: "desc" },
            { id: "created_at:asc", label: "Recently added (Oldest → Newest)", field: "created_at", direction: "asc" },
            { id: "name:asc", label: "A–Z", field: "name", direction: "asc" },
            { id: "name:desc", label: "Z–A", field: "name", direction: "desc" },
          ];
          
          if (canSeePrices()) {
            baseOptions.push(
              { id: "unit_price:asc", label: "Price (Low → High)", field: "unit_price", direction: "asc" },
              { id: "unit_price:desc", label: "Price (High → Low)", field: "unit_price", direction: "desc" },
              { id: "total_value:asc", label: "Total Value (Low → High)", field: "total_value", direction: "asc" },
              { id: "total_value:desc", label: "Total Value (High → Low)", field: "total_value", direction: "desc" }
            );
          }
          
          baseOptions.push(
            { id: "best_seller:desc", label: "Best seller", field: "best_seller", direction: "desc" }
          );
          
          return baseOptions;
        };
        
        // Get current sort preference for this category
        const getCurrentSortPreference = () => {
          if (category === "Parts") return partsSortPreference.sortPreference;
          if (category === "Materials") return materialsSortPreference.sortPreference;
          if (category === "Components") return componentsSortPreference.sortPreference;
          if (category === "Tools") return toolsSortPreference.sortPreference;
          if (category === "Machines") return machinesSortPreference.sortPreference;
          return null;
        };
        
        const getCurrentSortValue = () => {
          const pref = getCurrentSortPreference();
          return pref ? `${pref.field}:${pref.direction}` : "";
        };
        
        const handleSortChange = (value: string) => {
          const [field, direction] = value.split(":");
          const preference = { field, direction: direction as "asc" | "desc" };
          
          if (category === "Parts") {
            partsSortPreference.savePreference(preference);
          } else if (category === "Materials") {
            materialsSortPreference.savePreference(preference);
          } else if (category === "Components") {
            componentsSortPreference.savePreference(preference);
          } else if (category === "Tools") {
            toolsSortPreference.savePreference(preference);
          } else if (category === "Machines") {
            machinesSortPreference.savePreference(preference);
          }
        };
        
        return <TabsContent key={category} value={category} className="space-y-4 w-full max-w-full min-w-0">
              {/* Search and Add */}
              {category === "Materials" || category === "Components" ? (
                <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                  {/* First row: Action buttons (on mobile) / Right side (on desktop) */}
                  <div className="flex items-center gap-2 shrink-0 whitespace-nowrap w-full md:w-auto">
                    {(category === "Materials" || category === "Components") && (
                      <>
                        {category === "Materials" && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => setIsMaterialReorderSummaryDialogOpen(true)}
                              className="whitespace-nowrap flex-1 md:flex-none"
                            >
                              <FileText className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Reorder Summary</span>
                              <span className="sm:hidden">Reorder</span>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsMaterialManagementDialogOpen(true)}
                              className="whitespace-nowrap flex-1 md:flex-none"
                            >
                              <Settings className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Settings</span>
                            </Button>
                          </>
                        )}
                        {category === "Components" && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => setIsMaterialReorderSummaryDialogOpen(true)}
                              className="whitespace-nowrap flex-1 md:flex-none"
                            >
                              <FileText className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Reorder Summary</span>
                              <span className="sm:hidden">Reorder</span>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsMaterialManagementDialogOpen(true)}
                              className="whitespace-nowrap flex-1 md:flex-none"
                            >
                              <Settings className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Settings</span>
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    <Button 
                      onClick={() => handleOpenAddDialog(category)} 
                      className="whitespace-nowrap flex-1 md:flex-none"
                    >
                      <Plus className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">{category === "Materials" ? "Add Material" : "Add Component"}</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </div>
                  
                  {/* Second row: Search + Sort (on mobile) / Left side (on desktop) */}
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 w-full md:w-auto">
                    {/* Search bar */}
                    <div className="relative w-full sm:w-auto flex-1 min-w-[160px] md:max-w-[320px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input 
                        placeholder={`Search ${category.toLowerCase()}...`} 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="pl-10 w-full" 
                      />
                    </div>
                    
                    {/* Sort dropdown */}
                    <div className="w-full sm:w-auto min-w-[150px]">
                      <SortSelect
                        value={getCurrentSortValue()}
                        onChange={handleSortChange}
                        options={getSortOptions()}
                        placeholder="Sort"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-2 w-full">
                  {/* Search bar - one line on mobile */}
                  <div className="relative w-full md:max-w-md md:flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input placeholder={`Search ${category.toLowerCase()}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-full" />
                  </div>
                  
                  {/* Sort dropdown - one line on mobile */}
                  <div className="w-full md:w-auto min-w-[150px]">
                    <SortSelect
                      value={getCurrentSortValue()}
                      onChange={handleSortChange}
                      options={getSortOptions()}
                      placeholder="Sort"
                      className="w-full"
                    />
                  </div>
                  
                  {/* Customer filter - one line on mobile (only for Parts, hidden for customer users) */}
                  {category === "Parts" && !isCustomerUser() && (
                    <div className="w-full md:w-60 min-w-0">
                      <Select value={selectedCustomerFilter} onValueChange={setSelectedCustomerFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Filter by customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* "With Production Status" and "Add Part" - one line on mobile (Add Part hidden for customer users) */}
                  {category === "Parts" && (
                    <div className="flex flex-row items-center justify-between gap-2 md:gap-3 w-full md:w-auto">
                      <div className="flex items-center gap-2 flex-1 md:flex-none">
                        <Button
                          variant={showOnlyWithProductionStatus ? "default" : "outline"}
                          onClick={() => setShowOnlyWithProductionStatus(!showOnlyWithProductionStatus)}
                          size="default"
                          className="whitespace-nowrap"
                        >
                          <ClipboardList className="w-4 h-4 mr-2" />
                          With Production Status
                        </Button>
                      </div>
                      {!isCustomerUser() && (
                        <Button onClick={() => handleOpenAddDialog(category)} className="whitespace-nowrap">
                          <Plus className="w-4 h-4 mr-2" />
                          Add {category.slice(0, -1)}
                        </Button>
                      )}
                    </div>
                  )}
                {category === "Tools" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => setIsToolManagementDialogOpen(true)}
                      className="whitespace-nowrap"
                    >
                      <Cog className="w-4 h-4 mr-2" />
                      Tool Management System
                    </Button>
                    <Button onClick={() => handleOpenAddDialog(category)} className="whitespace-nowrap">
                      <Plus className="w-4 h-4 mr-2" />
                      Add {category.slice(0, -1)}
                    </Button>
                  </div>
                )}
                {category !== "Parts" && category !== "Materials" && category !== "Components" && category !== "Tools" && (
                  <Button onClick={() => handleOpenAddDialog(category)} className="whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-2" />
                    Add {category.slice(0, -1)}
                  </Button>
                )}
              </div>
              )}

              {/* Items List - Desktop View */}
              <div className="hidden md:block w-full max-w-full min-w-0">
                {filteredItems.length > 0 ? filteredItems.map(item => item && (
            <div key={item.id} className={cn(
              "border-b border-border py-4 px-4 last:border-b-0 min-h-[8rem]",
              !isCustomerUser() && "hover:bg-muted/30 transition-colors cursor-pointer",
              item.category !== "Parts" && item.quantity === 0 && "bg-destructive/5",
              (item.category === "Materials" || item.category === "Components") && materialReorders[item.id] && "bg-blue-50"
            )} onClick={() => {
              if (isCustomerUser()) return;
              const itemExists = inventoryItems.some(i => i.id === item.id);
              if (itemExists) {
                setSelectedViewItem(item);
                setIsViewDialogOpen(true);
              }
            }}>
                       <div className="h-full min-w-0 overflow-hidden">
                         <div className="grid grid-cols-[auto_1fr] gap-2 sm:gap-4 h-full items-center min-w-0">
                           {/* Material Shape Icon or Regular Image */}
                             {item?.category === "Materials" ? (() => {
                    const materialInfo = item.materials_used || {};
                    const shape = materialInfo?.shape || "";
                    const shapeId = materialInfo?.shapeId || null;
                    const shapeData = Array.isArray(shapes) ? shapes.find(s => s.id === shapeId || s.name === shape) : null;
                    return <div className="flex items-center justify-center flex-shrink-0">
                                    <ShapeImage 
                                      shapeName={shape} 
                                      shapeId={shapeId || undefined}
                                      imageUrl={shapeData?.image_url || null}
                                      size={88}
                                    />
                  </div>;
                })() : <div className="h-[103px] w-[110px] sm:w-[138px] bg-muted rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                            {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" /> : <CategoryIcon className="w-12 h-12 text-muted-foreground" />}
                          </div>}
                           
                           {/* Content */}
                           <div className="flex-1 flex flex-col justify-center min-w-0 h-full">
                             {item.category === "Parts" ? (
                               <div className="grid grid-cols-[290px_minmax(250px,1fr)_216.2px] gap-4 items-center min-w-0">
                                 {/* Column 1: Part name, Part#, Qty - 290px */}
                                 <div className="min-w-[290px] space-y-0.5 flex flex-col justify-center">
                                   <h3 className="font-semibold text-lg break-words">
                                     {item.name}
                                   </h3>
                                   {item.part_number && (
                                     <p className="text-sm text-muted-foreground font-medium">Part #: {item.part_number}</p>
                                   )}
                                   <div className="flex items-center gap-2 text-blue-600">
                                     <span className="text-lg font-bold text-blue-600">{item.quantity}</span>
                                     <div className="flex flex-col text-[0.5rem] leading-[0.6rem]">
                                       <span className="font-medium text-blue-600">
                                         {item.unit === "piece" || item.unit === "pcs" || !item.unit ? (item.quantity === 1 ? "piece" : "pieces") : item.unit}
                                       </span>
                                       <span className="text-blue-500">in stock</span>
                                     </div>
                                   </div>
                                 </div>
                                 {/* Column 2: Production status and requests - min 250px */}
                                 <div className="min-w-[250px] flex flex-col justify-center">
                                   <ProductionStatusWithRequests productionStatus={item.production_status} requests={partRequests[item.id] || []} />
                                 </div>
                                 {/* Column 3: Buttons, then customer and location below - fixed 216.2px */}
                                 <div className="flex flex-col items-end gap-2 min-w-[216.2px] w-[216.2px] shrink-0" onClick={e => e.stopPropagation()}>
                                   <div className="flex flex-nowrap gap-2 justify-end">
                                    {item.customer_id && (
                                      <>
                                        <Button variant="outline" size="sm" className={cn("transition-all duration-300", justAddedToPoItemId === item.id && "bg-green-600 text-white border-green-600 hover:bg-green-600 hover:text-white animate-bounce")} onClick={e => { e.preventDefault(); e.stopPropagation(); setAddToPoItem(item); setAddToPoQty(1); setAddToPoOpen(true); }}>
                                          {justAddedToPoItemId === item.id ? <Check className="h-4 w-4 mr-2" /> : <FilePlus className="h-4 w-4 mr-2" />}
                                          {justAddedToPoItemId === item.id ? "Added!" : "Add to PO"}
                                        </Button>
                                        {isCustomerUser() && (
                                          <Button variant="outline" size="sm" onClick={e => { e.preventDefault(); e.stopPropagation(); setSelectedItemForRequest(item); setRequestText(""); setIsRequestDialogOpen(true); }}>
                                            Request
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    {!isCustomerUser() && (
                                      <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleOpenEditDialog(item); }}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </Button>
                                    )}
                                   </div>
                                   {(item.location || item.customer_id) && (
                                     <div className="flex flex-col gap-1 items-end text-right">
                                       {item.customer_id && (() => {
                                         const customer = customers.find(c => c.id === item.customer_id);
                                         return customer?.name ? (
                                           <span className="text-xs font-medium truncate max-w-[200px]" title={customer.name}>{customer.name}</span>
                                         ) : null;
                                       })()}
                                       {item.location && (
                                         <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                                           <MapPin className="h-3 w-3 flex-shrink-0" />
                                           <span>{item.location}</span>
                                         </div>
                                       )}
                                     </div>
                                   )}
                                 </div>
                               </div>
                             ) : (
                             <div className="space-y-1">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="grid grid-cols-[1fr_auto] gap-4 min-w-0 flex-1 items-center">
                                    {/* First column: Name, Part#, Quantity in stock */}
                                    <div className="min-w-0 space-y-0.5 flex flex-col justify-center">
                                      {item.category === "Tools" ? (
                                        <>
                                          <h3 className="font-semibold text-lg">
                                            {(() => {
                                              const n = formatToolName(item.materials_used, item.name);
                                              if (!n) return null;
                                              const chunks = [];
                                              let remaining = n;
                                              while (remaining.length > 0) {
                                                if (remaining.length <= 25) {
                                                  chunks.push(remaining);
                                                  break;
                                                }
                                                const segment = remaining.slice(0, 25);
                                                const lastSpace = segment.lastIndexOf(' ');
                                                const breakAt = lastSpace >= 0 ? lastSpace : 25;
                                                chunks.push(remaining.slice(0, breakAt));
                                                remaining = remaining.slice(breakAt).trimStart();
                                              }
                                              return chunks.map((c, i) => <span key={i}>{i > 0 && <br />}{c}</span>);
                                            })()}
                                          </h3>
                                          {item.description && <p className="text-sm text-muted-foreground truncate">{item.description}</p>}
                                          {item.category !== "Materials" && (
                                            <div className={`flex items-center gap-2 ${item.quantity === 0 ? "text-destructive" : "text-blue-600"}`}>
                                              <span className={`text-lg font-bold ${item.quantity === 0 ? "text-destructive" : "text-blue-600"}`}>{item.quantity}</span>
                                              <div className="flex flex-col text-[0.5rem] leading-[0.6rem]">
                                                <span className={`font-medium ${item.quantity === 0 ? "text-destructive" : "text-blue-600"}`}>
                                                  {item.unit === "piece" || item.unit === "pcs" || !item.unit ? (item.quantity === 1 ? "piece" : "pieces") : item.unit}
                                                </span>
                                                <span className={item.quantity === 0 ? "text-destructive" : "text-blue-500"}>in stock</span>
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <h3 className="font-semibold text-lg">
                                            {(() => {
                                              const n = item.name || "";
                                              if (!n) return null;
                                              const chunks = [];
                                              let remaining = n;
                                              while (remaining.length > 0) {
                                                if (remaining.length <= 35) {
                                                  chunks.push(remaining);
                                                  break;
                                                }
                                                const segment = remaining.slice(0, 35);
                                                const lastSpace = segment.lastIndexOf(' ');
                                                const breakAt = lastSpace >= 0 ? lastSpace : 35;
                                                chunks.push(remaining.slice(0, breakAt));
                                                remaining = remaining.slice(breakAt).trimStart();
                                              }
                                              return chunks.map((c, i) => <span key={i}>{i > 0 && <br />}{c}</span>);
                                            })()}
                                          </h3>
                                          {item.part_number && item?.category !== "Materials" && item?.category !== "Components" && (
                                            <p className="text-sm text-muted-foreground font-medium">Part #: {item.part_number}</p>
                                          )}
                                          {item?.category !== "Materials" && (
                                            <div className={`flex items-center gap-2 ${item.quantity === 0 ? "text-destructive" : "text-blue-600"}`}>
                                              <span className={`text-lg font-bold ${item.quantity === 0 ? "text-destructive" : "text-blue-600"}`}>{item.quantity}</span>
                                              <div className="flex flex-col text-[0.5rem] leading-[0.6rem]">
                                                <span className={`font-medium ${item.quantity === 0 ? "text-destructive" : "text-blue-600"}`}>
                                                  {item.unit === "piece" || item.unit === "pcs" || !item.unit ? (item.quantity === 1 ? "piece" : "pieces") : item.unit}
                                                </span>
                                                <span className={item.quantity === 0 ? "text-destructive" : "text-blue-500"}>in stock</span>
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    {/* Second column: Production status and requests */}
                                    <div className="flex flex-col items-end justify-center shrink-0 min-w-[120px] max-w-[200px]">
                                      <ProductionStatusWithRequests productionStatus={item.production_status} requests={partRequests[item.id] || []} />
                                    </div>
                                  </div>
                                 <div className="flex flex-col items-end gap-2 ml-2 min-w-0" onClick={e => e.stopPropagation()}>
                                     {/* Row 1 & 2: Buttons in two rows, full size like cards */}
                                     <div className="flex flex-wrap gap-2 justify-end max-w-[280px]">
                                       {item.category === "Materials" && (
                                         <>
                                           <Button variant="outline" size="sm" className="text-green-600" onClick={e => { e.stopPropagation(); setSelectedMaterialForAdjustment(item); setIsMaterialAdjustmentDialogOpen(true); }}>
                                             <Plus className="h-4 w-4 mr-2" />
                                             Add
                                           </Button>
                                           <Button variant="outline" size="sm" className="text-red-600" onClick={e => { e.stopPropagation(); setSelectedMaterialForAdjustment(item); setIsMaterialAdjustmentDialogOpen(true); }}>
                                             <Minus className="h-4 w-4 mr-2" />
                                             Subtract
                                           </Button>
                                           {!materialReorders[item.id] ? (
                                             <Button variant="outline" size="sm" className="text-blue-600" onClick={e => { e.stopPropagation(); setSelectedMaterialForReorder(item); setIsMaterialReorderDialogOpen(true); }}>
                                               <ShoppingCart className="h-4 w-4 mr-2" />
                                               Reorder
                                             </Button>
                                           ) : (
                                             <Button variant="outline" size="sm" className="text-orange-600" onClick={e => { e.stopPropagation(); handleCancelReorder(item.id); }}>
                                               <X className="h-4 w-4 mr-2" />
                                               Cancel Reorder
                                             </Button>
                                           )}
                                         </>
                                       )}
                                       {item.category === "Components" && (
                                         <>
                                           <Button variant="outline" size="sm" className="text-green-600" onClick={e => { e.stopPropagation(); setSelectedComponentForAdjustment(item); setComponentAdjustmentType('add'); setIsComponentAdjustmentDialogOpen(true); }}>
                                             <Plus className="h-4 w-4 mr-2" />
                                             Add
                                           </Button>
                                           <Button variant="outline" size="sm" className="text-red-600" onClick={e => { e.stopPropagation(); setSelectedComponentForAdjustment(item); setComponentAdjustmentType('subtract'); setIsComponentAdjustmentDialogOpen(true); }}>
                                             <Minus className="h-4 w-4 mr-2" />
                                             Remove
                                           </Button>
                                           {!materialReorders[item.id] ? (
                                             <Button variant="outline" size="sm" className="text-blue-600" onClick={e => { e.stopPropagation(); setSelectedMaterialForReorder(item); setIsMaterialReorderDialogOpen(true); }}>
                                               <ShoppingCart className="h-4 w-4 mr-2" />
                                               Reorder
                                             </Button>
                                           ) : (
                                             <Button variant="outline" size="sm" className="text-orange-600" onClick={e => { e.stopPropagation(); handleCancelReorder(item.id); }}>
                                               <X className="h-4 w-4 mr-2" />
                                               Cancel Reorder
                                             </Button>
                                           )}
                                         </>
                                       )}
                                      {item.category === "Parts" && item.customer_id && (
                                        <>
                                          <Button variant="outline" size="sm" className={cn("transition-all duration-300", justAddedToPoItemId === item.id && "bg-green-600 text-white border-green-600 hover:bg-green-600 hover:text-white animate-bounce")} onClick={e => { e.preventDefault(); e.stopPropagation(); setAddToPoItem(item); setAddToPoQty(1); setAddToPoOpen(true); }}>
                                            {justAddedToPoItemId === item.id ? <Check className="h-4 w-4 mr-2" /> : <FilePlus className="h-4 w-4 mr-2" />}
                                            {justAddedToPoItemId === item.id ? "Added!" : "Add to PO"}
                                          </Button>
                                          {isCustomerUser() && (
                                            <Button variant="outline" size="sm" onClick={e => { e.preventDefault(); e.stopPropagation(); setSelectedItemForRequest(item); setRequestText(""); setIsRequestDialogOpen(true); }}>
                                              Request
                                            </Button>
                                          )}
                                        </>
                                      )}
                                      {!isCustomerUser() && (
                                        <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleOpenEditDialog(item); }}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </Button>
                                      )}
                                     </div>
                                     {/* Row 3: Stock location left of customer name, customer name right-aligned */}
                                     {(item.location || (item.category === "Parts" && item.customer_id)) && (
                                       <div className="flex items-center justify-end gap-2 w-full max-w-[280px]">
                                         {item.location && (
                                           <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                             <MapPin className="h-3 w-3 flex-shrink-0" />
                                             <span>{item.location}</span>
                                           </div>
                                         )}
                                         {item.category === "Parts" && item.customer_id && (() => {
                                           const customer = customers.find(c => c.id === item.customer_id);
                                           return customer?.name ? (
                                             <span className="text-xs font-medium truncate max-w-[150px]" title={customer.name}>{customer.name}</span>
                                           ) : null;
                                         })()}
                                       </div>
                                     )}
                                  </div>
                               </div>
                             </div>
                             )}
                             </div>
                          </div>
                        </div>
                      </div>
                )) : (
                  <div className="text-center py-12">
                    <CategoryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No {category.toLowerCase()} found</p>
                    {!isCustomerUser() && (
                      <Button variant="outline" onClick={() => handleOpenAddDialog(category)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First {category.slice(0, -1)}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 w-full max-w-full min-w-0">
                {filteredItems.length > 0 ? filteredItems.map(item => item && (
                  <Card 
                    key={item.id} 
                    className={`p-4 border relative w-full max-w-full overflow-hidden ${
                      !isCustomerUser() && "cursor-pointer hover:bg-muted/50 transition-colors"
                    } ${
                      item.category !== "Parts" && item.quantity === 0 ? 'border-destructive bg-destructive/5' : ''
                    } ${
                      item.category === "Materials" && materialReorders[item.id] ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => {
                      if (isCustomerUser()) return;
                      const itemExists = inventoryItems.some(i => i.id === item.id);
                      if (itemExists) {
                        setSelectedViewItem(item);
                        setIsViewDialogOpen(true);
                      }
                    }}
                  >
                    <div className="space-y-3 w-full min-w-0 overflow-hidden">
                      {/* Name/Title */}
                      <div className="flex flex-col space-y-1">
                        <div className="text-sm font-semibold break-words">
                          {item.category === "Tools" ? formatToolName(item.materials_used, item.name) : item.name}
                        </div>
                        {item.part_number && item.category !== "Materials" && (
                          <div className="text-xs text-muted-foreground break-words">Part #: {item.part_number}</div>
                        )}
                        {item.description && item.category === "Tools" && (
                          <div className="text-xs text-muted-foreground mt-1 break-words">{item.description}</div>
                        )}
                      </div>

                      {/* Category-specific fields */}
                      {item.category === "Materials" && (() => {
                        const materialInfo = item.materials_used || {};
                        const unitWeight = calculateMaterialWeight(materialInfo);
                        const totalWeight = unitWeight * item.quantity;
                        const stockQuantityMm = materialStockQuantities[item.id] || 0;
                        const reorder = materialReorders[item.id];
                        const shape = materialInfo?.shape || "";
                        const shapeId = materialInfo?.shapeId || null;
                        const shapeData = Array.isArray(shapes) ? shapes.find(s => s.id === shapeId || s.name === shape) : null;
                        
                        return (
                          <>
                            {/* Stock and Shape Picture - Bottom-aligned row */}
                            <div className="flex w-full items-end justify-between gap-3 min-w-0 overflow-visible">
                              {/* Stock section - left */}
                              <div className="flex flex-col space-y-1 min-w-0 flex-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stock</span>
                                <div className="text-sm font-medium text-blue-600">{stockQuantityMm.toFixed(0)} mm</div>
                              </div>
                              {/* Shape picture section - right */}
                              <div className="flex-shrink-0 pointer-events-none overflow-visible">
                                <ShapeImage 
                                  shapeName={shape} 
                                  shapeId={shapeId || undefined}
                                  imageUrl={shapeData?.image_url || null}
                                  size={88}
                                />
                              </div>
                            </div>
                            {totalWeight > 0 && (
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Weight</span>
                                <div className="text-sm font-medium">{totalWeight.toFixed(1)} kg</div>
                              </div>
                            )}
                            {reorder && (
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reorder</span>
                                <div className="text-xs text-blue-600 font-medium break-words">
                                  {reorder.length_mm}mm {reorder.notes && `- ${reorder.notes}`}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {(item.category === "Tools" || item.category === "Machines") && (
                        <>
                          {item.supplier && (
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Supplier</span>
                              <div className="text-sm font-medium flex items-center gap-1 min-w-0">
                                <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="break-words min-w-0">{item.supplier}</span>
                              </div>
                            </div>
                          )}
                          {item.category === "Machines" && item.weight > 0 && (
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weight</span>
                              <div className="text-sm font-medium">{item.weight} kg</div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Common fields */}
                      {item.location && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</span>
                          <div className="text-sm font-medium flex items-center gap-1 min-w-0">
                            <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="break-words min-w-0">{item.location}</span>
                          </div>
                        </div>
                      )}

                      {item.category !== "Materials" && (
                        <div className="flex w-full justify-between items-end gap-4 min-w-0 !mt-0 overflow-visible">
                          {/* Quantity and production status - left, constrained to not overlap picture */}
                          <div className="flex flex-col space-y-1 min-w-0 flex-1 justify-end max-w-[calc(100%-148px)]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[1.9rem] font-bold ${item.category === "Parts" ? "text-blue-600" : (item.quantity === 0 ? "text-destructive" : "text-blue-600")}`}>
                                {item.quantity}
                              </span>
                              <div className="flex flex-col justify-center leading-tight">
                                <span className={`text-xs ${item.category === "Parts" ? "text-blue-500" : (item.quantity === 0 ? "text-destructive" : "text-blue-500")}`}>
                                  {item.unit === "piece" || item.unit === "pcs" || !item.unit ? (item.quantity === 1 ? "piece" : "pieces") : item.unit}
                                </span>
                                <span className={`text-xs ${item.category === "Parts" ? "text-blue-500" : (item.quantity === 0 ? "text-destructive" : "text-blue-500")}`}>
                                  in stock
                                </span>
                              </div>
                            </div>
                            {/* Production status and requests - wraps as needed */}
                            <div className="min-h-[3.75em]">
                              <ProductionStatusWithRequests productionStatus={item.production_status} requests={partRequests[item.id] || []} className="text-xs" />
                            </div>
                          </div>
                          {/* Picture section - right */}
                          <div className="flex-shrink-0 pointer-events-none overflow-visible">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="h-[99px] w-[132px] object-contain rounded-lg"
                              />
                            ) : (
                              <div className="h-[99px] w-[132px] bg-muted rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                                <CategoryIcon className="w-10 h-10 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons - Bottom of Card, with location and customer on the right */}
                      <div className="pt-2 border-t flex flex-wrap gap-2 w-full items-start" onClick={(e) => e.stopPropagation()}>
                        {item.category === "Materials" && (
                          <>
                            <Button variant="outline" size="sm" className="text-green-600" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMaterialForAdjustment(item);
                              setIsMaterialAdjustmentDialogOpen(true);
                            }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMaterialForAdjustment(item);
                              setIsMaterialAdjustmentDialogOpen(true);
                            }}>
                              <Minus className="h-4 w-4 mr-2" />
                              Subtract
                            </Button>
                            {!materialReorders[item.id] ? (
                              <Button variant="outline" size="sm" className="text-blue-600" onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMaterialForReorder(item);
                                setIsMaterialReorderDialogOpen(true);
                              }}>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Reorder
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="text-orange-600" onClick={(e) => {
                                e.stopPropagation();
                                handleCancelReorder(item.id);
                              }}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel Reorder
                              </Button>
                            )}
                          </>
                        )}
                        {item.category === "Components" && (
                          <>
                            <Button variant="outline" size="sm" className="text-green-600" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedComponentForAdjustment(item);
                              setComponentAdjustmentType('add');
                              setIsComponentAdjustmentDialogOpen(true);
                            }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedComponentForAdjustment(item);
                              setComponentAdjustmentType('subtract');
                              setIsComponentAdjustmentDialogOpen(true);
                            }}>
                              <Minus className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                            {!materialReorders[item.id] ? (
                              <Button variant="outline" size="sm" className="text-blue-600" onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMaterialForReorder(item);
                                setIsMaterialReorderDialogOpen(true);
                              }}>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Reorder
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="text-orange-600" onClick={(e) => {
                                e.stopPropagation();
                                handleCancelReorder(item.id);
                              }}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel Reorder
                              </Button>
                            )}
                          </>
                        )}
                        {item.category === "Parts" && item.customer_id && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "transition-all duration-300",
                                justAddedToPoItemId === item.id && "bg-green-600 text-white border-green-600 hover:bg-green-600 hover:text-white animate-bounce"
                              )}
                              onClick={e => { e.preventDefault(); e.stopPropagation(); setAddToPoItem(item); setAddToPoQty(1); setAddToPoOpen(true); }}
                            >
                              {justAddedToPoItemId === item.id ? <Check className="h-4 w-4 mr-2" /> : <FilePlus className="h-4 w-4 mr-2" />}
                              {justAddedToPoItemId === item.id ? "Added!" : "Add to PO"}
                            </Button>
                            {isCustomerUser() && (
                              <Button variant="outline" size="sm" onClick={e => { e.preventDefault(); e.stopPropagation(); setSelectedItemForRequest(item); setRequestText(""); setIsRequestDialogOpen(true); }}>
                                Request
                              </Button>
                            )}
                          </>
                        )}
                        {!isCustomerUser() && (
                          <Button variant="outline" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDialog(item);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                        {/* Customer and location - same line as buttons, two rows: customer above, location below */}
                        {(item.location || (item.category === "Parts" && item.customer_id)) && (
                          <div className="flex flex-col gap-1 ml-auto text-right">
                            {item.category === "Parts" && item.customer_id && (() => {
                              const customer = customers.find(c => c.id === item.customer_id);
                              return customer?.name ? (
                                <span className="text-xs font-medium truncate max-w-[150px]" title={customer.name}>{customer.name}</span>
                              ) : null;
                            })()}
                            {item.location && (
                              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="break-words min-w-0">{item.location}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )) : (
                  <div className="text-center py-12">
                    <CategoryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No {category.toLowerCase()} found</p>
                    {!isCustomerUser() && (
                      <Button variant="outline" onClick={() => handleOpenAddDialog(category)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First {category.slice(0, -1)}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>;
      })}
      </Tabs>

      {/* Add to PO Dialog */}
      <Dialog open={addToPoOpen} onOpenChange={(open) => { setAddToPoOpen(open); if (!open) setAddToPoItem(null); }}>
        <DialogContent className="w-fit max-w-[280px] p-4">
          <div className="flex items-center gap-2">
            <NumericInput
              value={addToPoQty}
              onChange={v => setAddToPoQty(Math.max(1, v))}
              min={1}
              suffix={addToPoItem ? pluralizeUnit(addToPoItem.unit || "piece", addToPoQty) : "piece"}
              className="h-9"
              containerClassName="w-[156px]"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToPoItem && handleAddToPO(addToPoItem, addToPoQty); } }}
            />
            <Button
              size="icon"
              className="h-9 w-9 rounded-full p-0"
              onClick={() => addToPoItem && handleAddToPO(addToPoItem, addToPoQty)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Dialog - customer users only */}
      <Dialog open={isRequestDialogOpen} onOpenChange={(open) => { setIsRequestDialogOpen(open); if (!open) { setSelectedItemForRequest(null); setRequestText(""); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request / Question about part</DialogTitle>
            <DialogDescription>
              {selectedItemForRequest ? `Ask a question about "${selectedItemForRequest.name}"` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="request-text">Your question</Label>
              <Textarea
                id="request-text"
                placeholder="Enter your question about this part..."
                value={requestText}
                onChange={e => setRequestText(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsRequestDialogOpen(false); setSelectedItemForRequest(null); setRequestText(""); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmitRequest} disabled={!requestText.trim()}>
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New {currentCategory.slice(0, -1)}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {currentCategory === "Parts" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Part Name *</Label>
                    <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
                      ...prev,
                      name: e.target.value
                    }))} placeholder="Enter part name" />
                  </div>
                  <div className="grid gap-2">
                <Label htmlFor="part_number">Part Number</Label>
                <Input id="part_number" value={formData.part_number} onChange={e => setFormData(prev => ({
              ...prev,
              part_number: e.target.value
            }))} placeholder="Enter part number" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customer">Customer</Label>
                    <Select value={formData.customer_id} onValueChange={value => {
                      // Find the selected customer and auto-set currency
                      const selectedCustomer = customers.find(c => c.id === value);
                      const currency = selectedCustomer?.currency || (selectedCustomer?.country ? getCurrencyForCountry(selectedCustomer.country) : 'EUR');
                      
                      setFormData(prev => ({
                        ...prev,
                        customer_id: value,
                        currency: currency
                      }));
                    }}>
                      <SelectTrigger id="customer">
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={value => setFormData(prev => ({
                      ...prev,
                      currency: value
                    }))}>
                      <SelectTrigger id="currency">
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
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : currentCategory === "Materials" ? <MaterialForm onMaterialChange={setMaterialData} initialData={materialData || undefined} /> : 
              currentCategory === "Components" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Component Name *</Label>
                      <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
                        ...prev,
                        name: e.target.value
                      }))} placeholder="Enter component name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="part_number">Component Number</Label>
                      <Input id="part_number" value={formData.part_number} onChange={e => setFormData(prev => ({
                        ...prev,
                        part_number: e.target.value
                      }))} placeholder="Enter component number" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="unit">Unit</Label>
                      <UnitSelect
                        value={formData.unit || "piece"}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="minimum_stock">Min Stock Level</Label>
                      <NumericInput
                        id="minimum_stock"
                        value={formData.minimum_stock || ""}
                        onChange={(val) => setFormData(prev => ({ ...prev, minimum_stock: val === 0 ? "" : val.toString() }))}
                        min={0}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="weight">Weight/unit</Label>
                    <NumericInput
                      id="weight"
                      value={formData.weight}
                      onChange={(val) => setFormData(prev => ({ ...prev, weight: val.toString() }))}
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                    />
                  </div>
                </>
              ) : currentCategory === "Tools" ? (
                <ToolCategorySelector 
                  onSelectionChange={setToolCategorySelection}
                  initialSelection={toolCategorySelection}
                />
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))} placeholder="Enter item name" />
                </div>
              )}
            {currentCategory !== "Materials" && (
            <>
              {currentCategory === "Parts" ? (
                <>
                  {/* Mobile layout for Parts: 2 rows of 2 columns */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {/* Row 1: Quantity, Unit, Min Stock Level */}
                    <div className="grid gap-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <NumericInput
                        id="quantity"
                        value={formData.quantity}
                        onChange={(val) => setFormData(prev => ({ ...prev, quantity: val.toString() }))}
                        min={0}
                        placeholder="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="unit">Unit</Label>
                      <UnitSelect
                        value={formData.unit || "piece"}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="minimum_stock">Min Stock Level</Label>
                      <NumericInput
                        id="minimum_stock"
                        value={formData.minimum_stock || ""}
                        onChange={(val) => setFormData(prev => ({ ...prev, minimum_stock: val === 0 ? "" : val.toString() }))}
                        min={0}
                        placeholder="0"
                      />
                    </div>
                    {/* Desktop: Unit Price in same row */}
                    {canSeePrices() && (
                      <div className="grid gap-2 hidden sm:grid">
                        <Label htmlFor="unit_price">Unit Price *</Label>
                        <NumericInput
                          id="unit_price"
                          value={formData.unit_price || ""}
                          onChange={(val) => setFormData(prev => ({ ...prev, unit_price: val === 0 ? "" : val.toString() }))}
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          increment={0.01}
                          decrement={0.01}
                        />
                      </div>
                    )}
                  </div>
                  {/* Mobile: Row 2 for Parts - Unit Price and Weight (Unit shown in row 1) */}
                  {canSeePrices() && (
                    <div className="grid grid-cols-2 gap-4 sm:hidden mt-4">
                      <div className="grid gap-2">
                        <Label htmlFor="unit_price">Unit Price *</Label>
                        <NumericInput
                          id="unit_price"
                          value={formData.unit_price || ""}
                          onChange={(val) => setFormData(prev => ({ ...prev, unit_price: val === 0 ? "" : val.toString() }))}
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          increment={0.01}
                          decrement={0.01}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="weight">Weight (kg)</Label>
                        <NumericInput
                          id="weight"
                          value={formData.weight}
                          onChange={(val) => setFormData(prev => ({ ...prev, weight: val.toString() }))}
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                  {/* Desktop: Weight in separate row */}
                  <div className="grid gap-2 hidden sm:grid mt-4">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <NumericInput
                      id="weight"
                      value={formData.weight}
                      onChange={(val) => setFormData(prev => ({ ...prev, weight: val.toString() }))}
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                    />
                  </div>
                </>
              ) : currentCategory === "Components" ? null : (
                /* Other categories (Tools, Machines) - original layout */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <NumericInput
                      id="quantity"
                      value={formData.quantity}
                      onChange={(val) => setFormData(prev => ({ ...prev, quantity: val.toString() }))}
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  {formData.category !== "Machines" && (
                    <div className="grid gap-2">
                      <Label htmlFor="minimum_stock">Min Stock Level</Label>
                      <NumericInput
                        id="minimum_stock"
                        value={formData.minimum_stock || ""}
                        onChange={(val) => setFormData(prev => ({ ...prev, minimum_stock: val === 0 ? "" : val.toString() }))}
                        min={0}
                        placeholder="0"
                      />
                    </div>
                  )}
                  {canSeePrices() && (
                    <div className="grid gap-2">
                      <Label htmlFor="unit_price">Unit Price *</Label>
                      <NumericInput
                        id="unit_price"
                        value={formData.unit_price || ""}
                        onChange={(val) => setFormData(prev => ({ ...prev, unit_price: val === 0 ? "" : val.toString() }))}
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        increment={0.01}
                        decrement={0.01}
                      />
                    </div>
                  )}
                  {currentCategory !== "Parts" && currentCategory !== "Materials" && currentCategory !== "Components" && (
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={value => setFormData(prev => ({
                      ...prev,
                      currency: value
                    }))}>
                      <SelectTrigger id="currency">
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
                      </SelectContent>
                    </Select>
                  </div>
                  )}
                </div>
              )}
              {(currentCategory === "Machines") && (
                <div className="grid gap-2 mt-4">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <NumericInput
                    id="weight"
                    value={formData.weight}
                    onChange={(val) => setFormData(prev => ({ ...prev, weight: val.toString() }))}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                  />
                </div>
              )}
            </>
            )}
            {currentCategory !== "Materials" && currentCategory !== "Components" && (
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Select value={formData.location} onValueChange={value => setFormData(prev => ({
              ...prev,
              location: value
            }))}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations.map(location => <SelectItem key={location.id} value={location.name}>
                      {location.name} {location.description && `- ${location.description}`}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            )}
            {currentCategory !== "Parts" && currentCategory !== "Materials" && currentCategory !== "Components" && (
              <div className="grid gap-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select value={formData.supplier_id} onValueChange={value => {
                  // Find the selected supplier and auto-set currency
                  const selectedSupplier = suppliers.find(s => s.id === value);
                  const currency = selectedSupplier?.country ? getCurrencyForCountry(selectedSupplier.country) : 'EUR';
                  
                  setFormData(prev => ({
                    ...prev,
                    supplier_id: value,
                    currency: currency
                  }));
                }}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {currentCategory !== "Materials" && (
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={e => setFormData(prev => ({
              ...prev,
              description: e.target.value
            }))} placeholder="Enter item description" />
            </div>
            )}
            {formData.category !== "Materials" && <div className="grid gap-2">
                <DragDropImageUpload
                  value={formData.photo}
                  onChange={async (file) => {
                    if (file) {
                      try {
                        const resizedFile = await resizeImageForPartPhoto(file);
                        setFormData(prev => ({
                          ...prev,
                          photo: resizedFile
                        }));
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to process image. Please try again.",
                          variant: "destructive"
                        });
                      }
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        photo: null
                      }));
                      setPhotoPreview(null);
                    }
                  }}
                  maxSizeMB={10}
                  label="Photo"
                />
              </div>}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              setToolCategorySelection(null);
              setIsAddDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem} disabled={isUploading}>
              {isUploading ? "Uploading..." : `Save ${currentCategory.slice(0, -1)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editingItem?.category?.slice(0, -1) || "Item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editingItem?.category === "Parts" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_name">Part Name *</Label>
                    <Input id="edit_name" value={formData.name} onChange={e => setFormData(prev => ({
                      ...prev,
                      name: e.target.value
                    }))} placeholder="Enter part name" />
                  </div>
                  <div className="grid gap-2">
                <Label htmlFor="edit_part_number">Part Number</Label>
                <Input id="edit_part_number" value={formData.part_number} onChange={e => setFormData(prev => ({
              ...prev,
              part_number: e.target.value
            }))} placeholder="Enter part number" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_customer">Customer</Label>
                    <Select value={formData.customer_id} onValueChange={value => {
                      // Find the selected customer and auto-set currency
                      const selectedCustomer = customers.find(c => c.id === value);
                      const currency = selectedCustomer?.currency || (selectedCustomer?.country ? getCurrencyForCountry(selectedCustomer.country) : 'EUR');
                      
                      setFormData(prev => ({
                        ...prev,
                        customer_id: value,
                        currency: currency
                      }));
                    }}>
                      <SelectTrigger id="edit_customer">
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={value => setFormData(prev => ({
                      ...prev,
                      currency: value
                    }))}>
                      <SelectTrigger id="edit_currency">
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
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : editingItem?.category === "Materials" ? <MaterialForm onMaterialChange={setMaterialData} initialData={materialData || undefined} /> : 
              editingItem?.category === "Components" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit_name">Component Name *</Label>
                      <Input id="edit_name" value={formData.name} onChange={e => setFormData(prev => ({
                        ...prev,
                        name: e.target.value
                      }))} placeholder="Enter component name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit_part_number">Component Number</Label>
                      <Input id="edit_part_number" value={formData.part_number} onChange={e => setFormData(prev => ({
                        ...prev,
                        part_number: e.target.value
                      }))} placeholder="Enter component number" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit_unit">Unit</Label>
                      <UnitSelect
                        value={formData.unit || "piece"}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit_minimum_stock">Min Stock Level</Label>
                      <NumericInput
                        id="edit_minimum_stock"
                        value={formData.minimum_stock || 0}
                        onChange={(val) => setFormData(prev => ({ ...prev, minimum_stock: val.toString() }))}
                        min={0}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_weight">Weight/unit</Label>
                    <NumericInput
                      id="edit_weight"
                      value={formData.weight}
                      onChange={(val) => setFormData(prev => ({ ...prev, weight: val.toString() }))}
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                    />
                  </div>
                </>
              ) : editingItem?.category === "Tools" ? (
                <ToolCategorySelector 
                  onSelectionChange={setToolCategorySelection}
                  initialSelection={toolCategorySelection}
                />
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="edit_name">Name *</Label>
                  <Input id="edit_name" value={formData.name} onChange={e => setFormData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))} placeholder="Enter item name" />
                </div>
              )}
            {editingItem?.category !== "Materials" && editingItem?.category !== "Components" && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_quantity">Quantity *</Label>
                <NumericInput
                  id="edit_quantity"
                  value={formData.quantity}
                  onChange={(val) => setFormData(prev => ({ ...prev, quantity: val.toString() }))}
                  min={0}
                  placeholder="0"
                />
              </div>
              {editingItem?.category === "Parts" && (
                <div className="grid gap-2">
                  <Label htmlFor="edit_unit">Unit</Label>
                  <UnitSelect
                    value={formData.unit || "piece"}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}
                  />
                </div>
              )}
              {formData.category !== "Machines" && (
                <div className="grid gap-2">
                  <Label htmlFor="edit_minimum_stock">Min Stock Level</Label>
                  <NumericInput
                    id="edit_minimum_stock"
                    value={formData.minimum_stock || 0}
                    onChange={(val) => setFormData(prev => ({ ...prev, minimum_stock: val.toString() }))}
                    min={0}
                    placeholder="0"
                  />
                </div>
              )}
              {canSeePrices() && (
                <div className="grid gap-2">
                  <Label htmlFor="edit_unit_price">Unit Price *</Label>
                  <NumericInput
                    id="edit_unit_price"
                    value={formData.unit_price}
                    onChange={(val) => setFormData(prev => ({ ...prev, unit_price: val.toString() }))}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                  />
                </div>
              )}
              {editingItem?.category !== "Parts" && editingItem?.category !== "Materials" && editingItem?.category !== "Components" && (
              <div className="grid gap-2">
                <Label htmlFor="edit_currency">Currency</Label>
                <Select value={formData.currency} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  currency: value
                }))}>
                  <SelectTrigger id="edit_currency">
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
                  </SelectContent>
                </Select>
              </div>
              )}
            </div>
            )}
            {(editingItem?.category === "Parts" || editingItem?.category === "Machines") && (
              <div className="grid gap-2">
                <Label htmlFor="edit_weight">Weight (kg)</Label>
                <NumericInput
                  id="edit_weight"
                  value={formData.weight}
                  onChange={(val) => setFormData(prev => ({ ...prev, weight: val.toString() }))}
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                />
              </div>
            )}
            {editingItem?.category !== "Materials" && editingItem?.category !== "Components" && (
            <div className="grid gap-2">
              <Label htmlFor="edit_location">Location</Label>
              <Select value={formData.location} onValueChange={value => setFormData(prev => ({
              ...prev,
              location: value
            }))}>
                <SelectTrigger id="edit_location">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations.map(location => <SelectItem key={location.id} value={location.name}>
                      {location.name} {location.description && `- ${location.description}`}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            )}
            {editingItem?.category !== "Parts" && editingItem?.category !== "Materials" && editingItem?.category !== "Components" && (
              <div className="grid gap-2">
                <Label htmlFor="edit_supplier">Supplier</Label>
                <Select value={formData.supplier_id} onValueChange={value => {
                  // Find the selected supplier and auto-set currency
                  const selectedSupplier = suppliers.find(s => s.id === value);
                  const currency = selectedSupplier?.country ? getCurrencyForCountry(selectedSupplier.country) : 'EUR';
                  
                  setFormData(prev => ({
                    ...prev,
                    supplier_id: value,
                    currency: currency
                  }));
                }}>
                  <SelectTrigger id="edit_supplier">
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea id="edit_description" value={formData.description} onChange={e => setFormData(prev => ({
              ...prev,
              description: e.target.value
            }))} placeholder="Enter description" rows={3} />
            </div>
            {formData.category !== "Materials" && <div className="grid gap-2">
                <DragDropImageUpload
                  value={photoPreview || formData.photo}
                  onChange={async (file) => {
                    if (file) {
                      try {
                        const resizedFile = await resizeImageForPartPhoto(file);
                        setFormData(prev => ({
                          ...prev,
                          photo: resizedFile
                        }));
                        setPhotoPreview(URL.createObjectURL(resizedFile));
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to process image. Please try again.",
                          variant: "destructive"
                        });
                      }
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        photo: null
                      }));
                      setPhotoPreview(null);
                    }
                  }}
                  maxSizeMB={10}
                  label="Photo"
                />
              </div>}
            
            {editingItem?.category === "Parts" && <>
                {/* Materials Used Section */}
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4" />
                    Materials Used
                  </Label>
                  <div className="space-y-3">
                    {materialsUsed.map((material, index) => {
                      const selectedMaterial = materialsList.find(item => item.name === material.name);
                      return (
                        <div key={index} className="space-y-2">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <SearchableSelect
                              items={materialsList}
                              value={material.name}
                              onSelect={(item) => {
                                const newMaterials = [...materialsUsed];
                                newMaterials[index].name = item.name;
                                setMaterialsUsed(newMaterials);
                              }}
                              placeholder="Select material"
                              searchPlaceholder="Search materials..."
                              emptyMessage="No materials found."
                              getItemValue={(item) => item.name}
                              getItemLabel={(item) => item.name}
                              getItemSearchText={(item) => `${item.name} ${item.part_number || ''}`}
                              getItemPartNumber={(item) => item.part_number}
                            />
                          </div>
                          <Button variant="outline" size="sm" onClick={() => {
                      if (materialsUsed.length > 1) {
                        setMaterialsUsed(materialsUsed.filter((_, i) => i !== index));
                      }
                    }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="grid gap-2">
                            <Label htmlFor={`material-length-${index}`} className="text-xs">Length per piece (mm)</Label>
                            <NumericInput
                              id={`material-length-${index}`}
                              value={material.lengthPerPiece ? parseFloat(material.lengthPerPiece) : 0}
                              onChange={(val) => {
                                const newMaterials = [...materialsUsed];
                                newMaterials[index].lengthPerPiece = val.toString();
                                setMaterialsUsed(newMaterials);
                              }}
                              min={0}
                              step={0.01}
                              placeholder="0"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`material-notes-${index}`} className="text-xs">Notes (optional)</Label>
                            <Input 
                              id={`material-notes-${index}`}
                              placeholder="Material notes (optional)" 
                              value={material.notes} 
                              onChange={e => {
                                const newMaterials = [...materialsUsed];
                                newMaterials[index].notes = e.target.value;
                                setMaterialsUsed(newMaterials);
                              }} 
                              className="text-sm" 
                            />
                          </div>
                        </div>
                        </div>
                      );
                    })}
                    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setMaterialsUsed([...materialsUsed, {
                  name: "",
                  notes: "",
                  lengthPerPiece: ""
                }])}>
                      <Plus className="w-4 h-4" />
                      Add Material
                    </Button>
                  </div>
                </div>

                {/* Tools Used Section */}
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Wrench className="w-4 h-4" />
                    Tools Used
                  </Label>
                  <div className="space-y-3">
                    {toolsUsed.map((tool, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <SearchableSelect
                                items={toolsList}
                                value={tool.name}
                                onSelect={(item) => {
                                  const newTools = [...toolsUsed];
                                  newTools[index].name = item.name;
                                  setToolsUsed(newTools);
                                }}
                                placeholder="Select tool"
                                searchPlaceholder="Search tools..."
                                emptyMessage="No tools found."
                                getItemValue={(item) => item.name}
                                getItemLabel={(item) => item.category === "Tools" ? formatToolName(item.materials_used, item.name) : item.name}
                                getItemSearchText={(item) => `${item.category === "Tools" ? formatToolName(item.materials_used, item.name) : item.name} ${item.part_number || ''}`}
                                getItemPartNumber={(item) => item.part_number}
                              />
                            </div>
                            <Button variant="outline" size="sm" onClick={() => {
                        if (toolsUsed.length > 1) {
                          setToolsUsed(toolsUsed.filter((_, i) => i !== index));
                        }
                      }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <Input placeholder="Tool notes (optional)" value={tool.notes} onChange={e => {
                      const newTools = [...toolsUsed];
                      newTools[index].notes = e.target.value;
                      setToolsUsed(newTools);
                    }} className="text-sm" />
                        </div>
                    ))}
                    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setToolsUsed([...toolsUsed, {
                  name: "",
                  notes: ""
                }])}>
                      <Plus className="w-4 h-4" />
                      Add Tool
                    </Button>
                  </div>
                </div>

                {/* Components Used Section */}
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4" />
                    Components Used
                  </Label>
                  <div className="space-y-3">
                    {componentsUsed.map((component, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <SearchableSelect
                                items={componentsList}
                                value={component.name}
                                onSelect={(item) => {
                                  const newComponents = [...componentsUsed];
                                  newComponents[index].name = item.name;
                                  setComponentsUsed(newComponents);
                                }}
                                placeholder="Select component"
                                searchPlaceholder="Search components..."
                                emptyMessage="No components found."
                                getItemValue={(item) => item.name}
                                getItemLabel={(item) => item.name}
                                getItemSearchText={(item) => `${item.name} ${item.part_number || ''}`}
                                getItemPartNumber={(item) => item.part_number}
                              />
                            </div>
                            <div className="w-32">
                              <Label className="text-xs">Quantity</Label>
                              <NumericInput
                                value={component.quantity || 1}
                                onChange={(val) => {
                                  const newComponents = [...componentsUsed];
                                  newComponents[index].quantity = val;
                                  setComponentsUsed(newComponents);
                                }}
                                min={1}
                                placeholder="Qty"
                              />
                            </div>
                            <Button variant="outline" size="sm" onClick={() => {
                          if (componentsUsed.length > 1) {
                            setComponentsUsed(componentsUsed.filter((_, i) => i !== index));
                          }
                        }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                          </div>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setComponentsUsed([...componentsUsed, {
                      name: "",
                      quantity: 1
                    }])}>
                      <Plus className="w-4 h-4" />
                      Add Component
                    </Button>
                  </div>
                </div>

                {/* Files Upload Section */}
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4" />
                    Drawings & Other Files
                  </Label>
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-muted-foreground rounded-lg p-4">
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">Upload drawings, documents, or other files</p>
                        <Input type="file" multiple onChange={handleFileUpload} className="hidden" id="file-upload" accept=".pdf,.dwg,.dxf,.doc,.docx,.jpg,.png,.jpeg" />
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>Choose Files</span>
                          </Button>
                        </Label>
                      </div>
                    </div>
                    {uploadedFiles.length > 0 && <div className="space-y-2">
                        {uploadedFiles.map((file, index) => <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" onClick={() => window.open(file.url, '_blank')}>
                                View
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleRemoveFile(index)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>)}
                      </div>}
                  </div>
                </div>
              </>}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
            setMaterialsUsed([{
              name: "",
              notes: "",
              lengthPerPiece: ""
            }]);
            setToolsUsed([{
              name: "",
              notes: ""
            }]);
            setUploadedFiles([]);
            setToolCategorySelection(null);
            setIsEditDialogOpen(false);
          }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={isUploading}>
              {isUploading ? "Updating..." : "Update Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Work Order Dialog */}
      <CreateWorkOrderDialog
        open={isWorkOrderDialogOpen}
        onOpenChange={setIsWorkOrderDialogOpen}
        defaultPartId={selectedItemForWorkOrder?.id}
        defaultMaterials={selectedItemForWorkOrder?.materials_used && Array.isArray(selectedItemForWorkOrder.materials_used) 
          ? selectedItemForWorkOrder.materials_used.filter((m: any) => m.name).map((m: any) => ({
              name: m.name,
              notes: m.notes || "",
              lengthPerPiece: m.lengthPerPiece || ""
            }))
          : undefined}
        onSuccess={() => {
          // Refresh inventory items if needed
          fetchInventoryItems();
        }}
      />

      {/* History Dialog */}
      <PartHistoryDialog isOpen={isHistoryDialogOpen} onClose={() => setIsHistoryDialogOpen(false)} item={selectedItemForHistory} historyData={historyData} />

      {/* Production Status Dialog */}
      <ProductionStatusDialog 
        isOpen={isProductionStatusDialogOpen}
        onOpenChange={setIsProductionStatusDialogOpen}
        currentStatus={selectedItemForProductionStatus?.production_status || ""}
        onSave={handleSaveProductionStatus}
        itemName={selectedItemForProductionStatus?.name || ""}
      />

      {/* Part Requests Dialog (administrator) */}
      <PartRequestsDialog
        isOpen={isPartRequestsDialogOpen}
        onClose={() => { setIsPartRequestsDialogOpen(false); setSelectedItemForPartRequests(null); }}
        part={selectedItemForPartRequests ? { id: selectedItemForPartRequests.id, name: selectedItemForPartRequests.name } : null}
        onRequestsUpdated={() => fetchPartRequests(inventoryItems.filter((i: any) => i.category === "Parts").map((i: any) => i.id))}
      />


      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open);
        if (!open) {
          setMaterialViewAdditions([]);
          setEditingLocationForAddition(null);
          setNewLocationValue('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {(selectedViewItem?.category === "Materials" || selectedViewItem?.category === "Components") ? (selectedViewItem?.category === "Materials" ? "Material Details" : "Component Details") : 
               selectedViewItem?.category === "Tools" ? "Tool Details" : "Part Details"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedViewItem && <div className="space-y-6">
              {/* Photo and Basic Info */}
              <div className="flex gap-6">
                {selectedViewItem?.category === "Materials" ? (() => {
                  const materialInfo = selectedViewItem.materials_used || {};
                  const shape = materialInfo?.shape || "";
                  const shapeId = materialInfo?.shapeId || null;
                  const shapeData = Array.isArray(shapes) ? shapes.find(s => s.id === shapeId || s.name === shape) : null;
                  return (
                    <div className="flex items-center justify-center flex-shrink-0">
                      <ShapeImage 
                        shapeName={shape} 
                        shapeId={shapeId || undefined}
                        imageUrl={shapeData?.image_url || null}
                        size={80}
                      />
                    </div>
                  );
                })() : (
                  <div className="w-[170px] h-32 bg-muted rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    {selectedViewItem.photo_url ? <img src={selectedViewItem.photo_url} alt={selectedViewItem.name} className="w-full h-full object-cover" /> : <Package className="w-16 h-16 text-muted-foreground" />}
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {selectedViewItem.category === "Tools" ? "Tool Name" : 
                         selectedViewItem.category === "Materials" ? "Material Name" : 
                         selectedViewItem.category === "Components" ? "Component Name" :
                         "Part Name"}
                      </Label>
                      <p className="text-xl font-semibold">
                        {selectedViewItem.category === "Tools" 
                          ? formatToolName(selectedViewItem.materials_used, selectedViewItem.name)
                          : selectedViewItem.category === "Materials"
                          ? formatMaterialNameWithUnit(selectedViewItem.name)
                          : selectedViewItem.name
                        }
                      </p>
                    </div>
                    {/* Totals for Materials */}
                    {selectedViewItem?.category === "Materials" && materialViewAdditions.length > 0 && (() => {
                      const totalRemainingMm = materialViewAdditions.reduce((sum, add) => sum + add.remainingMm, 0);
                      const totalRemainingMeters = totalRemainingMm / 1000;
                      let totalKg = 0;
                      let totalValue = 0;
                      
                      if (materialProfile?.kg_per_meter) {
                        totalKg = totalRemainingMeters * materialProfile.kg_per_meter;
                      }
                      
                      materialViewAdditions.forEach((add: any) => {
                        if (add.price_unit === 'per_meter' && add.unit_price) {
                          totalValue += (add.remainingMm / 1000) * add.unit_price;
                        } else if (add.price_unit === 'per_kg' && add.unit_price && materialProfile?.kg_per_meter) {
                          const addMeters = add.remainingMm / 1000;
                          const addKg = addMeters * materialProfile.kg_per_meter;
                          totalValue += addKg * add.unit_price;
                        }
                      });
                      
                      const firstAddition = materialViewAdditions[0];
                      const firstSupplier = suppliers.find(s => s.id === firstAddition?.supplier_id);
                      const currency = firstSupplier?.currency || 'EUR';
                      
                      return (
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-right">
                          <div className="font-bold text-lg text-blue-900 dark:text-blue-100">
                            {totalKg > 0 ? `${totalKg.toFixed(2)} kg` : 'N/A'}
                          </div>
                          <div className="font-bold text-lg text-blue-900 dark:text-blue-100">
                            {totalValue > 0 ? `${getCurrencySymbol(currency)}${totalValue.toFixed(2)}` : 'N/A'}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {selectedViewItem.part_number && <div>
                      <Label className="text-sm font-medium text-muted-foreground">Part Number</Label>
                      <p className="text-lg font-medium">{selectedViewItem.part_number}</p>
                    </div>}
                  {selectedViewItem?.category !== "Materials" && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                      <p className="flex items-center gap-2 text-base">
                        <MapPin className="w-4 h-4" />
                        {selectedViewItem.location || "Not specified"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedViewItem?.description && selectedViewItem.description.trim() && selectedViewItem?.category !== "Materials" && <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">{selectedViewItem.description}</p>
                </div>}
              
              {/* Material Description - only if user entered something */}
              {selectedViewItem?.category === "Materials" && selectedViewItem?.description && selectedViewItem.description.trim() && <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">{selectedViewItem.description}</p>
                </div>}

              {/* Material Additions List */}
              {selectedViewItem?.category === "Materials" && (
                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                    <Package className="w-4 h-4" />
                    Stock Additions
                  </Label>
                  {materialViewAdditions.length === 0 ? (
                    <div className="p-4 bg-muted rounded-md text-center">
                      <p className="text-sm text-muted-foreground">No available stock additions</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                        {materialViewAdditions.map((add: any) => {
                          const supplierName = suppliers.find(s => s.id === add.supplier_id)?.name || 'N/A';
                          const isEditingLocation = editingLocationForAddition === add.id;
                          const remainingMeters = add.remainingMm / 1000;
                          let addKg = 0;
                          let addValue = 0;
                          
                          if (materialProfile?.kg_per_meter) {
                            addKg = remainingMeters * materialProfile.kg_per_meter;
                          }
                          
                          if (add.price_unit === 'per_meter' && add.unit_price) {
                            addValue = remainingMeters * add.unit_price;
                          } else if (add.price_unit === 'per_kg' && add.unit_price && addKg > 0) {
                            addValue = addKg * add.unit_price;
                          }
                          
                          const supplier = suppliers.find(s => s.id === add.supplier_id);
                          const currency = supplier?.currency || 'EUR';
                          
                          return (
                            <div
                              key={add.id}
                              className="p-3 border rounded-md"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Column 1: Basic Info */}
                                <div className="space-y-1">
                                  <div className="font-medium text-sm">
                                    {add.quantity_pieces} piece{add.quantity_pieces > 1 ? 's' : ''} × {add.length_mm}mm
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Total: {add.originalTotalMm.toFixed(0)}mm
                                  </div>
                                  <div className="text-sm font-medium text-green-600">
                                    Remaining: {add.remainingMm.toFixed(0)}mm
                                  </div>
                                  <div className="text-xs font-semibold text-blue-600">
                                    {addKg > 0 ? `${addKg.toFixed(2)} kg` : 'N/A'}
                                  </div>
                                  <div className="text-xs font-semibold text-blue-600">
                                    {addValue > 0 ? `${getCurrencySymbol(currency)}${addValue.toFixed(2)}` : 'N/A'}
                                  </div>
                                </div>
                                
                                {/* Column 2: Details */}
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  {supplierName !== 'N/A' && <div>Supplier: {supplierName}</div>}
                                  <div className="flex items-center gap-2">
                                    <span>Location:</span>
                                    {isEditingLocation ? (
                                      <div className="flex items-center gap-1">
                                        <Select
                                          value={newLocationValue}
                                          onValueChange={setNewLocationValue}
                                        >
                                          <SelectTrigger className="h-6 w-32 text-xs">
                                            <SelectValue placeholder="Select" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {stockLocations.map((loc) => (
                                              <SelectItem key={loc.id} value={loc.name}>
                                                {loc.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => handleUpdateAdditionLocation(add.id, newLocationValue)}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => {
                                            setEditingLocationForAddition(null);
                                            setNewLocationValue('');
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <span>{add.location || 'Not specified'}</span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 px-1 text-xs"
                                          onClick={() => {
                                            setEditingLocationForAddition(add.id);
                                            setNewLocationValue(add.location || '');
                                          }}
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  {add.unit_price && (
                                    <div>
                                      Price: {add.unit_price.toFixed(2)} /{add.price_unit === 'per_kg' ? 'kg' : 'm'}
                                    </div>
                                  )}
                                  <div>Added: {format(new Date(add.created_at), "MMM d, yyyy")}</div>
                                </div>
                                
                                {/* Column 3: Notes */}
                                <div className="text-xs text-muted-foreground">
                                  {add.notes && <div className="italic">Notes: {add.notes}</div>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Materials Used */}
              {selectedViewItem.materials_used && selectedViewItem.materials_used.length > 0 && <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Package className="w-4 h-4" />
                    Materials Used
                  </Label>
                  <div className="space-y-2">
                    {selectedViewItem.materials_used.filter((material: any) => material.name).map((material: any, index: number) => {
                      // Find the material item in inventory to get its stock quantity
                      const materialItem = inventoryItems.find((item: any) => 
                        item.category === "Materials" && item.name === material.name
                      );
                      const totalStockLength = materialItem ? (materialStockQuantities[materialItem.id] || 0) : 0;
                      
                      return (
                        <div key={index} className="p-3 bg-muted rounded-md">
                          <p className="font-medium">
                            {material.name}
                            {material.lengthPerPiece && parseFloat(material.lengthPerPiece) > 0 && (
                              <span className="text-muted-foreground"> --- {parseFloat(material.lengthPerPiece).toFixed(2)} mm</span>
                            )}
                            {totalStockLength > 0 && (
                              <span className="text-blue-600"> ({totalStockLength.toFixed(0)} mm in stock)</span>
                            )}
                          </p>
                          {material.notes && <p className="text-sm text-muted-foreground mt-1">{material.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>}

              {/* Tools Used */}
              {selectedViewItem.tools_used && selectedViewItem.tools_used.length > 0 && <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Wrench className="w-4 h-4" />
                    Tools Used
                  </Label>
                  <div className="space-y-2">
                     {selectedViewItem.tools_used.filter((tool: any) => tool.name).map((tool: any, index: number) => <div key={index} className="p-3 bg-muted rounded-md">
                        <p className="font-medium">{tool.name}</p>
                        {tool.notes && <p className="text-sm text-muted-foreground mt-1">{tool.notes}</p>}
                      </div>)}
                  </div>
                </div>}

              {/* Files */}
              {selectedViewItem.drawings_files && selectedViewItem.drawings_files.length > 0 && <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <FileText className="w-4 h-4" />
                    Files
                  </Label>
                  <div className="space-y-2">
                    {selectedViewItem.drawings_files.map((file: any, index: number) => <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted rounded-md">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="font-medium break-words">{file.name}</span>
                            <span className="text-xs text-muted-foreground block sm:inline sm:ml-2">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="flex-shrink-0 w-full sm:w-auto" onClick={async () => {
                  try {
                    // Fetch the file and create a blob URL for download
                    const response = await fetch(file.url);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = file.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Clean up the blob URL
                    URL.revokeObjectURL(blobUrl);
                  } catch (error) {
                    console.error('Download failed:', error);
                    // Fallback to original method
                    const link = document.createElement('a');
                    link.href = file.url;
                    link.download = file.name;
                    link.target = '_blank';
                    link.click();
                  }
                }}>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>)}
                  </div>
                </div>}
            </div>}
            
            {/* Action Buttons: History, Status, Calculator, Delete */}
            {selectedViewItem && (
              <div className="pt-4 mt-6 flex flex-wrap gap-2">
                {selectedViewItem.category !== "Materials" && selectedViewItem.category !== "Components" && (
                  <Button variant="outline" size="sm" onClick={() => handleViewHistory(selectedViewItem)}>
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                )}
                {selectedViewItem.category === "Materials" && (
                  <Button variant="outline" size="sm" onClick={() => { setSelectedMaterialForHistory(selectedViewItem); setIsMaterialHistoryDialogOpen(true); }}>
                    <Clock className="h-4 w-4 mr-2" />
                    History
                  </Button>
                )}
                {selectedViewItem.category === "Parts" && !isCustomerUser() && (
                  <Button variant="outline" size="sm" onClick={() => { setSelectedItemForPartRequests(selectedViewItem); setIsPartRequestsDialogOpen(true); }}>
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Requests
                  </Button>
                )}
                {selectedViewItem.category !== "Materials" && selectedViewItem.category !== "Components" && (
                  <Button variant="outline" size="sm" onClick={() => { setSelectedItemForProductionStatus(selectedViewItem); setIsProductionStatusDialogOpen(true); }}>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Status
                  </Button>
                )}
                {selectedViewItem.category !== "Materials" && selectedViewItem.category !== "Components" && (
                  <Button variant="outline" size="sm" onClick={() => { setSelectedItemForWorkOrder(selectedViewItem); setIsViewDialogOpen(false); setIsWorkOrderDialogOpen(true); }}>
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Work Order
                  </Button>
                )}
                {selectedViewItem.category === "Parts" && canSeePrices() && (
                  <Button variant="outline" size="sm" onClick={() => { setSelectedPartForPriceCalculator(selectedViewItem); setIsPriceCalculatorDialogOpen(true); }}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculator
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Item</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{selectedViewItem.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { handleDeleteInventoryItem(selectedViewItem.id); setIsViewDialogOpen(false); }}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            
            {/* Cancel Button */}
            <div className="pt-4 mt-6">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsViewDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Tool Management Dialog */}
      <ToolManagementDialog 
        open={isToolManagementDialogOpen}
        onOpenChange={setIsToolManagementDialogOpen}
      />

      {/* Material Management Dialog */}
      <MaterialManagementDialog 
        open={isMaterialManagementDialogOpen}
        onOpenChange={(open) => {
          setIsMaterialManagementDialogOpen(open);
          // Refresh shapes when dialog closes to get updated images
          if (!open) {
            fetchShapes();
          }
        }}
      />

      {/* Material Adjustment Dialog */}
      <MaterialAdjustmentDialog
        isOpen={isMaterialAdjustmentDialogOpen}
        onClose={() => setIsMaterialAdjustmentDialogOpen(false)}
        material={selectedMaterialForAdjustment}
        onSuccess={() => {
          // Refresh inventory items
          fetchInventoryItems();
        }}
      />
      <ComponentAdjustmentDialog
        isOpen={isComponentAdjustmentDialogOpen}
        onClose={() => setIsComponentAdjustmentDialogOpen(false)}
        component={selectedComponentForAdjustment}
        initialType={componentAdjustmentType}
        onSuccess={() => {
          // Refresh inventory items
          fetchInventoryItems();
        }}
      />

      {/* Material History Dialog */}
      <MaterialHistoryDialog
        isOpen={isMaterialHistoryDialogOpen}
        onClose={() => setIsMaterialHistoryDialogOpen(false)}
        material={selectedMaterialForHistory}
      />

      {/* Material Reorder Dialog */}
      <MaterialReorderDialog
        isOpen={isMaterialReorderDialogOpen}
        onClose={() => setIsMaterialReorderDialogOpen(false)}
        material={selectedMaterialForReorder}
        onSuccess={() => {
          // Refresh inventory items and reorders
          fetchInventoryItems();
        }}
      />

      {/* Material Reorder Summary Dialog */}
      <MaterialReorderSummaryDialog
        isOpen={isMaterialReorderSummaryDialogOpen}
        onClose={() => setIsMaterialReorderSummaryDialogOpen(false)}
      />

      {/* Price Calculator Dialog */}
      <PriceCalculatorDialog
        isOpen={isPriceCalculatorDialogOpen}
        onClose={() => {
          setIsPriceCalculatorDialogOpen(false);
          setSelectedPartForPriceCalculator(null);
        }}
        part={selectedPartForPriceCalculator}
        onSuccess={() => {
          fetchInventoryItems();
        }}
      />
      
      {/* Duplicate Warning Dialog */}
      <DuplicateWarningDialog
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
        duplicateItem={duplicateItem}
        onSaveAnyway={pendingSaveAction ? async () => {
          setIsDuplicateDialogOpen(false);
          if (pendingSaveAction) {
            await pendingSaveAction();
            setPendingSaveAction(null);
          }
        } : undefined}
      />
    </div>
  );
}