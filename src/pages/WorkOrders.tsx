import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, FileText, Wrench, Clock, Plus, Edit, Printer, Calendar, Settings, Users, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

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

// Shared parts data that will be imported by inventory
export const mockParts = [
  {
    id: "P-001",
    name: "Aluminum Bracket Assembly",
    partNumber: "AL-001",
    customerId: "C-001",
    customer: "ABC Manufacturing",
    location: "Warehouse A-1",
    description: "High-strength aluminum bracket assembly for industrial mounting applications",
    currentQuantity: 45,
    minimumQuantity: 10,
    unitOfMeasure: "pcs",
    leadTime: "5-7 days",
    sellingPrice: 125.50,
    manufacturingCost: 85.30,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop",
    drawingFiles: ["AL-001-Assembly.pdf", "AL-001-Detail.dwg"],
    materialsUsed: ["6061-T6 Aluminum", "Stainless Steel Bolts", "Neoprene Gasket"],
    workOrder: "WO-2024-001",
    productionTime: "3.5 hours",
    notes: "Requires precision machining and anodized finish",
    history: [
      { action: "Stock Replenishment", date: "2024-01-10", quantity: 25 },
      { action: "Production Completed", date: "2024-01-08", quantity: 50 },
      { action: "Order Shipped", date: "2024-01-05", quantity: 15 }
    ]
  },
  {
    id: "P-002",
    name: "Steel Mounting Plate",
    partNumber: "ST-002",
    customerId: "C-002",
    customer: "XYZ Industries",
    location: "Warehouse B-2",
    description: "Heavy-duty steel mounting plate with precision drilled holes",
    currentQuantity: 32,
    minimumQuantity: 15,
    unitOfMeasure: "pcs",
    leadTime: "3-5 days",
    sellingPrice: 89.75,
    manufacturingCost: 62.40,
    image: "https://images.unsplash.com/photo-1609205813671-7b7cf7bb0b6c?w=300&h=200&fit=crop",
    drawingFiles: ["ST-002-Plate.pdf", "ST-002-Drilling.dwg"],
    materialsUsed: ["A36 Steel Plate", "Powder Coating"],
    workOrder: "WO-2024-002",
    productionTime: "2.2 hours",
    notes: "Requires heat treatment and coating application",
    history: [
      { action: "Quality Check Passed", date: "2024-01-12", quantity: 0 },
      { action: "Production Completed", date: "2024-01-09", quantity: 40 }
    ]
  },
  {
    id: "P-003",
    name: "Precision Shaft",
    partNumber: "PR-003",
    customerId: "C-003",
    customer: "TechCorp Solutions",
    location: "Warehouse C-1",
    description: "High-precision machined shaft with tight tolerances",
    currentQuantity: 8,
    minimumQuantity: 12,
    unitOfMeasure: "pcs",
    leadTime: "4-6 days",
    sellingPrice: 185.00,
    manufacturingCost: 125.75,
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=300&h=200&fit=crop",
    drawingFiles: ["PR-003-Drawing.pdf", "PR-003-Tolerance.dwg"],
    materialsUsed: ["4140 Steel Rod", "Precision Cutting Tools"],
    workOrder: "WO-2024-003",
    productionTime: "5.5 hours",
    notes: "Critical tolerances +/- 0.001 inch. Use coordinate measuring machine for inspection.",
    history: [
      { action: "Work Order Created", date: "2024-01-20", quantity: 0 },
      { action: "Material Ordered", date: "2024-01-18", quantity: 0 }
    ]
  },
  {
    id: "P-004",
    name: "Custom Gear Housing",
    partNumber: "GH-004",
    customerId: "C-004",
    customer: "MechSystems Ltd",
    location: "Warehouse D-1",
    description: "Custom aluminum gear housing with internal bearing seats",
    currentQuantity: 12,
    minimumQuantity: 8,
    unitOfMeasure: "pcs",
    leadTime: "6-8 days",
    sellingPrice: 245.00,
    manufacturingCost: 165.80,
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&h=200&fit=crop",
    drawingFiles: ["GH-004-Assembly.pdf", "GH-004-Machining.dwg", "GH-004-Bearing-Seats.dwg"],
    materialsUsed: ["6061-T6 Aluminum Block", "Sealed Bearings", "O-Ring Seals"],
    workOrder: "WO-2024-004",
    productionTime: "8.0 hours",
    notes: "Complex internal geometry. Multiple setups required. Final inspection with go/no-go gauges.",
    history: [
      { action: "Production Started", date: "2024-01-15", quantity: 0 },
      { action: "Material Prepared", date: "2024-01-12", quantity: 15 }
    ]
  },
  {
    id: "P-005",
    name: "Bearing Support Block",
    partNumber: "BS-005",
    customerId: "C-005",
    customer: "Industrial Partners",
    location: "Warehouse E-2",
    description: "Cast iron bearing support block with precision bore",
    currentQuantity: 6,
    minimumQuantity: 10,
    unitOfMeasure: "pcs",
    leadTime: "7-10 days",
    sellingPrice: 156.25,
    manufacturingCost: 98.40,
    image: "https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=300&h=200&fit=crop",
    drawingFiles: ["BS-005-Block.pdf", "BS-005-Bore.dwg"],
    materialsUsed: ["Cast Iron Block", "Boring Tools", "Surface Grinder"],
    workOrder: "WO-2024-005",
    productionTime: "6.5 hours",
    notes: "Cast iron requires carbide tooling. Surface finish critical for bearing fit.",
    history: [
      { action: "Production On Hold", date: "2024-01-18", quantity: 0 },
      { action: "Customer Change Request", date: "2024-01-16", quantity: 0 }
    ]
  }
];

