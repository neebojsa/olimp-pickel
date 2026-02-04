import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Package, Settings, Users, Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";

// Predefined tools and machines for suggestions
const toolsList = [
  "CNC Mill", "Drill Press", "Precision Vise", "Laser Cutter", "Press Brake", 
  "Precision Lathe", "CMM Machine", "Carbide Inserts", "5-Axis CNC Mill", 
  "Boring Bar Set", "Go/No-Go Gauges", "Horizontal Boring Machine", 
  "Carbide Tooling Set", "Surface Finish Gauge"
];

const machinesList = [
  "CNC Machine #1", "CNC Machine #2", "CNC Machine #3", "Laser Cutting Machine #1",
  "CNC Lathe #2", "5-Axis CNC Machine #1", "Horizontal Boring Machine #2"
];

interface CreateWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPartId?: string;
  defaultMaterials?: Array<{ name: string; notes?: string; lengthPerPiece?: string }>;
  onSuccess?: () => void;
}

export function CreateWorkOrderDialog({ 
  open, 
  onOpenChange, 
  defaultPartId,
  defaultMaterials,
  onSuccess 
}: CreateWorkOrderDialogProps) {
  const { toast } = useToast();
  const [tools, setTools] = useState([{ name: "", quantity: "" }]);
  const [operatorsAndMachines, setOperatorsAndMachines] = useState([{ name: "", type: "operator" as "operator" | "machine" }]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [selectedPartId, setSelectedPartId] = useState(defaultPartId || "");
  const [selectedPartNumber, setSelectedPartNumber] = useState("");
  const [materials, setMaterials] = useState(() => {
    // Initialize with defaultMaterials if provided, otherwise empty
    if (defaultMaterials && defaultMaterials.length > 0) {
      return defaultMaterials.map(m => ({
        name: m.name || "",
        notes: m.notes || ""
      }));
    }
    return [{ name: "", notes: "" }];
  });
  const [materialItems, setMaterialItems] = useState<any[]>([]);
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);
  const [workOrderDueDate, setWorkOrderDueDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (open) {
      fetchInventoryItems();
      fetchStaffMembers();
      fetchMaterialItems();
      
      // Initialize materials with defaultMaterials when dialog opens
      if (defaultMaterials && defaultMaterials.length > 0) {
        setMaterials(defaultMaterials.map(m => ({
          name: m.name || "",
          notes: m.notes || ""
        })));
      } else {
        setMaterials([{ name: "", notes: "" }]);
      }
    }
  }, [open, defaultMaterials]);

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

  // Update selectedPartNumber when selectedPartId changes
  useEffect(() => {
    if (selectedPartId && inventoryItems.length > 0) {
      const selectedPart = inventoryItems.find(item => item.id === selectedPartId);
      if (selectedPart) {
        setSelectedPartNumber(`${selectedPart.name} - ${selectedPart.part_number || 'N/A'}`);
      }
    }
  }, [selectedPartId, inventoryItems]);

  const fetchInventoryItems = async () => {
    const { data } = await supabase.from('inventory').select('id, name, description, part_number, category').eq('category', 'Parts');
    if (data) {
      setInventoryItems(data);
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

  const handleCreateWorkOrder = async () => {
    // Get form values
    const quantity = (document.getElementById('quantity') as HTMLInputElement)?.value;
    const productionTime = (document.getElementById('productionTime') as HTMLInputElement)?.value;
    const dueDate = workOrderDueDate ? format(workOrderDueDate, 'yyyy-MM-dd') : null;
    const description = (document.getElementById('description') as HTMLTextAreaElement)?.value;

    if (!description || !selectedPartId) {
      toast({
        title: "Error",
        description: "Please fill in required fields and select a part",
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

    // Get selected part details
    const selectedPart = inventoryItems.find(item => item.id === selectedPartId);
    
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
        inventory_id: selectedPartId,
        part_name: selectedPart?.name,
        part_number: selectedPart?.part_number
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
      setOperatorsAndMachines([{ name: "", type: "operator" }]);
      // Reset materials to defaultMaterials if provided, otherwise empty
      if (defaultMaterials && defaultMaterials.length > 0) {
        setMaterials(defaultMaterials.map(m => ({
          name: m.name || "",
          notes: m.notes || ""
        })));
      } else {
        setMaterials([{ name: "", notes: "" }]);
      }
      setWorkOrderDueDate(undefined);
      
      // Clear form inputs
      const quantityInput = document.getElementById('quantity') as HTMLInputElement;
      const productionTimeInput = document.getElementById('productionTime') as HTMLInputElement;
      const descriptionInput = document.getElementById('description') as HTMLTextAreaElement;
      if (quantityInput) quantityInput.value = "";
      if (productionTimeInput) productionTimeInput.value = "";
      if (descriptionInput) descriptionInput.value = "";
      
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
      
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
    setOperatorsAndMachines([{ name: "", type: "operator" }]);
    setMaterials([{ name: "", notes: "" }]);
    setWorkOrderDueDate(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto thin-scrollbar">
        <DialogHeader>
          <DialogTitle>Create New Work Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="workOrderNumber">Work Order Number</Label>
              <Input 
                id="workOrderNumber" 
                placeholder="Auto-generated (e.g., 259-01)" 
                disabled 
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="partName">Part</Label>
              <Select value={selectedPartId} onValueChange={(value) => {
                setSelectedPartId(value);
                const selectedPart = inventoryItems.find(item => item.id === value);
                setSelectedPartNumber(selectedPart ? `${selectedPart.name} - ${selectedPart.part_number || 'N/A'}` : "");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select part" />
                </SelectTrigger>
                <SelectContent>
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
                value={0}
                onChange={() => {}}
                min={0}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
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
                        {toolsList.map((toolName) => (
                          <SelectItem key={toolName} value={toolName}>
                            {toolName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

          {/* Materials Section */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" />
              Materials
            </Label>
            <div className="space-y-3">
              {materials.map((material, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={material.name}
                        onValueChange={(value) => {
                          const newMaterials = [...materials];
                          newMaterials[index].name = value;
                          setMaterials(newMaterials);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {materialItems.map((item) => (
                            <SelectItem key={item.id} value={item.name}>
                              {item.name} {item.part_number && `(${item.part_number})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (materials.length > 1) {
                          setMaterials(materials.filter((_, i) => i !== index));
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => setMaterials([...materials, { name: "", notes: "" }])}
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
                          machinesList.map((machine) => (
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
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkOrder}>
              Create Work Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
