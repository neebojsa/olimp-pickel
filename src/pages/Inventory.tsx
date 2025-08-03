import { useState } from "react";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    location: "Rack A-1"
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
    location: "Tool Cabinet B"
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
    location: "Rack C-2"
  }
];

const mockCategories = [
  { name: "Raw Materials", count: 25, value: 12500 },
  { name: "Cutting Tools", count: 45, value: 8900 },
  { name: "Finished Parts", count: 12, value: 5600 },
  { name: "Consumables", count: 18, value: 850 }
];

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const lowStockItems = mockInventoryItems.filter(
    item => item.currentQuantity <= item.minimumQuantity
  );

  const totalValue = mockInventoryItems.reduce(
    (total, item) => total + (item.currentQuantity * item.unitCost), 0
  );

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
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockInventoryItems.length}</div>
            <p className="text-xs text-muted-foreground">
              across {mockCategories.length} categories
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
              current inventory value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {lowStockItems.length}
            </div>
            <p className="text-xs text-muted-foreground">
              need reordering
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockCategories.length}</div>
            <p className="text-xs text-muted-foreground">
              item categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
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
                <CardHeader>
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
          {lowStockItems.length > 0 ? (
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
    </div>
  );
}