import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FileText, Plus, Search, DollarSign, Calendar, Send, Trash2, Download, Eye, Edit, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currencyUtils";
import { supabase } from "@/integrations/supabase/client";
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
export default function Invoicing() {
  const {
    toast
  } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [invoiceSettings, setInvoiceSettings] = useState({
    primaryColor: '#000000',
    domesticFooter: ['', '', ''],
    foreignFooter: ['', '', '']
  });
  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchInventoryItems();
    fetchCompanyInfo();
    fetchInvoiceSettings();
  }, []);
  const fetchInvoices = async () => {
    const {
      data
    } = await supabase.from('invoices').select(`
        *,
        customers!inner(id, name, country),
        invoice_items!fk_invoice_items_invoice(*)
      `).order('created_at', {
      ascending: false
    });
    if (data) {
      setInvoices(data);
    }
  };
  const fetchCustomers = async () => {
    const {
      data
    } = await supabase.from('customers').select('*');
    if (data) setCustomers(data);
  };
  const fetchInventoryItems = async () => {
    const {
      data
    } = await supabase.from('inventory').select('*').eq('category', 'Parts');
    if (data) setInventoryItems(data);
  };
  const fetchCompanyInfo = async () => {
    const {
      data
    } = await supabase.from('company_info').select('*').limit(1).single();
    if (data) setCompanyInfo(data);
  };
  const fetchInvoiceSettings = async () => {
    try {
      // Temporary workaround until types are updated
      const {
        data
      } = await (supabase as any).from('invoice_settings').select('*').maybeSingle();
      if (data) {
        setInvoiceSettings({
          primaryColor: data.primary_color || '#000000',
          domesticFooter: [data.domestic_footer_column1 || '', data.domestic_footer_column2 || '', data.domestic_footer_column3 || ''],
          foreignFooter: [data.foreign_footer_column1 || '', data.foreign_footer_column2 || '', data.foreign_footer_column3 || '']
        });
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
    }
  };
  const saveInvoiceSettings = async () => {
    try {
      // Temporary workaround until types are updated
      const {
        data: existingSettings
      } = await (supabase as any).from('invoice_settings').select('id').maybeSingle();
      const settingsData = {
        primary_color: invoiceSettings.primaryColor,
        domestic_footer_column1: invoiceSettings.domesticFooter[0],
        domestic_footer_column2: invoiceSettings.domesticFooter[1],
        domestic_footer_column3: invoiceSettings.domesticFooter[2],
        foreign_footer_column1: invoiceSettings.foreignFooter[0],
        foreign_footer_column2: invoiceSettings.foreignFooter[1],
        foreign_footer_column3: invoiceSettings.foreignFooter[2]
      };
      let error;
      if (existingSettings) {
        ({
          error
        } = await (supabase as any).from('invoice_settings').update(settingsData).eq('id', existingSettings.id));
      } else {
        ({
          error
        } = await (supabase as any).from('invoice_settings').insert(settingsData));
      }
      if (error) throw error;
      toast({
        title: "Settings saved",
        description: "Invoice settings have been updated successfully."
      });
    } catch (error) {
      console.error('Error saving invoice settings:', error);
      toast({
        title: "Error",
        description: "Failed to save invoice settings. Please try again.",
        variant: "destructive"
      });
    }
  };
  const getSelectedCustomer = () => {
    return customers.find(c => c.id === newInvoice.customerId);
  };
  const generateInvoiceNumber = async () => {
    const {
      data
    } = await supabase.rpc('generate_invoice_number');
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
    const {
      data: invoiceData,
      error: invoiceError
    } = await supabase.from('invoices').insert([{
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
    }]).select().single();
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
    const {
      error: itemsError
    } = await supabase.from('invoice_items').insert(itemsData);
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
    const {
      error: invoiceError
    } = await supabase.from('invoices').update({
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
    }).eq('id', selectedInvoice.id);
    if (invoiceError) {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive"
      });
      return;
    }

    // Delete existing invoice items
    await supabase.from('invoice_items').delete().eq('invoice_id', selectedInvoice.id);

    // Insert updated invoice items
    const itemsData = invoiceItems.map(item => ({
      invoice_id: selectedInvoice.id,
      description: inventoryItems.find(inv => inv.id === item.inventoryId)?.name || '',
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice
    }));
    const {
      error: itemsError
    } = await supabase.from('invoice_items').insert(itemsData);
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
    const {
      error
    } = await supabase.from('invoices').delete().eq('id', invoiceId);
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
    setInvoiceItems(invoice.invoice_items?.map(item => ({
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
    updated[index] = {
      ...updated[index],
      [field]: value
    };

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
    const matchesSearch = invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) || invoice.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || invoice.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });
  const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  const paidInvoices = invoices.filter(inv => inv.status === "paid");
  const pendingInvoices = invoices.filter(inv => inv.status === "pending");
  const overdueInvoices = invoices.filter(inv => inv.status === "overdue");
  const totals = calculateTotals();
  const selectedCustomer = getSelectedCustomer();
  return <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoicing</h1>
          <p className="text-muted-foreground">
            Manage invoices and track payments
          </p>
        </div>
        <Button size="icon" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-4 h-4" />
        </Button>
        <Dialog open={isAddInvoiceOpen} onOpenChange={open => {
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
                  <Select value={newInvoice.customerId} onValueChange={value => {
                  setNewInvoice({
                    ...newInvoice,
                    customerId: value
                  });
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
                      {customers.map(customer => <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Order Number</Label>
                  <Input value={newInvoice.orderNumber} onChange={e => setNewInvoice({
                  ...newInvoice,
                  orderNumber: e.target.value
                })} placeholder="Enter order number" />
                </div>

                <div>
                  <Label>Shipping Date</Label>
                  <Input type="date" value={newInvoice.shippingDate} onChange={e => setNewInvoice({
                  ...newInvoice,
                  shippingDate: e.target.value
                })} />
                </div>

                <div>
                  <Label>Incoterms</Label>
                  <Select value={newInvoice.incoterms} onValueChange={value => setNewInvoice({
                  ...newInvoice,
                  incoterms: value
                })}>
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
                <Textarea value={newInvoice.shippingAddress} onChange={e => setNewInvoice({
                ...newInvoice,
                shippingAddress: e.target.value
              })} placeholder="Shipping address (auto-filled from customer)" rows={3} />
              </div>

              {/* Declaration Number and Packing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Declaration Number *</Label>
                  <Select value={newInvoice.declarationNumber} onValueChange={value => setNewInvoice({
                  ...newInvoice,
                  declarationNumber: value
                })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select declaration number" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCustomer?.declaration_numbers?.map((number, index) => <SelectItem key={index} value={number}>
                          {number}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Packing (packages)</Label>
                  <Input type="number" value={newInvoice.packing} onChange={e => setNewInvoice({
                  ...newInvoice,
                  packing: parseInt(e.target.value) || 1
                })} min="1" />
                </div>

                <div>
                  <Label>TARA Weight (kg)</Label>
                  <Input type="number" step="0.01" value={newInvoice.taraWeight} onChange={e => setNewInvoice({
                  ...newInvoice,
                  taraWeight: parseFloat(e.target.value) || 0
                })} min="0" />
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="mb-4">
                  <Label className="text-lg font-semibold">Invoice Items</Label>
                </div>

                <div className="space-y-3">
                  {invoiceItems.map((item, index) => <div key={index} className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                      <div>
                        <Label className="text-xs">Product</Label>
                        <Select value={item.inventoryId} onValueChange={value => updateInvoiceItem(index, 'inventoryId', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map(invItem => <SelectItem key={invItem.id} value={invItem.id}>
                                {invItem.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" value={item.quantity} onChange={e => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)} min="1" />
                      </div>

                      <div>
                        <Label className="text-xs">Unit Price</Label>
                        <Input type="number" step="0.01" value={item.unitPrice} onChange={e => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} min="0" />
                      </div>

                      <div>
                        <Label className="text-xs">Total</Label>
                        <Input value={(item.quantity * item.unitPrice).toFixed(2)} disabled className="bg-muted" />
                      </div>

                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeInvoiceItem(index)} disabled={invoiceItems.length === 1}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>)}
                </div>
                
                <div className="mt-3">
                  <Button type="button" onClick={addInvoiceItem} size="sm" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Calculations Display */}
              {selectedCustomer && <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Quantity:</span>
                      <span className="font-medium">{totals.totalQuantity} pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Weight:</span>
                      <span className="font-medium">{totals.netWeight.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Weight:</span>
                      <span className="font-medium">{totals.totalWeight.toFixed(2)} kg</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatCurrency(totals.subtotal, totals.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT ({totals.vatRate}%):</span>
                      <span className="font-medium">{formatCurrency(totals.vatAmount, totals.currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(totals.total, totals.currency)}</span>
                    </div>
                  </div>
                </div>}

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Textarea value={newInvoice.notes} onChange={e => setNewInvoice({
                ...newInvoice,
                notes: e.target.value
              })} placeholder="Additional notes..." rows={3} />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleSubmitInvoice}>
                {isEditMode ? 'Update Invoice' : 'Create Invoice'}
              </Button>
              <Button variant="outline" onClick={() => setIsAddInvoiceOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice Settings</DialogTitle>
              <DialogDescription>
                Configure invoice appearance and content
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
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" value={invoiceSettings.primaryColor} onChange={e => setInvoiceSettings(prev => ({
                    ...prev,
                    primaryColor: e.target.value
                  }))} className="w-16 h-10 p-1 border rounded" />
                    <Input type="text" value={invoiceSettings.primaryColor} onChange={e => setInvoiceSettings(prev => ({
                    ...prev,
                    primaryColor: e.target.value
                  }))} placeholder="#000000" className="flex-1" />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="domestic" className="space-y-4">
                <div className="space-y-4">
                  <Label>Footer Content for Domestic Invoices (3 Columns)</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Column 1</Label>
                      <Textarea value={invoiceSettings.domesticFooter[0]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      domesticFooter: [e.target.value, prev.domesticFooter[1], prev.domesticFooter[2]]
                    }))} placeholder="Enter content for column 1..." rows={4} />
                    </div>
                    <div>
                      <Label className="text-sm">Column 2</Label>
                      <Textarea value={invoiceSettings.domesticFooter[1]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      domesticFooter: [prev.domesticFooter[0], e.target.value, prev.domesticFooter[2]]
                    }))} placeholder="Enter content for column 2..." rows={4} />
                    </div>
                    <div>
                      <Label className="text-sm">Column 3</Label>
                      <Textarea value={invoiceSettings.domesticFooter[2]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      domesticFooter: [prev.domesticFooter[0], prev.domesticFooter[1], e.target.value]
                    }))} placeholder="Enter content for column 3..." rows={4} />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="foreign" className="space-y-4">
                <div className="space-y-4">
                  <Label>Footer Content for Foreign Invoices (3 Columns)</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Column 1</Label>
                      <Textarea value={invoiceSettings.foreignFooter[0]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      foreignFooter: [e.target.value, prev.foreignFooter[1], prev.foreignFooter[2]]
                    }))} placeholder="Enter content for column 1..." rows={4} />
                    </div>
                    <div>
                      <Label className="text-sm">Column 2</Label>
                      <Textarea value={invoiceSettings.foreignFooter[1]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      foreignFooter: [prev.foreignFooter[0], e.target.value, prev.foreignFooter[2]]
                    }))} placeholder="Enter content for column 2..." rows={4} />
                    </div>
                    <div>
                      <Label className="text-sm">Column 3</Label>
                      <Textarea value={invoiceSettings.foreignFooter[2]} onChange={e => setInvoiceSettings(prev => ({
                      ...prev,
                      foreignFooter: [prev.foreignFooter[0], prev.foreignFooter[1], e.target.value]
                    }))} placeholder="Enter content for column 3..." rows={4} />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={async () => {
              await saveInvoiceSettings();
              setIsSettingsOpen(false);
            }}>
                Save Settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time invoiced amount
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
              {paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0).toLocaleString()} collected
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
              {pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0).toLocaleString()} pending
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
              {overdueInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0).toLocaleString()} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Search invoices..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
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

      {/* Invoices List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          <Button onClick={() => setIsAddInvoiceOpen(true)}>
            + Add Invoice
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredInvoices.map(invoice => <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors min-h-[80px]">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="min-w-[120px]">
                    <button onClick={() => handleViewInvoice(invoice)} className="text-primary hover:underline font-medium text-left">
                      {invoice.invoice_number}
                    </button>
                  </div>
                  <div className="min-w-[100px]">
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</p>
                  </div>
                  <div className="min-w-[150px]">
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{invoice.customers?.name}</p>
                  </div>
                  <div className="min-w-[100px]">
                    <Badge variant="outline" className={getStatusColor(invoice.status)}>
                      {invoice.status === 'paid' ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                   <div className="min-w-[120px] text-right">
                     <p className="text-sm text-muted-foreground">Total</p>
                     <p className="font-bold text-lg">{formatCurrency(invoice.amount || 0, invoice.currency)}</p>
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
              </div>)}
          </div>
        </CardContent>
      </Card>

      {/* Printable Invoice Dialog */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:!max-w-none print:!w-full print:!h-full print:!max-h-none print:!p-0 print:!m-0 print:!shadow-none print:!border-none print:!rounded-none">
          
          
          {selectedInvoice && <>
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
                }
              `}</style>
              
              <div className="print-invoice print:text-black print:bg-white print:min-h-[calc(100vh-1in)] print:flex print:flex-col space-y-6">
                {/* Company Header with Invoice Title */}
                {companyInfo && <div className="company-header print:mb-6 flex justify-between items-end">
                    <div>
                      {companyInfo.logo_url && <div className="mb-3">
                          <img src={companyInfo.logo_url} alt="Company Logo" className="h-16 print:h-20 object-contain" />
                        </div>}
                       <div className="text-sm print-text-sm">
                         <div className="inline-block">
                           <p className="font-medium border-b-[2px] border-foreground print:border-black pb-1 inline-block">
                             {companyInfo.legal_name || companyInfo.company_name} - {companyInfo.address} - {companyInfo.postal_code} {companyInfo.city} - BA
                           </p>
                         </div>
                       </div>
                    </div>
                    
                    <div className="print-invoice-bg pl-2 pr-[50px] h-[30px] flex items-center justify-center" style={{
                backgroundColor: invoiceSettings.primaryColor
              }}>
                      <span className="text-lg print-text-lg font-medium text-black">INVOICE</span>
                    </div>
                  </div>}

                {/* Invoice Header */}
                <div className="invoice-header grid grid-cols-2 gap-6 print:mb-8">
                  <div>
                     <h3 className="font-semibold mb-2 print-text-lg">Bill To:</h3>
                     <p className="font-medium print-text-base">{selectedInvoice.customers?.name}</p>
                     <p className="text-sm whitespace-pre-line print-text-sm">{selectedInvoice.shipping_address}</p>
                  </div>
                  <div className="text-right">
                    <div className="space-y-1 print:space-y-2">
                       <p className="print-text-sm"><span className="font-medium">Invoice Number:</span> {selectedInvoice.invoice_number}</p>
                       <p className="print-text-sm"><span className="font-medium">Issue Date:</span> {new Date(selectedInvoice.issue_date).toLocaleDateString()}</p>
                       <p className="print-text-sm"><span className="font-medium">Due Date:</span> {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : 'N/A'}</p>
                       {selectedInvoice.order_number && <p className="print-text-sm"><span className="font-medium">Order Number:</span> {selectedInvoice.order_number}</p>}
                        {selectedInvoice.shipping_date && <p className="print-text-sm"><span className="font-medium">Shipping Date:</span> {new Date(selectedInvoice.shipping_date).toLocaleDateString()}</p>}
                        {selectedInvoice.incoterms && <p className="print-text-sm"><span className="font-medium">Incoterms:</span> {selectedInvoice.incoterms}</p>}
                        {selectedInvoice.declaration_number && <p className="print-text-sm"><span className="font-medium">Declaration Number:</span> {selectedInvoice.declaration_number}</p>}
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
                       {selectedInvoice.invoice_items?.map((item, index) => {
                    const inventoryItem = inventoryItems.find(inv => inv.name === item.description);
                    const subtotalWeight = (inventoryItem?.weight || 0) * item.quantity;
                    return <tr key={index}>
                           <td className="p-2">{item.description}</td>
                           <td className="p-2">{inventoryItem?.part_number || '-'}</td>
                           <td className="p-2">{inventoryItem?.unit || 'piece'}</td>
                           <td className="p-2">{item.quantity}</td>
                           <td className="p-2">{subtotalWeight.toFixed(2)} kg</td>
                           <td className="p-2">{formatCurrency(item.unit_price, selectedInvoice.currency)}</td>
                           <td className="p-2 text-right">{formatCurrency(item.total, selectedInvoice.currency)}</td>
                         </tr>;
                  })}
                    </tbody>
                  </table>
                </div>

                {/* Invoice Summary */}
                <div className="grid grid-cols-2 gap-6 no-page-break print:mt-8">
                  <div>
                     <h3 className="font-semibold mb-2 print-text-base">Summary</h3>
                     <div className="space-y-1 text-sm print:space-y-2 print-text-sm">
                       <p><span className="font-medium">Total Quantity:</span> {selectedInvoice.total_quantity} pcs</p>
                       <p><span className="font-medium">Net Weight:</span> {selectedInvoice.net_weight} kg</p>
                       <p><span className="font-medium">Total Weight:</span> {selectedInvoice.total_weight} kg</p>
                       <p><span className="font-medium">Packing:</span> {selectedInvoice.packing} {selectedInvoice.packing === 1 ? 'package' : 'packages'}</p>
                    </div>
                  </div>
                  
                   <div className="text-right w-3/5 ml-auto">
                    <div className="space-y-2 print:space-y-3">
                        <div className="flex justify-between print-text-sm">
                          <span>Subtotal:</span>
                          <span>{formatCurrency((selectedInvoice.amount || 0) / (1 + (selectedInvoice.vat_rate || 0) / 100), selectedInvoice.currency)}</span>
                        </div>
                        <div className="flex justify-between print-text-sm">
                          <span>VAT ({selectedInvoice.vat_rate}%):</span>
                          <span>{formatCurrency((selectedInvoice.amount || 0) - (selectedInvoice.amount || 0) / (1 + (selectedInvoice.vat_rate || 0) / 100), selectedInvoice.currency)}</span>
                        </div>
                        <div style={{
                    backgroundColor: invoiceSettings.primaryColor
                  }} className="flex justify-between font-bold text-lg print-invoice-bg h-[35px] items-center print-text-base pr-[20px]">
                          <span>Total:</span>
                          <span>{formatCurrency(selectedInvoice.amount || 0, selectedInvoice.currency)}</span>
                        </div>
                    </div>
                  </div>
                </div>

                {selectedInvoice.notes && <div className="no-page-break print:mt-6">
                     <h3 className="font-semibold mb-2 print-text-base">Notes</h3>
                     <p className="text-sm whitespace-pre-line print-text-sm">{selectedInvoice.notes}</p>
                  </div>}

                {/* Spacer to push footer to bottom */}
                <div className="print:flex-grow"></div>

                {/* Footer with separator line */}
                {(invoiceSettings.foreignFooter.some(col => col.trim()) || invoiceSettings.domesticFooter.some(col => col.trim())) && <div className="print:mt-auto">
                    <Separator className="print:border-black print:border-t print:my-4" />
                    <div className="text-xs print-text-xs grid grid-cols-3 gap-4">
                      {selectedInvoice.customers?.country === 'Bosnia and Herzegovina' ? <>
                          <div className="whitespace-pre-line text-left">{invoiceSettings.domesticFooter[0]}</div>
                          <div className="whitespace-pre-line text-center">{invoiceSettings.domesticFooter[1]}</div>
                          <div className="whitespace-pre-line text-right">{invoiceSettings.domesticFooter[2]}</div>
                        </> : <>
                          <div className="whitespace-pre-line text-left">{invoiceSettings.foreignFooter[0]}</div>
                          <div className="whitespace-pre-line text-center">{invoiceSettings.foreignFooter[1]}</div>
                          <div className="whitespace-pre-line text-right">{invoiceSettings.foreignFooter[2]}</div>
                        </>}
                    </div>
                  </div>}

                <div className="flex gap-2 pt-4 print:hidden">
                  <Button onClick={() => window.print()}>
                    <Download className="w-4 h-4 mr-2" />
                    Print Invoice
                  </Button>
                  <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>}
        </DialogContent>
      </Dialog>
    </div>;
}