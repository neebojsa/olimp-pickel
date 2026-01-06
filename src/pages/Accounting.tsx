import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Plus, Search, TrendingUp, TrendingDown, Calculator, FileText, Trash2, Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForInput } from "@/lib/dateUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";

// Mock accounting data
const mockTransactions = [
  {
    id: "TXN-001",
    date: "2024-01-15",
    description: "Invoice Payment - ABC Manufacturing",
    type: "Income",
    category: "Sales Revenue",
    amount: 1375.00,
    account: "Accounts Receivable",
    reference: "INV-2024-001"
  },
  {
    id: "TXN-002",
    date: "2024-01-16",
    description: "Material Purchase - Aluminum Stock",
    type: "Expense",
    category: "Raw Materials",
    amount: 450.00,
    account: "Inventory",
    reference: "PO-2024-005"
  },
  {
    id: "TXN-003",
    date: "2024-01-18",
    description: "Equipment Maintenance - CNC Machine",
    type: "Expense",
    category: "Maintenance",
    amount: 280.00,
    account: "Operating Expenses",
    reference: "SRV-2024-001"
  },
  {
    id: "TXN-004",
    date: "2024-01-20",
    description: "Invoice Payment - XYZ Industries",
    type: "Income",
    category: "Sales Revenue",
    amount: 979.00,
    account: "Accounts Receivable",
    reference: "INV-2024-002"
  },
  {
    id: "TXN-005",
    date: "2024-01-22",
    description: "Utility Bill - January",
    type: "Expense",
    category: "Utilities",
    amount: 340.00,
    account: "Operating Expenses",
    reference: "UTIL-01-2024"
  }
];

const mockBudgetItems = [
  {
    id: "BUD-001",
    category: "Sales Revenue",
    budgeted: 50000,
    actual: 45230,
    variance: -4770,
    period: "January 2024"
  },
  {
    id: "BUD-002",
    category: "Raw Materials",
    budgeted: 12000,
    actual: 13450,
    variance: 1450,
    period: "January 2024"
  },
  {
    id: "BUD-003",
    category: "Labor Costs",
    budgeted: 18000,
    actual: 17250,
    variance: -750,
    period: "January 2024"
  },
  {
    id: "BUD-004",
    category: "Operating Expenses",
    budgeted: 8000,
    actual: 8920,
    variance: 920,
    period: "January 2024"
  }
];

