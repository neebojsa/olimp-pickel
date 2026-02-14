import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Package, Settings, Users, Plus, Trash2, Calendar as CalendarIcon, ChevronsUpDown, Check, ClipboardCheck } from "lucide-react";
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
  const [materialSearchTerms, setMaterialSearchTerms] = useState<Record<number, string>>({});
  const [materialSearchOpen, setMaterialSearchOpen] = useState<Record<number, boolean>>({});
  const [toolSearchTerms, setToolSearchTerms] = useState<Record<number, string>>({});
  const [toolSearchOpen, setToolSearchOpen] = useState<Record<number, boolean>>({});
  const [components, setComponents] = useState([{ name: "", quantity: 1 }]);
  const [componentItems, setComponentItems] = useState<any[]>([]);
  const [componentSearchTerms, setComponentSearchTerms] = useState<Record<number, string>>({});
  const [componentSearchOpen, setComponentSearchOpen] = useState<Record<number, boolean>>({});
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);
  const [workOrderDueDate, setWorkOrderDueDate] = useState<Date | undefined>(undefined);
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
        setMaterialSearchTerms({});
        setMaterialSearchOpen({});
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
      setToolSearchTerms({});
      setToolSearchOpen({});
      setComponents([{ name: "", quantity: 1 }]);
      setComponentSearchTerms({});
      setComponentSearchOpen({});
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
        setMaterialSearchTerms({});
        setMaterialSearchOpen({});
      }
      setWorkOrderDueDate(undefined);
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
      setToolSearchTerms({});
      setToolSearchOpen({});
      setComponents([{ name: "", quantity: 1 }]);
      setComponentSearchTerms({});
      setComponentSearchOpen({});
    setOperatorsAndMachines([{ name: "", type: "operator" }]);
    setControlInChargeId("__none__");
    setMaterials([{ name: "", notes: "", lengthPerPiece: "" }]);
    setWorkOrderDueDate(undefined);
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
              <Select value={selectedPartId && inventoryItems.some(i => i.id === selectedPartId) ? selectedPartId : "__none__"} onValueChange={(value) => {
                const partId = value === "__none__" ? "" : value;
                setSelectedPartId(partId);
                const selectedPart = partId ? inventoryItems.find(item => item.id === partId) : undefined;
                setSelectedPartNumber(selectedPart ? `${selectedPart.name} - ${selectedPart.part_number || 'N/A'}` : "");
                
                // Load tools from the selected part
                if (selectedPart?.tools_used && Array.isArray(selectedPart.tools_used) && selectedPart.tools_used.length > 0) {
                  const toolsData = selectedPart.tools_used.filter((t: any) => t.name).map((t: any) => ({
                    name: t.name || "",
                    quantity: t.quantity ? t.quantity.toString() : ""
                  }));
                  if (toolsData.length > 0) {
                    setTools(toolsData);
                  } else {
                    setTools([{ name: "", quantity: "" }]);
                  }
                } else {
                  setTools([{ name: "", quantity: "" }]);
                }
                
                // Load components from the selected part
                if (selectedPart?.components_used && Array.isArray(selectedPart.components_used) && selectedPart.components_used.length > 0) {
                  const componentsData = selectedPart.components_used.filter((c: any) => c.name).map((c: any) => ({
                    name: c.name || "",
                    quantity: c.quantity || 1
                  }));
                  if (componentsData.length > 0) {
                    setComponents(componentsData);
                  } else {
                    setComponents([{ name: "", quantity: 1 }]);
                  }
                } else {
                  setComponents([{ name: "", quantity: 1 }]);
                }
                
                // Load materials from the selected part (only if not already set via defaultMaterials)
                if (!defaultMaterials || (defaultMaterials && defaultMaterials.length === 0)) {
                  if (selectedPart?.materials_used && Array.isArray(selectedPart.materials_used) && selectedPart.materials_used.length > 0) {
                    const materialsData = selectedPart.materials_used.filter((m: any) => m.name).map((m: any) => ({
                      name: m.name || "",
                      notes: m.notes || "",
                      lengthPerPiece: m.lengthPerPiece != null ? String(m.lengthPerPiece) : ""
                    }));
                    if (materialsData.length > 0) {
                      setMaterials(materialsData);
                    } else {
                      setMaterials([{ name: "", notes: "", lengthPerPiece: "" }]);
                    }
                  } else {
                    setMaterials([{ name: "", notes: "", lengthPerPiece: "" }]);
                  }
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select part</SelectItem>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {item.part_number || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {tools.map((tool, index) => {
                const selectedToolItem = toolLibraryItems.find(t => t.name === tool.name);
                const selectedToolDisplayName = selectedToolItem
                  ? formatToolName(selectedToolItem.materials_used, selectedToolItem.name)
                  : tool.name;
                return (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Popover
                        open={toolSearchOpen[index] || false}
                        onOpenChange={(open) => setToolSearchOpen(prev => ({ ...prev, [index]: open }))}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between text-left font-normal h-auto min-h-[40px] py-2 whitespace-normal"
                          >
                            {tool.name ? (
                              <span className="flex-1 break-words pr-2">
                                {selectedToolDisplayName}
                                {selectedToolItem?.part_number && (
                                  <span className="text-muted-foreground"> | {selectedToolItem.part_number}</span>
                                )}
                              </span>
                            ) : "Select tool"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-[var(--radix-popover-trigger-width)] p-0" 
                          align="start"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          <Command>
                            <CommandInput
                              placeholder="Search tools..."
                              value={toolSearchTerms[index] || ''}
                              onValueChange={(value) => {
                                setToolSearchTerms(prev => ({ ...prev, [index]: value }));
                              }}
                            />
                            <CommandList>
                              <CommandEmpty>No tools found.</CommandEmpty>
                              <CommandGroup>
                                {toolLibraryItems
                                  .filter(item => {
                                    const searchTerm = (toolSearchTerms[index] || '').toLowerCase();
                                    if (!searchTerm) return true;
                                    const displayName = formatToolName(item.materials_used, item.name);
                                    const nameMatch = (item.name || '').toLowerCase().includes(searchTerm);
                                    const partMatch = (item.part_number || '').toLowerCase().includes(searchTerm);
                                    const displayMatch = displayName.toLowerCase().includes(searchTerm);
                                    return nameMatch || partMatch || displayMatch;
                                  })
                                  .map((item) => {
                                    const displayName = formatToolName(item.materials_used, item.name);
                                    return (
                                      <CommandItem
                                        key={item.id}
                                        value={`${displayName} ${item.part_number || ''}`}
                                        onSelect={() => {
                                          const newTools = [...tools];
                                          newTools[index].name = item.name;
                                          setTools(newTools);
                                          setToolSearchOpen(prev => ({ ...prev, [index]: false }));
                                          setToolSearchTerms(prev => ({ ...prev, [index]: '' }));
                                        }}
                                        className="items-start py-2"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4 mt-1 shrink-0",
                                            tool.name === item.name ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col flex-1 min-w-0">
                                          <span className="break-words">{displayName}</span>
                                          {item.part_number && (
                                            <span className="text-xs text-muted-foreground">Part #: {item.part_number}</span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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
                            // First row: reset selection only
                            const newTools = [...tools];
                            newTools[0] = { name: "", quantity: "" };
                            setTools(newTools);
                            setToolSearchTerms(prev => ({ ...prev, 0: '' }));
                            setToolSearchOpen(prev => ({ ...prev, 0: false }));
                          } else {
                            setTools(tools.filter((_, i) => i !== index));
                            const newSearchTerms: Record<number, string> = {};
                            const newSearchOpen: Record<number, boolean> = {};
                            tools.forEach((_, i) => {
                              if (i < index) {
                                newSearchTerms[i] = toolSearchTerms[i] || '';
                                newSearchOpen[i] = toolSearchOpen[i] || false;
                              } else if (i > index) {
                                newSearchTerms[i - 1] = toolSearchTerms[i] || '';
                                newSearchOpen[i - 1] = toolSearchOpen[i] || false;
                              }
                            });
                            setToolSearchTerms(newSearchTerms);
                            setToolSearchOpen(newSearchOpen);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
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
              {components.map((component, index) => {
                const selectedComponent = componentItems.find(item => item.name === component.name);
                return (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Popover
                        open={componentSearchOpen[index] || false}
                        onOpenChange={(open) => setComponentSearchOpen(prev => ({ ...prev, [index]: open }))}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between text-left font-normal h-auto min-h-[40px] py-2 whitespace-normal"
                          >
                            {selectedComponent ? (
                              <span className="flex-1 break-words pr-2">
                                {selectedComponent.name}
                                {selectedComponent.part_number && (
                                  <span className="text-muted-foreground"> | {selectedComponent.part_number}</span>
                                )}
                              </span>
                            ) : "Select component"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-[var(--radix-popover-trigger-width)] p-0" 
                          align="start"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          <Command>
                            <CommandInput
                              placeholder="Search components..."
                              value={componentSearchTerms[index] || ''}
                              onValueChange={(value) => {
                                setComponentSearchTerms(prev => ({ ...prev, [index]: value }));
                              }}
                            />
                            <CommandList>
                              <CommandEmpty>No components found.</CommandEmpty>
                              <CommandGroup>
                                {componentItems
                                  .filter(item => {
                                    const searchTerm = (componentSearchTerms[index] || '').toLowerCase();
                                    if (!searchTerm) return true;
                                    const nameMatch = (item.name || '').toLowerCase().includes(searchTerm);
                                    const partNumberMatch = (item.part_number || '').toLowerCase().includes(searchTerm);
                                    return nameMatch || partNumberMatch;
                                  })
                                  .map((item) => (
                                    <CommandItem
                                      key={item.id}
                                      value={`${item.name} ${item.part_number || ''}`}
                                      onSelect={() => {
                                        const newComponents = [...components];
                                        newComponents[index].name = item.name;
                                        setComponents(newComponents);
                                        setComponentSearchOpen(prev => ({ ...prev, [index]: false }));
                                        setComponentSearchTerms(prev => ({ ...prev, [index]: '' }));
                                      }}
                                      className="items-start py-2"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4 mt-1 shrink-0",
                                          component.name === item.name ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <span className="break-words">{item.name}</span>
                                        {item.part_number && (
                                          <span className="text-xs text-muted-foreground">Part #: {item.part_number}</span>
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
                          setComponentSearchTerms(prev => ({ ...prev, 0: '' }));
                          setComponentSearchOpen(prev => ({ ...prev, 0: false }));
                        } else {
                          setComponents(components.filter((_, i) => i !== index));
                          const newSearchTerms: Record<number, string> = {};
                          const newSearchOpen: Record<number, boolean> = {};
                          components.forEach((_, i) => {
                            if (i < index) {
                              newSearchTerms[i] = componentSearchTerms[i] || '';
                              newSearchOpen[i] = componentSearchOpen[i] || false;
                            } else if (i > index) {
                              newSearchTerms[i - 1] = componentSearchTerms[i] || '';
                              newSearchOpen[i - 1] = componentSearchOpen[i] || false;
                            }
                          });
                          setComponentSearchTerms(newSearchTerms);
                          setComponentSearchOpen(newSearchOpen);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
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
                        <Popover
                          open={materialSearchOpen[index] || false}
                          onOpenChange={(open) => setMaterialSearchOpen(prev => ({ ...prev, [index]: open }))}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between text-left font-normal h-auto min-h-[40px] py-2 whitespace-normal"
                            >
                              {selectedMaterial ? (
                                <span className="flex-1 break-words pr-2">
                                  {selectedMaterial.name}
                                  {selectedMaterial.part_number && (
                                    <span className="text-muted-foreground"> | {selectedMaterial.part_number}</span>
                                  )}
                                </span>
                              ) : "Select material"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-[var(--radix-popover-trigger-width)] p-0" 
                            align="start"
                            onWheel={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                          >
                            <Command>
                              <CommandInput
                                placeholder="Search materials..."
                                value={materialSearchTerms[index] || ''}
                                onValueChange={(value) => {
                                  setMaterialSearchTerms(prev => ({ ...prev, [index]: value }));
                                }}
                              />
                              <CommandList>
                                <CommandEmpty>No materials found.</CommandEmpty>
                                <CommandGroup>
                                  {materialItems
                                    .filter(item => {
                                      const searchTerm = (materialSearchTerms[index] || '').toLowerCase();
                                      if (!searchTerm) return true;
                                      const nameMatch = (item.name || '').toLowerCase().includes(searchTerm);
                                      const partNumberMatch = (item.part_number || '').toLowerCase().includes(searchTerm);
                                      return nameMatch || partNumberMatch;
                                    })
                                    .map((item) => (
                                      <CommandItem
                                        key={item.id}
                                        value={`${item.name} ${item.part_number || ''}`}
                                        onSelect={() => {
                                          const newMaterials = [...materials];
                                          newMaterials[index].name = item.name;
                                          setMaterials(newMaterials);
                                          setMaterialSearchOpen(prev => ({ ...prev, [index]: false }));
                                          setMaterialSearchTerms(prev => ({ ...prev, [index]: '' }));
                                        }}
                                        className="items-start py-2"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4 mt-1 shrink-0",
                                            material.name === item.name ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col flex-1 min-w-0">
                                          <span className="break-words">{item.name}</span>
                                          {item.part_number && (
                                            <span className="text-xs text-muted-foreground">Part #: {item.part_number}</span>
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (index === 0) {
                            const newMaterials = [...materials];
                            newMaterials[0] = { name: "", notes: "", lengthPerPiece: "" };
                            setMaterials(newMaterials);
                            setMaterialSearchTerms(prev => ({ ...prev, 0: '' }));
                            setMaterialSearchOpen(prev => ({ ...prev, 0: false }));
                          } else {
                            setMaterials(materials.filter((_, i) => i !== index));
                            const newSearchTerms: Record<number, string> = {};
                            const newSearchOpen: Record<number, boolean> = {};
                            materials.forEach((_, i) => {
                              if (i < index) {
                                newSearchTerms[i] = materialSearchTerms[i] || '';
                                newSearchOpen[i] = materialSearchOpen[i] || false;
                              } else if (i > index) {
                                newSearchTerms[i - 1] = materialSearchTerms[i] || '';
                                newSearchOpen[i - 1] = materialSearchOpen[i] || false;
                              }
                            });
                            setMaterialSearchTerms(newSearchTerms);
                            setMaterialSearchOpen(newSearchOpen);
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
                          staffMembers.map((staff) => (
                            <SelectItem key={staff.id} value={staff.name}>
                              {staff.name} - {staff.position}
                            </SelectItem>
                          ))
                        ) : (
                          machineLibraryItems.map((machine) => (
                            <SelectItem key={machine.id} value={machine.name}>
                              {machine.name}
                              {machine.part_number && (
                                <span className="text-muted-foreground"> | {machine.part_number}</span>
                              )}
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
              <Select value={controlInChargeId} onValueChange={setControlInChargeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member for control" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name} {staff.position && `- ${staff.position}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
