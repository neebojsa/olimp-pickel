import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, X, Minus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDateForInput } from "@/lib/dateUtils";

interface DeliveryNoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingNote?: any;
}

export function DeliveryNoteForm({ open, onOpenChange, onSuccess, editingNote }: DeliveryNoteFormProps) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [isIssueDatePickerOpen, setIsIssueDatePickerOpen] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const [isCustomAddressMode, setIsCustomAddressMode] = useState(false);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [formData, setFormData] = useState({
    issueDate: formatDateForInput(today),
    deliveryNoteNumber: "",
    toType: "customer" as "customer" | "supplier",
    toId: "",
    deliveryAddress: "",
    packingNumber: 0,
    packingType: "packages" as "packages" | "pallets" | "parcels",
    taraWeight: 0,
    carrier: "",
    notes: "",
    customColumns: [] as string[]
  });
  
  const [items, setItems] = useState<Array<{
    inventoryId: string;
    quantity: number;
    material?: string;
    request?: string;
    customFields?: Record<string, string>;
  }>>([]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchSuppliers();
      fetchInventoryItems();
      fetchCompanyInfo();
      if (!editingNote) {
        generateDeliveryNoteNumber();
      }
    }
  }, [open, editingNote]);

  useEffect(() => {
    if (editingNote && open) {
      loadEditingNote();
    } else if (!editingNote && open) {
      resetForm();
    }
  }, [editingNote, open]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*');
    if (data) setCustomers(data);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*');
    if (data) setSuppliers(data);
  };

  const fetchInventoryItems = async () => {
    const { data } = await supabase.from('inventory').select('*').eq('category', 'Parts');
    if (data) setInventoryItems(data);
  };

  const fetchCompanyInfo = async () => {
    const { data } = await supabase.from('company_info').select('*').limit(1).single();
    if (data) setCompanyInfo(data);
  };

  const generateDeliveryNoteNumber = async () => {
    const { data } = await supabase.rpc('generate_delivery_note_number');
    if (data) {
      setFormData(prev => ({ ...prev, deliveryNoteNumber: data }));
    }
  };

  const resetForm = () => {
    setFormData({
      issueDate: formatDateForInput(today),
      deliveryNoteNumber: "",
      toType: "customer",
      toId: "",
      deliveryAddress: "",
      packingNumber: 0,
      packingType: "packages",
      taraWeight: 0,
      carrier: "",
      notes: "",
      customColumns: []
    });
    setItems([]);
    setCustomAddress("");
    setIsCustomAddressMode(false);
    generateDeliveryNoteNumber();
  };

  const loadEditingNote = async () => {
    if (!editingNote) return;
    
    // Map Serbian packing types to English
    const packingTypeMap: Record<string, "packages" | "pallets" | "parcels"> = {
      "paketi": "packages",
      "palete": "pallets",
      "koleta": "parcels"
    };
    
    const savedDeliveryAddress = editingNote.delivery_address || "";
    
    // Check if the saved address is a custom address by comparing with known addresses
    let isCustomAddress = false;
    if (savedDeliveryAddress && savedDeliveryAddress !== "Custom address") {
      const entity = editingNote.to_type === "customer" 
        ? customers.find(c => c.id === editingNote.to_id)
        : suppliers.find(s => s.id === editingNote.to_id);
      
      const knownAddresses: string[] = [];
      if (entity) {
        if (editingNote.to_type === "customer") {
          if (entity.address) knownAddresses.push(entity.address);
          if (entity.dap_address) knownAddresses.push(`DAP: ${entity.dap_address}`);
          if (entity.fco_address) knownAddresses.push(`FCO: ${entity.fco_address}`);
        } else {
          if (entity.address) knownAddresses.push(entity.address);
        }
      }
      
      if (companyInfo) {
        const companyAddr = `${companyInfo.address || ""}, ${companyInfo.postal_code || ""} ${companyInfo.city || ""}`.trim();
        if (companyAddr) {
          knownAddresses.push(companyAddr);
        }
      }
      
      isCustomAddress = !knownAddresses.includes(savedDeliveryAddress);
    }
    
    setFormData({
      issueDate: editingNote.issue_date || formatDateForInput(today),
      deliveryNoteNumber: editingNote.delivery_note_number || "",
      toType: editingNote.to_type || "customer",
      toId: editingNote.to_id || "",
      deliveryAddress: isCustomAddress ? "Custom address" : savedDeliveryAddress,
      packingNumber: editingNote.packing_number || 0,
      packingType: packingTypeMap[editingNote.packing_type] || "packages",
      taraWeight: editingNote.tara_weight || 0,
      carrier: editingNote.carrier || "",
      notes: editingNote.notes || "",
      customColumns: editingNote.custom_columns || []
    });
    
    if (isCustomAddress) {
      setCustomAddress(savedDeliveryAddress);
      setIsCustomAddressMode(true);
    } else {
      setCustomAddress("");
      setIsCustomAddressMode(false);
    }

    // Fetch items
    const { data: itemsData } = await supabase
      .from('delivery_note_items')
      .select('*')
      .eq('delivery_note_id', editingNote.id);
    
    if (itemsData) {
      setItems(itemsData.map(item => ({
        inventoryId: item.inventory_id || "",
        quantity: item.quantity || 1,
        material: item.material || "",
        request: item.request || "",
        customFields: item.custom_fields || {}
      })));
    }
  };

  const getSelectedEntity = () => {
    if (formData.toType === "customer") {
      return customers.find(c => c.id === formData.toId);
    } else {
      return suppliers.find(s => s.id === formData.toId);
    }
  };

  const partsForSelection = formData.toId
    ? (formData.toType === "customer"
        ? inventoryItems.filter((inv) => !inv.customer_id || inv.customer_id === formData.toId)
        : inventoryItems)
    : [];

  const getAddressOptions = () => {
    const entity = getSelectedEntity();
    const options: string[] = [];
    
    if (entity) {
      if (formData.toType === "customer") {
        if (entity.address) options.push(entity.address);
        if (entity.dap_address) options.push(`DAP: ${entity.dap_address}`);
        if (entity.fco_address) options.push(`FCO: ${entity.fco_address}`);
      } else {
        if (entity.address) options.push(entity.address);
      }
    }
    
    // Add company address option
    if (companyInfo) {
      const companyAddr = `${companyInfo.address || ""}, ${companyInfo.postal_code || ""} ${companyInfo.city || ""}`.trim();
      if (companyAddr) {
        options.push(companyAddr);
      }
    }
    
    // Add custom address option
    options.push("Custom address");
    
    return options;
  };

  const addItem = () => {
    setItems([...items, {
      inventoryId: "",
      quantity: 1,
      material: "",
      request: "",
      customFields: {}
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const addCustomColumn = () => {
    const columnName = prompt("Enter column name:");
    if (columnName && !formData.customColumns.includes(columnName)) {
      setFormData(prev => ({
        ...prev,
        customColumns: [...prev.customColumns, columnName]
      }));
    }
  };

  const removeCustomColumn = (columnName: string) => {
    setFormData(prev => ({
      ...prev,
      customColumns: prev.customColumns.filter(c => c !== columnName)
    }));
    // Remove custom field from all items
    setItems(items.map(item => {
      const { [columnName]: removed, ...rest } = item.customFields || {};
      return { ...item, customFields: rest };
    }));
  };

  const calculateTotalWeight = () => {
    let netWeight = 0;
    items.forEach(item => {
      const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryId);
      if (inventoryItem && inventoryItem.weight) {
        netWeight += (inventoryItem.weight || 0) * item.quantity;
      }
    });
    return netWeight + formData.taraWeight;
  };

  const handleSubmit = async () => {
    if (!formData.toId) {
      toast({
        title: "Error",
        description: "Please select a customer or supplier",
        variant: "destructive"
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one part",
        variant: "destructive"
      });
      return;
    }

    const totalWeight = calculateTotalWeight();

    // Map English packing types to Serbian for database compatibility
    const packingTypeToDb: Record<"packages" | "pallets" | "parcels", string> = {
      "packages": "paketi",
      "pallets": "palete",
      "parcels": "koleta"
    };

    const finalDeliveryAddress = isCustomAddressMode ? customAddress : formData.deliveryAddress;

    if (editingNote) {
      // Update existing delivery note
      const { error: updateError } = await supabase
        .from('delivery_notes')
        .update({
          issue_date: formData.issueDate,
          to_type: formData.toType,
          to_id: formData.toId,
          delivery_address: finalDeliveryAddress,
          packing_number: formData.packingNumber,
          packing_type: packingTypeToDb[formData.packingType],
          tara_weight: formData.taraWeight,
          total_weight: totalWeight,
          carrier: formData.carrier || null,
          notes: formData.notes,
          custom_columns: formData.customColumns
        })
        .eq('id', editingNote.id);

      if (updateError) {
        toast({
          title: "Error",
          description: "Failed to update delivery note",
          variant: "destructive"
        });
        return;
      }

      // Delete existing items
      await supabase.from('delivery_note_items').delete().eq('delivery_note_id', editingNote.id);
    } else {
      // Create new delivery note
      const { data: noteData, error: insertError } = await supabase
        .from('delivery_notes')
        .insert([{
          delivery_note_number: formData.deliveryNoteNumber,
          issue_date: formData.issueDate,
          to_type: formData.toType,
          to_id: formData.toId,
          delivery_address: finalDeliveryAddress,
          packing_number: formData.packingNumber,
          packing_type: packingTypeToDb[formData.packingType],
          tara_weight: formData.taraWeight,
          total_weight: totalWeight,
          carrier: formData.carrier || null,
          notes: formData.notes,
          custom_columns: formData.customColumns
        }])
        .select()
        .single();

      if (insertError || !noteData) {
        toast({
          title: "Error",
          description: "Failed to create delivery note",
          variant: "destructive"
        });
        return;
      }

      editingNote = { id: noteData.id };
    }

    // Insert items
    const itemsData = items.map(item => {
      const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryId);
      return {
        delivery_note_id: editingNote.id,
        inventory_id: item.inventoryId,
        part_name: inventoryItem?.name || "",
        part_number: inventoryItem?.part_number || "",
        unit: inventoryItem?.unit || "",
        quantity: item.quantity,
        weight: (inventoryItem?.weight || 0) * item.quantity,
        material: item.material || null,
        request: item.request || null,
        custom_fields: item.customFields || {}
      };
    });

    const { error: itemsError } = await supabase.from('delivery_note_items').insert(itemsData);

    if (itemsError) {
      toast({
        title: "Error",
        description: "Failed to save delivery note items",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: editingNote ? "Delivery note updated successfully" : "Delivery note created successfully"
    });

    resetForm();
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingNote ? "Edit Delivery Note" : "Create Delivery Note"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Main Fields - Three Columns */}
          <div className="grid grid-cols-3 gap-4">
            {/* Row 1: Issue Date, Delivery Note Number, To */}
            <div>
              <Label>Issue Date *</Label>
              <Popover open={isIssueDatePickerOpen} onOpenChange={setIsIssueDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {formData.issueDate ? format(new Date(formData.issueDate), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.issueDate ? new Date(formData.issueDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setFormData(prev => ({ ...prev, issueDate: formatDateForInput(date) }));
                        setIsIssueDatePickerOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Delivery Note Number *</Label>
              <Input value={formData.deliveryNoteNumber} disabled />
            </div>

            <div>
              <Label>To: *</Label>
              <Select value={formData.toType} onValueChange={(value: "customer" | "supplier") => {
                setFormData(prev => ({ ...prev, toType: value, toId: "", deliveryAddress: "" }));
                setIsCustomAddressMode(false);
                setCustomAddress("");
                setItems([{ inventoryId: "", quantity: 1, material: "", request: "", customFields: {} }]);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Customer/Supplier, Delivery Address, Carrier */}
            <div>
              <Label>{formData.toType === "customer" ? "Customer" : "Supplier"} *</Label>
              <Select value={formData.toId} onValueChange={(value) => {
                setFormData(prev => ({ ...prev, toId: value, deliveryAddress: "" }));
                setIsCustomAddressMode(false);
                setCustomAddress("");
                setItems([{ inventoryId: "", quantity: 1, material: "", request: "", customFields: {} }]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${formData.toType}`} />
                </SelectTrigger>
                <SelectContent>
                  {(formData.toType === "customer" ? customers : suppliers).map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Delivery Address *</Label>
              {isCustomAddressMode ? (
                <Input
                  value={customAddress}
                  onChange={(e) => {
                    setCustomAddress(e.target.value);
                  }}
                  placeholder="Enter custom address"
                />
              ) : (
              <Select value={formData.deliveryAddress} onValueChange={(value) => {
                  if (value === "Custom address") {
                    setIsCustomAddressMode(true);
                    setFormData(prev => ({ ...prev, deliveryAddress: "Custom address" }));
                  } else {
                setFormData(prev => ({ ...prev, deliveryAddress: value }));
                    setCustomAddress("");
                    setIsCustomAddressMode(false);
                  }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery address" />
                </SelectTrigger>
                <SelectContent>
                  {getAddressOptions().map((addr, idx) => (
                    <SelectItem key={idx} value={addr}>{addr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
            </div>

            <div>
              <Label>Carrier</Label>
              <Input
                value={formData.carrier}
                onChange={(e) => setFormData(prev => ({ ...prev, carrier: e.target.value }))}
                placeholder="Enter carrier name"
              />
            </div>

            {/* Row 3: Handling Units, HU Quantity, Tara Weight */}
            <div>
              <Label>Handling Units</Label>
              <Select value={formData.packingType} onValueChange={(value: "packages" | "pallets" | "parcels") => {
                setFormData(prev => ({ ...prev, packingType: value }));
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="packages">Packages</SelectItem>
                  <SelectItem value="pallets">Pallets</SelectItem>
                  <SelectItem value="parcels">Parcels</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>HU Quantity</Label>
              <div className="relative w-40">
                <Input
                  type="number"
                  value={formData.packingNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, packingNumber: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="text-center rounded-full pr-6 pl-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 border-0 shadow-none hover:bg-muted"
                  onClick={() => setFormData(prev => ({ ...prev, packingNumber: Math.max(0, prev.packingNumber - 1) }))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 border-0 shadow-none hover:bg-muted"
                  onClick={() => setFormData(prev => ({ ...prev, packingNumber: prev.packingNumber + 1 }))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Tara Weight (kg)</Label>
              <div className="relative w-40">
              <Input
                type="number"
                step="0.01"
                value={formData.taraWeight}
                onChange={(e) => setFormData(prev => ({ ...prev, taraWeight: parseFloat(e.target.value) || 0 }))}
                min="0"
                  className="text-center rounded-full pr-6 pl-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 border-0 shadow-none hover:bg-muted"
                  onClick={() => setFormData(prev => ({ ...prev, taraWeight: Math.max(0, prev.taraWeight - 10) }))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 border-0 shadow-none hover:bg-muted"
                  onClick={() => setFormData(prev => ({ ...prev, taraWeight: prev.taraWeight + 10 }))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
            </div>
            </div>

            {/* Custom Columns - spans all 3 columns */}
            <div className="col-span-3">
              <Label>Custom Columns</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.customColumns.map(col => (
                  <div key={col} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                    <span className="text-sm">{col}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => removeCustomColumn(col)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCustomColumn}>
                <Plus className="w-4 h-4 mr-1" />
                Add Column
              </Button>
            </div>
          </div>

          {/* Parts */}
          <div>
            <div className="mb-4">
              <Label className="text-lg font-semibold">Parts</Label>
            </div>

            {/* Headers */}
            <div className="mb-2">
              {!formData.toId && <p className="text-sm text-muted-foreground mb-2">Select a customer or supplier first to add parts</p>}
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <Label className="text-sm font-medium">Part</Label>
                <Label className="text-sm font-medium">Quantity</Label>
                <div></div>
              </div>
            </div>

            {/* Part rows */}
            <div className="space-y-2">
              {items.map((item, index) => {
                const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryId);
                const visibleColumns = [
                  "Part name",
                  "Part number",
                  "Quantity",
                  "Weight",
                  ...(items.some(i => i.material) ? ["Material"] : []),
                  ...(items.some(i => i.request) ? ["Request"] : []),
                  ...formData.customColumns
                ];

                return (
                  <div key={index} className="space-y-2">
                    {/* Part, Quantity, and Delete in one line */}
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                        <SearchableSelect
                          items={partsForSelection}
                          value={item.inventoryId}
                          onSelect={(invItem) => updateItem(index, 'inventoryId', invItem.id)}
                          placeholder={formData.toId ? "Select part..." : "Select customer/supplier first"}
                          searchPlaceholder={formData.toId ? "Search parts..." : "Select customer/supplier first"}
                          emptyMessage={formData.toId ? (formData.toType === "customer" ? "No parts found for this customer." : "No parts found.") : "Select customer/supplier first."}
                          getItemValue={(inv) => inv.id}
                          getItemLabel={(inv) => inv.name}
                          getItemSearchText={(inv) => `${inv.name} ${inv.part_number || ''}`}
                          getItemPartNumber={(inv) => inv.part_number}
                          disabled={!formData.toId}
                        />

                      <div className="relative w-40">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                          className="text-center rounded-full pr-6 pl-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                          style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 border-0 shadow-none hover:bg-muted"
                          onClick={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 border-0 shadow-none hover:bg-muted"
                          onClick={() => updateItem(index, 'quantity', item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="h-10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Optional fields */}
                    {(visibleColumns.includes("Material") || visibleColumns.includes("Request") || formData.customColumns.length > 0) && (
                      <div className="grid grid-cols-2 gap-2 ml-0">
                      {visibleColumns.includes("Material") && (
                        <div>
                          <Input
                            value={item.material || ""}
                            onChange={(e) => updateItem(index, 'material', e.target.value)}
                              placeholder="Material (optional)"
                              className="text-sm"
                          />
                        </div>
                      )}

                      {visibleColumns.includes("Request") && (
                        <div>
                          <Input
                            value={item.request || ""}
                            onChange={(e) => updateItem(index, 'request', e.target.value)}
                              placeholder="Request (optional)"
                              className="text-sm"
                          />
                        </div>
                      )}

                      {formData.customColumns.map(col => (
                        <div key={col}>
                          <Input
                            value={item.customFields?.[col] || ""}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[index] = {
                                ...updated[index],
                                customFields: {
                                  ...updated[index].customFields,
                                  [col]: e.target.value
                                }
                              };
                              setItems(updated);
                            }}
                            placeholder={col}
                              className="text-sm"
                          />
                        </div>
                      ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Part button below items */}
            <div className="mt-3">
              <Button type="button" onClick={addItem} size="sm" variant="outline" disabled={!formData.toId}>
                <Plus className="w-4 h-4 mr-1" />
                Add Part
              </Button>
            </div>
          </div>

          {/* Total Weight */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between">
              <span className="font-medium">Total Weight:</span>
              <span className="font-bold">{calculateTotalWeight().toFixed(2)} kg</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button className="flex-1" onClick={handleSubmit}>
            {editingNote ? "Update Delivery Note" : "Create Delivery Note"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