// Mock work orders data
  const mockWorkOrders = [
  {
    id: "WO-001",
    workOrderNumber: "WO-2024-001",
    partName: "Aluminum Bracket Assembly",
    partNumber: "AL-001",
    partId: "P-001",
    status: "In Progress",
    priority: "High",
    percentageCompletion: 75,
    orderDate: "2024-01-15",
    dueDate: "2024-01-25",
    quantity: 25,
    description: "High-strength aluminum bracket assembly for industrial mounting applications",
    productionTime: "3.5 hours",
    setupInstructions: "Mount workpiece in precision vise, ensure proper alignment and clamping pressure",
    qualityRequirements: "All dimensions must be within ±0.005 inch tolerance. Check surface finish Ra 32 or better",
    productionNotes: "Requires precision machining and anodized finish",
    tools: [
      { name: "CNC Mill", quantity: 1 },
      { name: "Drill Press", quantity: 1 },
      { name: "Precision Vise", quantity: 2 }
    ],
    operatorsAndMachines: [
      { name: "Machine Operator - John Smith", type: "operator" },
      { name: "CNC Machine #3", type: "machine" },
      { name: "Quality Inspector - Sarah Johnson", type: "operator" }
    ]
  },
  {
    id: "WO-002", 
    workOrderNumber: "WO-2024-002",
    partName: "Steel Mounting Plate",
    partNumber: "ST-002",
    partId: "P-002",
    status: "Completed",
    priority: "Medium",
    percentageCompletion: 100,
    orderDate: "2024-01-12",
    dueDate: "2024-01-20",
    quantity: 40,
    description: "Heavy-duty steel mounting plate with precision drilled holes",
    productionTime: "2.2 hours",
    setupInstructions: "Secure material in laser cutting bed, verify material thickness and cutting parameters",
    qualityRequirements: "Hole dimensions ±0.002 inch, edge quality per ISO 9013 class 2",
    productionNotes: "Requires heat treatment and coating application",
    tools: [
      { name: "Laser Cutter", quantity: 1 },
      { name: "Press Brake", quantity: 1 }
    ],
    operatorsAndMachines: [
      { name: "Sheet Metal Operator - Mike Wilson", type: "operator" },
      { name: "Laser Cutting Machine #1", type: "machine" }
    ]
  },
  {
    id: "WO-003",
    workOrderNumber: "WO-2024-003", 
    partName: "Precision Shaft",
    partNumber: "PR-003",
    partId: "P-003",
    status: "Not Started",
    priority: "Low",
    percentageCompletion: 0,
    orderDate: "2024-01-20",
    dueDate: "2024-01-30",
    quantity: 15,
    description: "High-precision machined shaft with tight tolerances",
    productionTime: "5.5 hours",
    setupInstructions: "Center shaft in 4-jaw chuck, indicate runout to <0.0002 inch TIR",
    qualityRequirements: "All critical dimensions ±0.001 inch, surface finish 32 Ra maximum",
    productionNotes: "Critical tolerances +/- 0.001 inch. Use coordinate measuring machine for inspection.",
    tools: [
      { name: "Precision Lathe", quantity: 1 },
      { name: "CMM Machine", quantity: 1 },
      { name: "Carbide Inserts", quantity: 5 }
    ],
    operatorsAndMachines: [
      { name: "Precision Machinist - David Brown", type: "operator" },
      { name: "CNC Lathe #2", type: "machine" },
      { name: "Quality Inspector - Lisa Davis", type: "operator" }
    ]
  },
  {
    id: "WO-004",
    workOrderNumber: "WO-2024-004",
    partName: "Custom Gear Housing", 
    partNumber: "GH-004",
    partId: "P-004",
    status: "In Progress",
    priority: "High",
    percentageCompletion: 45,
    orderDate: "2024-01-18",
    dueDate: "2024-02-01",
    quantity: 8,
    description: "Custom aluminum gear housing with internal bearing seats",
    productionTime: "8.0 hours",
    setupInstructions: "Secure housing in 5-axis vise, establish workpiece coordinate system using probe cycle",
    qualityRequirements: "Bearing bore diameter H7 tolerance, bearing seats perpendicular within 0.001 inch",
    productionNotes: "Complex internal geometry. Multiple setups required. Final inspection with go/no-go gauges.",
    tools: [
      { name: "5-Axis CNC Mill", quantity: 1 },
      { name: "Boring Bar Set", quantity: 1 },
      { name: "Go/No-Go Gauges", quantity: 3 }
    ],
    operatorsAndMachines: [
      { name: "CNC Programmer - Alex Martinez", type: "operator" },
      { name: "Senior Machinist - Robert Lee", type: "operator" },
      { name: "5-Axis CNC Machine #1", type: "machine" }
    ]
  },
  {
    id: "WO-005",
    workOrderNumber: "WO-2024-005",
    partName: "Bearing Support Block",
    partNumber: "BS-005",
    partId: "P-005",
    status: "On Hold",
    priority: "Medium",
    percentageCompletion: 20,
    orderDate: "2024-01-10",
    dueDate: "2024-01-28",
    quantity: 12,
    description: "Cast iron bearing support block with precision bore",
    productionTime: "6.5 hours",
    setupInstructions: "Mount block on boring machine table, align bore axis with spindle centerline",
    qualityRequirements: "Bore diameter +0.0000/-0.0005 inch, concentricity within 0.002 inch TIR",
    productionNotes: "Cast iron requires carbide tooling. Surface finish critical for bearing fit.",
    tools: [
      { name: "Horizontal Boring Machine", quantity: 1 },
      { name: "Carbide Tooling Set", quantity: 1 },
      { name: "Surface Finish Gauge", quantity: 1 }
    ],
    operatorsAndMachines: [
      { name: "Boring Machine Operator - James Garcia", type: "operator" },
      { name: "Horizontal Boring Machine #2", type: "machine" }
    ]
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "In Progress":
      return "bg-blue-500/10 text-blue-700 border-blue-200";
    case "On Hold":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    case "Not Started":
      return "bg-gray-500/10 text-gray-700 border-gray-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "bg-red-500/10 text-red-700 border-red-200";
    case "Medium":
      return "bg-orange-500/10 text-orange-700 border-orange-200";
    case "Low":
      return "bg-green-500/10 text-green-700 border-green-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

export default function WorkOrders() {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
  const [isWorkOrderDetailsOpen, setIsWorkOrderDetailsOpen] = useState(false);
  const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [tools, setTools] = useState([{ name: "", quantity: "" }]);
  const [operatorsAndMachines, setOperatorsAndMachines] = useState([{ name: "", type: "operator" }]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [selectedPartNumber, setSelectedPartNumber] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");

  useEffect(() => {
    fetchWorkOrders();
    fetchInventoryItems();
    fetchStaffMembers();
  }, []);

  const fetchWorkOrders = async () => {
    const { data } = await supabase.from('work_orders').select('*');
    if (data) {
      const formattedWorkOrders = data.map(wo => ({
        ...wo,
        workOrderNumber: wo.work_order_number || 'Pending',
        partName: wo.part_name || 'No Part Selected',
        partNumber: wo.part_number || 'N/A',
        percentageCompletion: 50, // Placeholder
        productionTime: "3.5 hours", // Placeholder
        setupInstructions: "", // Placeholder
        qualityRequirements: "", // Placeholder
        productionNotes: wo.description || "",
        tools: [], // Placeholder
        operatorsAndMachines: [] // Placeholder
      }));
      setWorkOrders(formattedWorkOrders);
    }
  };

  const extractPartNumber = (description: string) => {
    const match = description.match(/Part #([^:]+):/);
    return match ? match[1] : "";
  };

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

  const handleDeleteWorkOrder = async (workOrderId: string) => {
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', workOrderId);

    if (!error) {
      setWorkOrders(prev => prev.filter(wo => wo.id !== workOrderId));
      toast({
        title: "Work Order Deleted",
        description: "The work order has been successfully deleted.",
      });
    }
  };

  const handleStatusChange = async (workOrderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('work_orders')
      .update({ status: newStatus })
      .eq('id', workOrderId);

    if (!error) {
      setWorkOrders(prev => prev.map(wo => 
        wo.id === workOrderId ? { ...wo, status: newStatus } : wo
      ));
      toast({
        title: "Status Updated",
        description: `Work order status changed to ${newStatus}`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update work order status",
        variant: "destructive"
      });
    }
  };

  const handlePartNameClick = (partNumber: string) => {
    // Would fetch part details from database
    console.log("View part:", partNumber);
  };

  const handleWorkOrderClick = (workOrder: any) => {
    setSelectedWorkOrder(workOrder);
    setIsWorkOrderDetailsOpen(true);
    setIsEditMode(false);
  };

  const handleEditWorkOrder = () => {
    setIsEditMode(true);
  };

  const handleSaveWorkOrder = () => {
    setIsEditMode(false);
    toast({
      title: "Work Order Updated",
      description: "The work order has been successfully updated.",
    });
  };

  const handleAddWorkOrder = () => {
    setTools([{ name: "", quantity: "" }]);
    setOperatorsAndMachines([{ name: "", type: "operator" }]);
    setSelectedPartNumber("");
    setSelectedPartId("");
    setIsAddWorkOrderOpen(true);
  };

  const handleCreateWorkOrder = async () => {
    // Get form values
    const quantity = (document.getElementById('quantity') as HTMLInputElement)?.value;
    const productionTime = (document.getElementById('productionTime') as HTMLInputElement)?.value;
    const dueDate = (document.getElementById('dueDate') as HTMLInputElement)?.value;
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
      await fetchWorkOrders();
      setIsAddWorkOrderOpen(false);
      // Reset form
      setSelectedPartId("");
      setSelectedPartNumber("");
      toast({
        title: "Work Order Created",
        description: "New work order has been successfully created.",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Work Orders</h1>
        <Button onClick={handleAddWorkOrder} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Work Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order Number</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Production Time</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders.map((workOrder) => (
                  <TableRow key={workOrder.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleWorkOrderClick(workOrder)}>
                    <TableCell className="font-medium">
                      <button className="text-primary hover:underline font-medium">
                        {workOrder.workOrderNumber}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => handlePartNameClick(workOrder.partNumber)}
                        className="text-primary hover:underline font-medium text-left"
                      >
                        {workOrder.partName}
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {workOrder.partNumber}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={workOrder.status} 
                        onValueChange={(value) => handleStatusChange(workOrder.id, value)}
                      >
                        <SelectTrigger 
                          className={`w-32 ${getStatusColor(workOrder.status)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="Not Started">Not Started</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="On Hold">On Hold</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getPriorityColor(workOrder.priority)}
                      >
                        {workOrder.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={workOrder.percentageCompletion} 
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground min-w-[3rem]">
                          {workOrder.percentageCompletion}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{workOrder.productionTime}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete work order "{workOrder.workOrderNumber}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteWorkOrder(workOrder.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Product Details Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Image and Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name}
                    className="w-full aspect-video object-cover rounded-lg"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div><span className="font-medium">Part Number:</span> {selectedProduct.partNumber}</div>
                      <div><span className="font-medium">Customer:</span> {selectedProduct.customer}</div>
                      <div><span className="font-medium">Location:</span> {selectedProduct.location}</div>
                      <div><span className="font-medium">Lead Time:</span> {selectedProduct.leadTime}</div>
                      <div><span className="font-medium">In Stock:</span> {selectedProduct.currentQuantity} {selectedProduct.unitOfMeasure}</div>
                      <div><span className="font-medium">Min Stock:</span> {selectedProduct.minimumQuantity} {selectedProduct.unitOfMeasure}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">Description</h3>
                    <p className="text-sm text-muted-foreground mt-1">{selectedProduct.description}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Pricing & Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Manufacturing Cost</p>
                      <p className="text-lg font-bold">${selectedProduct.manufacturingCost}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Selling Price</p>
                      <p className="text-lg font-bold text-green-600">${selectedProduct.sellingPrice}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Profit Margin</p>
                      <p className="text-lg font-bold text-green-600">
                        ${(selectedProduct.sellingPrice - selectedProduct.manufacturingCost).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Margin %</p>
                      <p className="text-lg font-bold text-green-600">
                        {(((selectedProduct.sellingPrice - selectedProduct.manufacturingCost) / selectedProduct.sellingPrice) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Drawing Files */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Drawing Files
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedProduct.drawingFiles?.map((file: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{file}</span>
                        <Button size="sm" variant="ghost" className="ml-auto">
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Materials Used */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Materials Used
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.materialsUsed?.map((material: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {material}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Production Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      Work Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Work Order:</span>
                        <span className="font-medium">{selectedProduct.workOrder}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Production Time:</span>
                        <span className="font-medium">{selectedProduct.productionTime}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Production Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedProduct.notes}</p>
                  </CardContent>
                </Card>
              </div>

              {/* History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedProduct.history?.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{entry.action}</p>
                          <p className="text-sm text-muted-foreground">{entry.date}</p>
                        </div>
                        {entry.quantity > 0 && (
                          <Badge variant="outline">
                            Qty: {entry.quantity}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button className="flex-1">
                  Add to Invoice
                </Button>
                <Button variant="outline" className="flex-1">
                  Edit Product
                </Button>
                <Button variant="outline" className="flex-1">
                  Create Work Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Work Order Details Dialog - A4 Format */}
      <Dialog open={isWorkOrderDetailsOpen} onOpenChange={setIsWorkOrderDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          {selectedWorkOrder && (
            <div className="space-y-6 p-6 bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h1 className="text-3xl font-bold">Work Order</h1>
                  <p className="text-xl text-muted-foreground">{selectedWorkOrder.workOrderNumber}</p>
                </div>
                <div className="flex gap-2">
                  {!isEditMode ? (
                    <>
                      <Button onClick={handleEditWorkOrder} variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Printer className="w-4 h-4 mr-1" />
                        Print
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleSaveWorkOrder} size="sm">
                        Save Changes
                      </Button>
                      <Button onClick={() => setIsEditMode(false)} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Work Order Information */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Work Order Details</h3>
                  {isEditMode ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Work Order Number</Label>
                        <Input defaultValue={selectedWorkOrder.workOrderNumber} />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select defaultValue={selectedWorkOrder.status}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select defaultValue={selectedWorkOrder.priority}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Production Time</Label>
                        <Input defaultValue={selectedWorkOrder.productionTime} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order Date:</span>
                          <span className="font-medium">{selectedWorkOrder.orderDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Due Date:</span>
                          <span className="font-medium">{selectedWorkOrder.dueDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge className={getStatusColor(selectedWorkOrder.status)}>
                            {selectedWorkOrder.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Priority:</span>
                          <Badge className={getPriorityColor(selectedWorkOrder.priority)}>
                            {selectedWorkOrder.priority}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Production Time:</span>
                          <span className="font-medium">{selectedWorkOrder.productionTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completion:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={selectedWorkOrder.percentageCompletion} className="w-16" />
                            <span>{selectedWorkOrder.percentageCompletion}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Part Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Part Information</h3>
                {isEditMode ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Part Name</Label>
                      <Input defaultValue={selectedWorkOrder.partName} />
                    </div>
                    <div>
                      <Label>Part Number</Label>
                      <Input defaultValue={selectedWorkOrder.partNumber} />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input type="number" defaultValue={selectedWorkOrder.quantity} />
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Textarea defaultValue={selectedWorkOrder.description} rows={3} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Part Name:</span>
                          <span className="font-medium">{selectedWorkOrder.partName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Part Number:</span>
                          <span className="font-medium font-mono">{selectedWorkOrder.partNumber}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span className="font-medium">{selectedWorkOrder.quantity} pcs</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-muted-foreground">Description:</span>
                      <p className="text-sm mt-1 p-3 bg-muted rounded">{selectedWorkOrder.description}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tools Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Tools Required
                </h3>
                {isEditMode ? (
                  <div className="space-y-3">
                    {(selectedWorkOrder.tools || []).map((tool: any, index: number) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label>Tool Name</Label>
                          <Input defaultValue={tool.name} placeholder="Tool name" />
                        </div>
                        <div className="w-24">
                          <Label>Quantity</Label>
                          <Input type="number" defaultValue={tool.quantity} placeholder="Qty" />
                        </div>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Tool
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedWorkOrder.tools?.map((tool: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                        <span className="font-medium">{tool.name}</span>
                        <Badge variant="outline">Qty: {tool.quantity}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Operators and Machines Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Operators & Machines
                </h3>
                {isEditMode ? (
                  <div className="space-y-3">
                    {(selectedWorkOrder.operatorsAndMachines || []).map((item: any, index: number) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label>Name</Label>
                          <Input defaultValue={item.name} placeholder="Operator/Machine name" />
                        </div>
                        <div className="w-32">
                          <Label>Type</Label>
                          <Select defaultValue={item.type}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="operator">Operator</SelectItem>
                              <SelectItem value="machine">Machine</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Operator/Machine
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedWorkOrder.operatorsAndMachines?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                        <span className="font-medium">{item.name}</span>
                        <Badge variant={item.type === 'operator' ? 'default' : 'secondary'}>
                          {item.type === 'operator' ? 'Operator' : 'Machine'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Setup Instructions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Setup Instructions</h3>
                {isEditMode ? (
                  <div>
                    <Label>Setup Instructions</Label>
                    <Textarea defaultValue={selectedWorkOrder.setupInstructions} rows={4} />
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm p-3 bg-muted rounded">{selectedWorkOrder.setupInstructions}</p>
                  </div>
                )}
              </div>

              {/* Quality Requirements */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Quality Requirements</h3>
                {isEditMode ? (
                  <div>
                    <Label>Quality Requirements</Label>
                    <Textarea defaultValue={selectedWorkOrder.qualityRequirements} rows={4} />
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm p-3 bg-muted rounded">{selectedWorkOrder.qualityRequirements}</p>
                  </div>
                )}
              </div>

              {/* Production Notes */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Production Notes</h3>
                {isEditMode ? (
                  <div>
                    <Label>Production Notes</Label>
                    <Textarea defaultValue={selectedWorkOrder.productionNotes} rows={4} />
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm p-3 bg-muted rounded">{selectedWorkOrder.productionNotes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
                Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Work Order Dialog */}
      <Dialog open={isAddWorkOrderOpen} onOpenChange={setIsAddWorkOrderOpen}>
        <DialogContent className="max-w-2xl">
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
                <Input id="quantity" type="number" placeholder="0" />
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
                <Input id="dueDate" type="date" />
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
              <Button variant="outline" onClick={() => setIsAddWorkOrderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkOrder}>
                Create Work Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}