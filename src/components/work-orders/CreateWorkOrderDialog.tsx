import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Calendar } from "@/components/ui/calendar";
import { Package, Settings, Users, Plus, Trash2, Calendar as CalendarIcon, ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";
import { formatToolName } from "@/lib/toolSpecUtils";

export type EditingWorkOrder = {
  id: string;
  work_order_number?: string | null;
  inventory_id?: string | null;
  part_name?: string | null;
  part_number?: string | null;
  description?: string | null;
  estimated_hours?: number | null;
  due_date?: string | null;
  po_date?: string | null;
  priority?: string | null;
  setup_instructions?: string | null;
  quality_requirements?: string | null;
  production_notes?: string | null;
  tools_used?: Array<{ name: string; quantity?: number }> | null;
  components_used?: Array<{ name: string; quantity?: number }> | null;
  materials_used?: Array<{ name: string; notes?: string; lengthPerPiece?: string }> | null;
  quantity?: number | null;
  operators_and_machines?: Array<{ name: string; type: "operator" | "machine" }> | null;
  control_in_charge_id?: string | null;
};

interface CreateWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPartId?: string;
  defaultMaterials?: Array<{ name: string; notes?: string; lengthPerPiece?: string }>;
  editingWorkOrder?: EditingWorkOrder | null;
  onSuccess?: () => void;
}

