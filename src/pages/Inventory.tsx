import { useState } from "react";
import { Plus, Search, Package, AlertTriangle, FileText, Clock, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Mock data for demonstration
const mockInventoryItems = [
  {
    id: "1",
    name: "Aluminum 6061 Bar",
    sku: "AL6061-1",
    category: "Raw Materials",
    currentQuantity: 15,
    minimumQuantity: 10,
    unitOfMeasure: "pieces",
    unitCost: 45.50,
    supplier: "Metal Supply Co",
    location: "Rack A-1",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop&crop=center"
  },
  {
    id: "2",
    name: "1/4\" End Mill",
    sku: "EM-025",
    category: "Cutting Tools",
    currentQuantity: 8,
    minimumQuantity: 15,
    unitOfMeasure: "pieces",
    unitCost: 12.99,
    supplier: "Tool World",
    location: "Tool Cabinet B",
    image: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=300&fit=crop&crop=center"
  },
  {
    id: "3",
    name: "Steel 1018 Plate",
    sku: "ST1018-P",
    category: "Raw Materials",
    currentQuantity: 25,
    minimumQuantity: 5,
    unitOfMeasure: "pieces",
    unitCost: 85.00,
    supplier: "Steel Direct",
    location: "Rack C-2",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=300&fit=crop&crop=center"
  }
];

const mockFinishedProducts = [
  {
    id: "fp1",
    name: "Custom Bracket Assembly",
    partNumber: "BRK-001-A",
    description: "Aluminum bracket for automotive application",
    currentQuantity: 8,
    minimumQuantity: 5,
    unitOfMeasure: "pieces",
    manufacturingCost: 45.00,
    sellingPrice: 120.00,
    customer: "AutoCorp Industries",
    leadTime: "3-5 days",
    location: "Finished Goods A-1",
    status: "active",
    image: "https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=400&h=300&fit=crop&crop=center",
    drawingFiles: ["BRK-001-A_Drawing.pdf", "BRK-001-A_Assembly.dwg"],
    materialsUsed: ["Aluminum 6061 Bar", "M6x12 Socket Cap Screws"],
    workOrder: "WO-2024-001",
    productionTime: "2.5 hours",
    notes: "Customer requires tight tolerances on mounting holes. Use fixture #A-12.",
    history: [
      { date: "2024-01-15", action: "Production run completed", quantity: 10 },
      { date: "2024-01-10", action: "Work order created", quantity: 10 }
    ]
  },
  {
    id: "fp2",
    name: "Precision Shaft",
    partNumber: "SHF-205-B",
    description: "Steel shaft with tight tolerances",
    currentQuantity: 12,
    minimumQuantity: 8,
    unitOfMeasure: "pieces",
    manufacturingCost: 85.00,
    sellingPrice: 220.00,
    customer: "MechTech Solutions",
    leadTime: "2-4 days",
    location: "Finished Goods B-2",
    status: "active",
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop&crop=center",
    drawingFiles: ["SHF-205-B_Drawing.pdf", "SHF-205-B_Specs.pdf"],
    materialsUsed: ["Steel 1018 Plate", "Cutting Oil"],
    workOrder: "WO-2024-005",
    productionTime: "4.0 hours",
    notes: "Surface finish Ra 32. Use diamond turning insert for final pass.",
    history: [
      { date: "2024-01-20", action: "Quality inspection passed", quantity: 15 },
      { date: "2024-01-18", action: "Production completed", quantity: 15 }
    ]
  },
  {
    id: "fp3",
    name: "Heat Sink Housing",
    partNumber: "HSK-301-C",
    description: "Aluminum heat sink for electronics",
    currentQuantity: 3,
    minimumQuantity: 10,
    unitOfMeasure: "pieces",
    manufacturingCost: 28.00,
    sellingPrice: 75.00,
    customer: "ElectroMax Corp",
    leadTime: "1-3 days",
    location: "Finished Goods C-1",
    status: "low_stock",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop&crop=center",
    drawingFiles: ["HSK-301-C_Drawing.pdf"],
    materialsUsed: ["Aluminum 6061 Bar", "1/4\" End Mill"],
    workOrder: "WO-2024-003",
    productionTime: "1.5 hours",
    notes: "Anodize finish required. Check thermal specifications.",
    history: [
      { date: "2024-01-12", action: "Production run", quantity: 20 },
      { date: "2024-01-08", action: "Material ordered", quantity: 0 }
    ]
  },
  {
    id: "fp4",
    name: "Motor Mount Plate",
    partNumber: "MMP-150-D",
    description: "Steel motor mounting plate",
    currentQuantity: 15,
    minimumQuantity: 6,
    unitOfMeasure: "pieces",
    manufacturingCost: 35.00,
    sellingPrice: 95.00,
    customer: "Industrial Motors Inc",
    leadTime: "2-3 days",
    location: "Finished Goods A-3",
    status: "active",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=300&fit=crop&crop=center",
    drawingFiles: ["MMP-150-D_Drawing.pdf", "MMP-150-D_Drill_Pattern.pdf"],
    materialsUsed: ["Steel 1018 Plate", "M8 Threaded Inserts"],
    workOrder: "WO-2024-007",
    productionTime: "3.0 hours",
    notes: "Customer requires zinc plating. Use jig #M-25 for drilling pattern.",
    history: [
      { date: "2024-01-25", action: "Production completed", quantity: 20 },
      { date: "2024-01-22", action: "Material prep", quantity: 0 }
    ]
  }
];

const mockCategories = [
  { name: "Raw Materials", count: 25, value: 12500 },
  { name: "Cutting Tools", count: 45, value: 8900 },
  { name: "Finished Products", count: mockFinishedProducts.length, value: mockFinishedProducts.reduce((total, item) => total + (item.currentQuantity * item.sellingPrice), 0) },
  { name: "Consumables", count: 18, value: 850 }
];

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);

  const lowStockItems = mockInventoryItems.filter(
    item => item.currentQuantity <= item.minimumQuantity
  );

  const lowStockFinishedProducts = mockFinishedProducts.filter(
    item => item.currentQuantity <= item.minimumQuantity
  );

  const totalValue = mockInventoryItems.reduce(
    (total, item) => total + (item.currentQuantity * item.unitCost), 0
  );

  const finishedProductsValue = mockFinishedProducts.reduce(
    (total, item) => total + (item.currentQuantity * item.sellingPrice), 0
  );

  const allLowStockCount = lowStockItems.length + lowStockFinishedProducts.length;

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
        <Button>
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
            <div className="text-2xl font-bold">{mockInventoryItems.length}</div>
            <p className="text-xs text-muted-foreground">
              ${totalValue.toLocaleString()} value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finished Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockFinishedProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              ${finishedProductsValue.toLocaleString()} value
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
            <div className="text-2xl font-bold">${(totalValue + finishedProductsValue).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              complete inventory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Raw Materials</TabsTrigger>
          <TabsTrigger value="finished-products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search inventory items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockInventoryItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="space-y-2">
                  <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    {item.currentQuantity <= item.minimumQuantity && (
                      <Badge variant="destructive">Low Stock</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Quantity:</span>
                    <span className={`font-bold ${
                      item.currentQuantity <= item.minimumQuantity 
                        ? 'text-destructive' 
                        : 'text-foreground'
                    }`}>
                      {item.currentQuantity} {item.unitOfMeasure}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Unit Cost:</span>
                    <span className="font-bold">${item.unitCost}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Location:</span>
                    <span className="text-sm">{item.location}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Supplier:</span>
                    <span className="text-sm">{item.supplier}</span>
                  </div>
                  
                  <Badge variant="secondary" className="w-fit">
                    {item.category}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="finished-products" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search finished products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Finished Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockFinishedProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="space-y-2">
                  <div 
                    className="aspect-video w-full bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setSelectedProduct(product);
                      setIsProductDialogOpen(true);
                    }}
                  >
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle 
                        className="text-lg cursor-pointer hover:text-primary transition-colors"
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsProductDialogOpen(true);
                        }}
                      >
                        {product.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Part #: {product.partNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
                    </div>
                    {product.currentQuantity <= product.minimumQuantity && (
                      <Badge variant="destructive">Low Stock</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">In Stock:</span>
                    <span className={`font-bold ${
                      product.currentQuantity <= product.minimumQuantity 
                        ? 'text-destructive' 
                        : 'text-foreground'
                    }`}>
                      {product.currentQuantity} {product.unitOfMeasure}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Selling Price:</span>
                    <span className="font-bold text-green-600">${product.sellingPrice}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cost:</span>
                    <span className="text-sm">${product.manufacturingCost}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Margin:</span>
                    <span className="text-sm font-bold text-green-600">
                      ${(product.sellingPrice - product.manufacturingCost).toFixed(2)} 
                      ({(((product.sellingPrice - product.manufacturingCost) / product.sellingPrice) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Customer:</span>
                    <span className="text-xs">{product.customer}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Lead Time:</span>
                    <span className="text-xs">{product.leadTime}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Location:</span>
                    <span className="text-xs">{product.location}</span>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1">
                      Add to Invoice
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockCategories.map((category) => (
              <Card key={category.name}>
                <CardHeader>
                  <CardTitle>{category.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span className="font-bold">{category.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Value:</span>
                    <span className="font-bold">${category.value.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          {allLowStockCount > 0 ? (
            <div className="space-y-6">
              {/* Raw Materials Low Stock */}
              {lowStockItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Raw Materials & Tools</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lowStockItems.map((item) => (
                      <Card key={item.id} className="border-destructive">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                            <Badge variant="destructive">Low Stock</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span>Current:</span>
                            <span className="font-bold text-destructive">
                              {item.currentQuantity} {item.unitOfMeasure}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Minimum:</span>
                            <span className="font-bold">
                              {item.minimumQuantity} {item.unitOfMeasure}
                            </span>
                          </div>
                          <Button size="sm" className="w-full mt-3">
                            Reorder Now
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Finished Products Low Stock */}
              {lowStockFinishedProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Finished Products</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lowStockFinishedProducts.map((product) => (
                      <Card key={product.id} className="border-destructive">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <Badge variant="destructive">Low Stock</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Part #: {product.partNumber}</p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span>Current:</span>
                            <span className="font-bold text-destructive">
                              {product.currentQuantity} {product.unitOfMeasure}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Minimum:</span>
                            <span className="font-bold">
                              {product.minimumQuantity} {product.unitOfMeasure}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Customer:</span>
                            <span className="text-sm">{product.customer}</span>
                          </div>
                          <Button size="sm" className="w-full mt-3">
                            Schedule Production
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Low Stock Items</h3>
                  <p className="text-muted-foreground">All items are adequately stocked</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
                    {selectedProduct.drawingFiles?.map((file, index) => (
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
                    {selectedProduct.materialsUsed?.map((material, index) => (
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
                    {selectedProduct.history?.map((entry, index) => (
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