import { useState, useEffect } from "react";
import { Plus, Search, Package, AlertTriangle, Wrench, Trash2, Settings, Cog, Upload, X, Edit, MapPin, Building2, ClipboardList, Users, History, FileText, Calendar, Clock, Eye, Download, Circle, Square, Hexagon, Cylinder, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { resizeImageFile, validateImageFile } from "@/lib/imageUtils";
import PartHistoryDialog from "@/components/PartHistoryDialog";
import { MaterialForm, MaterialData } from "@/components/MaterialForm";
import { ProductionStatusDialog } from "@/components/ProductionStatusDialog";
import { format } from "date-fns";
export default function Inventory() {
  const {
    toast
  } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [currentCategory, setCurrentCategory] = useState("Parts");
  const [formData, setFormData] = useState({
    part_number: "",
    name: "",
    description: "",
    quantity: "",
    unit_price: "",
    location: "",
    category: "Parts",
    customer_id: "",
    supplier_id: "",
    minimum_stock: "",
    photo: null as File | null
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isWorkOrderDialogOpen, setIsWorkOrderDialogOpen] = useState(false);
  const [selectedItemForWorkOrder, setSelectedItemForWorkOrder] = useState<any>(null);
  const [tools, setTools] = useState([{
    name: "",
    quantity: ""
  }]);
  const [operatorsAndMachines, setOperatorsAndMachines] = useState([{
    name: "",
    type: "operator"
  }]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [materialsUsed, setMaterialsUsed] = useState([{
    name: "",
    notes: ""
  }]);
  const [toolsUsed, setToolsUsed] = useState([{
    name: "",
    notes: ""
  }]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [toolsList, setToolsList] = useState<any[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState<any>(null);
  const [materialData, setMaterialData] = useState<MaterialData | null>(null);
  const [isProductionStatusDialogOpen, setIsProductionStatusDialogOpen] = useState(false);
  const [selectedItemForProductionStatus, setSelectedItemForProductionStatus] = useState<any>(null);
  useEffect(() => {
    fetchInventoryItems();
    fetchSuppliers();
    fetchCustomers();
    fetchStockLocations();
    fetchStaff();
    fetchMaterialsAndTools();
  }, []);
  const fetchInventoryItems = async () => {
    const {
      data
    } = await supabase.from('inventory').select('*');
    if (data) {
      const formattedItems = data.map(item => ({
        ...item,
        sku: `SKU-${item.id}`,
        currentQuantity: item.quantity,
        minimumQuantity: 5,
        // Default minimum
        unitOfMeasure: "pieces",
        unitCost: item.unit_price,
        image: item.photo_url || null
      }));
      setInventoryItems(formattedItems);
    }
  };
  const fetchSuppliers = async () => {
    const {
      data
    } = await supabase.from('suppliers').select('id, name');
    if (data) {
      setSuppliers(data);
    }
  };
  const fetchCustomers = async () => {
    const {
      data
    } = await supabase.from('customers').select('id, name');
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
      setStaff(data);
    }
  };
  const fetchMaterialsAndTools = async () => {
    const {
      data: materials
    } = await supabase.from('inventory').select('id, name, part_number').eq('category', 'Materials');
    const {
      data: tools
    } = await supabase.from('inventory').select('id, name, part_number').eq('category', 'Tools');
    if (materials) setMaterialsList(materials);
    if (tools) setToolsList(tools);
  };
  const handleDeleteInventoryItem = async (itemId: string) => {
    const {
      error
    } = await supabase.from('inventory').delete().eq('id', itemId);
    if (!error) {
      setInventoryItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Item Deleted",
        description: "The inventory item has been successfully deleted."
      });
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
      const resizedFile = await resizeImageFile(file, 400, 400);
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
      if (!materialData || !materialData.surfaceFinish || !materialData.shape || !materialData.material || !formData.quantity || !formData.unit_price) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required material fields.",
          variant: "destructive"
        });
        return;
      }
    } else if (!formData.name || !formData.quantity || !formData.unit_price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
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
    const itemName = currentCategory === "Materials" && materialData ? materialData.generatedName : formData.name;
    const {
      error
    } = await supabase.from('inventory').insert({
      part_number: formData.part_number,
      name: itemName,
      description: formData.description || null,
      quantity: parseInt(formData.quantity),
      unit_price: parseFloat(formData.unit_price),
      location: formData.location,
      category: formData.category,
      customer_id: formData.category === "Parts" ? (formData.customer_id || null) : null,
      supplier: formData.category !== "Parts" ? (suppliers.find(s => s.id === formData.supplier_id)?.name || null) : null,
      minimum_stock: formData.category === "Machines" ? 0 : (parseInt(formData.minimum_stock) || 0),
      photo_url: photoUrl,
      materials_used: currentCategory === "Materials" && materialData ? {
        surfaceFinish: materialData.surfaceFinish,
        shape: materialData.shape,
        material: materialData.material,
        dimensions: materialData.dimensions,
        priceUnit: materialData.priceUnit
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
        location: "",
        category: currentCategory,
        customer_id: "",
        supplier_id: "",
        minimum_stock: "",
        photo: null
      });
      setPhotoPreview(null);
      setMaterialData(null);
      setIsAddDialogOpen(false);
      fetchInventoryItems();
      toast({
        title: "Item Added",
        description: "The inventory item has been successfully added."
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleOpenAddDialog = (category: string) => {
    setCurrentCategory(category);
    setFormData(prev => ({
      ...prev,
      category
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
      location: item.location || "",
      category: item.category,
      customer_id: item.customer_id || "",
      supplier_id: item.supplier ? (suppliers.find(s => s.name === item.supplier)?.id || "") : "",
      minimum_stock: item.minimum_stock?.toString() || "",
      photo: null
    });

    // For materials, parse the structured data from materials_used
    if (item?.category === "Materials" && item.materials_used) {
      const materialInfo = item.materials_used;
      setMaterialData({
        surfaceFinish: materialInfo.surfaceFinish || "",
        shape: materialInfo.shape || "",
        material: materialInfo.material || "",
        dimensions: materialInfo.dimensions || {},
        generatedName: item.name,
        priceUnit: materialInfo.priceUnit || "per_meter"
      });
    } else {
      // Reset material data for non-materials
      setMaterialData(null);
    }
    if (item.photo_url) {
      setPhotoPreview(item.photo_url);
    }

    // Populate materials used
    if (item.materials_used && Array.isArray(item.materials_used)) {
      setMaterialsUsed(item.materials_used);
    } else {
      setMaterialsUsed([{
        name: "",
        notes: ""
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

    // Populate uploaded files
    if (item.drawings_files && Array.isArray(item.drawings_files)) {
      setUploadedFiles(item.drawings_files);
    } else {
      setUploadedFiles([]);
    }
    setIsEditDialogOpen(true);
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
    } else if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Item name is required",
        variant: "destructive"
      });
      return;
    }
    setIsUploading(true);
    try {
      let photoUrl = editingItem.photo_url;

      // Upload new photo if selected
      if (formData.photo) {
        photoUrl = await uploadPhoto(formData.photo);
      }
      const itemName = editingItem?.category === "Materials" && materialData ? materialData.generatedName : formData.name;
      const {
        error
      } = await supabase.from('inventory').update({
        part_number: formData.part_number,
        name: itemName,
        description: editingItem?.category === "Materials" ? formData.description || null : formData.description,
        quantity: parseInt(formData.quantity) || 0,
        unit_price: parseFloat(formData.unit_price) || 0,
        location: formData.location,
        category: formData.category,
        customer_id: formData.category === "Parts" ? (formData.customer_id || null) : null,
        supplier: formData.category !== "Parts" ? (suppliers.find(s => s.id === formData.supplier_id)?.name || null) : null,
        minimum_stock: formData.category === "Machines" ? 0 : (parseInt(formData.minimum_stock) || 0),
        photo_url: photoUrl,
        materials_used: editingItem?.category === "Materials" && materialData ? {
          surfaceFinish: materialData.surfaceFinish,
          shape: materialData.shape,
          material: materialData.material,
          dimensions: materialData.dimensions,
          priceUnit: materialData.priceUnit
        } : materialsUsed.filter(m => m.name),
        tools_used: toolsUsed.filter(t => t.name),
        drawings_files: uploadedFiles
      }).eq('id', editingItem.id);
      if (error) throw error;
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
        location: "",
        category: "Parts",
        customer_id: "",
        supplier_id: "",
        minimum_stock: "",
        photo: null
      });
      setPhotoPreview(null);
      setEditingItem(null);
      setMaterialsUsed([{
        name: "",
        notes: ""
      }]);
      setToolsUsed([{
        name: "",
        notes: ""
      }]);
      setUploadedFiles([]);
      setMaterialData(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  const getFilteredItems = (category: string) => {
    return inventoryItems.filter(item => item && item?.category === category && item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Parts":
        return Package;
      case "Materials":
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
  const getMaterialShapeIcon = (shape: string) => {
    if (shape?.includes("Round")) return Circle;
    if (shape?.includes("Square")) return Square;
    if (shape?.includes("Hex")) return Hexagon;
    if (shape?.includes("Rectangular")) return Square;
    if (shape?.includes("tube")) return Cylinder;
    if (shape?.includes("Sheet")) return Square;
    return Circle;
  };
  const calculateMaterialWeight = (materialInfo: any) => {
    if (!materialInfo?.material || !materialInfo?.dimensions) return 0;

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

      // 1. Created in system
      historyEntries.push({
        date: format(new Date(item.created_at), 'dd/MM/yyyy'),
        time: format(new Date(item.created_at), 'HH:mm'),
        activity: 'Created in system',
        details: `Initial quantity: ${item.quantity}`,
        reference: item.id
      });

      // 2. Work orders for this part (using inventory_id foreign key)
      const {
        data: workOrders
      } = await supabase.from('work_orders').select('*').eq('inventory_id', item.id);
      if (workOrders) {
        workOrders.forEach(wo => {
          historyEntries.push({
            date: format(new Date(wo.created_at), 'dd/MM/yyyy'),
            time: format(new Date(wo.created_at), 'HH:mm'),
            activity: 'Work Order Created',
            details: wo.title,
            reference: `WO-${wo.id.slice(-8)}`
          });
          if (wo.status === 'completed') {
            historyEntries.push({
              date: format(new Date(wo.updated_at), 'dd/MM/yyyy'),
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
              date: format(new Date(invoiceItem.invoices.issue_date), 'dd/MM/yyyy'),
              time: '09:00',
              // Default time since we don't have time in date field
              activity: 'Sold',
              details: `Quantity: ${invoiceItem.quantity}, Unit Price: €${invoiceItem.unit_price}`,
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
  return <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track materials, tools, and stock levels
          </p>
        </div>
        <Button onClick={() => handleOpenAddDialog(currentCategory)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Raw Materials</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryItems.length}</div>
            <p className="text-xs text-muted-foreground">
              ${totalValue.toLocaleString()} value
            </p>
          </CardContent>
        </Card>

        

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {allLowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">
              items need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              complete inventory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="Parts" className="space-y-4" onValueChange={setCurrentCategory}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="Parts">Parts</TabsTrigger>
          <TabsTrigger value="Materials">Materials</TabsTrigger>
          <TabsTrigger value="Tools">Tools</TabsTrigger>
          <TabsTrigger value="Machines">Machines</TabsTrigger>
        </TabsList>

        {["Parts", "Materials", "Tools", "Machines"].map(category => {
        const CategoryIcon = getCategoryIcon(category);
        const filteredItems = getFilteredItems(category);
        return <TabsContent key={category} value={category} className="space-y-4">
              {/* Search and Add */}
              <div className="flex items-center justify-between space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder={`Search ${category.toLowerCase()}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Button onClick={() => handleOpenAddDialog(category)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add {category.slice(0, -1)}
                </Button>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {filteredItems.length > 0 ? filteredItems.map(item => item &&
            // Add null check for the entire item
            <Card key={item.id} className={`${category === "Materials" ? "h-[90px]" : "h-40"} hover:shadow-md transition-shadow cursor-pointer ${
              item.quantity <= (item.minimum_stock || 0) ? 'border-destructive bg-destructive/5' : ''
            }`} onClick={() => {
              setSelectedViewItem(item);
              setIsViewDialogOpen(true);
            }}>
                       <CardContent className="p-4 h-full">
                         <div className="flex h-full gap-4">
                           {/* Material Shape Icon or Regular Image */}
                             {item?.category === "Materials" ? (() => {
                    const materialInfo = item.materials_used || {};
                    const ShapeIcon = getMaterialShapeIcon(materialInfo?.shape);
                    const color = getMaterialColor(materialInfo?.material);
                    return <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                                    <ShapeIcon className="w-10 h-10" style={{
                        color
                      }} />
                                  </div>;
                  })() : <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                               {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <CategoryIcon className="w-12 h-12 text-muted-foreground" />}
                             </div>}
                           
                           {/* Content */}
                           <div className="flex-1 flex flex-col justify-between min-w-0">
                             <div className="space-y-2">
                               <div className="flex items-start justify-between">
                                 <div className="min-w-0 flex-1">
                                   <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                                    {item.part_number && item?.category !== "Materials" && <p className="text-sm text-muted-foreground font-medium">Part #: {item.part_number}</p>}
                                    {item.production_status && <p className="text-sm text-black font-medium">{item.production_status}</p>}
                                 </div>
                                 <AlertDialog>
                                   <div className="flex gap-1 ml-2">
                                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={e => {
                              e.stopPropagation();
                              setSelectedViewItem(item);
                              setIsViewDialogOpen(true);
                            }} title="View Details">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                       <Button variant="outline" size="icon" className="h-8 w-8" onClick={e => {
                               e.stopPropagation();
                               handleViewHistory(item);
                             }} title="View History">
                                         <History className="h-4 w-4" />
                                       </Button>
                                       <Button variant="outline" size="icon" className="h-8 w-8" onClick={e => {
                               e.stopPropagation();
                               setSelectedItemForProductionStatus(item);
                               setIsProductionStatusDialogOpen(true);
                             }} title="Production Status">
                                         <PlayCircle className="h-4 w-4" />
                                       </Button>
                                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={e => {
                              e.stopPropagation();
                              setSelectedItemForWorkOrder(item);
                              setTools([{
                                name: "",
                                quantity: ""
                              }]);
                              setOperatorsAndMachines([{
                                name: "",
                                type: "operator"
                              }]);
                              setIsWorkOrderDialogOpen(true);
                            }} title="Create Work Order">
                                        <ClipboardList className="h-4 w-4" />
                                      </Button>
                                     <Button variant="outline" size="icon" className="h-8 w-8" onClick={e => {
                              e.stopPropagation();
                              handleOpenEditDialog(item);
                            }}>
                                       <Edit className="h-4 w-4" />
                                     </Button>
                                     <AlertDialogTrigger asChild>
                                       <Button variant="destructive" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                                         <Trash2 className="h-4 w-4" />
                                       </Button>
                                     </AlertDialogTrigger>
                                  </div>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteInventoryItem(item.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                               </div>
                             </div>
                            
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                  {item?.category === "Materials" ? (() => {
                          const materialInfo = item.materials_used || {};
                          const quantity = formatMaterialQuantity(materialInfo, item.quantity);
                          const weight = calculateMaterialWeight(materialInfo);
                          const priceUnit = materialInfo.priceUnit === 'per_kg' ? 'kg' : 'm';
                          return <>
                                           <Badge variant={item.quantity <= (item.minimum_stock || 0) ? "destructive" : "secondary"}>
                                             {quantity}
                                           </Badge>
                                          {weight > 0 && <span className="text-sm text-muted-foreground">
                                              {weight.toFixed(1)} kg
                                            </span>}
                                           <span className="font-semibold text-lg">${item.unit_price.toFixed(2)}/{priceUnit}</span>
                                            <span className="text-sm text-muted-foreground ml-2">
                                              (Total: ${(materialInfo.priceUnit === 'per_kg' ? weight * item.unit_price : item.quantity * item.unit_price).toFixed(2)})
                                            </span>
                                        </>;
                        })() : <>
                                      <Badge variant={item.quantity <= (item.minimum_stock || 0) ? "destructive" : "secondary"}>
                                        {item.quantity} pcs
                                      </Badge>
                                     <span className="font-semibold text-lg">${item.unit_price}</span>
                                   </>}
                               </div>
                              
                                <div className="text-xs text-muted-foreground text-right space-y-1">
                                  {item.customer_id && item.category === "Parts" && <div className="flex items-center justify-end gap-1">
                                      <Users className="h-3 w-3 text-gray-400" />
                                      <span>{customers.find(c => c.id === item.customer_id)?.name}</span>
                                    </div>}
                                  {item.supplier && item.category !== "Parts" && <div className="flex items-center justify-end gap-1">
                                      <Building2 className="h-3 w-3 text-gray-400" />
                                      <span>{item.supplier}</span>
                                    </div>}
                                  {item.location && <div className="flex items-center justify-end gap-1">
                                      <MapPin className="h-3 w-3 text-gray-400" />
                                      <span>{item.location}</span>
                                    </div>}
                                </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                     </Card>) : <div className="text-center py-12">
                    <CategoryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No {category.toLowerCase()} found</p>
                    <Button variant="outline" onClick={() => handleOpenAddDialog(category)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First {category.slice(0, -1)}
                    </Button>
                  </div>}
              </div>
            </TabsContent>;
      })}
      </Tabs>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New {currentCategory.slice(0, -1)}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {currentCategory === "Parts" && <div className="grid gap-2">
                <Label htmlFor="part_number">Part Number</Label>
                <Input id="part_number" value={formData.part_number} onChange={e => setFormData(prev => ({
              ...prev,
              part_number: e.target.value
            }))} placeholder="Enter part number" />
              </div>}
            {currentCategory === "Materials" ? <MaterialForm onMaterialChange={setMaterialData} initialData={materialData || undefined} /> : <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
              ...prev,
              name: e.target.value
            }))} placeholder="Enter item name" />
              </div>}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={e => setFormData(prev => ({
              ...prev,
              description: e.target.value
            }))} placeholder="Enter item description" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input id="quantity" type="number" value={formData.quantity} onChange={e => setFormData(prev => ({
                ...prev,
                quantity: e.target.value
              }))} placeholder="0" />
              </div>
              {formData.category !== "Machines" && (
                <div className="grid gap-2">
                  <Label htmlFor="minimum_stock">Min Stock Level</Label>
                  <Input id="minimum_stock" type="number" value={formData.minimum_stock || ''} onChange={e => setFormData(prev => ({
                  ...prev,
                  minimum_stock: e.target.value
                }))} placeholder="0" />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="unit_price">Unit Price *</Label>
                <Input id="unit_price" type="number" step="0.01" value={formData.unit_price} onChange={e => setFormData(prev => ({
                ...prev,
                unit_price: e.target.value
              }))} placeholder="0.00" />
              </div>
            </div>
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
            {currentCategory === "Parts" ? (
              <div className="grid gap-2">
                <Label htmlFor="customer">Customer</Label>
                <Select value={formData.customer_id} onValueChange={value => setFormData(prev => ({
                ...prev,
                customer_id: value
              }))}>
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
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select value={formData.supplier_id} onValueChange={value => setFormData(prev => ({
                ...prev,
                supplier_id: value
              }))}>
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
            {formData.category !== "Materials" && <div className="grid gap-2">
                <Label htmlFor="photo">Photo</Label>
                <div className="space-y-2">
                  {photoPreview ? <div className="relative">
                      <img src={photoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
                      <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={handleRemovePhoto}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div> : <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">Click to upload photo</p>
                      <Input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                      <Label htmlFor="photo" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>Choose File</span>
                        </Button>
                      </Label>
                    </div>}
                </div>
              </div>}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
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
            {editingItem?.category === "Parts" && <div className="grid gap-2">
                <Label htmlFor="edit_part_number">Part Number</Label>
                <Input id="edit_part_number" value={formData.part_number} onChange={e => setFormData(prev => ({
              ...prev,
              part_number: e.target.value
            }))} placeholder="Enter part number" />
              </div>}
            {editingItem?.category === "Materials" ? <MaterialForm onMaterialChange={setMaterialData} initialData={materialData || undefined} /> : <div className="grid gap-2">
                <Label htmlFor="edit_name">Name *</Label>
                <Input id="edit_name" value={formData.name} onChange={e => setFormData(prev => ({
              ...prev,
              name: e.target.value
            }))} placeholder="Enter item name" />
              </div>}
            <div className="grid gap-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea id="edit_description" value={formData.description} onChange={e => setFormData(prev => ({
              ...prev,
              description: e.target.value
            }))} placeholder="Enter description" rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_quantity">Quantity *</Label>
                <Input id="edit_quantity" type="number" value={formData.quantity} onChange={e => setFormData(prev => ({
                ...prev,
                quantity: e.target.value
              }))} placeholder="0" />
              </div>
              {formData.category !== "Machines" && (
                <div className="grid gap-2">
                  <Label htmlFor="edit_minimum_stock">Min Stock Level</Label>
                  <Input id="edit_minimum_stock" type="number" value={formData.minimum_stock || ''} onChange={e => setFormData(prev => ({
                  ...prev,
                  minimum_stock: e.target.value
                }))} placeholder="0" />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="edit_unit_price">Unit Price *</Label>
                <Input id="edit_unit_price" type="number" step="0.01" value={formData.unit_price} onChange={e => setFormData(prev => ({
                ...prev,
                unit_price: e.target.value
              }))} placeholder="0.00" />
              </div>
            </div>
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
            {editingItem?.category === "Parts" ? (
              <div className="grid gap-2">
                <Label htmlFor="edit_customer">Customer</Label>
                <Select value={formData.customer_id} onValueChange={value => setFormData(prev => ({
                ...prev,
                customer_id: value
              }))}>
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
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="edit_supplier">Supplier</Label>
                <Select value={formData.supplier_id} onValueChange={value => setFormData(prev => ({
                ...prev,
                supplier_id: value
              }))}>
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
            {formData.category !== "Materials" && <div className="grid gap-2">
                <Label htmlFor="edit_photo">Photo</Label>
                <div className="space-y-2">
                  {photoPreview ? <div className="relative">
                      <img src={photoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
                      <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={handleRemovePhoto}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div> : <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">Click to upload photo</p>
                      <Input id="edit_photo" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                      <Label htmlFor="edit_photo" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>Choose File</span>
                        </Button>
                      </Label>
                    </div>}
                </div>
              </div>}
            
            {editingItem?.category === "Parts" && <>
                {/* Materials Used Section */}
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4" />
                    Materials Used
                  </Label>
                  <div className="space-y-3">
                    {materialsUsed.map((material, index) => <div key={index} className="space-y-2">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select value={material.name} onValueChange={value => {
                        const newMaterials = [...materialsUsed];
                        newMaterials[index].name = value;
                        setMaterialsUsed(newMaterials);
                      }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                              <SelectContent>
                                {materialsList.map(item => <SelectItem key={item.id} value={item.name}>
                                    {item.name} {item.part_number && `(${item.part_number})`}
                                  </SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => {
                      if (materialsUsed.length > 1) {
                        setMaterialsUsed(materialsUsed.filter((_, i) => i !== index));
                      }
                    }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input placeholder="Material notes (optional)" value={material.notes} onChange={e => {
                    const newMaterials = [...materialsUsed];
                    newMaterials[index].notes = e.target.value;
                    setMaterialsUsed(newMaterials);
                  }} className="text-sm" />
                      </div>)}
                    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setMaterialsUsed([...materialsUsed, {
                  name: "",
                  notes: ""
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
                    {toolsUsed.map((tool, index) => <div key={index} className="space-y-2">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select value={tool.name} onValueChange={value => {
                        const newTools = [...toolsUsed];
                        newTools[index].name = value;
                        setToolsUsed(newTools);
                      }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tool" />
                              </SelectTrigger>
                              <SelectContent>
                                {toolsList.map(item => <SelectItem key={item.id} value={item.name}>
                                    {item.name} {item.part_number && `(${item.part_number})`}
                                  </SelectItem>)}
                              </SelectContent>
                            </Select>
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
                      </div>)}
                    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setToolsUsed([...toolsUsed, {
                  name: "",
                  notes: ""
                }])}>
                      <Plus className="w-4 h-4" />
                      Add Tool
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
              notes: ""
            }]);
            setToolsUsed([{
              name: "",
              notes: ""
            }]);
            setUploadedFiles([]);
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
      <Dialog open={isWorkOrderDialogOpen} onOpenChange={setIsWorkOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Work Order for {selectedItemForWorkOrder?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wo_partName">Part Name</Label>
                <Input id="wo_partName" value={selectedItemForWorkOrder?.name || ""} readOnly className="bg-muted" />
              </div>
              <div>
                <Label htmlFor="wo_partNumber">Part Number</Label>
                <Input id="wo_partNumber" value={selectedItemForWorkOrder?.part_number || ""} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wo_quantity">Quantity</Label>
                <Input id="wo_quantity" type="number" placeholder="0" />
              </div>
              <div>
                <Label htmlFor="wo_priority">Priority</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wo_productionTime">Production Time</Label>
                <Input id="wo_productionTime" placeholder="e.g. 3.5 hours" />
              </div>
              <div>
                <Label htmlFor="wo_dueDate">Due Date</Label>
                <Input id="wo_dueDate" type="date" />
              </div>
            </div>

            <div>
              <Label htmlFor="wo_description">Description</Label>
              <Textarea id="wo_description" placeholder="Part description..." rows={3} defaultValue={selectedItemForWorkOrder?.description || ""} />
            </div>

            <div>
              <Label htmlFor="wo_setupInstructions">Setup Instructions</Label>
              <Textarea id="wo_setupInstructions" placeholder="Setup instructions for this work order..." rows={3} />
            </div>

            <div>
              <Label htmlFor="wo_qualityRequirements">Quality Requirements</Label>
              <Textarea id="wo_qualityRequirements" placeholder="Quality requirements and tolerances..." rows={3} />
            </div>

            <div>
              <Label htmlFor="wo_productionNotes">Production Notes</Label>
              <Textarea id="wo_productionNotes" placeholder="Production notes and requirements..." rows={3} />
            </div>

            {/* Tools Section */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4" />
                Tools Required
              </Label>
              <div className="space-y-3">
                {tools.map((tool, index) => <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={tool.name} onValueChange={value => {
                    const newTools = [...tools];
                    newTools[index].name = value;
                    setTools(newTools);
                  }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tool" />
                        </SelectTrigger>
                        <SelectContent>
                          {["CNC Mill", "Drill Press", "Precision Vise", "Laser Cutter", "Press Brake", "Precision Lathe", "CMM Machine", "Carbide Inserts", "5-Axis CNC Mill", "Boring Bar Set", "Go/No-Go Gauges", "Horizontal Boring Machine", "Carbide Tooling Set", "Surface Finish Gauge"].map(toolName => <SelectItem key={toolName} value={toolName}>
                              {toolName}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input type="number" placeholder="Qty" value={tool.quantity} onChange={e => {
                    const newTools = [...tools];
                    newTools[index].quantity = e.target.value;
                    setTools(newTools);
                  }} />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                  if (tools.length > 1) {
                    setTools(tools.filter((_, i) => i !== index));
                  }
                }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>)}
                <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setTools([...tools, {
                name: "",
                quantity: ""
              }])}>
                  <Plus className="w-4 h-4" />
                  Add Tool
                </Button>
              </div>
            </div>

            {/* Operators and Machines Section */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" />
                Operators & Machines
              </Label>
              <div className="space-y-3">
                {operatorsAndMachines.map((item, index) => <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={item.name} onValueChange={value => {
                    const newItems = [...operatorsAndMachines];
                    newItems[index].name = value;
                    setOperatorsAndMachines(newItems);
                  }}>
                        <SelectTrigger>
                          <SelectValue placeholder={item.type === "operator" ? "Select operator" : "Select machine"} />
                        </SelectTrigger>
                        <SelectContent>
                          {item.type === "operator" ? staff.map(staffMember => <SelectItem key={staffMember.id} value={staffMember.name}>
                                {staffMember.name} - {staffMember.position}
                              </SelectItem>) : ["CNC Machine #1", "CNC Machine #2", "CNC Machine #3", "Laser Cutting Machine #1", "CNC Lathe #2", "5-Axis CNC Machine #1", "Horizontal Boring Machine #2"].map(machine => <SelectItem key={machine} value={machine}>
                                {machine}
                              </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Select value={item.type} onValueChange={value => {
                    const newItems = [...operatorsAndMachines];
                    newItems[index].type = value as "operator" | "machine";
                    newItems[index].name = ""; // Clear selection when type changes
                    setOperatorsAndMachines(newItems);
                  }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operator">Operator</SelectItem>
                          <SelectItem value="machine">Machine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                  if (operatorsAndMachines.length > 1) {
                    setOperatorsAndMachines(operatorsAndMachines.filter((_, i) => i !== index));
                  }
                }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>)}
                <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setOperatorsAndMachines([...operatorsAndMachines, {
                name: "",
                type: "operator"
              }])}>
                  <Plus className="w-4 h-4" />
                  Add Operator/Machine
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsWorkOrderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={async () => {
              const partName = selectedItemForWorkOrder?.name;
              const partNumber = selectedItemForWorkOrder?.part_number;
              const quantity = (document.getElementById('wo_quantity') as HTMLInputElement)?.value;
              const productionTime = (document.getElementById('wo_productionTime') as HTMLInputElement)?.value;
              const dueDate = (document.getElementById('wo_dueDate') as HTMLInputElement)?.value;
              const description = (document.getElementById('wo_description') as HTMLTextAreaElement)?.value;
              if (!partName || !description) {
                toast({
                  title: "Error",
                  description: "Please fill in required fields",
                  variant: "destructive"
                });
                return;
              }

              // Generate work order number
              const {
                data: workOrderNumber,
                error: numberError
              } = await supabase.rpc('generate_work_order_number');
              if (numberError) {
                toast({
                  title: "Error",
                  description: "Failed to generate work order number",
                  variant: "destructive"
                });
                return;
              }
              const {
                data,
                error
              } = await supabase.from('work_orders').insert([{
                title: workOrderNumber,
                work_order_number: workOrderNumber,
                description: description,
                estimated_hours: productionTime ? parseFloat(productionTime) : null,
                due_date: dueDate || null,
                priority: 'medium',
                status: 'pending',
                inventory_id: selectedItemForWorkOrder?.id,
                part_name: partName,
                part_number: partNumber
              }]).select();
              if (error) {
                toast({
                  title: "Error",
                  description: "Failed to create work order",
                  variant: "destructive"
                });
              } else {
                setIsWorkOrderDialogOpen(false);
                toast({
                  title: "Work Order Created",
                  description: `Work order ${workOrderNumber} created for ${partName}`
                });
              }
            }}>
                Create Work Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {selectedViewItem?.category === "Materials" ? "Material Details" : "Part Details"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedViewItem && <div className="space-y-6">
              {/* Photo and Basic Info */}
              <div className="flex gap-6">
                {selectedViewItem?.category !== "Materials" && <div className="w-48 h-48 bg-muted rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    {selectedViewItem.photo_url ? <img src={selectedViewItem.photo_url} alt={selectedViewItem.name} className="w-full h-full object-cover" /> : <Package className="w-16 h-16 text-muted-foreground" />}
                  </div>}
                <div className="flex-1 space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Part Name</Label>
                    <p className="text-xl font-semibold">{selectedViewItem.name}</p>
                  </div>
                  {selectedViewItem.part_number && <div>
                      <Label className="text-sm font-medium text-muted-foreground">Part Number</Label>
                      <p className="text-lg font-medium">{selectedViewItem.part_number}</p>
                    </div>}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                    <p className="flex items-center gap-2 text-base">
                      <MapPin className="w-4 h-4" />
                      {selectedViewItem.location || "Not specified"}
                    </p>
                  </div>
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

              {/* Materials Used */}
              {selectedViewItem.materials_used && selectedViewItem.materials_used.length > 0 && <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Package className="w-4 h-4" />
                    Materials Used
                  </Label>
                  <div className="space-y-2">
                    {selectedViewItem.materials_used.filter((material: any) => material.name).map((material: any, index: number) => <div key={index} className="p-3 bg-muted rounded-md">
                        <p className="font-medium">{material.name}</p>
                        {material.notes && <p className="text-sm text-muted-foreground mt-1">{material.notes}</p>}
                      </div>)}
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
                    {selectedViewItem.drawings_files.map((file: any, index: number) => <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="font-medium">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={async () => {
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
        </DialogContent>
      </Dialog>
    </div>;
}