export function CreateWorkOrderDialog({ 
  open, 
  onOpenChange, 
  defaultPartId,
  defaultMaterials,
  editingWorkOrder,
  onSuccess 
}: CreateWorkOrderDialogProps) {
  const isEditMode = !!editingWorkOrder;
  const { toast } = useToast();
  const [tools, setTools] = useState([{ name: "", quantity: "" }]);
  const [operatorsAndMachines, setOperatorsAndMachines] = useState([{ name: "", type: "operator" as "operator" | "machine" }]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [toolLibraryItems, setToolLibraryItems] = useState<any[]>([]);
  const [machineLibraryItems, setMachineLibraryItems] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [selectedPartId, setSelectedPartId] = useState(defaultPartId || "");
  const [selectedPartNumber, setSelectedPartNumber] = useState("");
  const [materials, setMaterials] = useState<Array<{ name: string; notes?: string; lengthPerPiece?: string }>>(() => {
    // Initialize with defaultMaterials if provided, otherwise empty
    if (defaultMaterials && defaultMaterials.length > 0) {
      return defaultMaterials.map(m => ({
        name: m.name || "",
        notes: m.notes || "",
        lengthPerPiece: m.lengthPerPiece ?? ""
      }));
    }
    return [{ name: "", notes: "", lengthPerPiece: "" }];
  });
  const [workOrderQuantity, setWorkOrderQuantity] = useState(0);
  const [materialStockMm, setMaterialStockMm] = useState<Record<string, number>>({});
  const [materialItems, setMaterialItems] = useState<any[]>([]);
  const [components, setComponents] = useState([{ name: "", quantity: 1 }]);
  const [componentItems, setComponentItems] = useState<any[]>([]);
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);
  const [isPoDatePickerOpen, setIsPoDatePickerOpen] = useState(false);
  const [workOrderDueDate, setWorkOrderDueDate] = useState<Date | undefined>(undefined);
  const [workOrderPoDate, setWorkOrderPoDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState("Medium");
  const [controlInChargeId, setControlInChargeId] = useState<string>("__none__");

  useEffect(() => {
    if (open) {
      fetchInventoryItems();
      fetchToolLibrary();
      fetchMachineLibrary();
      fetchStaffMembers();
      fetchMaterialItems();
      fetchComponentItems();
      
      if (editingWorkOrder) {
        setSelectedPartId(editingWorkOrder.inventory_id || "");
        setSelectedPartNumber(
          [editingWorkOrder.part_name, editingWorkOrder.part_number].filter(Boolean).join(" - ") || ""
        );
        setWorkOrderDueDate(
          editingWorkOrder.due_date ? new Date(editingWorkOrder.due_date) : undefined
        );
        setWorkOrderPoDate(
          editingWorkOrder.po_date ? new Date(editingWorkOrder.po_date) : undefined
        );
        setPriority(editingWorkOrder.priority || "Medium");
        if (editingWorkOrder.tools_used && Array.isArray(editingWorkOrder.tools_used) && editingWorkOrder.tools_used.length > 0) {
          setTools(editingWorkOrder.tools_used.map((t: any) => ({
            name: t.name || "",
            quantity: t.quantity != null ? String(t.quantity) : ""
          })));
        }
        if (editingWorkOrder.components_used && Array.isArray(editingWorkOrder.components_used) && editingWorkOrder.components_used.length > 0) {
          setComponents(editingWorkOrder.components_used.map((c: any) => ({
            name: c.name || "",
            quantity: c.quantity ?? 1
          })));
        }
        if (editingWorkOrder.materials_used && Array.isArray(editingWorkOrder.materials_used) && editingWorkOrder.materials_used.length > 0) {
          setMaterials(editingWorkOrder.materials_used.map((m: any) => ({
            name: m.name || "",
            notes: m.notes || "",
            lengthPerPiece: m.lengthPerPiece != null ? String(m.lengthPerPiece) : ""
          })));
        }
        setWorkOrderQuantity(editingWorkOrder.quantity ?? 0);
        setControlInChargeId(editingWorkOrder.control_in_charge_id || "__none__");
        if (editingWorkOrder.operators_and_machines && Array.isArray(editingWorkOrder.operators_and_machines) && editingWorkOrder.operators_and_machines.length > 0) {
          setOperatorsAndMachines(editingWorkOrder.operators_and_machines.map((o: any) => ({
            name: o.name || "",
            type: (o.type === "machine" ? "machine" : "operator") as "operator" | "machine"
          })));
        }
        setTimeout(() => {
          const descEl = document.getElementById("description") as HTMLTextAreaElement | null;
          const timeEl = document.getElementById("productionTime") as HTMLInputElement | null;
          const setupEl = document.getElementById("setupInstructions") as HTMLTextAreaElement | null;
          const qualityEl = document.getElementById("qualityRequirements") as HTMLTextAreaElement | null;
          const prodNotesEl = document.getElementById("productionNotes") as HTMLTextAreaElement | null;
          if (descEl) descEl.value = editingWorkOrder.description || "";
          if (timeEl) timeEl.value = editingWorkOrder.estimated_hours != null ? String(editingWorkOrder.estimated_hours) : "";
          if (setupEl) setupEl.value = editingWorkOrder.setup_instructions || "";
          if (qualityEl) qualityEl.value = editingWorkOrder.quality_requirements || "";
          if (prodNotesEl) prodNotesEl.value = editingWorkOrder.production_notes || "";
        }, 0);
      } else {
        setSelectedPartId(defaultPartId || "");
        setSelectedPartNumber("");
        setWorkOrderDueDate(undefined);
        setPriority("Medium");
        setControlInChargeId("__none__");
        setTools([{ name: "", quantity: "" }]);
        setComponents([{ name: "", quantity: 1 }]);
        setTimeout(() => {
          const descEl = document.getElementById("description") as HTMLTextAreaElement | null;
          const timeEl = document.getElementById("productionTime") as HTMLInputElement | null;
          const setupEl = document.getElementById("setupInstructions") as HTMLTextAreaElement | null;
          const qualityEl = document.getElementById("qualityRequirements") as HTMLTextAreaElement | null;
          const prodNotesEl = document.getElementById("productionNotes") as HTMLTextAreaElement | null;
          if (descEl) descEl.value = "";
          if (timeEl) timeEl.value = "";
          if (setupEl) setupEl.value = "";
          if (qualityEl) qualityEl.value = "";
          if (prodNotesEl) prodNotesEl.value = "";
        }, 0);
      }
      
      // Initialize materials with defaultMaterials when dialog opens (create mode)
      if (!editingWorkOrder && defaultMaterials && defaultMaterials.length > 0) {
        setMaterials(defaultMaterials.map(m => ({
          name: m.name || "",
          notes: m.notes || "",
          lengthPerPiece: m.lengthPerPiece ?? ""
        })));
      } else if (!editingWorkOrder) {
        setMaterials([{ name: "", notes: "", lengthPerPiece: "" }]);
      }
      fetchMaterialStockMm();
    }
  }, [open, defaultMaterials, editingWorkOrder]);

  // Set default part when inventoryItems are loaded and defaultPartId is provided
  useEffect(() => {
    if (defaultPartId && inventoryItems.length > 0) {
      const defaultPart = inventoryItems.find(item => item.id === defaultPartId);
      if (defaultPart && selectedPartId !== defaultPartId) {
        setSelectedPartId(defaultPartId);
        setSelectedPartNumber(`${defaultPart.name} - ${defaultPart.part_number || 'N/A'}`);
      }
    }
  }, [defaultPartId, inventoryItems]);

  // Update selectedPartNumber and load tools/components/materials when selectedPartId changes
  // When editing: use saved work order data if present; otherwise fall back to part presets
  useEffect(() => {
    if (selectedPartId && inventoryItems.length > 0) {
      const selectedPart = inventoryItems.find(item => item.id === selectedPartId);
      if (selectedPart) {
        setSelectedPartNumber(`${selectedPart.name} - ${selectedPart.part_number || 'N/A'}`);
        
        const hasSavedTools = editingWorkOrder?.tools_used && Array.isArray(editingWorkOrder.tools_used) && editingWorkOrder.tools_used.length > 0;
        const hasSavedComponents = editingWorkOrder?.components_used && Array.isArray(editingWorkOrder.components_used) && editingWorkOrder.components_used.length > 0;
        const hasSavedMaterials = editingWorkOrder?.materials_used && Array.isArray(editingWorkOrder.materials_used) && editingWorkOrder.materials_used.length > 0;
        
        if (!hasSavedTools) {
          if (selectedPart.tools_used && Array.isArray(selectedPart.tools_used) && selectedPart.tools_used.length > 0) {
            const toolsData = selectedPart.tools_used.filter((t: any) => t.name).map((t: any) => ({
              name: t.name || "",
              quantity: t.quantity ? t.quantity.toString() : ""
            }));
            setTools(toolsData);
          } else {
            setTools([{ name: "", quantity: "" }]);
          }
        }
        
        if (!hasSavedComponents) {
          if (selectedPart.components_used && Array.isArray(selectedPart.components_used) && selectedPart.components_used.length > 0) {
            const componentsData = selectedPart.components_used.filter((c: any) => c.name).map((c: any) => ({
              name: c.name || "",
              quantity: c.quantity || 1
            }));
            setComponents(componentsData);
          } else {
            setComponents([{ name: "", quantity: 1 }]);
          }
        }
        
        if (!hasSavedMaterials && (!defaultMaterials || defaultMaterials.length === 0)) {
          if (selectedPart.materials_used && Array.isArray(selectedPart.materials_used) && selectedPart.materials_used.length > 0) {
            const materialsData = selectedPart.materials_used.filter((m: any) => m.name).map((m: any) => ({
              name: m.name || "",
              notes: m.notes || "",
              lengthPerPiece: m.lengthPerPiece != null ? String(m.lengthPerPiece) : ""
            }));
            setMaterials(materialsData);
          } else {
            setMaterials([{ name: "", notes: "", lengthPerPiece: "" }]);
          }
        }
      }
    }
  }, [selectedPartId, inventoryItems, editingWorkOrder, defaultMaterials]);

  const fetchInventoryItems = async () => {
    const { data } = await supabase.from('inventory').select('id, name, description, part_number, category, tools_used, materials_used, components_used').eq('category', 'Parts');
    if (data) {
      setInventoryItems(data);
    }
  };

  const fetchToolLibrary = async () => {
    const { data } = await supabase.from('inventory').select('id, name, part_number, materials_used').eq('category', 'Tools');
    if (data) {
      setToolLibraryItems(data);
    }
  };

  const fetchMachineLibrary = async () => {
    const { data } = await supabase.from('inventory').select('id, name, part_number').eq('category', 'Machines');
    if (data) {
      setMachineLibraryItems(data);
    }
  };

  const fetchStaffMembers = async () => {
    const { data } = await supabase.from('staff').select('id, name, position, department');
    if (data) {
      setStaffMembers(data);
    }
  };

  const fetchMaterialItems = async () => {
    const { data } = await supabase.from('inventory').select('id, name, description, part_number').eq('category', 'Materials');
    if (data) {
      setMaterialItems(data);
    }
  };

  const fetchMaterialStockMm = async () => {
    const { data: adjustments } = await supabase
      .from('material_adjustments' as any)
      .select('inventory_id, adjustment_type, length_mm, quantity_pieces');
    if (!adjustments) return;
    const stockByMaterial: Record<string, number> = {};
    (adjustments as any[]).forEach((adj: any) => {
      const totalMm = (adj.length_mm || 0) * (adj.quantity_pieces || 0);
      if (!stockByMaterial[adj.inventory_id]) stockByMaterial[adj.inventory_id] = 0;
      if (adj.adjustment_type === 'add') {
        stockByMaterial[adj.inventory_id] += totalMm;
      } else if (adj.adjustment_type === 'subtract') {
        stockByMaterial[adj.inventory_id] -= totalMm;
      }
    });
    setMaterialStockMm(stockByMaterial);
  };

  const fetchComponentItems = async () => {
    const { data } = await supabase.from('inventory').select('id, name, description, part_number').eq('category', 'Components');
    if (data) {
      setComponentItems(data);
    }
  };

  const handleCreateWorkOrder = async () => {
    const productionTime = (document.getElementById('productionTime') as HTMLInputElement)?.value;
    const dueDate = workOrderDueDate ? format(workOrderDueDate, 'yyyy-MM-dd') : null;
    const description = (document.getElementById('description') as HTMLTextAreaElement)?.value;
    const setupInstructions = (document.getElementById('setupInstructions') as HTMLTextAreaElement)?.value ?? "";
    const qualityRequirements = (document.getElementById('qualityRequirements') as HTMLTextAreaElement)?.value ?? "";
    const productionNotes = (document.getElementById('productionNotes') as HTMLTextAreaElement)?.value ?? "";

    if (!description || !selectedPartId) {
      toast({
        title: "Error",
        description: "Please fill in required fields and select a part",
        variant: "destructive"
      });
      return;
    }

    const selectedPart = inventoryItems.find(item => item.id === selectedPartId);

    const toolsPayload = tools.filter(t => t.name).map(t => ({
      name: t.name,
      quantity: t.quantity ? parseFloat(t.quantity) || 0 : 0
    }));
    const componentsPayload = components.filter(c => c.name).map(c => ({
      name: c.name,
      quantity: c.quantity ?? 1
    }));
    const materialsPayload = materials.filter(m => m.name).map(m => ({
      name: m.name,
      notes: m.notes || undefined,
      lengthPerPiece: m.lengthPerPiece || undefined
    }));
    const operatorsPayload = operatorsAndMachines.filter(o => o.name).map(o => ({
      name: o.name,
      type: o.type
    }));

    if (editingWorkOrder) {
      const { error } = await supabase
        .from('work_orders')
        .update({
          description,
          estimated_hours: productionTime ? parseFloat(productionTime) : null,
          due_date: dueDate || null,
          po_date: workOrderPoDate ? format(workOrderPoDate, 'yyyy-MM-dd') : null,
          priority: priority || 'Medium',
          inventory_id: selectedPartId,
          part_name: selectedPart?.name,
          part_number: selectedPart?.part_number,
          setup_instructions: setupInstructions || null,
          quality_requirements: qualityRequirements || null,
          production_notes: productionNotes || null,
          tools_used: toolsPayload.length > 0 ? toolsPayload : null,
          components_used: componentsPayload.length > 0 ? componentsPayload : null,
          materials_used: materialsPayload.length > 0 ? materialsPayload : null,
          quantity: workOrderQuantity || null,
          operators_and_machines: operatorsPayload.length > 0 ? operatorsPayload : null,
          control_in_charge_id: controlInChargeId && controlInChargeId !== "__none__" ? controlInChargeId : null
        })
        .eq('id', editingWorkOrder.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update work order",
          variant: "destructive"
        });
      } else {
        onOpenChange(false);
        if (onSuccess) onSuccess();
        toast({
          title: "Work Order Updated",
          description: "Work order has been successfully updated.",
        });
      }
      return;
    }

    // Create new
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
        po_date: workOrderPoDate ? format(workOrderPoDate, 'yyyy-MM-dd') : null,
        priority: priority || 'medium',
        status: 'pending',
        inventory_id: selectedPartId,
        part_name: selectedPart?.name,
        part_number: selectedPart?.part_number,
        setup_instructions: setupInstructions || null,
        quality_requirements: qualityRequirements || null,
        production_notes: productionNotes || null,
        tools_used: toolsPayload.length > 0 ? toolsPayload : null,
        components_used: componentsPayload.length > 0 ? componentsPayload : null,
        materials_used: materialsPayload.length > 0 ? materialsPayload : null,
        quantity: workOrderQuantity || null,
        operators_and_machines: operatorsPayload.length > 0 ? operatorsPayload : null,
        control_in_charge_id: controlInChargeId && controlInChargeId !== "__none__" ? controlInChargeId : null
      }])
      .select();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create work order",
        variant: "destructive"
      });
    } else {
      // Reset form (but preserve defaultPartId if provided)
      if (!defaultPartId) {
        setSelectedPartId("");
        setSelectedPartNumber("");
      }
      setTools([{ name: "", quantity: "" }]);
      setComponents([{ name: "", quantity: 1 }]);
      setOperatorsAndMachines([{ name: "", type: "operator" }]);
      setControlInChargeId("__none__");
      // Reset materials to defaultMaterials if provided, otherwise empty
      if (defaultMaterials && defaultMaterials.length > 0) {
        setMaterials(defaultMaterials.map(m => ({
          name: m.name || "",
          notes: m.notes || "",
          lengthPerPiece: m.lengthPerPiece ?? ""
        })));
      } else {
        setMaterials([{ name: "", notes: "", lengthPerPiece: "" }]);
      }
      setWorkOrderDueDate(undefined);
      setWorkOrderPoDate(undefined);
      setWorkOrderQuantity(0);
      setPriority("Medium");
      
      const productionTimeInput = document.getElementById('productionTime') as HTMLInputElement;
      const descriptionInput = document.getElementById('description') as HTMLTextAreaElement;
      if (productionTimeInput) productionTimeInput.value = "";
      if (descriptionInput) descriptionInput.value = "";
      
      onOpenChange(false);
      if (onSuccess) onSuccess();
      toast({
        title: "Work Order Created",
        description: "New work order has been successfully created.",
      });
    }
  };

  const handleClose = () => {
    // Reset form when closing (but preserve defaultPartId if provided)
    if (!defaultPartId) {
      setSelectedPartId("");
      setSelectedPartNumber("");
    } else {
      // Reset to defaultPartId if it was provided
      setSelectedPartId(defaultPartId);
      const defaultPart = inventoryItems.find(item => item.id === defaultPartId);
      if (defaultPart) {
        setSelectedPartNumber(`${defaultPart.name} - ${defaultPart.part_number || 'N/A'}`);
      }
    }
      setTools([{ name: "", quantity: "" }]);
      setComponents([{ name: "", quantity: 1 }]);
    setOperatorsAndMachines([{ name: "", type: "operator" }]);
    setControlInChargeId("__none__");
    setMaterials([{ name: "", notes: "", lengthPerPiece: "" }]);
    setWorkOrderDueDate(undefined);
    setWorkOrderPoDate(undefined);
    setWorkOrderQuantity(0);
    setPriority("Medium");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto thin-scrollbar">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Work Order" : "Create New Work Order"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="workOrderNumber">Work Order Number</Label>
              <Input 
                id="workOrderNumber" 
                placeholder={isEditMode ? "" : "Auto-generated (e.g., 259-01)"}
                value={isEditMode ? (editingWorkOrder?.work_order_number || "") : ""}
                disabled 
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="partName">Part</Label>
              <SearchableSelect
                items={inventoryItems}
                value={selectedPartId}
                onSelect={(part) => {
                  const selectedPart = part ?? undefined;
                  const partId = selectedPart?.id ?? "";
                  setSelectedPartId(partId);
                  setSelectedPartNumber(selectedPart ? `${selectedPart.name} - ${selectedPart.part_number || 'N/A'}` : "");
                  
                  if (selectedPart?.tools_used && Array.isArray(selectedPart.tools_used) && selectedPart.tools_used.length > 0) {
                    setTools(selectedPart.tools_used.filter((t: any) => t.name).map((t: any) => ({
                      name: t.name || "",
                      quantity: t.quantity ? t.quantity.toString() : ""
                    })));
                  } else {
                    setTools([{ name: "", quantity: "" }]);
                  }
                  
                  if (selectedPart?.components_used && Array.isArray(selectedPart.components_used) && selectedPart.components_used.length > 0) {
                    setComponents(selectedPart.components_used.filter((c: any) => c.name).map((c: any) => ({
                      name: c.name || "",
                      quantity: c.quantity || 1
                    })));
                  } else {
                    setComponents([{ name: "", quantity: 1 }]);
                  }
                  
                  if (!defaultMaterials?.length && selectedPart?.materials_used && Array.isArray(selectedPart.materials_used) && selectedPart.materials_used.length > 0) {
                    setMaterials(selectedPart.materials_used.filter((m: any) => m.name).map((m: any) => ({
                      name: m.name || "",
                      notes: m.notes || "",
                      lengthPerPiece: m.lengthPerPiece != null ? String(m.lengthPerPiece) : ""
                    })));
                  } else if (!defaultMaterials?.length) {
                    setMaterials([{ name: "", notes: "", lengthPerPiece: "" }]);
                  }
                }}
                placeholder="Select part"
                searchPlaceholder="Search parts..."
                emptyMessage="No parts found."
                allowClear
                getItemValue={(item) => item.id}
                getItemLabel={(item) => item.name}
                getItemSearchText={(item) => `${item.name} ${item.part_number || ''}`}
                getItemPartNumber={(item) => item.part_number}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <NumericInput
                id="quantity"
                value={workOrderQuantity}
                onChange={(val) => setWorkOrderQuantity(val)}
                min={0}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
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
              <Label htmlFor="productionTime">Production Time</Label>
              <Input id="productionTime" placeholder="e.g. 3.5 hours" />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Popover open={isDueDatePickerOpen} onOpenChange={setIsDueDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !workOrderDueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {workOrderDueDate ? format(workOrderDueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={workOrderDueDate}
                    onSelect={(date) => {
                      if (date) {
                        setWorkOrderDueDate(date);
                        setIsDueDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="poDate">PO Date</Label>
              <Popover open={isPoDatePickerOpen} onOpenChange={setIsPoDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !workOrderPoDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {workOrderPoDate ? format(workOrderPoDate, "PPP") : <span>Pick a date (optional)</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={workOrderPoDate}
                    onSelect={(date) => {
                      if (date) {
                        setWorkOrderPoDate(date);
                        setIsPoDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Part description..." rows={3} />
          </div>

          <div>
            <Label htmlFor="setupInstructions">Setup Instructions</Label>
            <Textarea id="setupInstructions" placeholder="Setup instructions for this work order..." rows={3} />
          </div>

          <div>
            <Label htmlFor="qualityRequirements">Quality Requirements</Label>
            <Textarea id="qualityRequirements" placeholder="Quality requirements and tolerances..." rows={3} />
          </div>

          <div>
            <Label htmlFor="productionNotes">Production Notes</Label>
            <Textarea id="productionNotes" placeholder="Production notes and requirements..." rows={3} />
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
                      <SearchableSelect
                        items={toolLibraryItems}
                        value={tool.name}
                        onSelect={(item) => {
                          const newTools = [...tools];
                          newTools[index].name = item.name;
                          setTools(newTools);
                        }}
                        placeholder="Select tool"
                        searchPlaceholder="Search tools..."
                        emptyMessage="No tools found."
                        getItemValue={(item) => item.name}
                        getItemLabel={(item) => formatToolName(item.materials_used, item.name)}
                        getItemSearchText={(item) => `${formatToolName(item.materials_used, item.name)} ${item.part_number || ''}`}
                        getItemPartNumber={(item) => item.part_number}
                      />
                    </div>
                  <div className="w-40">
                    <NumericInput
                      value={tool.quantity ? parseFloat(tool.quantity) : 0}
                      onChange={(val) => {
                        const newTools = [...tools];
                        newTools[index].quantity = val.toString();
                        setTools(newTools);
                      }}
                      min={0}
                      placeholder="Qty"
                    />
                  </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (index === 0) {
                            const newTools = [...tools];
                            newTools[0] = { name: "", quantity: "" };
                            setTools(newTools);
                          } else {
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

          {/* Components Section */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" />
              Components Required
            </Label>
            <div className="space-y-3">
              {components.map((component, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <SearchableSelect
                        items={componentItems}
                        value={component.name}
                        onSelect={(item) => {
                          const newComponents = [...components];
                          newComponents[index].name = item.name;
                          setComponents(newComponents);
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
                    <div className="w-40">
                      <NumericInput
                        value={component.quantity || 1}
                        onChange={(val) => {
                          const newComponents = [...components];
                          newComponents[index].quantity = val;
                          setComponents(newComponents);
                        }}
                        min={1}
                        placeholder="Qty"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (index === 0) {
                          const newComponents = [...components];
                          newComponents[0] = { name: "", quantity: 1 };
                          setComponents(newComponents);
                        } else {
                          setComponents(components.filter((_, i) => i !== index));
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
                onClick={() => setComponents([...components, { name: "", quantity: 1 }])}
              >
                <Plus className="w-4 h-4" />
                Add Component
              </Button>
            </div>
          </div>

          {/* Materials Section */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" />
              Materials
            </Label>
            <div className="space-y-3">
              {materials.map((material, index) => {
                const selectedMaterial = materialItems.find(item => item.name === material.name);
                const lengthPerPieceMm = material.lengthPerPiece ? parseFloat(material.lengthPerPiece) || 0 : 0;
                const totalLengthNeededMm = lengthPerPieceMm * workOrderQuantity;
                const stockMm = selectedMaterial ? (materialStockMm[selectedMaterial.id] ?? 0) : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <SearchableSelect
                          items={materialItems}
                          value={material.name}
                          onSelect={(item) => {
                            const newMaterials = [...materials];
                            newMaterials[index].name = item.name;
                            setMaterials(newMaterials);
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (index === 0) {
                            const newMaterials = [...materials];
                            newMaterials[0] = { name: "", notes: "", lengthPerPiece: "" };
                            setMaterials(newMaterials);
                          } else {
                            setMaterials(materials.filter((_, i) => i !== index));
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Length per piece (mm)</Label>
                        <NumericInput
                          value={lengthPerPieceMm}
                          onChange={(val) => {
                            const newMaterials = [...materials];
                            newMaterials[index].lengthPerPiece = val > 0 ? String(val) : "";
                            setMaterials(newMaterials);
                          }}
                          min={0}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Total length needed (mm)</Label>
                        <Input
                          readOnly
                          value={totalLengthNeededMm > 0 ? totalLengthNeededMm.toFixed(2) : "—"}
                          className="h-9 bg-muted"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Stock (mm)</Label>
                        <Input
                          readOnly
                          value={selectedMaterial ? stockMm.toFixed(0) : "—"}
                          className="h-9 bg-muted"
                        />
                      </div>
                    </div>
                  <Input 
                    placeholder="Material notes (optional)"
                    value={material.notes}
                    onChange={(e) => {
                      const newMaterials = [...materials];
                      newMaterials[index].notes = e.target.value;
                      setMaterials(newMaterials);
                    }}
                    className="text-sm"
                  />
                  </div>
                );
              })}
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => setMaterials([...materials, { name: "", notes: "", lengthPerPiece: "" }])}
              >
                <Plus className="w-4 h-4" />
                Add Material
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
                    {item.type === "operator" ? (
                      <SearchableSelect
                        items={staffMembers}
                        value={item.name}
                        onSelect={(staff) => {
                          const newItems = [...operatorsAndMachines];
                          newItems[index].name = staff.name;
                          setOperatorsAndMachines(newItems);
                        }}
                        placeholder="Select operator"
                        searchPlaceholder="Search operators..."
                        emptyMessage="No operators found."
                        getItemValue={(s) => s.name}
                        getItemLabel={(s) => `${s.name}${s.position ? ` - ${s.position}` : ''}`}
                        getItemSearchText={(s) => `${s.name} ${s.position || ''} ${s.department || ''}`}
                        showPartNumber={false}
                      />
                    ) : (
                      <SearchableSelect
                        items={machineLibraryItems}
                        value={item.name}
                        onSelect={(machine) => {
                          const newItems = [...operatorsAndMachines];
                          newItems[index].name = machine.name;
                          setOperatorsAndMachines(newItems);
                        }}
                        placeholder="Select machine"
                        searchPlaceholder="Search machines..."
                        emptyMessage="No machines found."
                        getItemValue={(m) => m.name}
                        getItemLabel={(m) => m.name}
                        getItemSearchText={(m) => `${m.name} ${m.part_number || ''}`}
                        getItemPartNumber={(m) => m.part_number}
                      />
                    )}
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
                      if (index === 0) {
                        const newItems = [...operatorsAndMachines];
                        newItems[0] = { name: "", type: "operator" };
                        setOperatorsAndMachines(newItems);
                      } else {
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

          {/* Control Section */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-4 h-4" />
              Person in Charge of Control
            </Label>
            <SearchableSelect
              items={staffMembers}
              value={controlInChargeId === "__none__" ? "" : controlInChargeId}
              onSelect={(staff) => setControlInChargeId(staff?.id ?? "__none__")}
              placeholder="None"
              searchPlaceholder="Search staff..."
              emptyMessage="No staff found."
              allowClear
              getItemValue={(s) => s.id}
              getItemLabel={(s) => `${s.name}${s.position ? ` - ${s.position}` : ''}`}
              getItemSearchText={(s) => `${s.name} ${s.position || ''} ${s.department || ''}`}
              showPartNumber={false}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkOrder}>
              {isEditMode ? "Update Work Order" : "Create Work Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
