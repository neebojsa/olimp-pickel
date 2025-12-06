import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Plus, Search, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDateForInput } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "draft":
      return "bg-gray-500/10 text-gray-700 border-gray-200";
    case "sent":
      return "bg-blue-500/10 text-blue-700 border-blue-200";
    case "paid":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "overdue":
      return "bg-red-500/10 text-red-700 border-red-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

export default function Invoicing() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [newInvoice, setNewInvoice] = useState({
    invoice_number: "",
    customer_id: "",
    issue_date: formatDateForInput(new Date()),
    due_date: "",
    amount: "",
    currency: "EUR",
    status: "draft",
    order_number: "",
    notes: ""
  });

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, []);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          country
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive"
      });
    } else if (data) {
      setInvoices(data);
    }
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) {
      setCustomers(data);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.invoice_number || !newInvoice.customer_id || !newInvoice.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert([{
        invoice_number: newInvoice.invoice_number,
        customer_id: newInvoice.customer_id,
        issue_date: newInvoice.issue_date,
        due_date: newInvoice.due_date || null,
        amount: parseFloat(newInvoice.amount),
        currency: newInvoice.currency,
        status: newInvoice.status,
        order_number: newInvoice.order_number || null,
        notes: newInvoice.notes || null
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive"
      });
    } else {
      await fetchInvoices();
      setIsAddDialogOpen(false);
      setNewInvoice({
        invoice_number: "",
        customer_id: "",
        issue_date: formatDateForInput(new Date()),
        due_date: "",
        amount: "",
        currency: "EUR",
        status: "draft",
        order_number: "",
        notes: ""
      });
      toast({
        title: "Success",
        description: "Invoice created successfully"
      });
      // Navigate to the invoice view
      if (data?.id) {
        navigate(`/invoice/${data.id}`);
      }
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive"
      });
    } else {
      await fetchInvoices();
      toast({
        title: "Success",
        description: "Invoice deleted successfully"
      });
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidAmount = filteredInvoices
    .filter(inv => inv.status?.toLowerCase() === "paid")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

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
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Number *</Label>
                <Input
                  placeholder="INV-2024-001"
                  value={newInvoice.invoice_number}
                  onChange={(e) => setNewInvoice({ ...newInvoice, invoice_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Customer *</Label>
                <Select
                  value={newInvoice.customer_id}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, customer_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issue Date *</Label>
                <Input
                  type="date"
                  value={newInvoice.issue_date}
                  onChange={(e) => setNewInvoice({ ...newInvoice, issue_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newInvoice.due_date}
                  onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={newInvoice.currency}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="PLN">PLN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={newInvoice.status}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Order Number</Label>
                <Input
                  placeholder="PO-2024-001"
                  value={newInvoice.order_number}
                  onChange={(e) => setNewInvoice({ ...newInvoice, order_number: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Additional notes..."
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleCreateInvoice}>
                Create Invoice
              </Button>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalPages} page{totalPages !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount, "EUR")}</div>
            <p className="text-xs text-muted-foreground">
              All invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingAmount, "EUR")}</div>
            <p className="text-xs text-muted-foreground">
              Unpaid invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by invoice number, customer, or order number..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => navigate(`/invoice/${invoice.id}`)}
                          className="text-primary hover:underline cursor-pointer font-medium"
                          title="View Invoice"
                        >
                          {invoice.invoice_number}
                        </button>
                      </TableCell>
                      <TableCell>{invoice.customers?.name || "Unknown"}</TableCell>
                      <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                      <TableCell>{invoice.due_date ? formatDate(invoice.due_date) : "-"}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount || 0, invoice.currency || "EUR")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(invoice.status)}>
                          {invoice.status || "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Delete Invoice">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete invoice {invoice.invoice_number}? This action cannot be undone.
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


