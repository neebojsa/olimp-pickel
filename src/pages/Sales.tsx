
import React, { useState, useMemo, useEffect } from 'react';
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
  RefreshCcw
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
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currencyUtils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  orders: { label: "Orders", color: "hsl(var(--chart-2))" },
  customers: { label: "Customers", color: "hsl(var(--chart-3))" },
  parts: { label: "Parts", color: "hsl(var(--chart-4))" },
};

export default function Sales() {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [activeTab, setActiveTab] = useState("overview");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [customerPage, setCustomerPage] = useState(1);
  const [partPage, setPartPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select(`*, customers!inner(id,name,country), invoice_items!fk_invoice_items_invoice(*)`)
        .order('created_at', { ascending: true });
      if (invoiceData) setInvoices(invoiceData as any[]);

      const { data: inventory } = await supabase.from('inventory').select('*');
      if (inventory) setInventoryItems(inventory as any[]);
    };
    fetchData();
  }, []);

  // Compute analytics from invoices and items
  const { monthlyData, customerData, partData, categoryPieData, totalsByCurrency, ordersByCurrency } = useMemo(() => {
    const isAllYears = selectedYear === 'all';
    const yearNum = isAllYears ? undefined : parseInt(selectedYear, 10);
    const rangeFrom = dateRange.from?.getTime();
    const rangeTo = dateRange.to?.getTime();

    const filteredInvoices = invoices.filter(inv => {
      const issue = new Date(inv.issue_date || inv.created_at).getTime();
      const yearOk = isAllYears ? true : new Date(inv.issue_date || inv.created_at).getFullYear() === yearNum;
      const rangeOk = (!rangeFrom || issue >= rangeFrom) && (!rangeTo || issue <= rangeTo);
      const customerOk = selectedCustomer === 'all' || inv.customers?.name === selectedCustomer;
      return yearOk && rangeOk && customerOk;
    });

    const monthlyMap: Record<string, { month: string; revenue: number; orders: number; customers: number; parts: number; }> = {};
    const seenCustomersByMonth: Record<string, Set<string>> = {};
    monthLabels.forEach((m, idx) => {
      const key = isAllYears ? `${idx+1}` : `${yearNum}-${idx+1}`;
      monthlyMap[key] = { month: m, revenue: 0, orders: 0, customers: 0, parts: 0 };
      seenCustomersByMonth[key] = new Set();
    });

    const customerMap: Record<string, { name: string; revenueTotal: number; revenueByCurrency: Record<string, number>; orders: number; parts: number; country?: string }> = {};
    const partMap: Record<string, { name: string; revenueTotal: number; revenueByCurrency: Record<string, number>; quantity: number; category: string }> = {};
    const totalsByCurrency: Record<string, number> = {};
    const ordersByCurrency: Record<string, number> = {};

    filteredInvoices.forEach(inv => {
      const d = new Date(inv.issue_date || inv.created_at);
      const key = isAllYears ? `${d.getMonth()+1}` : `${d.getFullYear()}-${d.getMonth()+1}`;
      const customerName = inv.customers?.name || 'Unknown';

      if (monthlyMap[key]) {
        monthlyMap[key].revenue += inv.amount || 0;
        monthlyMap[key].orders += 1;
        if (!seenCustomersByMonth[key].has(customerName)) {
          seenCustomersByMonth[key].add(customerName);
          monthlyMap[key].customers += 1;
        }
        const partsQty = (inv.invoice_items || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0);
        monthlyMap[key].parts += partsQty;
      }

      if (!customerMap[customerName]) {
        customerMap[customerName] = { name: customerName, revenueTotal: 0, revenueByCurrency: {}, orders: 0, parts: 0, country: inv.customers?.country };
      }
      const invCurrency = inv.currency || 'EUR';
      customerMap[customerName].revenueTotal += inv.amount || 0;
      customerMap[customerName].revenueByCurrency[invCurrency] = (customerMap[customerName].revenueByCurrency[invCurrency] || 0) + (inv.amount || 0);
      totalsByCurrency[invCurrency] = (totalsByCurrency[invCurrency] || 0) + (inv.amount || 0);
      ordersByCurrency[invCurrency] = (ordersByCurrency[invCurrency] || 0) + 1;
      customerMap[customerName].orders += 1;
      customerMap[customerName].parts += (inv.invoice_items || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0);

      (inv.invoice_items || []).forEach((it: any) => {
        const name = it.description || 'Unknown';
        const inventory = inventoryItems.find((x: any) => x.name === name);
        const category = inventory?.category || 'Unknown';
        if (!partMap[name]) {
          partMap[name] = { name, revenueTotal: 0, revenueByCurrency: {}, quantity: 0, category };
        }
        const itemTotal = it.total || (it.unit_price || 0) * (it.quantity || 0);
        partMap[name].revenueTotal += itemTotal;
        const cur = inv.currency || 'EUR';
        partMap[name].revenueByCurrency[cur] = (partMap[name].revenueByCurrency[cur] || 0) + itemTotal;
        partMap[name].quantity += it.quantity || 0;
        if (!partMap[name].category && category) partMap[name].category = category;
      });
    });

    let monthlyData = Object.values(monthlyMap);
    if (selectedMonth !== 'all') monthlyData = monthlyData.filter(m => m.month === selectedMonth);

    let customerData = Object.values(customerMap).sort((a,b) => b.revenueTotal - a.revenueTotal).slice(0, 20);
    if (selectedCustomer !== 'all') customerData = customerData.filter(c => c.name === selectedCustomer);

    let partData = Object.values(partMap).sort((a,b) => b.revenueTotal - a.revenueTotal).slice(0, 50);
    if (selectedCategory !== 'all') partData = partData.filter(p => p.category === selectedCategory);

    const categoryMap: Record<string, number> = {};
    partData.forEach(p => { categoryMap[p.category || 'Unknown'] = (categoryMap[p.category || 'Unknown'] || 0) + p.revenueTotal; });
    const colors = ["hsl(var(--chart-1))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))","hsl(var(--chart-5))"];
    const categoryPieData = Object.entries(categoryMap).map(([name, value], idx) => ({ name, value, fill: colors[idx % colors.length] }));

    return { monthlyData, customerData, partData, categoryPieData, totalsByCurrency, ordersByCurrency };
  }, [invoices, inventoryItems, selectedYear, selectedMonth, selectedCustomer, selectedCategory, dateRange.from, dateRange.to]);

  const totalOrders = monthlyData.reduce((sum, item) => sum + item.orders, 0);
  const totalCustomers = monthlyData.reduce((sum, item) => sum + item.customers, 0);
  const avgsByCurrency = Object.fromEntries(Object.entries(totalsByCurrency).map(([cur, amount]) => [cur, (ordersByCurrency[cur] || 0) ? (amount as number) / (ordersByCurrency[cur] as number) : 0]));

  const revenueGrowth = monthlyData.length > 1 
    ? ((monthlyData[monthlyData.length - 1].revenue - monthlyData[0].revenue) / Math.max(monthlyData[0].revenue, 1) * 100)
    : 0;

  // Customer pagination
  const totalCustomerPages = Math.ceil(customerData.length / itemsPerPage);
  const customerStartIndex = (customerPage - 1) * itemsPerPage;
  const customerEndIndex = customerStartIndex + itemsPerPage;
  const paginatedCustomers = customerData.slice(customerStartIndex, customerEndIndex);

  // Part pagination
  const totalPartPages = Math.ceil(partData.length / itemsPerPage);
  const partStartIndex = (partPage - 1) * itemsPerPage;
  const partEndIndex = partStartIndex + itemsPerPage;
  const paginatedParts = partData.slice(partStartIndex, partEndIndex);

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
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
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
              {monthLabels.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
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
              {Array.from(new Set(invoices.map(inv => inv.customers?.name).filter(Boolean))).map((name) => (
                <SelectItem key={name as string} value={name as string}>
                  {name as string}
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
              {Array.from(new Set(inventoryItems.map((i: any) => i.category))).map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" className="rounded-full h-9 w-9" title="Reset Filters" onClick={() => {
            setSelectedYear('all');
            setSelectedMonth('all');
            setSelectedCustomer('all');
            setSelectedCategory('all');
            setDateRange({});
          }}>
            <RefreshCcw className="w-4 h-4" />
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
            <div className="text-2xl font-bold space-y-1">
              {Object.entries(totalsByCurrency).map(([cur, amount]) => (
                <div key={cur}>{formatCurrency(amount as number, cur as string)}</div>
              ))}
            </div>
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
              Avg: {(totalOrders / Math.max(monthlyData.length, 1)).toFixed(0)} per month
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
            <div className="text-2xl font-bold space-y-1">
              {Object.entries(avgsByCurrency).map(([cur, avg]) => (
                <div key={cur}>{formatCurrency(Math.round(avg as number), cur as string)}</div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Revenue per order</p>
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
                  <AreaChart data={monthlyData}>
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
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryPieData.map((entry, index) => (
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
                <BarChart data={monthlyData}>
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
                <BarChart data={customerData} layout="horizontal">
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
                {paginatedCustomers.map((customer, index) => (
                  <div key={customer.name} className="flex items-center justify-between p-4 rounded-lg shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{customer.name}</h3>
                        <Badge variant="outline">{customer.country || '—'}</Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{customer.orders} orders</span>
                        <span>{customer.parts} parts</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {Object.entries(customer.revenueByCurrency).map(([cur, amount]) => (
                          <span key={cur} className="block">{formatCurrency(amount, cur as string)}</span>
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg per order:
                        {customer.orders ? (
                          <>
                            {Object.entries(customer.revenueByCurrency).map(([cur, amount]) => (
                              <span key={cur} className="block">{formatCurrency(Math.round((amount as number) / customer.orders), cur as string)}</span>
                            ))}
                          </>
                        ) : (
                          <span className="block">{formatCurrency(0, 'EUR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls for Customers */}
              {totalCustomerPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {customerStartIndex + 1} to {Math.min(customerEndIndex, customerData.length)} of {customerData.length} customers
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCustomerPage(p => Math.max(1, p - 1))}
                          className={customerPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalCustomerPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCustomerPage(page)}
                            isActive={customerPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCustomerPage(p => Math.min(totalCustomerPages, p + 1))}
                          className={customerPage === totalCustomerPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
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
                <BarChart data={partData.map(p => ({ ...p, revenue: p.revenueTotal }))}>
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
                {paginatedParts.map((part, index) => (
                  <div key={part.name} className="flex items-center justify-between p-4 rounded-lg shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{part.name}</h3>
                        <Badge variant="secondary">{part.category || 'Unknown'}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {part.quantity} units sold
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {Object.entries(part.revenueByCurrency).map(([cur, amount]) => (
                          <span key={cur} className="block">{formatCurrency(amount as number, cur as string)}</span>
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Per unit:
                        {part.quantity ? (
                          <>
                            {Object.entries(part.revenueByCurrency).map(([cur, amount]) => (
                              <span key={cur} className="block">{formatCurrency(Math.round((amount as number) / part.quantity), cur as string)}</span>
                            ))}
                          </>
                        ) : (
                          <span className="block">{formatCurrency(0, 'EUR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls for Parts */}
              {totalPartPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {partStartIndex + 1} to {Math.min(partEndIndex, partData.length)} of {partData.length} parts
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setPartPage(p => Math.max(1, p - 1))}
                          className={partPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPartPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setPartPage(page)}
                            isActive={partPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setPartPage(p => Math.min(totalPartPages, p + 1))}
                          className={partPage === totalPartPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
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
                <LineChart data={monthlyData}>
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
                  {monthlyData.slice(1).map((item, index) => {
                    const prevRevenue = monthlyData[index].revenue;
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
                      {monthlyData.reduce((max, item) => 
                        item.revenue > max.revenue ? item : max, monthlyData[0] || { month: '-', revenue: 0 }
                      ).month}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Best Month (Orders)</span>
                    <Badge variant="outline">
                      {monthlyData.reduce((max, item) => 
                        item.orders > max.orders ? item : max, monthlyData[0] || { month: '-', orders: 0 }
                      ).month}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Top Customer</span>
                    <Badge variant="outline">{customerData[0]?.name || '—'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Top Part</span>
                    <Badge variant="outline">{partData[0]?.name || '—'}</Badge>
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
