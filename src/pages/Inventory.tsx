import { useState, useEffect } from "react";
import { Plus, Search, Package, AlertTriangle, Wrench, Trash2, Settings, Cog, Upload, X, Edit, MapPin, Building2, ClipboardList, Users, History, FileText, Calendar, Clock } from "lucide-react";
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
import { format } from "date-fns";

export default function Inventory() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
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

  useEffect(() => {
    fetchInventoryItems();
    fetchSuppliers();
    fetchStockLocations();
    fetchStaff();
  }, []);

  const fetchInventoryItems = async () => {
    const { data } = await supabase.from('inventory').select('*');
    if (data) {
      const formattedItems = data.map(item => ({
        ...item,
        sku: `SKU-${item.id}`,
        currentQuantity: item.quantity,
        minimumQuantity: 5, // Default minimum
        unitOfMeasure: "pieces",
        unitCost: item.unit_price,
        image: item.photo_url || null
      }));
      setInventoryItems(formattedItems);
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name');
    if (data) {
      setSuppliers(data);
    }
  };

  const fetchStockLocations = async () => {
    const { data } = await supabase.from('stock_locations').select('id, name, description').eq('is_active', true);
    if (data) {
      setStockLocations(data);
    }
  };

  const fetchStaff = async () => {
    const { data } = await supabase.from('staff').select('id, name, position').eq('is_active', true);
    if (data) {
      setStaff(data);
    }
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', itemId);

    if (!error) {
      setInventoryItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Item Deleted",
        description: "The inventory item has been successfully deleted.",
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
        variant: "destructive",
      });
      return;
    }

    try {
      const resizedFile = await resizeImageFile(file, 400, 400);
      setFormData(prev => ({ ...prev, photo: resizedFile }));
      setPhotoPreview(URL.createObjectURL(resizedFile));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photo: null }));
    setPhotoPreview(null);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('inventory-photos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('inventory-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSaveItem = async () => {
    if (!formData.name || !formData.quantity || !formData.unit_price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
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
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
    }

    const { error } = await supabase
      .from('inventory')
      .insert({
        part_number: formData.part_number,
        name: formData.name,
        description: formData.description,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        location: formData.location,
        category: formData.category,
        photo_url: photoUrl
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
        photo: null
      });
      setPhotoPreview(null);
      setIsAddDialogOpen(false);
      fetchInventoryItems();
      toast({
        title: "Item Added",
        description: "The inventory item has been successfully added.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenAddDialog = (category: string) => {
    setCurrentCategory(category);
    setFormData(prev => ({ ...prev, category }));
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
      photo: null
    });
    if (item.photo_url) {
      setPhotoPreview(item.photo_url);
    }
    setIsEditDialogOpen(true);
  };

  const handleUpdateItem = async () => {
    if (!formData.name.trim()) {
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

      const { error } = await supabase
        .from('inventory')
        .update({
          part_number: formData.part_number,
          name: formData.name,
          description: formData.description,
          quantity: parseInt(formData.quantity) || 0,
          unit_price: parseFloat(formData.unit_price) || 0,
          location: formData.location,
          category: formData.category,
          photo_url: photoUrl
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({
        title: "Item Updated",
        description: `${formData.name} has been successfully updated.`,
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
        photo: null
      });
      setPhotoPreview(null);
      setEditingItem(null);
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
    return inventoryItems.filter(item => 
      item.category === category && 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Parts": return Package;
      case "Materials": return Settings;
      case "Tools": return Wrench;
      case "Machines": return Cog;
      default: return Package;
    }
  };

  const lowStockItems = inventoryItems.filter(
    item => item.currentQuantity <= item.minimumQuantity
  );

  const totalValue = inventoryItems.reduce(
    (total, item) => total + (item.currentQuantity * item.unitCost), 0
  );

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
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('*')
        .eq('inventory_id', item.id);
      
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
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select(`
          *,
          invoices (
            invoice_number,
            issue_date,
            status
          )
        `)
        .ilike('description', `%${item.name}%`);
        
      if (invoiceItems) {
        invoiceItems.forEach((invoiceItem: any) => {
          if (invoiceItem.invoices) {
            historyEntries.push({
              date: format(new Date(invoiceItem.invoices.issue_date), 'dd/MM/yyyy'),
              time: '09:00', // Default time since we don't have time in date field
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

  return (
    <div className="p-6 space-y-6">
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
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">
              item categories
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

        {["Parts", "Materials", "Tools", "Machines"].map((category) => {
          const CategoryIcon = getCategoryIcon(category);
          const filteredItems = getFilteredItems(category);

          return (
            <TabsContent key={category} value={category} className="space-y-4">
              {/* Search and Add */}
              <div className="flex items-center justify-between space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={`Search ${category.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => handleOpenAddDialog(category)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add {category.slice(0, -1)}
                </Button>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <Card key={item.id} className="h-40 hover:shadow-md transition-shadow">
                      <CardContent className="p-4 h-full">
                        <div className="flex h-full gap-4">
                          {/* Image */}
                          <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <CategoryIcon className="w-12 h-12 text-muted-foreground" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                                  {item.part_number && (
                                    <p className="text-sm text-muted-foreground font-medium">Part #: {item.part_number}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                </div>
                                <AlertDialog>
                                  <div className="flex gap-1 ml-2">
                                     <Button
                                       variant="outline"
                                       size="icon"
                                       className="h-8 w-8"
                                       onClick={() => handleViewHistory(item)}
                                       title="View History"
                                     >
                                       <History className="h-4 w-4" />
                                     </Button>
                                     <Button
                                       variant="outline"
                                       size="icon"
                                       className="h-8 w-8"
                                       onClick={() => {
                                         setSelectedItemForWorkOrder(item);
                                         setTools([{ name: "", quantity: "" }]);
                                         setOperatorsAndMachines([{ name: "", type: "operator" }]);
                                         setIsWorkOrderDialogOpen(true);
                                       }}
                                       title="Create Work Order"
                                     >
                                       <ClipboardList className="h-4 w-4" />
                                     </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleOpenEditDialog(item)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8"
                                      >
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
                              
                              {item.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Badge variant={item.currentQuantity <= item.minimumQuantity ? "destructive" : "secondary"}>
                                  {item.currentQuantity} {item.unitOfMeasure}
                                </Badge>
                                <span className="font-semibold text-lg">${item.unitCost}</span>
                              </div>
                              
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
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <CategoryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No {category.toLowerCase()} found</p>
                    <Button 
                      variant="outline" 
                      onClick={() => handleOpenAddDialog(category)}
                    >
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

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New {currentCategory.slice(0, -1)}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {currentCategory === "Parts" && (
              <div className="grid gap-2">
                <Label htmlFor="part_number">Part Number</Label>
                <Input
                  id="part_number"
                  value={formData.part_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, part_number: e.target.value }))}
                  placeholder="Enter part number"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter item name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter item description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit_price">Unit Price *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name} {location.description && `- ${location.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photo">Photo</Label>
              <div className="space-y-2">
                {photoPreview ? (
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemovePhoto}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Click to upload photo</p>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <Label htmlFor="photo" className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>Choose File</span>
                      </Button>
                    </Label>
                  </div>
                )}
              </div>
            </div>
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
            {editingItem?.category === "Parts" && (
              <div className="grid gap-2">
                <Label htmlFor="edit_part_number">Part Number</Label>
                <Input
                  id="edit_part_number"
                  value={formData.part_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, part_number: e.target.value }))}
                  placeholder="Enter part number"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit_name">Name *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter item name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_quantity">Quantity *</Label>
                <Input
                  id="edit_quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_unit_price">Unit Price *</Label>
                <Input
                  id="edit_unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_location">Location</Label>
              <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
                <SelectTrigger id="edit_location">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name} {location.description && `- ${location.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_photo">Photo</Label>
              <div className="space-y-2">
                {photoPreview ? (
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemovePhoto}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Click to upload photo</p>
                    <Input
                      id="edit_photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <Label htmlFor="edit_photo" className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>Choose File</span>
                      </Button>
                    </Label>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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
                <Input 
                  id="wo_partName" 
                  value={selectedItemForWorkOrder?.name || ""} 
                  readOnly 
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="wo_partNumber">Part Number</Label>
                <Input 
                  id="wo_partNumber" 
                  value={selectedItemForWorkOrder?.part_number || ""} 
                  readOnly 
                  className="bg-muted"
                />
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
              <Textarea 
                id="wo_description" 
                placeholder="Part description..." 
                rows={3}
                defaultValue={selectedItemForWorkOrder?.description || ""}
              />
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
                {tools.map((tool, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={tool.name}
                        onValueChange={(value) => {
                          const newTools = [...tools];
                          newTools[index].name = value;
                          setTools(newTools);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tool" />
                        </SelectTrigger>
                        <SelectContent>
                          {["CNC Mill", "Drill Press", "Precision Vise", "Laser Cutter", "Press Brake", "Precision Lathe", "CMM Machine", "Carbide Inserts", "5-Axis CNC Mill", "Boring Bar Set", "Go/No-Go Gauges", "Horizontal Boring Machine", "Carbide Tooling Set", "Surface Finish Gauge"].map((toolName) => (
                            <SelectItem key={toolName} value={toolName}>
                              {toolName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input 
                        type="number" 
                        placeholder="Qty"
                        value={tool.quantity}
                        onChange={(e) => {
                          const newTools = [...tools];
                          newTools[index].quantity = e.target.value;
                          setTools(newTools);
                        }}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (tools.length > 1) {
                          setTools(tools.filter((_, i) => i !== index));
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => setTools([...tools, { name: "", quantity: "" }])}
                >
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
                {operatorsAndMachines.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={item.name}
                        onValueChange={(value) => {
                          const newItems = [...operatorsAndMachines];
                          newItems[index].name = value;
                          setOperatorsAndMachines(newItems);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={item.type === "operator" ? "Select operator" : "Select machine"} />
                        </SelectTrigger>
                        <SelectContent>
                          {item.type === "operator" ? (
                            staff.map((staffMember) => (
                              <SelectItem key={staffMember.id} value={staffMember.name}>
                                {staffMember.name} - {staffMember.position}
                              </SelectItem>
                            ))
                          ) : (
                            ["CNC Machine #1", "CNC Machine #2", "CNC Machine #3", "Laser Cutting Machine #1", "CNC Lathe #2", "5-Axis CNC Machine #1", "Horizontal Boring Machine #2"].map((machine) => (
                              <SelectItem key={machine} value={machine}>
                                {machine}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Select 
                        value={item.type}
                        onValueChange={(value) => {
                          const newItems = [...operatorsAndMachines];
                          newItems[index].type = value as "operator" | "machine";
                          newItems[index].name = ""; // Clear selection when type changes
                          setOperatorsAndMachines(newItems);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operator">Operator</SelectItem>
                          <SelectItem value="machine">Machine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (operatorsAndMachines.length > 1) {
                          setOperatorsAndMachines(operatorsAndMachines.filter((_, i) => i !== index));
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => setOperatorsAndMachines([...operatorsAndMachines, { name: "", type: "operator" }])}
                >
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
                const { data: workOrderNumber, error: numberError } = await supabase
                  .rpc('generate_work_order_number');

                if (numberError) {
                  toast({
                    title: "Error",
                    description: "Failed to generate work order number",
                    variant: "destructive"
                  });
                  return;
                }

                const { data, error } = await supabase
                  .from('work_orders')
                  .insert([{
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
                  }])
                  .select();

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
                    description: `Work order ${workOrderNumber} created for ${partName}`,
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
      <PartHistoryDialog
        isOpen={isHistoryDialogOpen}
        onClose={() => setIsHistoryDialogOpen(false)}
        item={selectedItemForHistory}
        historyData={historyData}
      />
    </div>
  );
}