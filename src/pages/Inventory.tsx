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
  const { toast } = useToast();
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
    supplier: "",
    photo: null as File | null
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isWorkOrderDialogOpen, setIsWorkOrderDialogOpen] = useState(false);
  const [selectedItemForWorkOrder, setSelectedItemForWorkOrder] = useState<any>(null);
  const [tools, setTools] = useState([{ name: "", quantity: "" }]);
  const [operatorsAndMachines, setOperatorsAndMachines] = useState([{ name: "", type: "operator" }]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [materialsUsed, setMaterialsUsed] = useState([{ name: "", notes: "" }]);
  const [toolsUsed, setToolsUsed] = useState([{ name: "", notes: "" }]);
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
    const { data } = await supabase.from('inventory').select('*');
    if (data) {
      const formattedItems = data.map(item => ({
        ...item,
        sku: `SKU-${item.id}`,
        currentQuantity: item.quantity,
        minimumQuantity: 5,
        unitOfMeasure: "pieces",
        unitCost: item.unit_price,
        image: item.photo_url || null
      }));
      setInventoryItems(formattedItems);
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*');
    if (data) setSuppliers(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*');
    if (data) setCustomers(data);
  };

  const fetchStockLocations = async () => {
    const { data } = await supabase.from('stock_locations').select('*').eq('is_active', true);
    if (data) setStockLocations(data);
  };

  const fetchStaff = async () => {
    const { data } = await supabase.from('staff').select('*').eq('is_active', true);
    if (data) setStaff(data);
  };

  const fetchMaterialsAndTools = async () => {
    const { data: materials } = await supabase.from('inventory').select('*').eq('category', 'Materials');
    const { data: tools } = await supabase.from('inventory').select('*').eq('category', 'Tools');
    if (materials) setMaterialsList(materials);
    if (tools) setToolsList(tools);
  };

  const handleDeleteInventoryItem = async (id: string) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      fetchInventoryItems();
    }
  };

  const getFilteredItems = (category: string) => {
    return inventoryItems.filter(
      item => item.category === category &&
      item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Parts": return Package;
      case "Materials": return Wrench;
      case "Tools": return Settings;
      case "Machines": return Cog;
      default: return Package;
    }
  };

  const handleOpenAddDialog = (category: string) => {
    setCurrentCategory(category);
    setFormData({ ...formData, category });
    setIsAddDialogOpen(true);
  };

  const handleSaveProductionStatus = async (status: string) => {
    if (!selectedItemForProductionStatus) return;
    
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ production_status: status })
        .eq('id', selectedItemForProductionStatus.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Production status updated successfully",
      });
      
      setIsProductionStatusDialogOpen(false);
      fetchInventoryItems();
    } catch (error) {
      console.error('Error updating production status:', error);
      toast({
        title: "Error", 
        description: "Failed to update production status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate stats
  const lowStockItems = inventoryItems.filter(item => item.currentQuantity <= item.minimumQuantity);
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.currentQuantity * item.unitCost), 0);
  const allLowStockCount = lowStockItems.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryItems.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-destructive">{allLowStockCount}</div>
              {allLowStockCount > 0 && <AlertTriangle className="h-5 w-5 text-destructive" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="Parts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="Parts">Parts</TabsTrigger>
          <TabsTrigger value="Materials">Materials</TabsTrigger>
          <TabsTrigger value="Tools">Tools</TabsTrigger>
          <TabsTrigger value="Machines">Machines</TabsTrigger>
        </TabsList>

        {["Parts", "Materials", "Tools", "Machines"].map(category => {
          const CategoryIcon = getCategoryIcon(category);
          const filteredItems = getFilteredItems(category);
          
          return (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{category}</h2>
                <Button onClick={() => handleOpenAddDialog(category)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add {category.slice(0, -1)}
                </Button>
              </div>
              
              <div className="grid gap-4">
                {filteredItems.length > 0 ? filteredItems.map(item => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <CategoryIcon className="w-12 h-12 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                                {item.part_number && category !== "Materials" && (
                                  <p className="text-sm text-muted-foreground font-medium">Part #: {item.part_number}</p>
                                )}
                                {item.production_status && (
                                  <p className="text-sm text-black font-medium">{item.production_status}</p>
                                )}
                              </div>
                              
                              <AlertDialog>
                                <div className="flex gap-1 ml-2">
                                  <Button variant="outline" size="icon" className="h-8 w-8" title="View Details">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-8 w-8" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemForProductionStatus(item);
                                      setIsProductionStatusDialogOpen(true);
                                    }}
                                    title="Production Status"
                                  >
                                    <PlayCircle className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="icon" className="h-8 w-8" title="Create Work Order">
                                    <ClipboardList className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="icon" className="h-8 w-8">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-8 w-8">
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

                          {/* Location and Supplier info */}
                          <div className="text-xs text-muted-foreground text-right space-y-1">
                            {item.location && (
                              <div className="flex items-center justify-end gap-1">
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <span>{item.location}</span>
                              </div>
                            )}
                            {item.supplier && (
                              <div className="flex items-center justify-end gap-1">
                                <Building2 className="h-3 w-3 text-gray-400" />
                                <span>{item.supplier}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Quantity and Price Section - Below main content */}
                      <div className="flex items-center gap-4 pt-4 mt-4 border-t">
                        <Badge 
                          variant={item.currentQuantity <= item.minimumQuantity ? "destructive" : "secondary"} 
                          className="text-2xl px-4 py-2 font-bold"
                        >
                          {item.currentQuantity} {item.unitOfMeasure}
                        </Badge>
                        <span className="font-semibold text-lg">${item.unitCost}</span>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="text-center py-12">
                    <CategoryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No {category.toLowerCase()} found</p>
                    <Button variant="outline" onClick={() => handleOpenAddDialog(category)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First {category.slice(0, -1)}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Production Status Dialog */}
      <ProductionStatusDialog 
        isOpen={isProductionStatusDialogOpen}
        onOpenChange={setIsProductionStatusDialogOpen}
        currentStatus={selectedItemForProductionStatus?.production_status || ""}
        onSave={handleSaveProductionStatus}
        itemName={selectedItemForProductionStatus?.name || ""}
      />
    </div>
  );
}