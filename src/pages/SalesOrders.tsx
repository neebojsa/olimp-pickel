import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ShoppingCart, Plus, Search, Calendar as CalendarIcon, Trash2, Edit, Filter, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, getCurrencySymbol } from "@/lib/currencyUtils";
import { formatDate, formatDateForInput } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { NumericInput } from "@/components/NumericInput";
import { SortSelect, SortOption } from "@/components/SortSelect";
import { useSortPreference } from "@/hooks/useSortPreference";
import { sortItems } from "@/lib/sortUtils";

const GenerateButton = ({
  label,
  generated,
  onClick,
  disabled,
}: {
  label: string;
  generated: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    className={cn(
      "text-xs shrink-0",
      generated
        ? "bg-green-500/10 text-green-700 border-green-200 hover:bg-green-500/20"
        : "bg-gray-500/10 text-gray-700 border-gray-200 hover:bg-gray-500/20"
    )}
    onClick={onClick}
    disabled={disabled}
  >
    {label}
  </Button>
);

export default function SalesOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const sortPreference = useSortPreference("sales-orders");
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [salesOrderNumberFilter, setSalesOrderNumberFilter] = useState({ search: "", from: "", to: "" });
  const [isSalesOrderNumberFilterOpen, setIsSalesOrderNumberFilterOpen] = useState(false);
  const [issueDateFilter, setIssueDateFilter] = useState<{ from?: Date; to?: Date }>({});
  const [isIssueDateFilterOpen, setIsIssueDateFilterOpen] = useState(false);
  const [requestedDeliveryDateFilter, setRequestedDeliveryDateFilter] = useState<{ from?: Date; to?: Date }>({});
  const [isRequestedDeliveryDateFilterOpen, setIsRequestedDeliveryDateFilterOpen] = useState(false);
  const [customerFilter, setCustomerFilter] = useState({ search: "", selectedId: "all" });
  const [isCustomerFilterOpen, setIsCustomerFilterOpen] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<Record<string, { hasOC: boolean; hasWO: boolean; hasBom: boolean; hasInvoice: boolean }>>({});
  const [generatingFor, setGeneratingFor] = useState<{ orderId: string; type: string } | null>(null);
  const [amountFilter, setAmountFilter] = useState({ from: "", to: "" });
  const [isAmountFilterOpen, setIsAmountFilterOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<any>(null);
  const [isIssueDatePickerOpen, setIsIssueDatePickerOpen] = useState(false);
  const [isRequestedDeliveryDatePickerOpen, setIsRequestedDeliveryDatePickerOpen] = useState(false);
  const [isPoDatePickerOpen, setIsPoDatePickerOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customerId: "",
    issueDate: "",
    requestedDeliveryDate: "",
    customerPoNumber: "",
    poDate: "",
    notes: "",
    status: "draft",
  });
  const [orderItems, setOrderItems] = useState([{ inventoryId: "", quantity: 1, unitPrice: 0 }]);

  useEffect(() => {
    fetchSalesOrders();
    fetchCustomers();
    fetchInventoryItems();
  }, []);

  useEffect(() => {
    if (salesOrders.length === 0) {
      setGenerationStatus({});
      return;
    }
    const ids = salesOrders.map((o) => o.id);
    const fetchStatus = async () => {
      const status: Record<string, { hasOC: boolean; hasWO: boolean; hasBom: boolean; hasInvoice: boolean }> = {};
      ids.forEach((id) => {
        status[id] = { hasOC: false, hasWO: false, hasBom: false, hasInvoice: false };
      });
      try {
        const [ocRes, woRes, bomRes, invRes] = await Promise.all([
          supabase.from("order_confirmations").select("id, sales_order_id").in("sales_order_id", ids),
          supabase.from("work_orders").select("id, sales_order_id").in("sales_order_id", ids),
          supabase.from("documents").select("id, sales_order_id").eq("type", "Bill Of Materials").in("sales_order_id", ids),
          supabase.from("invoices").select("id, sales_order_id").in("sales_order_id", ids),
        ]);
        (ocRes.data || []).forEach((r: any) => {
          if (r.sales_order_id && status[r.sales_order_id]) status[r.sales_order_id].hasOC = true;
        });
        (woRes.data || []).forEach((r: any) => {
          if (r.sales_order_id && status[r.sales_order_id]) status[r.sales_order_id].hasWO = true;
        });
        (bomRes.data || []).forEach((r: any) => {
          if (r.sales_order_id && status[r.sales_order_id]) status[r.sales_order_id].hasBom = true;
        });
        (invRes.data || []).forEach((r: any) => {
          if (r.sales_order_id && status[r.sales_order_id]) status[r.sales_order_id].hasInvoice = true;
        });
      } catch {
        // Columns may not exist before migration
      }
      setGenerationStatus(status);
    };
    fetchStatus();
  }, [JSON.stringify(salesOrders.map((o) => o.id))]);

  const fetchSalesOrders = async () => {
    const { data, error } = await supabase
      .from("sales_orders")
      .select(`
        *,
        customers(id, name, country, address, city, phone, photo_url),
        sales_order_items(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load sales orders.", variant: "destructive" });
      return;
    }
    setSalesOrders(data || []);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from("customers").select("*, dap_address, fco_address");
    if (data) setCustomers(data);
  };

  const fetchInventoryItems = async () => {
    const { data } = await supabase.from("inventory").select("*").eq("category", "Parts");
    if (data) setInventoryItems(data);
  };

  const getSelectedCustomer = () => customers.find((c) => c.id === newOrder.customerId);

  const partsForCustomer = newOrder.customerId
    ? inventoryItems.filter((inv) => !inv.customer_id || inv.customer_id === newOrder.customerId)
    : [];

  const generateSalesOrderNumber = async () => {
    const { data } = await supabase.rpc("generate_sales_order_number");
    return data;
  };

  const calculateTotals = () => {
    const customer = getSelectedCustomer();
    let totalQuantity = 0;
    let netWeight = 0;
    let subtotal = 0;
    orderItems.forEach((item) => {
      const inv = inventoryItems.find((inv) => inv.id === item.inventoryId);
      if (inv) {
        totalQuantity += item.quantity;
        netWeight += (inv.weight || 0) * item.quantity;
        subtotal += item.quantity * item.unitPrice;
      }
    });
    const vatRate = customer?.country === "Bosnia and Herzegovina" ? 17 : 0;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    const currency = customer?.currency || (customer?.country === "Bosnia and Herzegovina" ? "BAM" : "EUR");
    return { totalQuantity, netWeight, subtotal, vatRate, vatAmount, total, currency };
  };

  const handleCreateOrder = async () => {
    if (!newOrder.customerId) {
      toast({ title: "Error", description: "Please select a customer", variant: "destructive" });
      return;
    }
    const soNumber = await generateSalesOrderNumber();
    const totals = calculateTotals();
    const customer = getSelectedCustomer();
    const todayDate = new Date().toISOString().split("T")[0];
    const issueDate = newOrder.issueDate || todayDate;

    const { data: orderData, error: orderError } = await supabase
      .from("sales_orders")
      .insert([{
        sales_order_number: soNumber,
        customer_id: newOrder.customerId,
        issue_date: issueDate,
        requested_delivery_date: newOrder.requestedDeliveryDate || null,
        customer_po_number: newOrder.customerPoNumber || null,
        po_date: newOrder.poDate || null,
        notes: newOrder.notes || null,
        status: newOrder.status,
        total_quantity: totals.totalQuantity,
        net_weight: totals.netWeight,
        total_weight: totals.netWeight,
        amount: totals.total,
        currency: totals.currency,
        vat_rate: totals.vatRate,
      }])
      .select()
      .single();

    if (orderError) {
      toast({ title: "Error", description: "Failed to create sales order", variant: "destructive" });
      return;
    }

    const itemsData = orderItems.map((item) => {
      const inv = inventoryItems.find((i) => i.id === item.inventoryId);
      return {
        sales_order_id: orderData.id,
        inventory_id: item.inventoryId || null,
        description: inv?.name || "",
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice,
      };
    });

    const { error: itemsError } = await supabase.from("sales_order_items").insert(itemsData);
    if (itemsError) {
      toast({ title: "Error", description: `Failed to create items: ${itemsError.message}`, variant: "destructive" });
      return;
    }

    await fetchSalesOrders();
    setIsAddOrderOpen(false);
    resetForm();
    toast({ title: "Success", description: "Sales order created successfully" });
  };

  const handleUpdateOrder = async () => {
    if (!newOrder.customerId || !selectedOrder) {
      toast({ title: "Error", description: "Please select a customer", variant: "destructive" });
      return;
    }
    const totals = calculateTotals();
    const customer = getSelectedCustomer();
    const todayDate = new Date().toISOString().split("T")[0];
    const issueDate = newOrder.issueDate || todayDate;

    const { error: orderError } = await supabase
      .from("sales_orders")
      .update({
        customer_id: newOrder.customerId,
        issue_date: issueDate,
        requested_delivery_date: newOrder.requestedDeliveryDate || null,
        customer_po_number: newOrder.customerPoNumber || null,
        po_date: newOrder.poDate || null,
        notes: newOrder.notes || null,
        status: newOrder.status,
        total_quantity: totals.totalQuantity,
        net_weight: totals.netWeight,
        total_weight: totals.netWeight,
        amount: totals.total,
        currency: totals.currency,
        vat_rate: totals.vatRate,
      })
      .eq("id", selectedOrder.id);

    if (orderError) {
      toast({ title: "Error", description: "Failed to update sales order", variant: "destructive" });
      return;
    }

    await supabase.from("sales_order_items").delete().eq("sales_order_id", selectedOrder.id);

    const itemsData = orderItems.map((item) => {
      const inv = inventoryItems.find((i) => i.id === item.inventoryId);
      return {
        sales_order_id: selectedOrder.id,
        inventory_id: item.inventoryId || null,
        description: inv?.name || "",
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice,
      };
    });

    const { error: itemsError } = await supabase.from("sales_order_items").insert(itemsData);
    if (itemsError) {
      toast({ title: "Error", description: `Failed to update items: ${itemsError.message}`, variant: "destructive" });
      return;
    }

    // Sync SO changes to linked work orders (SO is source of truth; WO changes do not affect SO)
    await supabase
      .from("work_orders")
      .update({
        due_date: newOrder.requestedDeliveryDate || null,
        po_date: newOrder.poDate || null,
        customer_id: newOrder.customerId || null,
      })
      .eq("sales_order_id", selectedOrder.id);

    await fetchSalesOrders();
    setIsAddOrderOpen(false);
    resetForm();
    toast({ title: "Success", description: "Sales order updated successfully" });
  };

  const handleSubmitOrder = () => {
    if (isEditMode) handleUpdateOrder();
    else handleCreateOrder();
  };

  const resetForm = () => {
    setNewOrder({
      customerId: "",
      issueDate: "",
      requestedDeliveryDate: "",
      customerPoNumber: "",
      poDate: "",
      notes: "",
      status: "draft",
    });
    setOrderItems([{ inventoryId: "", quantity: 1, unitPrice: 0 }]);
    setSelectedOrder(null);
    setIsEditMode(false);
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;
    const { error } = await supabase.from("sales_orders").delete().eq("id", deletingOrder.id);
    if (!error) {
      setSalesOrders((prev) => prev.filter((o) => o.id !== deletingOrder.id));
      setDeletingOrder(null);
      toast({ title: "Sales Order Deleted", description: "The sales order has been successfully deleted." });
    } else {
      toast({ title: "Error", description: "Failed to delete sales order", variant: "destructive" });
    }
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setNewOrder({
      customerId: order.customer_id || "",
      issueDate: order.issue_date || "",
      requestedDeliveryDate: order.requested_delivery_date || "",
      customerPoNumber: order.customer_po_number || "",
      poDate: order.po_date || "",
      notes: order.notes || "",
      status: order.status || "draft",
    });
    setOrderItems(
      order.sales_order_items?.map((item: any) => ({
        inventoryId: item.inventory_id || inventoryItems.find((inv) => inv.name === item.description)?.id || "",
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })) || [{ inventoryId: "", quantity: 1, unitPrice: 0 }]
    );
    setIsEditMode(true);
    setIsAddOrderOpen(true);
  };

  const addOrderItem = () => setOrderItems([...orderItems, { inventoryId: "", quantity: 1, unitPrice: 0 }]);
  const removeOrderItem = (index: number) => setOrderItems(orderItems.filter((_, i) => i !== index));
  const updateOrderItem = (index: number, field: string, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "inventoryId") {
      const inv = inventoryItems.find((i) => i.id === value);
      if (inv) updated[index].unitPrice = inv.unit_price;
    }
    setOrderItems(updated);
  };

  const createWorkOrdersFromSalesOrder = async (order: any): Promise<number> => {
    const items = (order.sales_order_items || []).filter((i: any) => i.inventory_id);
    if (items.length === 0) return 0;

    const { data: existing } = await supabase
      .from("work_orders")
      .select("id")
      .eq("sales_order_id", order.id)
      .limit(1);
    if (existing && existing.length > 0) return 0;

    const dueDate = order.requested_delivery_date || null;
    const customerId = order.customer_id || null;
    let created = 0;

    for (const item of items) {
      const { data: prevWo } = await supabase
        .from("work_orders")
        .select("*")
        .eq("inventory_id", item.inventory_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: woNumber, error: numErr } = await supabase.rpc("generate_work_order_number");
      if (numErr || !woNumber) continue;

      const inv = inventoryItems.find((i) => i.id === item.inventory_id);
      const payload: Record<string, unknown> = {
        title: woNumber,
        work_order_number: woNumber,
        status: "pending",
        inventory_id: item.inventory_id,
        quantity: item.quantity ?? 1,
        due_date: dueDate,
        customer_id: customerId,
        sales_order_id: order.id,
        part_name: prevWo?.part_name ?? inv?.name ?? null,
        part_number: prevWo?.part_number ?? inv?.part_number ?? null,
        description: prevWo?.description ?? null,
        priority: prevWo?.priority ?? "medium",
        assigned_to: prevWo?.assigned_to ?? null,
        estimated_hours: prevWo?.estimated_hours ?? null,
        setup_instructions: prevWo?.setup_instructions ?? null,
        quality_requirements: prevWo?.quality_requirements ?? null,
        production_notes: prevWo?.production_notes ?? null,
        tools_used: prevWo?.tools_used ?? null,
        components_used: prevWo?.components_used ?? null,
        materials_used: prevWo?.materials_used ?? null,
        operators_and_machines: prevWo?.operators_and_machines ?? null,
        control_in_charge_id: prevWo?.control_in_charge_id ?? null,
      };

      const { error: insertErr } = await supabase.from("work_orders").insert([payload]);
      if (!insertErr) created++;
    }
    return created;
  };

  const generateOrderConfirmation = async (order: any) => {
    setGeneratingFor({ orderId: order.id, type: "OC" });
    try {
      const { data: ocNum } = await supabase.rpc("generate_order_confirmation_number");
      if (!ocNum) throw new Error("Failed to generate OC number");
      const items = order.sales_order_items || [];
      const totalAmount = items.reduce((s: number, i: any) => s + (i.total || 0), 0);
      const { data: oc, error: ocErr } = await supabase
        .from("order_confirmations")
        .insert({
          order_confirmation_number: ocNum,
          customer_id: order.customer_id,
          amount: totalAmount,
          order_number: order.sales_order_number,
          issue_date: order.issue_date,
          shipping_address: order.shipping_address,
          currency: order.currency || "EUR",
          vat_rate: order.vat_rate,
          sales_order_id: order.id,
        })
        .select()
        .single();
      if (ocErr) throw ocErr;
      const itemsData = items.map((i: any) => {
        const inv = inventoryItems.find((x) => x.id === i.inventory_id);
        return {
          order_confirmation_id: oc.id,
          inventory_id: i.inventory_id,
          description: i.description || inv?.name || "",
          quantity: i.quantity || 1,
          unit_price: i.unit_price || 0,
          total: i.total || 0,
          weight: inv?.weight || 0,
          part_number: inv?.part_number || null,
          photo_url: inv?.photo_url || null,
        };
      });
      const { error: itemsErr } = await supabase.from("order_confirmation_items").insert(itemsData);
      if (itemsErr) throw itemsErr;
      setGenerationStatus((prev) => ({ ...prev, [order.id]: { ...(prev[order.id] || { hasOC: false, hasWO: false, hasBom: false, hasInvoice: false }), hasOC: true } }));
      toast({ title: "Order Confirmation Created", description: `OC ${ocNum} created.` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create Order Confirmation", variant: "destructive" });
    } finally {
      setGeneratingFor(null);
    }
  };

  const generateWorkOrders = async (order: any) => {
    setGeneratingFor({ orderId: order.id, type: "WO" });
    try {
      const count = await createWorkOrdersFromSalesOrder(order);
      if (count > 0) {
        setGenerationStatus((prev) => ({ ...prev, [order.id]: { ...(prev[order.id] || { hasOC: false, hasWO: false, hasBom: false, hasInvoice: false }), hasWO: true } }));
        toast({ title: "Work Orders Created", description: `${count} work order(s) created.` });
      } else {
        toast({ title: "Info", description: "No items with parts to create work orders.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create Work Orders", variant: "destructive" });
    } finally {
      setGeneratingFor(null);
    }
  };

  const generateBom = async (order: any) => {
    setGeneratingFor({ orderId: order.id, type: "Bom" });
    try {
      const items = order.sales_order_items || [];
      const bomContent = items
        .map((i: any) => `${i.description || ""} | Qty: ${i.quantity} | ${i.unit_price} ${order.currency || "EUR"}`)
        .join("\n");
      const { error } = await supabase.from("documents").insert({
        name: `BoM - ${order.sales_order_number}`,
        type: "Bill Of Materials",
        content: bomContent || "Bill of Materials",
        sales_order_id: order.id,
      });
      if (error) throw error;
      setGenerationStatus((prev) => ({ ...prev, [order.id]: { ...(prev[order.id] || { hasOC: false, hasWO: false, hasBom: false, hasInvoice: false }), hasBom: true } }));
      toast({ title: "BoM Created", description: "Bill of Materials created." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create BoM", variant: "destructive" });
    } finally {
      setGeneratingFor(null);
    }
  };

  const generateInvoice = async (order: any) => {
    setGeneratingFor({ orderId: order.id, type: "Invoice" });
    try {
      const { data: invNum } = await supabase.rpc("generate_invoice_number");
      if (!invNum) throw new Error("Failed to generate invoice number");
      const items = order.sales_order_items || [];
      const totalAmount = items.reduce((s: number, i: any) => s + (i.total || 0), 0);
      const customer = customers.find((c) => c.id === order.customer_id);
      const vatRate = customer?.country === "Bosnia and Herzegovina" ? 17 : 0;
      const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invNum,
          invoice_type: "invoice",
          customer_id: order.customer_id,
          order_number: order.sales_order_number,
          issue_date: order.issue_date,
          shipping_address: order.shipping_address,
          amount: totalAmount,
          currency: order.currency || "EUR",
          vat_rate: vatRate,
          status: "pending",
          sales_order_id: order.id,
          total_quantity: order.total_quantity ?? totalQty,
          net_weight: order.net_weight,
          total_weight: order.total_weight,
        })
        .select()
        .single();
      if (invErr) throw invErr;
      const itemsData = items.map((i: any) => ({
        invoice_id: inv.id,
        inventory_id: i.inventory_id,
        description: i.description || "",
        quantity: i.quantity || 1,
        unit_price: i.unit_price || 0,
        total: i.total || 0,
      }));
      const { error: itemsErr } = await supabase.from("invoice_items").insert(itemsData);
      if (itemsErr) throw itemsErr;
      setGenerationStatus((prev) => ({ ...prev, [order.id]: { ...(prev[order.id] || { hasOC: false, hasWO: false, hasBom: false, hasInvoice: false }), hasInvoice: true } }));
      toast({ title: "Invoice Created", description: `Invoice ${invNum} created.` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create Invoice", variant: "destructive" });
    } finally {
      setGeneratingFor(null);
    }
  };

  const filteredOrders = salesOrders.filter((order) => {
    const matchesSearch =
      !searchTerm ||
      order.sales_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSoNumber = !salesOrderNumberFilter.search || order.sales_order_number?.toLowerCase().includes(salesOrderNumberFilter.search.toLowerCase());
    const soNumberMatch =
      salesOrderNumberFilter.from && salesOrderNumberFilter.to
        ? (() => {
            const num = parseInt(order.sales_order_number?.replace(/\D/g, "") || "0");
            const from = parseInt(salesOrderNumberFilter.from.replace(/\D/g, "") || "0");
            const to = parseInt(salesOrderNumberFilter.to.replace(/\D/g, "") || "999999");
            return num >= from && num <= to;
          })()
        : true;
    const issueDateStr = order.issue_date;
    const issueDateTime = issueDateStr ? new Date(issueDateStr).getTime() : undefined;
    const issueFromTime = issueDateFilter.from ? issueDateFilter.from.getTime() : undefined;
    const issueToTime = issueDateFilter.to ? (() => { const d = new Date(issueDateFilter.to); d.setHours(23, 59, 59, 999); return d.getTime(); })() : undefined;
    const matchesIssueDate = (!issueFromTime || (issueDateTime !== undefined && issueDateTime >= issueFromTime)) && (!issueToTime || (issueDateTime !== undefined && issueDateTime <= issueToTime));
    const reqDateStr = order.requested_delivery_date;
    const reqDateTime = reqDateStr ? new Date(reqDateStr).getTime() : undefined;
    const reqFromTime = requestedDeliveryDateFilter.from ? requestedDeliveryDateFilter.from.getTime() : undefined;
    const reqToTime = requestedDeliveryDateFilter.to ? (() => { const d = new Date(requestedDeliveryDateFilter.to); d.setHours(23, 59, 59, 999); return d.getTime(); })() : undefined;
    const matchesReqDate = (!reqFromTime || (reqDateTime !== undefined && reqDateTime >= reqFromTime)) && (!reqToTime || (reqDateTime !== undefined && reqDateTime <= reqToTime));
    const matchesCustomer = customerFilter.selectedId === "all" || order.customer_id === customerFilter.selectedId;
    const amount = order.amount || 0;
    const amountFrom = amountFilter.from ? parseFloat(amountFilter.from) : undefined;
    const amountTo = amountFilter.to ? parseFloat(amountFilter.to) : undefined;
    const matchesAmount = (!amountFrom || amount >= amountFrom) && (!amountTo || amount <= amountTo);
    return matchesSearch && matchesSoNumber && soNumberMatch && matchesIssueDate && matchesReqDate && matchesCustomer && matchesAmount;
  });

  let sortedOrders = [...filteredOrders];
  if (sortPreference.sortPreference) {
    sortedOrders = sortItems(sortedOrders, sortPreference.sortPreference, (item, field) => {
      switch (field) {
        case "created_at": return item.created_at ? new Date(item.created_at) : null;
        case "amount": return item.amount || 0;
        case "customer_name": return item.customers?.name || "";
        default: return null;
      }
    });
  } else {
    sortedOrders = sortedOrders.sort((a, b) => (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0));
  }

  const sortOptions: SortOption[] = [
    { id: "created_at:desc", label: "Recently added (Newest → Oldest)", field: "created_at", direction: "desc" },
    { id: "created_at:asc", label: "Recently added (Oldest → Newest)", field: "created_at", direction: "asc" },
    { id: "amount:asc", label: "Total (Low → High)", field: "amount", direction: "asc" },
    { id: "amount:desc", label: "Total (High → Low)", field: "amount", direction: "desc" },
    { id: "customer_name:asc", label: "Customer (A–Z)", field: "customer_name", direction: "asc" },
    { id: "customer_name:desc", label: "Customer (Z–A)", field: "customer_name", direction: "desc" },
  ];

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / itemsPerPage));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedOrders = sortedOrders.slice((effectivePage - 1) * itemsPerPage, effectivePage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, customerFilter.selectedId, salesOrderNumberFilter, issueDateFilter, requestedDeliveryDateFilter, amountFilter, itemsPerPage]);

  const totals = calculateTotals();
  const selectedCustomer = getSelectedCustomer();

  const handleViewOrder = (order: any) => navigate(`/sales-orders/${order.id}`);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Sales Orders</h1>
        <div className="flex items-center gap-2 md:hidden">
          <Button onClick={() => setIsAddOrderOpen(true)}>+ Add Sales Order</Button>
        </div>
      </div>

      <Dialog open={isAddOrderOpen} onOpenChange={(open) => { setIsAddOrderOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{isEditMode ? "Edit Sales Order" : "Create New Sales Order"}</DialogTitle>
            <DialogDescription>Fill in the sales order details and add parts</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Customer *</Label>
                <Select
                  value={newOrder.customerId}
                  onValueChange={(value) => {
                    setNewOrder((prev) => ({ ...prev, customerId: value }));
                    setOrderItems([{ inventoryId: "", quantity: 1, unitPrice: 0 }]);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Customer PO Number</Label>
                <Input value={newOrder.customerPoNumber} onChange={(e) => setNewOrder({ ...newOrder, customerPoNumber: e.target.value })} placeholder="Customer PO number" />
              </div>
              <div>
                <Label>PO Date</Label>
                <Popover open={isPoDatePickerOpen} onOpenChange={setIsPoDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newOrder.poDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newOrder.poDate ? format(new Date(newOrder.poDate), "PPP") : <span>Pick a date (optional)</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newOrder.poDate ? new Date(newOrder.poDate) : undefined} onSelect={(d) => d && (setNewOrder({ ...newOrder, poDate: formatDateForInput(d) }), setIsPoDatePickerOpen(false))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Issue Date</Label>
                <Popover open={isIssueDatePickerOpen} onOpenChange={setIsIssueDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newOrder.issueDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newOrder.issueDate ? format(new Date(newOrder.issueDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newOrder.issueDate ? new Date(newOrder.issueDate) : undefined} onSelect={(d) => d && (setNewOrder({ ...newOrder, issueDate: formatDateForInput(d) }), setIsIssueDatePickerOpen(false))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Requested Delivery Date</Label>
                <Popover open={isRequestedDeliveryDatePickerOpen} onOpenChange={setIsRequestedDeliveryDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newOrder.requestedDeliveryDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newOrder.requestedDeliveryDate ? format(new Date(newOrder.requestedDeliveryDate), "PPP") : <span>Pick a date (optional)</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newOrder.requestedDeliveryDate ? new Date(newOrder.requestedDeliveryDate) : undefined} onSelect={(d) => d && (setNewOrder({ ...newOrder, requestedDeliveryDate: formatDateForInput(d) }), setIsRequestedDeliveryDatePickerOpen(false))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <div className="mb-4">
                <Label className="text-lg font-semibold">Items</Label>
                {!newOrder.customerId && <p className="text-sm text-muted-foreground mt-1">Select a customer first to add parts</p>}
              </div>
              <div className="space-y-0">
                {orderItems.map((item, index) => {
                  const inv = inventoryItems.find((i) => i.id === item.inventoryId);
                  const unit = inv?.unit || "piece";
                  const currency = inv?.currency || selectedCustomer?.currency || totals.currency || "EUR";
                  const currencySymbol = getCurrencySymbol(currency);
                  return (
                    <div key={index} className={cn("grid gap-2 py-3 grid-cols-1 sm:grid-cols-[2.6fr_1.05fr_1.05fr_0.735fr_0.8fr]", index > 0 && "border-t border-border")}>
                      <div>
                        {index === 0 ? <Label className="text-xs">Part</Label> : <Label className="sr-only">Part</Label>}
                        <SearchableSelect
                          items={partsForCustomer}
                          value={item.inventoryId}
                          onSelect={(selected) => updateOrderItem(index, "inventoryId", selected.id)}
                          placeholder={newOrder.customerId ? "Select part..." : "Select customer first"}
                          searchPlaceholder={newOrder.customerId ? "Search parts..." : "Select customer first"}
                          emptyMessage={newOrder.customerId ? "No parts found for this customer." : "Select customer first."}
                          getItemValue={(inv) => inv.id}
                          getItemLabel={(inv) => inv.name}
                          getItemSearchText={(inv) => `${inv.name} ${inv.part_number || ""}`}
                          getItemPartNumber={(inv) => inv.part_number}
                          disabled={!newOrder.customerId}
                        />
                      </div>
                      <div>
                        {index === 0 ? <Label className="text-xs">Quantity</Label> : <Label className="sr-only">Quantity</Label>}
                        <NumericInput
                          value={item.quantity}
                          onChange={(v) => updateOrderItem(index, "quantity", v)}
                          min={1}
                          suffix={unit}
                          containerClassName="w-[156px]"
                        />
                      </div>
                      <div>
                        {index === 0 ? <Label className="text-xs">Unit Price</Label> : <Label className="sr-only">Unit Price</Label>}
                        <NumericInput
                          value={item.unitPrice}
                          onChange={(v) => updateOrderItem(index, "unitPrice", v)}
                          min={0}
                          step={0.01}
                          suffix={currencySymbol}
                          containerClassName="w-[156px]"
                        />
                      </div>
                      <div>
                        {index === 0 ? <Label className="text-xs">Total</Label> : <Label className="sr-only">Total</Label>}
                        <div className="relative w-[110px]">
                          <Input
                            value={(item.quantity * item.unitPrice).toFixed(2)}
                            disabled
                            className="bg-muted pr-10 text-center"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {currencySymbol}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeOrderItem(index)} disabled={orderItems.length === 1}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button type="button" onClick={addOrderItem} size="sm" variant="outline" className="mt-3" disabled={!newOrder.customerId}><Plus className="w-4 h-4" /></Button>
            </div>

            {selectedCustomer && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Total Quantity:</span><span className="font-medium">{totals.totalQuantity} pcs</span></div>
                  <div className="flex justify-between"><span>Net Weight:</span><span className="font-medium">{totals.netWeight.toFixed(2)} kg</span></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Subtotal:</span><span className="font-medium">{formatCurrency(totals.subtotal, totals.currency)}</span></div>
                  <div className="flex justify-between"><span>VAT ({totals.vatRate}%):</span><span className="font-medium">{formatCurrency(totals.vatAmount, totals.currency)}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>{formatCurrency(totals.total, totals.currency)}</span></div>
                </div>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea value={newOrder.notes} onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })} placeholder="Additional notes..." rows={3} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4 flex-shrink-0 border-t">
            <Button className="flex-1 w-full sm:w-auto" onClick={handleSubmitOrder}>{isEditMode ? "Update Sales Order" : "Create Sales Order"}</Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsAddOrderOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="rounded-none bg-transparent text-foreground shadow-none md:rounded-lg md:bg-card md:text-card-foreground md:shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-0 min-[1430px]:p-6 min-[1430px]:pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 min-w-0 flex-1">
            <div className="relative w-full md:max-w-md md:flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by SO number or customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 text-sm w-full" />
            </div>
            <div className="w-full md:w-[120px] min-w-0">
              <SortSelect value={sortPreference.sortPreference ? `${sortPreference.sortPreference.field}:${sortPreference.sortPreference.direction}` : ""} onChange={(v) => { const [f, d] = v.split(":"); sortPreference.savePreference({ field: f, direction: d as "asc" | "desc" }); }} options={sortOptions} placeholder="Sort" className="w-full" />
            </div>
            <div className="w-full md:w-[120px] min-w-0">
              <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Per page" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Button onClick={() => setIsAddOrderOpen(true)}>+ Add Sales Order</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-3">
          <div className="hidden md:block w-full max-w-full min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: 80, minWidth: 80 }} className="p-2"></TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Sales Order #
                      <Popover open={isSalesOrderNumberFilterOpen} onOpenChange={setIsSalesOrderNumberFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className={cn("h-3 w-3", (salesOrderNumberFilter.search || salesOrderNumberFilter.from || salesOrderNumberFilter.to) && "text-primary")} /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label>Filter by Sales Order #</Label>
                              {(salesOrderNumberFilter.search || salesOrderNumberFilter.from || salesOrderNumberFilter.to) && (
                                <Button variant="ghost" size="sm" onClick={() => setSalesOrderNumberFilter({ search: "", from: "", to: "" })}><X className="h-3 w-3" /></Button>
                              )}
                            </div>
                            <div><Label>Search</Label><Input placeholder="Search..." value={salesOrderNumberFilter.search} onChange={(e) => setSalesOrderNumberFilter({ ...salesOrderNumberFilter, search: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><Label>From</Label><Input placeholder="e.g., 001" value={salesOrderNumberFilter.from} onChange={(e) => setSalesOrderNumberFilter({ ...salesOrderNumberFilter, from: e.target.value })} /></div>
                              <div><Label>To</Label><Input placeholder="e.g., 100" value={salesOrderNumberFilter.to} onChange={(e) => setSalesOrderNumberFilter({ ...salesOrderNumberFilter, to: e.target.value })} /></div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Issue Date
                      <Popover open={isIssueDateFilterOpen} onOpenChange={setIsIssueDateFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className={cn("h-3 w-3", (issueDateFilter.from || issueDateFilter.to) && "text-primary")} /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="range" selected={{ from: issueDateFilter.from, to: issueDateFilter.to }} onSelect={(r) => setIssueDateFilter({ from: r?.from, to: r?.to })} numberOfMonths={2} className="rounded-md border" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Requested Delivery
                      <Popover open={isRequestedDeliveryDateFilterOpen} onOpenChange={setIsRequestedDeliveryDateFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className={cn("h-3 w-3", (requestedDeliveryDateFilter.from || requestedDeliveryDateFilter.to) && "text-primary")} /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="range" selected={{ from: requestedDeliveryDateFilter.from, to: requestedDeliveryDateFilter.to }} onSelect={(r) => setRequestedDeliveryDateFilter({ from: r?.from, to: r?.to })} numberOfMonths={2} className="rounded-md border" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Customer
                      <Popover open={isCustomerFilterOpen} onOpenChange={setIsCustomerFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className={cn("h-3 w-3", customerFilter.selectedId !== "all" && "text-primary")} /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between"><Label>Filter by Customer</Label>{customerFilter.selectedId !== "all" && <Button variant="ghost" size="sm" onClick={() => setCustomerFilter({ search: "", selectedId: "all" })}><X className="h-3 w-3" /></Button>}</div>
                            <div><Label>Search</Label><Input placeholder="Search customers..." value={customerFilter.search} onChange={(e) => setCustomerFilter({ ...customerFilter, search: e.target.value })} /></div>
                            <Select value={customerFilter.selectedId} onValueChange={(v) => { setCustomerFilter({ ...customerFilter, selectedId: v }); setIsCustomerFilterOpen(false); }}>
                              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Customers</SelectItem>
                                {customers.filter((c) => !customerFilter.search || c.name.toLowerCase().includes(customerFilter.search.toLowerCase())).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="w-24">PO#</TableHead>
                  <TableHead>Generate</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Total
                      <Popover open={isAmountFilterOpen} onOpenChange={setIsAmountFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className={cn("h-3 w-3", (amountFilter.from || amountFilter.to) && "text-primary")} /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between"><Label>Filter by Amount</Label>{(amountFilter.from || amountFilter.to) && <Button variant="ghost" size="sm" onClick={() => setAmountFilter({ from: "", to: "" })}><X className="h-3 w-3" /></Button>}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><Label>From</Label><NumericInput value={amountFilter.from ? parseFloat(amountFilter.from) : 0} onChange={(v) => setAmountFilter({ ...amountFilter, from: v.toString() })} min={0} placeholder="Min" /></div>
                              <div><Label>To</Label><NumericInput value={amountFilter.to ? parseFloat(amountFilter.to) : 0} onChange={(v) => setAmountFilter({ ...amountFilter, to: v.toString() })} min={0} placeholder="Max" /></div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewOrder(order)}>
                    <TableCell style={{ width: 80, minWidth: 80 }} className="p-2 shrink-0">
                      {order.customers?.photo_url ? (
                        <img src={order.customers.photo_url} alt="" style={{ width: 80, height: 50, minWidth: 80, minHeight: 50, maxWidth: 80, maxHeight: 50 }} className="object-contain rounded" />
                      ) : (
                        <div style={{ width: 80, height: 50, minWidth: 80, minHeight: 50 }} className="rounded bg-muted flex items-center justify-center" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <button onClick={(e) => { e.stopPropagation(); handleViewOrder(order); }} className="text-primary hover:underline text-left">{order.sales_order_number}</button>
                    </TableCell>
                    <TableCell>{formatDate(order.issue_date)}</TableCell>
                    <TableCell>{order.requested_delivery_date ? formatDate(order.requested_delivery_date) : "N/A"}</TableCell>
                    <TableCell>{order.customers?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{order.customer_po_number || "—"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        <GenerateButton
                          label="Order Confirmation"
                          generated={!!generationStatus[order.id]?.hasOC}
                          onClick={() => generateOrderConfirmation(order)}
                          disabled={!!generatingFor}
                        />
                        <GenerateButton
                          label="Work Order"
                          generated={!!generationStatus[order.id]?.hasWO}
                          onClick={() => generateWorkOrders(order)}
                          disabled={!!generatingFor}
                        />
                        <GenerateButton
                          label="BoM"
                          generated={!!generationStatus[order.id]?.hasBom}
                          onClick={() => generateBom(order)}
                          disabled={!!generatingFor}
                        />
                        <GenerateButton
                          label="Invoice"
                          generated={!!generationStatus[order.id]?.hasInvoice}
                          onClick={() => generateInvoice(order)}
                          disabled={!!generatingFor}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.amount || 0, order.currency)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEditOrder(order); }}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setDeletingOrder(order); }}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3 w-full max-w-full min-w-0">
            {paginatedOrders.map((order) => (
              <Card key={order.id} className="p-4 border cursor-pointer hover:bg-muted/50 transition-colors rounded-lg relative" onClick={() => handleViewOrder(order)}>
                <div className="absolute top-4 right-4">
                  {order.customers?.photo_url ? (
                    <img src={order.customers.photo_url} alt="" style={{ width: 80, height: 50, minWidth: 80, minHeight: 50, maxWidth: 80, maxHeight: 50 }} className="object-contain rounded" />
                  ) : (
                    <div style={{ width: 80, height: 50, minWidth: 80, minHeight: 50 }} className="rounded bg-muted" />
                  )}
                </div>
                <div className="space-y-3 pr-[88px]">
                  <div className="flex flex-col space-y-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sales Order #</span>
                    <button onClick={(e) => { e.stopPropagation(); handleViewOrder(order); }} className="text-sm font-medium text-primary hover:underline text-left">{order.sales_order_number}</button>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issue Date</span>
                    <div className="text-sm font-medium">{formatDate(order.issue_date)}</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Requested Delivery</span>
                    <div className="text-sm font-medium">{order.requested_delivery_date ? formatDate(order.requested_delivery_date) : "N/A"}</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</span>
                    <div className="text-sm font-medium">{order.customers?.name}</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PO#</span>
                    <div className="text-sm font-medium text-muted-foreground">{order.customer_po_number || "—"}</div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span>
                    <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      <span className="text-sm font-medium">{formatCurrency(order.amount || 0, order.currency)}</span>
                      <div className="flex flex-wrap gap-1">
                        <GenerateButton
                          label="OC"
                          generated={!!generationStatus[order.id]?.hasOC}
                          onClick={() => generateOrderConfirmation(order)}
                          disabled={!!generatingFor}
                        />
                        <GenerateButton
                          label="WO"
                          generated={!!generationStatus[order.id]?.hasWO}
                          onClick={() => generateWorkOrders(order)}
                          disabled={!!generatingFor}
                        />
                        <GenerateButton
                          label="BoM"
                          generated={!!generationStatus[order.id]?.hasBom}
                          onClick={() => generateBom(order)}
                          disabled={!!generatingFor}
                        />
                        <GenerateButton
                          label="Invoice"
                          generated={!!generationStatus[order.id]?.hasInvoice}
                          onClick={() => generateInvoice(order)}
                          disabled={!!generatingFor}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t flex flex-nowrap gap-0.5 min-[376px]:gap-1 sm:gap-2 w-full max-md:w-[calc(100%+88px)] min-w-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEditOrder(order); }} className="flex-1 min-w-0 shrink overflow-hidden !px-1.5 min-[376px]:!px-2 sm:!px-3 !text-xs sm:!text-sm"><span className="truncate block min-w-0">Edit</span></Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setDeletingOrder(order); }} className="flex-1 min-w-0 shrink overflow-hidden !px-1.5 min-[376px]:!px-2 sm:!px-3 !text-xs sm:!text-sm"><Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1 shrink-0" /><span className="truncate block min-w-0">Delete</span></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Showing {(effectivePage - 1) * itemsPerPage + 1}-{Math.min(effectivePage * itemsPerPage, sortedOrders.length)} of {sortedOrders.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={effectivePage <= 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={effectivePage >= totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Order</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this sales order? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
