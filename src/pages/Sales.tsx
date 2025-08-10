
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  BarChart3,
  Filter,
  Download
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// Mock data for sales analytics
const salesData = [
  { month: "Jan", revenue: 45000, orders: 156, customers: 89, parts: 234 },
  { month: "Feb", revenue: 52000, orders: 178, customers: 102, parts: 267 },
  { month: "Mar", revenue: 48000, orders: 165, customers: 95, parts: 245 },
  { month: "Apr", revenue: 61000, orders: 203, customers: 118, parts: 312 },
  { month: "May", revenue: 55000, orders: 187, customers: 107, parts: 278 },
  { month: "Jun", revenue: 67000, orders: 221, customers: 134, parts: 345 },
  { month: "Jul", revenue: 72000, orders: 245, customers: 142, parts: 389 },
  { month: "Aug", revenue: 68000, orders: 234, customers: 138, parts: 367 },
  { month: "Sep", revenue: 74000, orders: 256, customers: 151, parts: 401 },
  { month: "Oct", revenue: 69000, orders: 238, customers: 145, parts: 378 },
  { month: "Nov", revenue: 78000, orders: 267, customers: 162, parts: 423 },
  { month: "Dec", revenue: 85000, orders: 289, customers: 175, parts: 456 },
];

const customerSalesData = [
  { name: "Acme Corp", revenue: 125000, orders: 45, parts: 189, country: "USA" },
  { name: "Tech Solutions", revenue: 98000, orders: 32, parts: 142, country: "Canada" },
  { name: "Global Industries", revenue: 87000, orders: 28, parts: 134, country: "UK" },
  { name: "Precision Manufacturing", revenue: 76000, orders: 24, parts: 98, country: "Germany" },
  { name: "Innovation Labs", revenue: 65000, orders: 21, parts: 87, country: "France" },
];

const partSalesData = [
  { name: "Precision Bracket", revenue: 145000, quantity: 1250, category: "Brackets" },
  { name: "Custom Housing", revenue: 98000, quantity: 780, category: "Housings" },
  { name: "Machined Shaft", revenue: 87000, quantity: 650, category: "Shafts" },
  { name: "CNC Plate", revenue: 76000, quantity: 890, category: "Plates" },
  { name: "Aluminum Mount", revenue: 65000, quantity: 420, category: "Mounts" },
];

const pieChartData = [
  { name: "Brackets", value: 35, fill: "hsl(var(--chart-1))" },
  { name: "Housings", value: 25, fill: "hsl(var(--chart-2))" },
  { name: "Shafts", value: 20, fill: "hsl(var(--chart-3))" },
  { name: "Plates", value: 12, fill: "hsl(var(--chart-4))" },
  { name: "Mounts", value: 8, fill: "hsl(var(--chart-5))" },
];

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  orders: { label: "Orders", color: "hsl(var(--chart-2))" },
  customers: { label: "Customers", color: "hsl(var(--chart-3))" },
  parts: { label: "Parts", color: "hsl(var(--chart-4))" },
};

export default function Sales() {
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [activeTab, setActiveTab] = useState("overview");

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filtered = [...salesData];
    
    if (selectedMonth !== "all") {
      filtered = filtered.filter(item => item.month === selectedMonth);
    }
    
    return filtered;
  }, [selectedMonth]);

  const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = filteredData.reduce((sum, item) => sum + item.orders, 0);
  const totalCustomers = filteredData.reduce((sum, item) => sum + item.customers, 0);
  const avgOrderValue = totalRevenue / totalOrders;

  const revenueGrowth = filteredData.length > 1 
    ? ((filteredData[filteredData.length - 1].revenue - filteredData[0].revenue) / filteredData[0].revenue * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive sales tracking and performance analytics
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {salesData.map((item) => (
                <SelectItem key={item.month} value={item.month}>
                  {item.month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customerSalesData.map((customer) => (
                <SelectItem key={customer.name} value={customer.name}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Brackets">Brackets</SelectItem>
              <SelectItem value="Housings">Housings</SelectItem>
              <SelectItem value="Shafts">Shafts</SelectItem>
              <SelectItem value="Plates">Plates</SelectItem>
              <SelectItem value="Mounts">Mounts</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(revenueGrowth).toFixed(1)}%
              </span>
              <span className="ml-1">from selected period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {(totalOrders / Math.max(filteredData.length, 1)).toFixed(0)} per month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Unique customers served
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgOrderValue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Revenue per order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="parts">Parts</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <AreaChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="var(--color-revenue)" 
                      fill="var(--color-revenue)"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>Revenue distribution by part category</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Multi-Metric Performance</CardTitle>
              <CardDescription>Orders, customers, and parts over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="orders" fill="var(--color-orders)" />
                  <Bar dataKey="customers" fill="var(--color-customers)" />
                  <Bar dataKey="parts" fill="var(--color-parts)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Revenue</CardTitle>
              <CardDescription>Customer performance ranking</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart data={customerSalesData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
              <CardDescription>Detailed customer performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerSalesData.map((customer, index) => (
                  <div key={customer.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{customer.name}</h3>
                        <Badge variant="outline">{customer.country}</Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{customer.orders} orders</span>
                        <span>{customer.parts} parts</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">${customer.revenue.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        ${Math.round(customer.revenue / customer.orders)} avg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Parts by Revenue</CardTitle>
              <CardDescription>Best performing parts analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart data={partSalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Part Performance Details</CardTitle>
              <CardDescription>Revenue and quantity metrics by part</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {partSalesData.map((part, index) => (
                  <div key={part.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{part.name}</h3>
                        <Badge variant="secondary">{part.category}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {part.quantity} units sold
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">${part.revenue.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        ${Math.round(part.revenue / part.quantity)} per unit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Orders Correlation</CardTitle>
              <CardDescription>Relationship between order volume and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--color-revenue)" 
                    strokeWidth={3}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="orders" 
                    stroke="var(--color-orders)" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Growth Analysis</CardTitle>
                <CardDescription>Month-over-month growth rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredData.slice(1).map((item, index) => {
                    const prevRevenue = filteredData[index].revenue;
                    const growth = ((item.revenue - prevRevenue) / prevRevenue * 100);
                    return (
                      <div key={item.month} className="flex items-center justify-between">
                        <span className="font-medium">{item.month}</span>
                        <div className="flex items-center gap-2">
                          {growth >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className={growth >= 0 ? "text-green-500" : "text-red-500"}>
                            {growth.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics Summary</CardTitle>
                <CardDescription>Performance indicators overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Best Month (Revenue)</span>
                    <Badge variant="outline">
                      {filteredData.reduce((max, item) => 
                        item.revenue > max.revenue ? item : max, filteredData[0]
                      ).month}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Best Month (Orders)</span>
                    <Badge variant="outline">
                      {filteredData.reduce((max, item) => 
                        item.orders > max.orders ? item : max, filteredData[0]
                      ).month}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Top Customer</span>
                    <Badge variant="outline">{customerSalesData[0].name}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Top Part</span>
                    <Badge variant="outline">{partSalesData[0].name}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
