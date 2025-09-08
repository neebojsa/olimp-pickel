import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Search, DollarSign, Calendar, Send, Trash2, Download, Eye, Edit, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currencyUtils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type InvoiceSettings = Database['public']['Tables']['invoice_settings']['Row'];

const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "pending":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    case "overdue":
      return "bg-red-500/10 text-red-700 border-red-200";
    case "draft":
      return "bg-gray-500/10 text-gray-700 border-gray-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

const InvoiceSettingsDialog = ({ children }: { children: React.ReactNode }) => {
  const { toast } = useToast();
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [domesticFooterCol1, setDomesticFooterCol1] = useState("");
  const [domesticFooterCol2, setDomesticFooterCol2] = useState("");
  const [domesticFooterCol3, setDomesticFooterCol3] = useState("");
  const [foreignFooterCol1, setForeignFooterCol1] = useState("");
  const [foreignFooterCol2, setForeignFooterCol2] = useState("");
  const [foreignFooterCol3, setForeignFooterCol3] = useState("");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setSettingsId(data.id);
        setPrimaryColor(data.primary_color || "#3b82f6");
        setDomesticFooterCol1(data.domestic_footer_column1 || "");
        setDomesticFooterCol2(data.domestic_footer_column2 || "");
        setDomesticFooterCol3(data.domestic_footer_column3 || "");
        setForeignFooterCol1(data.foreign_footer_column1 || "");
        setForeignFooterCol2(data.foreign_footer_column2 || "");
        setForeignFooterCol3(data.foreign_footer_column3 || "");
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      const settings = {
        primary_color: primaryColor,
        domestic_footer_column1: domesticFooterCol1,
        domestic_footer_column2: domesticFooterCol2,
        domestic_footer_column3: domesticFooterCol3,
        foreign_footer_column1: foreignFooterCol1,
        foreign_footer_column2: foreignFooterCol2,
        foreign_footer_column3: foreignFooterCol3,
      };

      if (settingsId) {
        const { error } = await supabase
          .from('invoice_settings')
          .update(settings)
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('invoice_settings')
          .insert(settings)
          .select()
          .single();

        if (error) throw error;
        setSettingsId(data.id);
      }

      toast({
        title: "Success",
        description: "Settings saved successfully"
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invoice Settings</DialogTitle>
          <DialogDescription>
            Configure your invoice appearance and content
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="domestic">Domestic Invoices</TabsTrigger>
            <TabsTrigger value="foreign">Foreign Invoices</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">{primaryColor}</span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="domestic" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domestic-col1">Column 1</Label>
                <Textarea
                  id="domestic-col1"
                  placeholder="Footer column 1..."
                  value={domesticFooterCol1}
                  onChange={(e) => setDomesticFooterCol1(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domestic-col2">Column 2</Label>
                <Textarea
                  id="domestic-col2"
                  placeholder="Footer column 2..."
                  value={domesticFooterCol2}
                  onChange={(e) => setDomesticFooterCol2(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domestic-col3">Column 3</Label>
                <Textarea
                  id="domestic-col3"
                  placeholder="Footer column 3..."
                  value={domesticFooterCol3}
                  onChange={(e) => setDomesticFooterCol3(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="foreign" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="foreign-col1">Column 1</Label>
                <Textarea
                  id="foreign-col1"
                  placeholder="Footer column 1..."
                  value={foreignFooterCol1}
                  onChange={(e) => setForeignFooterCol1(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foreign-col2">Column 2</Label>
                <Textarea
                  id="foreign-col2"
                  placeholder="Footer column 2..."
                  value={foreignFooterCol2}
                  onChange={(e) => setForeignFooterCol2(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foreign-col3">Column 3</Label>
                <Textarea
                  id="foreign-col3"
                  placeholder="Footer column 3..."
                  value={foreignFooterCol3}
                  onChange={(e) => setForeignFooterCol3(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function Invoicing() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerId: '',
    orderNumber: '',
    shippingDate: '',
    shippingAddress: '',
    incoterms: '',
    declarationNumber: '',
    packing: 1,
    taraWeight: 0,
    notes: ''
  });
  const [invoiceItems, setInvoiceItems] = useState([{
    inventoryId: '',
    quantity: 1,
    unitPrice: 0
  }]);

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchInventoryItems();
    fetchCompanyInfo();
  }, []);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select(`
        *,
        customers!inner(id, name, country),
        invoice_items!fk_invoice_items_invoice(*)
      `)
      .order('created_at', { ascending: false });
    
    if (data) {
      setInvoices(data);
    }
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*');
    if (data) setCustomers(data);
  };

  const fetchInventoryItems = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('category', 'Parts');
    if (data) setInventoryItems(data);
  };

  const fetchCompanyInfo = async () => {
    const { data } = await supabase
      .from('company_info')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) setCompanyInfo(data);
  };

  const getSelectedCustomer = () => {
    return customers.find(c => c.id === newInvoice.customerId);
  };

  const generateInvoiceNumber = async () => {
    const { data } = await supabase.rpc('generate_invoice_number');
    return data;
  };

  const calculateTotals = () => {
    const customer = getSelectedCustomer();
    let totalQuantity = 0;
    let netWeight = 0;
    let subtotal = 0;

    invoiceItems.forEach(item => {
      const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryId);
      if (inventoryItem) {
        totalQuantity += item.quantity;
        netWeight += (inventoryItem.weight || 0) * item.quantity;
        subtotal += item.quantity * item.unitPrice;
      }
    });

    const totalWeight = netWeight + newInvoice.taraWeight;
    const vatRate = customer?.country === 'Bosnia and Herzegovina' ? 17 : 0;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    const currency = customer?.country === 'Bosnia and Herzegovina' ? 'BAM' : 'EUR';

    return {
      totalQuantity,
      netWeight,
      totalWeight,
      subtotal,
      vatRate,
      vatAmount,
      total,
      currency
    };
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.customerId) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive"
      });
      return;
    }

    const invoiceNumber = await generateInvoiceNumber();
    const totals = calculateTotals();
    const customer = getSelectedCustomer();

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        invoice_number: invoiceNumber,
        customer_id: newInvoice.customerId,
        order_number: newInvoice.orderNumber,
        shipping_date: newInvoice.shippingDate,
        shipping_address: newInvoice.shippingAddress || customer?.address,
        incoterms: newInvoice.incoterms,
        declaration_number: newInvoice.declarationNumber,
        packing: newInvoice.packing,
        tara_weight: newInvoice.taraWeight,
        total_quantity: totals.totalQuantity,
        net_weight: totals.netWeight,
        total_weight: totals.totalWeight,
        amount: totals.total,
        currency: totals.currency,
        vat_rate: totals.vatRate,
        notes: newInvoice.notes,
        status: 'draft'
      }])
      .select()
      .single();

    if (invoiceError) {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive"
      });
      return;
    }

    // Insert invoice items
    const itemsData = invoiceItems.map(item => ({
      invoice_id: invoiceData.id,
      description: inventoryItems.find(inv => inv.id === item.inventoryId)?.name || '',
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsData);

    if (!itemsError) {
      await fetchInvoices();
      setIsAddInvoiceOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Invoice created successfully"
      });
    }
  };

  const handleUpdateInvoice = async () => {
    if (!newInvoice.customerId || !selectedInvoice) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive"
      });
      return;
    }

    const totals = calculateTotals();
    const customer = getSelectedCustomer();

    // Update the invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({
        customer_id: newInvoice.customerId,
        order_number: newInvoice.orderNumber,
        shipping_date: newInvoice.shippingDate,
        shipping_address: newInvoice.shippingAddress || customer?.address,
        incoterms: newInvoice.incoterms,
        declaration_number: newInvoice.declarationNumber,
        packing: newInvoice.packing,
        tara_weight: newInvoice.taraWeight,
        total_quantity: totals.totalQuantity,
        net_weight: totals.netWeight,
        total_weight: totals.totalWeight,
        amount: totals.total,
        currency: totals.currency,
        vat_rate: totals.vatRate,
        notes: newInvoice.notes
      })
      .eq('id', selectedInvoice.id);

    if (invoiceError) {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive"
      });
      return;
    }

    // Delete existing invoice items
    await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', selectedInvoice.id);

    // Insert updated invoice items
    const itemsData = invoiceItems.map(item => ({
      invoice_id: selectedInvoice.id,
      description: inventoryItems.find(inv => inv.id === item.inventoryId)?.name || '',
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsData);

    if (!itemsError) {
      await fetchInvoices();
      setIsAddInvoiceOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Invoice updated successfully"
      });
    }
  };

  const handleSubmitInvoice = () => {
    if (isEditMode) {
      handleUpdateInvoice();
    } else {
      handleCreateInvoice();
    }
  };

  const resetForm = () => {
    setNewInvoice({
      customerId: '',
      orderNumber: '',
      shippingDate: '',
      shippingAddress: '',
      incoterms: '',
      declarationNumber: '',
      packing: 1,
      taraWeight: 0,
      notes: ''
    });
    setInvoiceItems([{
      inventoryId: '',
      quantity: 1,
      unitPrice: 0
    }]);
    setIsEditMode(false);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (!error) {
      setInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
      toast({
        title: "Invoice Deleted",
        description: "The invoice has been successfully deleted."
      });
    }
  };

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsPrintDialogOpen(true);
  };

  const handleEditInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setNewInvoice({
      customerId: invoice.customer_id,
      orderNumber: invoice.order_number || '',
      shippingDate: invoice.shipping_date || '',
      shippingAddress: invoice.shipping_address || '',
      incoterms: invoice.incoterms || '',
      declarationNumber: invoice.declaration_number || '',
      packing: invoice.packing || 1,
      taraWeight: invoice.tara_weight || 0,
      notes: invoice.notes || ''
    });

    setInvoiceItems(invoice.invoice_items?.map((item: any) => ({
      inventoryId: inventoryItems.find(inv => inv.name === item.description)?.id || '',
      quantity: item.quantity,
      unitPrice: item.unit_price
    })) || [{
      inventoryId: '',
      quantity: 1,
      unitPrice: 0
    }]);

    setIsEditMode(true);
    setIsAddInvoiceOpen(true);
  };

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, {
      inventoryId: '',
      quantity: 1,
      unitPrice: 0
    }]);
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill unit price when inventory item is selected
    if (field === 'inventoryId') {
      const inventoryItem = inventoryItems.find(item => item.id === value);
      if (inventoryItem) {
        updated[index].unitPrice = inventoryItem.unit_price;
      }
    }

    setInvoiceItems(updated);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || invoice.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  const paidInvoices = invoices.filter(inv => inv.status === "paid");
  const pendingInvoices = invoices.filter(inv => inv.status === "pending");
  const overdueInvoices = invoices.filter(inv => inv.status === "overdue");
  const totals = calculateTotals();
  const selectedCustomer = getSelectedCustomer();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoicing</h1>
          <p className="text-muted-foreground">
            Manage invoices and track payments
          </p>
        </div>
        <div className="flex gap-2">
          <InvoiceSettingsDialog>
            <Button size="icon" variant="outline">
              <Settings className="w-4 h-4" />
            </Button>
          </InvoiceSettingsDialog>
          <Button onClick={() => setIsAddInvoiceOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue, 'EUR')}</div>
            <p className="text-xs text-muted-foreground">
              From {invoices.length} invoices
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0), 'EUR')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0), 'EUR')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(overdueInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0), 'EUR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search invoices or customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{invoice.customers?.name}</p>
                    <p className="text-sm text-muted-foreground">{new Date(invoice.issue_date).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency((invoice.amount || 0), invoice.currency)}</p>
                  </div>
               </div>
                
                <div className="flex gap-1 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => handleViewInvoice(invoice)} title="View Invoice">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEditInvoice(invoice)} title="Edit Invoice">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete invoice "{invoice.invoice_number}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Invoice Dialog */}
      <Dialog open={isAddInvoiceOpen} onOpenChange={(open) => {
        setIsAddInvoiceOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
            <DialogDescription>
              Fill in the invoice details and add products
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Customer and Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer *</Label>
                <Select value={newInvoice.customerId} onValueChange={(value) => {
                  setNewInvoice({ ...newInvoice, customerId: value });
                  const customer = customers.find(c => c.id === value);
                  if (customer) {
                    setNewInvoice(prev => ({
                      ...prev,
                      shippingAddress: customer.address || '',
                      declarationNumber: customer.declaration_numbers?.[0] || ''
                    }));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Order Number</Label>
                <Input
                  value={newInvoice.orderNumber}
                  onChange={(e) => setNewInvoice({ ...newInvoice, orderNumber: e.target.value })}
                  placeholder="Enter order number"
                />
              </div>

              <div>
                <Label>Shipping Date</Label>
                <Input
                  type="date"
                  value={newInvoice.shippingDate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, shippingDate: e.target.value })}
                />
              </div>

              <div>
                <Label>Incoterms</Label>
                <Select value={newInvoice.incoterms} onValueChange={(value) => setNewInvoice({ ...newInvoice, incoterms: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select incoterms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                    <SelectItem value="DAP">DAP - Delivered At Place</SelectItem>
                    <SelectItem value="FCO">FCO - Free Carrier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <Label>Shipping Address *</Label>
              <Textarea
                value={newInvoice.shippingAddress}
                onChange={(e) => setNewInvoice({ ...newInvoice, shippingAddress: e.target.value })}
                placeholder="Shipping address (auto-filled from customer)"
                rows={3}
              />
            </div>

            {/* Declaration Number and Packing */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Declaration Number *</Label>
                <Select value={newInvoice.declarationNumber} onValueChange={(value) => setNewInvoice({ ...newInvoice, declarationNumber: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select declaration number" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCustomer?.declaration_numbers?.map((number: any, index: number) => (
                      <SelectItem key={index} value={number}>
                        {number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Packing</Label>
                <Input
                  type="number"
                  value={newInvoice.packing}
                  onChange={(e) => setNewInvoice({ ...newInvoice, packing: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>

              <div>
                <Label>Tara Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newInvoice.taraWeight}
                  onChange={(e) => setNewInvoice({ ...newInvoice, taraWeight: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label className="text-base font-semibold">Invoice Items</Label>
                <Button type="button" onClick={addInvoiceItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {invoiceItems.map((item, index) => (
                  <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label>Part *</Label>
                      <Select 
                        value={item.inventoryId} 
                        onValueChange={(value) => updateInvoiceItem(index, 'inventoryId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select part" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map(inv => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.name} - {formatCurrency(inv.unit_price, 'EUR')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-24">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                      />
                    </div>

                    <div className="w-32">
                      <Label>Unit Price *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </div>

                    <div className="w-32">
                      <Label>Total</Label>
                      <div className="h-10 flex items-center font-medium">
                        {formatCurrency(item.quantity * item.unitPrice, totals.currency)}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeInvoiceItem(index)}
                      disabled={invoiceItems.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                placeholder="Additional notes or comments..."
                rows={3}
              />
            </div>

            {/* Invoice Summary */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-4">Invoice Summary</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Quantity:</span>
                    <span>{totals.totalQuantity} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Weight:</span>
                    <span>{totals.netWeight.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Weight:</span>
                    <span>{totals.totalWeight.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Currency:</span>
                    <span>{totals.currency}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal, totals.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT ({totals.vatRate}%):</span>
                    <span>{formatCurrency(totals.vatAmount, totals.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(totals.total, totals.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitInvoice}>
              {isEditMode ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Printable Invoice Dialog with Footer */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:!max-w-none print:!w-full print:!h-full print:!max-h-none print:!p-0 print:!m-0 print:!shadow-none print:!border-none print:!rounded-none">
          {selectedInvoice && <InvoicePrintPreview invoice={selectedInvoice} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Invoice Print Preview Component with Footer
const InvoicePrintPreview = ({ invoice }: { invoice: any }) => {
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);

  useEffect(() => {
    fetchCompanyInfo();
    fetchInventoryItems();
    fetchInvoiceSettings();
  }, []);

  const fetchCompanyInfo = async () => {
    const { data } = await supabase
      .from('company_info')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) setCompanyInfo(data);
  };

  const fetchInventoryItems = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('category', 'Parts');
    if (data) setInventoryItems(data);
  };

  const fetchInvoiceSettings = async () => {
    const { data } = await supabase
      .from('invoice_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) setInvoiceSettings(data);
  };

  const isForeignCustomer = invoice.customers?.country && 
    invoice.customers.country.toLowerCase() !== 'germany' &&
    invoice.customers.country.toLowerCase() !== 'deutschland' &&
    invoice.customers.country.toLowerCase() !== 'bosnia and herzegovina';

  const getFooterContent = () => {
    if (!invoiceSettings) return null;

    if (isForeignCustomer) {
      return {
        col1: invoiceSettings.foreign_footer_column1,
        col2: invoiceSettings.foreign_footer_column2,
        col3: invoiceSettings.foreign_footer_column3,
      };
    } else {
      return {
        col1: invoiceSettings.domestic_footer_column1,
        col2: invoiceSettings.domestic_footer_column2,
        col3: invoiceSettings.domestic_footer_column3,
      };
    }
  };

  const footerContent = getFooterContent();

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 0.5in;
            size: A4;
          }
          
          .print-invoice {
            font-family: 'Arial', sans-serif !important;
            font-size: 16pt !important;
            line-height: 1.4 !important;
            color: black !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .invoice-header {
            display: flex !important;
            justify-content: space-between !important;
            margin-bottom: 30px !important;
          }
          
          .invoice-items-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 20px 0 !important;
          }
          
          .invoice-items-table th,
          .invoice-items-table td {
            border-left: none !important;
            border-right: none !important;
            padding: 8px !important;
            text-align: left !important;
            font-size: 14pt !important;
          }
          
          .invoice-items-table th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
            font-size: 10pt !important;
            border-top: 1px solid #000 !important;
            border-bottom: 1px solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .invoice-items-table td {
            border-top: 1px solid #6b7280 !important;
            border-bottom: 1px solid #6b7280 !important;
          }
          
          .print-invoice-bg {
            background-color: #f3daaf !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print-text-lg {
            font-size: 18pt !important;
          }
          
          .print-text-base {
            font-size: 16pt !important;
          }
          
          .print-text-sm {
            font-size: 14pt !important;
          }
          
          .page-break {
            page-break-before: always !important;
          }
          
          .no-page-break {
            page-break-inside: avoid !important;
          }

          .invoice-footer {
            margin-top: 40px !important;
            border-top: 2px solid ${invoiceSettings?.primary_color || '#3b82f6'} !important;
            padding-top: 20px !important;
          }
        }
      `}</style>
      
      <div className="print-invoice space-y-6 print:text-black print:bg-white">
        {/* Company Header with Invoice Title */}
        {companyInfo && (
          <div className="company-header print:mb-6 flex justify-between items-end">
            <div>
              {companyInfo.logo_url && (
                <div className="mb-3">
                  <img src={companyInfo.logo_url} alt="Company Logo" className="h-16 print:h-20 object-contain" />
                </div>
              )}
              <div className="text-sm print-text-sm">
                <div className="inline-block">
                  <p className="font-medium border-b-[2px] border-foreground print:border-black pb-1 inline-block">
                    {companyInfo.legal_name || companyInfo.company_name} - {companyInfo.address} - {companyInfo.postal_code} {companyInfo.city} - BA
                  </p>
                </div>
              </div>
            </div>
            
            <div 
              className="pl-2 pr-[30px] h-[25px] flex items-center justify-center"
              style={{ backgroundColor: invoiceSettings?.primary_color || '#f3daaf' }}
            >
              <span className="text-lg print-text-lg font-medium text-black">INVOICE</span>
            </div>
          </div>
        )}

        {/* Invoice Header */}
        <div className="invoice-header grid grid-cols-2 gap-6 print:mb-8">
          <div>
            <h3 className="font-semibold mb-2 print-text-lg">Bill To:</h3>
            <p className="font-medium print-text-base">{invoice.customers?.name}</p>
            <p className="text-sm whitespace-pre-line print-text-sm">{invoice.shipping_address}</p>
          </div>
          <div className="text-right">
            <div className="space-y-1 print:space-y-2">
              <p className="print-text-sm"><span className="font-medium">Invoice Number:</span> {invoice.invoice_number}</p>
              <p className="print-text-sm"><span className="font-medium">Issue Date:</span> {new Date(invoice.issue_date).toLocaleDateString()}</p>
              <p className="print-text-sm"><span className="font-medium">Due Date:</span> {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
              {invoice.order_number && <p className="print-text-sm"><span className="font-medium">Order Number:</span> {invoice.order_number}</p>}
              {invoice.shipping_date && <p className="print-text-sm"><span className="font-medium">Shipping Date:</span> {new Date(invoice.shipping_date).toLocaleDateString()}</p>}
              {invoice.incoterms && <p className="print-text-sm"><span className="font-medium">Incoterms:</span> {invoice.incoterms}</p>}
              {invoice.declaration_number && <p className="print-text-sm"><span className="font-medium">Declaration Number:</span> {invoice.declaration_number}</p>}
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="no-page-break">
          <table className="invoice-items-table w-full border-collapse print:border-black">
            <thead>
              <tr>
                <th className="p-2 text-left text-sm">Part name</th>
                <th className="p-2 text-sm">Part number</th>
                <th className="p-2 text-sm">Unit</th>
                <th className="p-2 text-sm">Quantity</th>
                <th className="p-2 text-sm">Subtotal weight</th>
                <th className="p-2 text-sm">Price</th>
                <th className="p-2 text-right text-sm">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items?.map((item: any, index: number) => {
                const inventoryItem = inventoryItems.find(inv => inv.name === item.description);
                const subtotalWeight = (inventoryItem?.weight || 0) * item.quantity;
                return (
                  <tr key={index}>
                    <td className="p-2">{item.description}</td>
                    <td className="p-2">{inventoryItem?.part_number || '-'}</td>
                    <td className="p-2">{inventoryItem?.unit || 'piece'}</td>
                    <td className="p-2">{item.quantity}</td>
                    <td className="p-2">{subtotalWeight.toFixed(2)} kg</td>
                    <td className="p-2">{formatCurrency(item.unit_price, invoice.currency)}</td>
                    <td className="p-2 text-right">{formatCurrency(item.total, invoice.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary */}
        <div className="grid grid-cols-2 gap-6 no-page-break print:mt-8">
          <div>
            <h3 className="font-semibold mb-2 print-text-base">Summary</h3>
            <div className="space-y-1 text-sm print:space-y-2 print-text-sm">
              <p><span className="font-medium">Total Quantity:</span> {invoice.total_quantity} pcs</p>
              <p><span className="font-medium">Net Weight:</span> {invoice.net_weight} kg</p>
              <p><span className="font-medium">Total Weight:</span> {invoice.total_weight} kg</p>
              <p><span className="font-medium">Packing:</span> {invoice.packing} {invoice.packing === 1 ? 'package' : 'packages'}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="space-y-2 print:space-y-3">
              <div className="flex justify-between print-text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(((invoice.amount || 0) / (1 + (invoice.vat_rate || 0) / 100)), invoice.currency)}</span>
              </div>
              <div className="flex justify-between print-text-sm">
                <span>VAT ({invoice.vat_rate}%):</span>
                <span>{formatCurrency(((invoice.amount || 0) - (invoice.amount || 0) / (1 + (invoice.vat_rate || 0) / 100)), invoice.currency)}</span>
              </div>
              <div 
                className="flex justify-between font-bold text-lg h-[25px] items-center px-2 print-text-base"
                style={{ backgroundColor: invoiceSettings?.primary_color || '#f3daaf' }}
              >
                <span>Total:</span>
                <span>{formatCurrency((invoice.amount || 0), invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="no-page-break print:mt-6">
            <h3 className="font-semibold mb-2 print-text-base">Notes</h3>
            <p className="text-sm whitespace-pre-line print-text-sm">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        {footerContent && (footerContent.col1 || footerContent.col2 || footerContent.col3) && (
          <div className="invoice-footer">
            <div className="grid grid-cols-3 gap-4 text-sm print-text-sm">
              {footerContent.col1 && (
                <div className="whitespace-pre-line">
                  {footerContent.col1}
                </div>
              )}
              {footerContent.col2 && (
                <div className="whitespace-pre-line text-center">
                  {footerContent.col2}
                </div>
              )}
              {footerContent.col3 && (
                <div className="whitespace-pre-line text-right">
                  {footerContent.col3}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 print:hidden">
          <Button onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
          <Button variant="outline" onClick={() => window.close()}>
            Close
          </Button>
        </div>
      </div>
    </>
  );
};
