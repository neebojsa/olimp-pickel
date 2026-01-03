import { useState, useEffect } from "react";
import { Plus, FileText, Edit, Trash2, Search, Download, Eye, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DeliveryNoteForm } from "@/components/DeliveryNoteForm";
import { DeliveryNoteViewDialog } from "@/components/DeliveryNoteViewDialog";
import OrderConfirmationForm from "@/components/OrderConfirmationForm";
import { useNavigate } from "react-router-dom";

const getTypeColor = (type: string) => {
  switch (type) {
    case "Contract":
      return "bg-blue-500/10 text-blue-700 border-blue-200";
    case "Invoice":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "Report":
      return "bg-purple-500/10 text-purple-700 border-purple-200";
    case "Agreement":
      return "bg-orange-500/10 text-orange-700 border-orange-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

export default function OtherDocs() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [orderConfirmations, setOrderConfirmations] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeliveryNoteFormOpen, setIsDeliveryNoteFormOpen] = useState(false);
  const [isOrderConfirmationFormOpen, setIsOrderConfirmationFormOpen] = useState(false);
  const [isDeliveryNoteViewOpen, setIsDeliveryNoteViewOpen] = useState(false);
  const [viewingDeliveryNote, setViewingDeliveryNote] = useState<any>(null);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [editingDeliveryNote, setEditingDeliveryNote] = useState<any>(null);
  const [editingOrderConfirmation, setEditingOrderConfirmation] = useState<any>(null);
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    content: ""
  });
  // Column header filters
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [isDocumentTypeFilterOpen, setIsDocumentTypeFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Regulations");

  useEffect(() => {
    if (activeTab === "Delivery Notes") {
      fetchDeliveryNotes();
    } else if (activeTab === "Order Confirmations") {
      fetchOrderConfirmations();
    } else {
      fetchDocuments();
    }
  }, [activeTab]);

  const fetchDocuments = async () => {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (data) {
      setDocuments(data);
    }
  };

  const fetchDeliveryNotes = async () => {
    const { data: notesData, error } = await supabase
      .from('delivery_notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching delivery notes:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery notes",
        variant: "destructive"
      });
      return;
    }
    
    if (notesData) {
      // Fetch customers and suppliers separately
      const { data: customersData } = await supabase.from('customers').select('id, name');
      const { data: suppliersData } = await supabase.from('suppliers').select('id, name');
      
      // Map delivery notes with their related entities
      const notesWithEntities = notesData.map(note => {
        let entity = null;
        if (note.to_type === 'customer' && customersData) {
          entity = customersData.find(c => c.id === note.to_id);
        } else if (note.to_type === 'supplier' && suppliersData) {
          entity = suppliersData.find(s => s.id === note.to_id);
        }
        
        return {
          ...note,
          customers: note.to_type === 'customer' ? entity : null,
          suppliers: note.to_type === 'supplier' ? entity : null
        };
      });
      
      setDeliveryNotes(notesWithEntities);
    }
  };

  const fetchOrderConfirmations = async () => {
    const { data: ocData, error } = await supabase
      .from('order_confirmations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching order confirmations:', error);
      toast({
        title: "Error",
        description: "Failed to load order confirmations",
        variant: "destructive"
      });
      return;
    }

    if (ocData) {
      const { data: customersData } = await supabase.from('customers').select('id, name');
      const withCustomer = ocData.map(oc => ({
        ...oc,
        customer: customersData?.find(c => c.id === oc.customer_id) || null
      }));
      setOrderConfirmations(withCustomer);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (!error) {
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast({
        title: "Document Deleted",
        description: "The document has been successfully deleted.",
      });
    }
  };

  const handleSaveDocument = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from('documents')
      .insert([{
        name: formData.name,
        type: formData.type,
        content: formData.content
      }])
      .select();

    if (!error && data) {
      toast({
        title: "Document Created",
        description: `${formData.name} has been successfully created.`,
      });
      
      await fetchDocuments();
      setFormData({ name: "", type: "", content: "" });
      setIsAddDialogOpen(false);
    } else {
      toast({
        title: "Error",
        description: "Failed to create document",
        variant: "destructive"
      });
    }
  };

  const handleOpenEditDialog = (document: any) => {
    setEditingDocument(document);
    setFormData({
      name: document.name,
      type: document.type,
      content: document.content || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateDocument = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('documents')
      .update({
        name: formData.name,
        type: formData.type,
        content: formData.content
      })
      .eq('id', editingDocument.id);

    if (!error) {
      toast({
        title: "Document Updated",
        description: `${formData.name} has been successfully updated.`,
      });
      
      await fetchDocuments();
      setFormData({ name: "", type: "", content: "" });
      setEditingDocument(null);
      setIsEditDialogOpen(false);
    } else {
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive"
      });
    }
  };

  const handleViewDocument = (document: any) => {
    setViewingDocument(document);
    setIsViewDialogOpen(true);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = documentTypeFilter === "all" || doc.type === documentTypeFilter;
    const matchesTab = doc.type === activeTab;
    return matchesSearch && matchesType && matchesTab;
  });

  const filteredDeliveryNotes = deliveryNotes.filter(note => {
    const entityName = note.to_type === "customer" 
      ? (note.customers?.name || "")
      : (note.suppliers?.name || "");
    return note.delivery_note_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entityName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredOrderConfirmations = orderConfirmations.filter(oc => {
    const customerName = oc.customer?.name || "";
    return oc.order_confirmation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Get unique document types
  const documentTypes = [...new Set(documents.map(doc => doc.type).filter(Boolean))].sort();

  const tabTypes = [
    "Regulations",
    "Statements",
    "Requests",
    "Purchase Orders",
    "Order Confirmations",
    "Pallet tags",
    "Contracts",
    "Reports",
    "Delivery Notes",
    "Quotes"
  ];

  // Get button text based on tab name
  const getAddButtonText = (tabName: string): string => {
    const buttonTexts: Record<string, string> = {
      "Regulations": "Add Regulation",
      "Statements": "Add Statement",
      "Requests": "Add Request",
      "Purchase Orders": "Add Purchase Order",
      "Order Confirmations": "Add Order Confirmation",
      "Pallet tags": "Add Pallet tag",
      "Contracts": "Add Contract",
      "Reports": "Add Report",
      "Delivery Notes": "Add Delivery Note",
      "Quotes": "Add Quote"
    };
    
    return buttonTexts[tabName] || `Add ${tabName}`;
  };

  const handleAddDocumentForTab = (tabName: string) => {
    if (tabName === "Delivery Notes") {
      setEditingDeliveryNote(null);
      setIsDeliveryNoteFormOpen(true);
    } else if (tabName === "Order Confirmations") {
      setEditingOrderConfirmation(null);
      setIsOrderConfirmationFormOpen(true);
    } else {
      setFormData({
        name: "",
        type: tabName,
        content: ""
      });
      setIsAddDialogOpen(true);
    }
  };

  const handleEditDeliveryNote = (note: any) => {
    setEditingDeliveryNote(note);
    setIsDeliveryNoteFormOpen(true);
  };

  const handleDeleteDeliveryNote = async (noteId: string) => {
    const { error } = await supabase.from('delivery_notes').delete().eq('id', noteId);
    if (!error) {
      await fetchDeliveryNotes();
      toast({
        title: "Delivery Note Deleted",
        description: "The delivery note has been successfully deleted.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete delivery note",
        variant: "destructive"
      });
    }
  };

  const handleViewDeliveryNote = (note: any) => {
    setViewingDeliveryNote(note);
    setIsDeliveryNoteViewOpen(true);
  };

  const handleViewOrderConfirmation = (oc: any) => {
    navigate(`/order-confirmation/${oc.id}`);
  };

  const handleEditOrderConfirmation = async (oc: any) => {
    const { data: itemsData } = await supabase
      .from('order_confirmation_items')
      .select('*')
      .eq('order_confirmation_id', oc.id);
    setEditingOrderConfirmation({
      ...oc,
      order_confirmation_items: itemsData || []
    });
    setIsOrderConfirmationFormOpen(true);
  };

  const handleDeleteOrderConfirmation = async (ocId: string) => {
    const { error } = await supabase.from('order_confirmations').delete().eq('id', ocId);
    if (!error) {
      await fetchOrderConfirmations();
      toast({
        title: "Order Confirmation Deleted",
        description: "The order confirmation has been successfully deleted.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete order confirmation",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Other Documents</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          {tabTypes.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="whitespace-nowrap flex-shrink-0">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Content */}
        {tabTypes.map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {/* Tab Header with Add Button */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{tab}</h2>
              <Button onClick={() => handleAddDocumentForTab(tab)}>
                <Plus className="w-4 h-4 mr-2" />
                {getAddButtonText(tab)}
              </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle>{activeTab === "Delivery Notes" ? "Delivery Notes" : "Documents"}</CardTitle>
              </CardHeader>
              <CardContent>
                {activeTab === "Delivery Notes" ? (
                  filteredDeliveryNotes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Delivery Note Number</TableHead>
                          <TableHead>Issue Date</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Delivery Address</TableHead>
                          <TableHead>Total Weight</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDeliveryNotes.map((note) => {
                          const entityName = note.to_type === "customer" 
                            ? (note.customers?.name || "")
                            : (note.suppliers?.name || "");
                          return (
                            <TableRow key={note.id}>
                              <TableCell className="font-medium">
                                <button
                                  onClick={() => handleViewDeliveryNote(note)}
                                  className="text-left hover:text-primary hover:underline cursor-pointer transition-colors"
                                >
                                  {note.delivery_note_number}
                                </button>
                              </TableCell>
                              <TableCell>{new Date(note.issue_date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {note.to_type === "customer" ? "Customer" : "Supplier"}: {entityName}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{note.delivery_address}</TableCell>
                              <TableCell>{note.total_weight?.toFixed(2) || "0.00"} kg</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditDeliveryNote(note)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Delivery Note</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{note.delivery_note_number}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteDeliveryNote(note.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No delivery notes found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first delivery note."}
                      </p>
                    </div>
                  )
                ) : activeTab === "Order Confirmations" ? (
                  filteredOrderConfirmations.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order Confirmation Number</TableHead>
                          <TableHead>Issue Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Shipping Date</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrderConfirmations.map((oc) => {
                          const amountValue = Number(oc.amount || 0);
                          return (
                            <TableRow key={oc.id}>
                              <TableCell className="font-medium">
                                <button
                                  onClick={() => handleViewOrderConfirmation(oc)}
                                  className="text-left hover:text-primary hover:underline cursor-pointer transition-colors"
                                >
                                  {oc.order_confirmation_number}
                                </button>
                              </TableCell>
                              <TableCell>{oc.issue_date ? new Date(oc.issue_date).toLocaleDateString() : "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {oc.customer?.name || "Customer"}
                                </Badge>
                              </TableCell>
                              <TableCell>{amountValue.toFixed(2)} {oc.currency || "EUR"}</TableCell>
                              <TableCell>{oc.shipping_date ? new Date(oc.shipping_date).toLocaleDateString() : "-"}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditOrderConfirmation(oc)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Order Confirmation</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{oc.order_confirmation_number}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteOrderConfirmation(oc.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No order confirmations found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first order confirmation."}
                      </p>
                    </div>
                  )
                ) : (
                  filteredDocuments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Name</TableHead>
                          <TableHead>
                    <div className="flex items-center gap-2">
                              Type
                              <Popover open={isDocumentTypeFilterOpen} onOpenChange={setIsDocumentTypeFilterOpen}>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Filter className={`h-3 w-3 ${documentTypeFilter !== "all" ? 'text-primary' : ''}`} />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48" align="start">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label>Filter by Document Type</Label>
                                      {documentTypeFilter !== "all" && (
                                        <Button variant="ghost" size="sm" onClick={() => setDocumentTypeFilter("all")}>
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                    <Select value={documentTypeFilter} onValueChange={(value) => {
                                      setDocumentTypeFilter(value);
                                      setIsDocumentTypeFilterOpen(false);
                                    }}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {documentTypes.map(type => (
                                          <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </TableHead>
                          <TableHead>Content Preview</TableHead>
                          <TableHead>Created Date</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.name}</TableCell>
                            <TableCell>
                      <Badge variant="outline" className={getTypeColor(doc.type)}>
                        {doc.type}
                      </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {doc.content ? (
                                <span className="line-clamp-2">{doc.content}</span>
                              ) : (
                                <span className="text-muted-foreground">No content</span>
                              )}
                            </TableCell>
                            <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewDocument(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEditDialog(doc)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{doc.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteDocument(doc.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No documents found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first document."}
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add Document Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Document Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter document name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Document Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regulations">Regulations</SelectItem>
                  <SelectItem value="Statements">Statements</SelectItem>
                  <SelectItem value="Requests">Requests</SelectItem>
                  <SelectItem value="Purchase Orders">Purchase Orders</SelectItem>
                  <SelectItem value="Order Confirmations">Order Confirmations</SelectItem>
                  <SelectItem value="Pallet tags">Pallet tags</SelectItem>
                  <SelectItem value="Contracts">Contracts</SelectItem>
                  <SelectItem value="Reports">Reports</SelectItem>
                  <SelectItem value="Delivery Notes">Delivery Notes</SelectItem>
                  <SelectItem value="Quotes">Quotes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter document content"
                rows={5}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDocument}>
              Save Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Document Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter document name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Document Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regulations">Regulations</SelectItem>
                  <SelectItem value="Statements">Statements</SelectItem>
                  <SelectItem value="Requests">Requests</SelectItem>
                  <SelectItem value="Purchase Orders">Purchase Orders</SelectItem>
                  <SelectItem value="Order Confirmations">Order Confirmations</SelectItem>
                  <SelectItem value="Pallet tags">Pallet tags</SelectItem>
                  <SelectItem value="Contracts">Contracts</SelectItem>
                  <SelectItem value="Reports">Reports</SelectItem>
                  <SelectItem value="Delivery Notes">Delivery Notes</SelectItem>
                  <SelectItem value="Quotes">Quotes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter document content"
                rows={5}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDocument}>
              Update Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {viewingDocument?.name}
              <Badge variant="outline" className={getTypeColor(viewingDocument?.type || "")}>
                {viewingDocument?.type}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {viewingDocument?.content ? (
              <div className="whitespace-pre-wrap text-sm">
                {viewingDocument.content}
              </div>
            ) : (
              <p className="text-muted-foreground">No content available for this document.</p>
            )}
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Created: {viewingDocument && new Date(viewingDocument.created_at).toLocaleString()}
              {viewingDocument?.updated_at !== viewingDocument?.created_at && (
                <span className="ml-4">
                  Updated: {viewingDocument && new Date(viewingDocument.updated_at).toLocaleString()}
                </span>
              )}
            </div>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Note Form */}
      <DeliveryNoteForm
        open={isDeliveryNoteFormOpen}
        onOpenChange={(open) => {
          setIsDeliveryNoteFormOpen(open);
          if (!open) {
            setEditingDeliveryNote(null);
          }
        }}
        onSuccess={() => {
          fetchDeliveryNotes();
        }}
        editingNote={editingDeliveryNote}
      />

      <OrderConfirmationForm
        isOpen={isOrderConfirmationFormOpen}
        onClose={() => {
          setIsOrderConfirmationFormOpen(false);
          setEditingOrderConfirmation(null);
        }}
        onSuccess={() => {
          fetchOrderConfirmations();
        }}
        editingOrderConfirmation={editingOrderConfirmation}
      />

      {/* Delivery Note View Dialog */}
      {viewingDeliveryNote && (
        <DeliveryNoteViewDialog
          deliveryNoteId={viewingDeliveryNote.id}
          open={isDeliveryNoteViewOpen}
          onOpenChange={(open) => {
            setIsDeliveryNoteViewOpen(open);
            if (!open) {
              setViewingDeliveryNote(null);
            }
          }}
        />
      )}
    </div>
  );
}