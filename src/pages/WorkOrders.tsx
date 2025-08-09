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

// Mock product data (matching inventory finished products)
const mockProducts = [
  {
    id: "P-001",
    name: "Aluminum Bracket Assembly",
    partNumber: "AL-001",
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
  }
];

// Mock work orders data
const mockWorkOrders = [
  {
    id: "WO-001",
    workOrderNumber: "WO-2024-001",
    partName: "Aluminum Bracket Assembly",
    partNumber: "AL-001",
    buyer: "ABC Manufacturing",
    status: "In Progress",
    priority: "High",
    percentageCompletion: 75,
  },
  {
    id: "WO-002", 
    workOrderNumber: "WO-2024-002",
    partName: "Steel Mounting Plate",
    partNumber: "ST-002",
    buyer: "XYZ Industries",
    status: "Completed",
    priority: "Medium",
    percentageCompletion: 100,
  },
  {
    id: "WO-003",
    workOrderNumber: "WO-2024-003", 
    partName: "Precision Shaft",
    partNumber: "PR-003",
    buyer: "TechCorp Solutions",
    status: "Not Started",
    priority: "Low",
    percentageCompletion: 0,
  },
  {
    id: "WO-004",
    workOrderNumber: "WO-2024-004",
    partName: "Custom Gear Housing", 
    partNumber: "GH-004",
    buyer: "MechSystems Ltd",
    status: "In Progress",
    priority: "High",
    percentageCompletion: 45,
  },
  {
    id: "WO-005",
    workOrderNumber: "WO-2024-005",
    partName: "Bearing Support Block",
    partNumber: "BS-005", 
    buyer: "Industrial Partners",
    status: "On Hold",
    priority: "Medium",
    percentageCompletion: 20,
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
    const product = mockProducts.find(p => p.partNumber === partNumber);
    if (product) {
      setSelectedProduct(product);
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
                  <TableHead>Buyer</TableHead>
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
                    <TableCell>{workOrder.buyer}</TableCell>
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