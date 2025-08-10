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
import { Package, FileText, Wrench, Clock } from "lucide-react";
import { useState } from "react";
import { mockCustomers } from "./Customers";

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

// Mock work orders data - synchronized with parts and customers
const mockWorkOrders = [
  {
    id: "WO-001",
    workOrderNumber: "WO-2024-001",
    partName: "Aluminum Bracket Assembly",
    partNumber: "AL-001",
    partId: "P-001",
    customerId: "C-001",
    customer: "ABC Manufacturing",
    status: "In Progress",
    priority: "High",
    percentageCompletion: 75,
    orderDate: "2024-01-15",
    dueDate: "2024-01-25",
    quantity: 25,
    unitPrice: 125.50,
    totalValue: 3137.50
  },
  {
    id: "WO-002", 
    workOrderNumber: "WO-2024-002",
    partName: "Steel Mounting Plate",
    partNumber: "ST-002",
    partId: "P-002",
    customerId: "C-002",
    customer: "XYZ Industries",
    status: "Completed",
    priority: "Medium",
    percentageCompletion: 100,
    orderDate: "2024-01-12",
    dueDate: "2024-01-20",
    quantity: 40,
    unitPrice: 89.75,
    totalValue: 3590.00
  },
  {
    id: "WO-003",
    workOrderNumber: "WO-2024-003", 
    partName: "Precision Shaft",
    partNumber: "PR-003",
    partId: "P-003",
    customerId: "C-003",
    customer: "TechCorp Solutions",
    status: "Not Started",
    priority: "Low",
    percentageCompletion: 0,
    orderDate: "2024-01-20",
    dueDate: "2024-01-30",
    quantity: 15,
    unitPrice: 185.00,
    totalValue: 2775.00
  },
  {
    id: "WO-004",
    workOrderNumber: "WO-2024-004",
    partName: "Custom Gear Housing", 
    partNumber: "GH-004",
    partId: "P-004",
    customerId: "C-004",
    customer: "MechSystems Ltd",
    status: "In Progress",
    priority: "High",
    percentageCompletion: 45,
    orderDate: "2024-01-18",
    dueDate: "2024-02-01",
    quantity: 8,
    unitPrice: 245.00,
    totalValue: 1960.00
  },
  {
    id: "WO-005",
    workOrderNumber: "WO-2024-005",
    partName: "Bearing Support Block",
    partNumber: "BS-005",
    partId: "P-005",
    customerId: "C-005",
    customer: "Industrial Partners",
    status: "On Hold",
    priority: "Medium",
    percentageCompletion: 20,
    orderDate: "2024-01-10",
    dueDate: "2024-01-28",
    quantity: 12,
    unitPrice: 156.25,
    totalValue: 1875.00
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
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);

  const handlePartNameClick = (partNumber: string) => {
    const part = mockParts.find(p => p.partNumber === partNumber);
    if (part) {
      setSelectedProduct(part);
      setIsProductDialogOpen(true);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Work Orders</h1>
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockWorkOrders.map((workOrder) => (
                  <TableRow key={workOrder.id}>
                    <TableCell className="font-medium">
                      {workOrder.workOrderNumber}
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
                    <TableCell>{workOrder.customer}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(workOrder.status)}
                      >
                        {workOrder.status}
                      </Badge>
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
    </div>
  );
}