const getTransactionTypeColor = (type: string) => {
  switch (type) {
    case "Income":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "Expense":
      return "bg-red-500/10 text-red-700 border-red-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

export default function Accounting() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  // Column header filters
  const [dateFilter, setDateFilter] = useState<{ from?: Date; to?: Date }>({});
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [amountFilter, setAmountFilter] = useState({ from: "", to: "" });
  const [isAmountFilterOpen, setIsAmountFilterOpen] = useState(false);
  const [referenceFilter, setReferenceFilter] = useState({ search: "", from: "", to: "" });
  const [isReferenceFilterOpen, setIsReferenceFilterOpen] = useState(false);
  // Date picker popover for form
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: formatDateForInput(new Date()),
    type: '',
    description: '',
    category: '',
    amount: '',
    reference: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Exchange rate: 1 EUR = 1.955 BAM
  const EUR_TO_BAM_RATE = 1.955;
  
  const convertToBAM = (amount: number, currency?: string | null): number => {
    if (!currency || currency.toUpperCase() === 'BAM' || currency.toUpperCase() === 'KM') {
      return amount;
    }
    if (currency.toUpperCase() === 'EUR') {
      return amount * EUR_TO_BAM_RATE;
    }
    // Default: assume BAM if currency unknown
    return amount;
  };

  const fetchTransactions = async () => {
    // Only fetch invoices and credit notes from accounting_entries
    // Quotes and other document types are filtered out
    const { data } = await supabase
      .from('accounting_entries')
      .select('*')
      .in('category', ['invoice', 'credit_note']);
    
    if (data) {
      // Fetch currency from invoices for entries that reference invoices (for backward compatibility)
      // New entries are already converted to BAM at creation time
      const invoiceReferences = data
        .filter(entry => entry.reference && entry.category === 'invoice')
        .map(entry => entry.reference);
      
      let invoiceCurrencies: Record<string, string> = {};
      if (invoiceReferences.length > 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('invoice_number, currency')
          .in('invoice_number', invoiceReferences);
        
        if (invoices) {
          invoiceCurrencies = invoices.reduce((acc, inv) => {
            acc[inv.invoice_number] = inv.currency || 'BAM';
            return acc;
          }, {} as Record<string, string>);
        }
      }
      
      const formattedTransactions = data.map(entry => {
        // Get currency from invoice if available, otherwise default to BAM
        const currency = entry.reference && invoiceCurrencies[entry.reference] 
          ? invoiceCurrencies[entry.reference] 
          : 'BAM';
        
        // Convert amount to BAM (for backward compatibility with old entries)
        // New entries are already in BAM, so this is a no-op for them
        const amountInBAM = convertToBAM(entry.amount || 0, currency);
        
        return {
          ...entry,
          description: entry.description,
          account: "General", // Placeholder
          reference: entry.reference || `TXN-${entry.id}`,
          amount: amountInBAM // Amount in BAM
        };
      });
      setTransactions(formattedTransactions);
    }
  };

  const handleSaveTransaction = async () => {
    if (!newTransaction.type || !newTransaction.description || !newTransaction.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from('accounting_entries')
      .insert([{
        date: newTransaction.date,
        type: newTransaction.type,
        description: newTransaction.description,
        category: newTransaction.category,
        amount: parseFloat(newTransaction.amount),
        reference: newTransaction.reference
      }])
      .select();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save transaction",
        variant: "destructive"
      });
    } else {
      await fetchTransactions();
      setIsAddTransactionOpen(false);
      setNewTransaction({
        date: formatDateForInput(new Date()),
        type: '',
        description: '',
        category: '',
        amount: '',
        reference: ''
      });
      toast({
        title: "Success",
        description: "Transaction saved successfully"
      });
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const { error } = await supabase
      .from('accounting_entries')
      .delete()
      .eq('id', transactionId);

    if (!error) {
      setTransactions(prev => prev.filter(txn => txn.id !== transactionId));
      toast({
        title: "Transaction Deleted",
        description: "The transaction has been successfully deleted.",
      });
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || transaction.type?.toLowerCase() === selectedType.toLowerCase();
    const matchesCategory = selectedCategory === "all" || transaction.category === selectedCategory;
    
    // Column header filters
    const transactionDate = new Date(transaction.date);
    const dateFromTime = dateFilter.from ? dateFilter.from.getTime() : undefined;
    const dateToTime = dateFilter.to ? (() => {
      const toDate = new Date(dateFilter.to);
      toDate.setHours(23, 59, 59, 999);
      return toDate.getTime();
    })() : undefined;
    const matchesDate = (!dateFromTime || transactionDate.getTime() >= dateFromTime) &&
      (!dateToTime || transactionDate.getTime() <= dateToTime);
    
    const matchesTypeFilter = typeFilter === "all" || transaction.type?.toLowerCase() === typeFilter.toLowerCase();
    const matchesCategoryFilter = categoryFilter === "all" || transaction.category === categoryFilter;
    
    const amount = transaction.amount || 0;
    const amountFrom = amountFilter.from ? parseFloat(amountFilter.from) : undefined;
    const amountTo = amountFilter.to ? parseFloat(amountFilter.to) : undefined;
    const matchesAmount = (!amountFrom || amount >= amountFrom) && (!amountTo || amount <= amountTo);
    
    const matchesReference = !referenceFilter.search || transaction.reference?.toLowerCase().includes(referenceFilter.search.toLowerCase());
    const referenceMatch = referenceFilter.from && referenceFilter.to 
      ? (() => {
          const refNum = parseInt(transaction.reference?.replace(/\D/g, '') || '0');
          const from = parseInt(referenceFilter.from.replace(/\D/g, '') || '0');
          const to = parseInt(referenceFilter.to.replace(/\D/g, '') || '999999');
          return refNum >= from && refNum <= to;
        })()
      : true;
    
    return matchesSearch && matchesType && matchesCategory &&
      matchesDate && matchesTypeFilter && matchesCategoryFilter && matchesAmount && matchesReference && referenceMatch;
  });

  const totalIncome = transactions.filter(t => t.type?.toLowerCase() === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type?.toLowerCase() === "expense").reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  const categories = [...new Set(transactions.map(t => t.category))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounting</h1>
          <p className="text-muted-foreground">
            Financial tracking and budget management
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newTransaction.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTransaction.date ? format(new Date(newTransaction.date), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newTransaction.date ? new Date(newTransaction.date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setNewTransaction({...newTransaction, date: formatDateForInput(date)});
                            setIsDatePickerOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newTransaction.type} onValueChange={(value) => setNewTransaction({...newTransaction, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Income">Income</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input 
                    placeholder="Transaction description" 
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newTransaction.category} onValueChange={(value) => setNewTransaction({...newTransaction, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales Revenue">Sales Revenue</SelectItem>
                      <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                      <SelectItem value="Operating Expenses">Operating Expenses</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Reference</Label>
                  <Input 
                    placeholder="Reference number" 
                    value={newTransaction.reference}
                    onChange={(e) => setNewTransaction({...newTransaction, reference: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={handleSaveTransaction}>Add Transaction</Button>
                <Button variant="outline" onClick={() => setIsAddTransactionOpen(false)}>
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM</div>
            <p className="text-xs text-muted-foreground">
              Revenue this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM</div>
            <p className="text-xs text-muted-foreground">
              Costs this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(netIncome).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM
            </div>
            <p className="text-xs text-muted-foreground">
              {netIncome >= 0 ? 'Profit' : 'Loss'} this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">
              Total recorded entries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Income">Income</SelectItem>
                <SelectItem value="Expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Date
                        <Popover open={isDateFilterOpen} onOpenChange={setIsDateFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${dateFilter.from || dateFilter.to ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="range"
                              selected={{ from: dateFilter.from, to: dateFilter.to }}
                              onSelect={(range) => {
                                setDateFilter({
                                  from: range?.from,
                                  to: range?.to
                                });
                                if (range?.from && range?.to) {
                                  setIsDateFilterOpen(false);
                                }
                              }}
                              numberOfMonths={2}
                              className="rounded-md border"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                      <TableHead>Description</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Type
                        <Popover open={isTypeFilterOpen} onOpenChange={setIsTypeFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${typeFilter !== "all" ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48" align="start">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Filter by Type</Label>
                                {typeFilter !== "all" && (
                                  <Button variant="ghost" size="sm" onClick={() => setTypeFilter("all")}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <Select value={typeFilter} onValueChange={(value) => {
                                setTypeFilter(value);
                                setIsTypeFilterOpen(false);
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Types</SelectItem>
                                  <SelectItem value="Income">Income</SelectItem>
                                  <SelectItem value="Expense">Expense</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Category
                        <Popover open={isCategoryFilterOpen} onOpenChange={setIsCategoryFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${categoryFilter !== "all" ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48" align="start">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Filter by Category</Label>
                                {categoryFilter !== "all" && (
                                  <Button variant="ghost" size="sm" onClick={() => setCategoryFilter("all")}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <Select value={categoryFilter} onValueChange={(value) => {
                                setCategoryFilter(value);
                                setIsCategoryFilterOpen(false);
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Categories</SelectItem>
                                  {categories.map(category => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                      <TableHead>Account</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Amount
                        <Popover open={isAmountFilterOpen} onOpenChange={setIsAmountFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${amountFilter.from || amountFilter.to ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="start">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label>Filter by Amount</Label>
                                {(amountFilter.from || amountFilter.to) && (
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setAmountFilter({ from: "", to: "" });
                                  }}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label>From</Label>
                                  <NumericInput
                                    value={amountFilter.from ? parseFloat(amountFilter.from) : 0}
                                    onChange={(val) => setAmountFilter({ ...amountFilter, from: val.toString() })}
                                    min={0}
                                    placeholder="Min amount"
                                  />
                                </div>
                                <div>
                                  <Label>To</Label>
                                  <NumericInput
                                    value={amountFilter.to ? parseFloat(amountFilter.to) : 0}
                                    onChange={(val) => setAmountFilter({ ...amountFilter, to: val.toString() })}
                                    min={0}
                                    placeholder="Max amount"
                                  />
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Reference
                        <Popover open={isReferenceFilterOpen} onOpenChange={setIsReferenceFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${referenceFilter.search || referenceFilter.from || referenceFilter.to ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="start">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label>Filter by Reference</Label>
                                {(referenceFilter.search || referenceFilter.from || referenceFilter.to) && (
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setReferenceFilter({ search: "", from: "", to: "" });
                                  }}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <div>
                                <Label>Search</Label>
                                <Input
                                  placeholder="Search reference..."
                                  value={referenceFilter.search}
                                  onChange={(e) => setReferenceFilter({ ...referenceFilter, search: e.target.value })}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label>From</Label>
                                  <Input
                                    placeholder="e.g., TXN-001"
                                    value={referenceFilter.from}
                                    onChange={(e) => setReferenceFilter({ ...referenceFilter, from: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>To</Label>
                                  <Input
                                    placeholder="e.g., TXN-100"
                                    value={referenceFilter.to}
                                    onChange={(e) => setReferenceFilter({ ...referenceFilter, to: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getTransactionTypeColor(transaction.type)}
                          >
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell>{transaction.account}</TableCell>
                        <TableCell className={`font-medium ${transaction.type?.toLowerCase() === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type?.toLowerCase() === 'income' ? '+' : '-'}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM
                        </TableCell>
                        <TableCell>{transaction.reference}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this transaction? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Budgeted</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* No budget items in this version */}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Revenue</span>
                    <span className="font-medium">{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses</span>
                    <span className="font-medium">{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Net Income</span>
                    <span className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {Math.abs(netIncome).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Cash Inflows</span>
                    <span className="font-medium text-green-600">{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Outflows</span>
                    <span className="font-medium text-red-600">{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Net Cash Flow</span>
                    <span className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {Math.abs(netIncome).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM
                    </span>
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