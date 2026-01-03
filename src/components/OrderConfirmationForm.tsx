import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FileText, Plus, Calendar as CalendarIcon, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { formatDateForInput } from "@/lib/dateUtils";
import { getCurrencyForCountry } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrderConfirmationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingOrderConfirmation?: any;
}

interface OrderConfirmationItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  inventoryId?: string;
  weight?: number;
}

export default function OrderConfirmationForm({ isOpen, onClose, onSuccess, editingOrderConfirmation }: OrderConfirmationFormProps) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
  const [productSearchOpen, setProductSearchOpen] = useState<Record<number, boolean>>({});

  const [formData, setFormData] = useState({
    orderConfirmationNumber: '',
    customerId: '',
    orderNumber: '',
    issueDate: formatDateForInput(new Date()),
    shippingDate: '',
    shippingAddress: '',
    packing: 0,
    taraWeight: 0,
    netWeight: 0,
    totalWeight: 0,
    totalQuantity: 0,
    currency: 'EUR',
    notes: '',
    items: [] as OrderConfirmationItem[],
  });

  const [isIssueDatePickerOpen, setIsIssueDatePickerOpen] = useState(false);
  const [isShippingDatePickerOpen, setIsShippingDatePickerOpen] = useState(false);

  const isEditMode = !!editingOrderConfirmation;

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      fetchInventoryItems();
      if (isEditMode && editingOrderConfirmation) {
        loadEditingOrderConfirmation();
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingOrderConfirmation]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*, dap_address, fco_address, payment_terms, country');
    if (data) setCustomers(data);
  };

  const fetchInventoryItems = async () => {
    const { data } = await supabase.from('inventory').select('*').eq('category', 'Parts');
    if (data) setInventoryItems(data);
  };

  const resetForm = () => {
    const customerCurrency = customers.length
      ? getCurrencyForCountry(customers.find(c => c.id === formData.customerId)?.country || '')
      : 'EUR';

    setFormData({
      orderConfirmationNumber: '',
      customerId: '',
      orderNumber: '',
      issueDate: formatDateForInput(new Date()),
      shippingDate: '',
      shippingAddress: '',
      packing: 0,
      taraWeight: 0,
      netWeight: 0,
      totalWeight: 0,
      totalQuantity: 0,
      currency: customerCurrency || 'EUR',
      notes: '',
      items: [],
    });
    setProductSearchTerms({});
    setProductSearchOpen({});
  };

  const loadEditingOrderConfirmation = () => {
    if (!editingOrderConfirmation) return;

    const customer = customers.find(c => c.id === editingOrderConfirmation.customer_id);

    const customerCurrency = getCurrencyForCountry(customer?.country || '');

    const itemsMapped = editingOrderConfirmation.order_confirmation_items?.map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total,
      inventoryId: item.inventory_id,
      weight: item.weight || 0,
    })) || [];

    const { totalQuantity, netWeight, totalWeight } = recalcTotals(itemsMapped, editingOrderConfirmation.tara_weight || 0);

    setFormData({
      orderConfirmationNumber: editingOrderConfirmation.order_confirmation_number || '',
      customerId: editingOrderConfirmation.customer_id || '',
      orderNumber: editingOrderConfirmation.order_number || '',
      issueDate: editingOrderConfirmation.issue_date || formatDateForInput(new Date()),
      shippingDate: editingOrderConfirmation.shipping_date || '',
      shippingAddress: editingOrderConfirmation.shipping_address || '',
      packing: editingOrderConfirmation.packing || 0,
      taraWeight: editingOrderConfirmation.tara_weight || 0,
      netWeight,
      totalWeight,
      totalQuantity,
      currency: editingOrderConfirmation.currency || customerCurrency || 'EUR',
      notes: editingOrderConfirmation.notes || '',
      items: itemsMapped,
    });
  };

  const getSelectedCustomer = () => {
    return customers.find(c => c.id === formData.customerId);
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    const currency = getCurrencyForCountry(customer?.country || '');
    setFormData(prev => ({
      ...prev,
      customerId,
      shippingAddress: customer?.address || '',
      currency: currency || prev.currency,
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
        weight: 0,
      }]
    }));
  };

  const removeItem = (index: number) => {
    // Clean up search term and open state for removed item
    // Reindex remaining items: items after removed index shift down by 1
    const newSearchTerms: Record<number, string> = {};
    const newSearchOpen: Record<number, boolean> = {};
    
    Object.keys(productSearchTerms).forEach(key => {
      const oldIndex = parseInt(key);
      if (oldIndex < index) {
        newSearchTerms[oldIndex] = productSearchTerms[oldIndex];
      } else if (oldIndex > index) {
        newSearchTerms[oldIndex - 1] = productSearchTerms[oldIndex];
      }
      // Skip oldIndex === index (removed item)
    });
    
    Object.keys(productSearchOpen).forEach(key => {
      const oldIndex = parseInt(key);
      if (oldIndex < index) {
        newSearchOpen[oldIndex] = productSearchOpen[oldIndex];
      } else if (oldIndex > index) {
        newSearchOpen[oldIndex - 1] = productSearchOpen[oldIndex];
      }
      // Skip oldIndex === index (removed item)
    });
    
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const { totalQuantity, netWeight, totalWeight } = recalcTotals(newItems, prev.taraWeight);
      return {
        ...prev,
        items: newItems,
        netWeight,
        totalWeight,
        totalQuantity,
      };
    });
    
    setProductSearchTerms(newSearchTerms);
    setProductSearchOpen(newSearchOpen);
  };

  const recalcTotals = (items: OrderConfirmationItem[], taraWeight: number) => {
    const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const netWeight = items.reduce((sum, item) => sum + (item.weight || 0) * (item.quantity || 0), 0);
    const totalWeight = netWeight + (taraWeight || 0);
    return { totalAmount, totalQuantity, netWeight, totalWeight };
  };

  const updateItem = (index: number, field: keyof OrderConfirmationItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };

      if (field === 'inventoryId') {
        const inventoryItem = inventoryItems.find(inv => inv.id === value);
        if (inventoryItem) {
          item.description = inventoryItem.name || inventoryItem.part_name || '';
          item.unitPrice = inventoryItem.unit_price ?? inventoryItem.price ?? 0;
          item.weight = inventoryItem.weight ?? 0;
          item.inventoryId = value;
        }
      } else if (field === 'quantity') {
        (item as any)[field] = value;
        // Recalculate weight when quantity changes
        const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryId);
        if (inventoryItem) {
          item.weight = (inventoryItem.weight ?? 0) * value;
        }
      } else {
        (item as any)[field] = value;
      }

      item.total = item.quantity * item.unitPrice;
      newItems[index] = item;

      const { totalAmount, totalQuantity, netWeight, totalWeight } = recalcTotals(newItems, prev.taraWeight);

      return {
        ...prev,
        items: newItems,
        netWeight,
        totalWeight,
        totalQuantity,
        // amount is calculated at submit
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.customerId) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive"
      });
      return;
    }

    if (formData.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive"
      });
      return;
    }

    try {
      let orderConfirmationNumber = formData.orderConfirmationNumber;

      // Generate order confirmation number if creating new
      if (!isEditMode) {
        const { data: numberData, error: numberError } = await supabase
          .rpc('generate_order_confirmation_number');

        if (numberError) {
          console.error('Error generating order confirmation number:', numberError);
          toast({
            title: "Error",
            description: "Failed to generate order confirmation number",
            variant: "destructive"
          });
          return;
        }

        orderConfirmationNumber = numberData;
      }

      const { totalAmount, totalQuantity, netWeight, totalWeight } = recalcTotals(formData.items, formData.taraWeight);

      const orderConfirmationData = {
        order_confirmation_number: orderConfirmationNumber,
        customer_id: formData.customerId,
        amount: totalAmount,
        status: 'draft',
        shipping_date: formData.shippingDate?.trim() || null,
        issue_date: formData.issueDate,
        order_number: formData.orderNumber?.trim() || null,
        shipping_address: formData.shippingAddress?.trim() || null,
        packing: formData.packing || 0,
        tara_weight: formData.taraWeight || 0,
        net_weight: netWeight || 0,
        total_weight: totalWeight || 0,
        total_quantity: totalQuantity || 0,
        currency: formData.currency || 'EUR',
        notes: formData.notes?.trim() || null,
      };

      let orderConfirmationId;

      if (isEditMode) {
        const { data, error } = await supabase
          .from('order_confirmations')
          .update(orderConfirmationData)
          .eq('id', editingOrderConfirmation.id)
          .select()
          .single();

        if (error) throw error;
        orderConfirmationId = editingOrderConfirmation.id;

        // Delete existing items
        await supabase
          .from('order_confirmation_items')
          .delete()
          .eq('order_confirmation_id', orderConfirmationId);
      } else {
        const { data, error } = await supabase
          .from('order_confirmations')
          .insert(orderConfirmationData)
          .select()
          .single();

        if (error) {
          console.error('Error inserting order confirmation:', error);
          console.error('Order confirmation data:', orderConfirmationData);
          throw error;
        }
        orderConfirmationId = data.id;
      }

      // Insert items
      const itemsData = formData.items.map(item => {
        const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryId);
        const itemWeight = inventoryItem?.weight ? (inventoryItem.weight * item.quantity) : (item.weight || 0);
        return {
          order_confirmation_id: orderConfirmationId,
          inventory_id: item.inventoryId || null,
          description: item.description?.trim() || '',
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || 0,
          total: item.total || 0,
          weight: itemWeight,
        };
      });

      // Validate items before inserting
      const invalidItems = itemsData.filter(item => !item.description || item.description.length === 0);
      if (invalidItems.length > 0) {
        throw new Error('All items must have a description');
      }

      const { error: itemsError } = await supabase
        .from('order_confirmation_items')
        .insert(itemsData);

      if (itemsError) {
        console.error('Error inserting items:', itemsError);
        throw itemsError;
      }

      toast({
        title: "Success",
        description: `Order confirmation ${isEditMode ? 'updated' : 'created'} successfully`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving order confirmation:', error);
      const errorMessage = error?.message || error?.details || `Failed to ${isEditMode ? 'update' : 'create'} order confirmation`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const { totalAmount } = recalcTotals(formData.items, formData.taraWeight);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Order Confirmation' : 'Create New Order Confirmation'}</DialogTitle>
          <DialogDescription>
            Fill in the order confirmation details and add products
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer and Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Customer *</Label>
              <Select value={formData.customerId} onValueChange={handleCustomerChange}>
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
              <Label>Purchase Order Number</Label>
              <Input
                value={formData.orderNumber}
                onChange={e => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                placeholder="Enter purchase order number"
              />
            </div>

            <div>
              <Label>Issue Date</Label>
              <Popover open={isIssueDatePickerOpen} onOpenChange={setIsIssueDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.issueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.issueDate ? format(new Date(formData.issueDate), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.issueDate ? new Date(formData.issueDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const newIssueDate = formatDateForInput(date);
                        setFormData(prev => ({
                          ...prev,
                          issueDate: newIssueDate,
                        }));
                        setIsIssueDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Shipping Date (optional)</Label>
              <Popover open={isShippingDatePickerOpen} onOpenChange={setIsShippingDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.shippingDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.shippingDate ? format(new Date(formData.shippingDate), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.shippingDate ? new Date(formData.shippingDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setFormData(prev => ({
                          ...prev,
                          shippingDate: formatDateForInput(date)
                        }));
                        setIsShippingDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <Label>Shipping Address *</Label>
            <Textarea
              value={formData.shippingAddress}
              onChange={e => setFormData(prev => ({ ...prev, shippingAddress: e.target.value }))}
              placeholder="Enter shipping address"
              rows={3}
            />
          </div>

          {/* Packing and Weight Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Packing</Label>
              <Input
                type="number"
                value={formData.packing}
                onChange={e => setFormData(prev => ({ ...prev, packing: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Tara Weight</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.taraWeight}
                onChange={e => {
                  const tara = parseFloat(e.target.value) || 0;
                  setFormData(prev => {
                    const { netWeight, totalWeight } = recalcTotals(prev.items, tara);
                    return { ...prev, taraWeight: tara, netWeight, totalWeight };
                  });
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Currency (auto-set from customer country) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Currency (auto)</Label>
              <Input value={formData.currency} readOnly />
            </div>
          </div>

          {/* Products Section */}
          <div>
            <div className="mb-4">
              <Label className="text-base font-medium">Products</Label>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryId);
                return (
                <div key={index} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end p-3 rounded-lg border">
                  <div>
                    <Label className="text-xs">Product</Label>
                    <Popover
                      open={productSearchOpen[index] || false}
                      onOpenChange={(open) => setProductSearchOpen(prev => ({ ...prev, [index]: open }))}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between text-left font-normal"
                        >
                          {inventoryItem ? (
                            <div className="flex flex-col items-start flex-1">
                              <span>{inventoryItem.name || inventoryItem.part_name}</span>
                              {inventoryItem.part_number && (
                                <span className="text-xs text-muted-foreground">Part #: {inventoryItem.part_number}</span>
                              )}
                            </div>
                          ) : "Select product..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search products..."
                            value={productSearchTerms[index] || ''}
                            onValueChange={(value) => {
                              setProductSearchTerms(prev => ({ ...prev, [index]: value }));
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              {inventoryItems
                                .filter(invItem => {
                                  const searchTerm = (productSearchTerms[index] || '').toLowerCase();
                                  if (!searchTerm) return true;
                                  const nameMatch = (invItem.name || invItem.part_name || '').toLowerCase().includes(searchTerm);
                                  const partNumberMatch = (invItem.part_number || '').toLowerCase().includes(searchTerm);
                                  return nameMatch || partNumberMatch;
                                })
                                .map((inv) => (
                                  <CommandItem
                                    key={inv.id}
                                    value={`${inv.name || inv.part_name} ${inv.part_number || ''}`}
                                    onSelect={() => {
                                      updateItem(index, 'inventoryId', inv.id);
                                      setProductSearchOpen(prev => ({ ...prev, [index]: false }));
                                      setProductSearchTerms(prev => ({ ...prev, [index]: '' }));
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        item.inventoryId === inv.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{inv.name || inv.part_name}</span>
                                      {inv.part_number && (
                                        <span className="text-xs text-muted-foreground">Part #: {inv.part_number}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="w-20">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>

                  <div className="w-24">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={e => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>

                  <div className="w-24">
                    <Label className="text-xs">Total</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.total.toFixed(2)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={formData.items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                );
              })}
              
              {/* Add Product button below items */}
              <div className="mt-3">
                <Button type="button" onClick={addItem} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              </div>
            </div>

            <div className="mt-4 text-right">
              <span className="font-medium">Total: {totalAmount.toFixed(2)} {formData.currency}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter any additional notes"
              rows={3}
            />
          </div>

          <Separator />

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <FileText className="w-4 h-4 mr-2" />
              {isEditMode ? 'Update' : 'Create'} Order Confirmation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
