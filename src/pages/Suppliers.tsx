import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, Globe, MapPin, Phone, Plus, Trash2, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForInput } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { CountryAutocomplete } from "@/components/CountryAutocomplete";
import { getCurrencyForCountry } from "@/lib/currencyUtils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "On Hold":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    case "Inactive":
      return "bg-gray-500/10 text-gray-700 border-gray-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

export default function Suppliers() {
  const { toast } = useToast();
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    website: '',
    tax_id: '',
    payment_terms: 'Net 30',
    notes: '',
    country: '',
    currency: 'EUR'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*');
    if (data) {
      const formattedSuppliers = data.map(supplier => ({
        ...supplier,
        status: "Active", // Placeholder
        totalOrders: 0, // Would calculate from inventory purchases
        totalValue: 0, // Would calculate from inventory purchases
        lastOrderDate: formatDateForInput(new Date()),
        category: "General" // Placeholder
      }));
      setSuppliers(formattedSuppliers);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId);

    if (!error) {
      setSuppliers(prev => prev.filter(supplier => supplier.id !== supplierId));
      toast({
        title: "Supplier Deleted",
        description: "The supplier has been successfully deleted.",
      });
    }
  };

  const handleSaveSupplier = async () => {
    if (!newSupplier.name.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([{
        name: newSupplier.name,
        contact_person: newSupplier.contact_person,
        email: newSupplier.email,
        phone: newSupplier.phone,
        address: newSupplier.address,
        city: newSupplier.city,
        website: newSupplier.website,
        tax_id: newSupplier.tax_id,
        payment_terms: newSupplier.payment_terms,
        notes: newSupplier.notes,
        country: newSupplier.country,
        currency: newSupplier.currency
      }])
      .select();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save supplier",
        variant: "destructive"
      });
    } else {
      await fetchSuppliers();
      setIsAddSupplierOpen(false);
      setNewSupplier({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        website: '',
        tax_id: '',
        payment_terms: 'Net 30',
        notes: '',
        country: '',
        currency: 'EUR'
      });
      toast({
        title: "Success",
        description: "Supplier saved successfully"
      });
    }
  };

  const handleSupplierClick = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsSupplierDialogOpen(true);
  };

  const handleEditSupplier = () => {
    setNewSupplier({
      name: selectedSupplier.name,
      contact_person: selectedSupplier.contact_person || '',
      email: selectedSupplier.email || '',
      phone: selectedSupplier.phone || '',
      address: selectedSupplier.address || '',
      city: selectedSupplier.city || '',
      website: selectedSupplier.website || '',
      tax_id: selectedSupplier.tax_id || '',
      payment_terms: selectedSupplier.payment_terms || 'Net 30',
      notes: selectedSupplier.notes || '',
      country: selectedSupplier.country || '',
      currency: selectedSupplier.currency || 'EUR'
    });
    setIsSupplierDialogOpen(false);
    setIsEditSupplierOpen(true);
  };

  const handleUpdateSupplier = async () => {
    if (!newSupplier.name.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('suppliers')
      .update({
        name: newSupplier.name,
        contact_person: newSupplier.contact_person,
        email: newSupplier.email,
        phone: newSupplier.phone,
        address: newSupplier.address,
        city: newSupplier.city,
        website: newSupplier.website,
        tax_id: newSupplier.tax_id,
        payment_terms: newSupplier.payment_terms,
        notes: newSupplier.notes,
        country: newSupplier.country,
        currency: newSupplier.currency
      })
      .eq('id', selectedSupplier.id);

    if (!error) {
      toast({
        title: "Supplier Updated",
        description: "The supplier has been successfully updated.",
      });
      
      await fetchSuppliers();
      setNewSupplier({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        website: '',
        tax_id: '',
        payment_terms: 'Net 30',
        notes: '',
        country: '',
        currency: 'EUR'
      });
      setIsEditSupplierOpen(false);
    } else {
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive"
      });
    }
  };

  // Handler for country selection - updates currency automatically
  const handleCountryChange = (country: string) => {
    const currency = getCurrencyForCountry(country);
    setNewSupplier({ ...newSupplier, country, currency });
  };

  // Pagination
  const totalPages = Math.ceil(suppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = suppliers.slice(startIndex, endIndex);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Suppliers</h1>
        <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input 
                  placeholder="Enter company name" 
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input 
                  placeholder="Enter contact person" 
                  value={newSupplier.contact_person}
                  onChange={(e) => setNewSupplier({...newSupplier, contact_person: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email" 
                  placeholder="Enter email" 
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  placeholder="Enter phone number" 
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                />
              </div>
              <div>
                <Label>Tax ID</Label>
                <Input 
                  placeholder="Enter tax ID" 
                  value={newSupplier.tax_id}
                  onChange={(e) => setNewSupplier({...newSupplier, tax_id: e.target.value})}
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Input 
                  placeholder="e.g., Net 30" 
                  value={newSupplier.payment_terms}
                  onChange={(e) => setNewSupplier({...newSupplier, payment_terms: e.target.value})}
                />
              </div>
              <div>
                <Label>Country</Label>
                <CountryAutocomplete
                  value={newSupplier.country}
                  onChange={handleCountryChange}
                  placeholder="Select country"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input 
                  value={newSupplier.currency}
                  disabled
                  placeholder="Currency (auto-set from country)"
                />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input 
                  placeholder="Enter full address" 
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input 
                  placeholder="Enter city" 
                  value={newSupplier.city}
                  onChange={(e) => setNewSupplier({...newSupplier, city: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>Website</Label>
                <Input 
                  placeholder="Enter website URL" 
                  value={newSupplier.website}
                  onChange={(e) => setNewSupplier({...newSupplier, website: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input 
                  placeholder="Enter any notes" 
                  value={newSupplier.notes}
                  onChange={(e) => setNewSupplier({...newSupplier, notes: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleSaveSupplier}>Save Supplier</Button>
              <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <button 
                        onClick={() => handleSupplierClick(supplier)}
                        className="text-primary hover:underline font-medium text-left"
                      >
                        {supplier.name}
                      </button>
                    </TableCell>
                    <TableCell>{supplier.contact_person}</TableCell>
                    <TableCell className="text-sm">
                      <a href={`mailto:${supplier.email}`} className="hover:underline">
                        {supplier.email}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">{supplier.phone}</TableCell>
                    <TableCell className="text-sm">{supplier.country || '-'}</TableCell>
                    <TableCell>{supplier.payment_terms}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(supplier.status)}
                      >
                        {supplier.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{supplier.totalOrders}</TableCell>
                    <TableCell className="font-medium">
                      ${supplier.totalValue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{supplier.name}"? This action cannot be undone and will remove all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSupplier(supplier.id)}>
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
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, suppliers.length)} of {suppliers.length} suppliers
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Details Dialog */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedSupplier && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{selectedSupplier.contact_person}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tax ID</p>
                      <p className="font-medium">{selectedSupplier.tax_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Terms</p>
                      <p className="font-medium">{selectedSupplier.payment_terms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Country</p>
                      <p className="font-medium">{selectedSupplier.country || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Currency</p>
                      <p className="font-medium">{selectedSupplier.currency || 'EUR'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge
                        variant="outline"
                        className={getStatusColor(selectedSupplier.status)}
                      >
                        {selectedSupplier.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Contact Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${selectedSupplier.email}`} className="hover:underline">
                        {selectedSupplier.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedSupplier.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a href={selectedSupplier.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {selectedSupplier.website}
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{selectedSupplier.address}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{selectedSupplier.totalOrders}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${selectedSupplier.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Average Order</p>
                      <p className="text-2xl font-bold">
                        ${selectedSupplier.totalOrders > 0 ? (selectedSupplier.totalValue / selectedSupplier.totalOrders).toLocaleString() : '0'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Last Order</p>
                      <p className="text-lg font-medium">{selectedSupplier.lastOrderDate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedSupplier.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedSupplier.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button className="flex-1">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Create Purchase Order
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleEditSupplier}>
                  Edit Supplier
                </Button>
                <Button variant="outline" className="flex-1">
                  View Purchase History
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditSupplierOpen} onOpenChange={setIsEditSupplierOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input
                id="edit-name"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contact">Contact Person</Label>
              <Input
                id="edit-contact"
                value={newSupplier.contact_person}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, contact_person: e.target.value }))}
                placeholder="Enter contact person name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={newSupplier.address}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={newSupplier.city}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Enter city"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                value={newSupplier.website}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, website: e.target.value }))}
                placeholder="Enter website URL"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tax-id">Tax ID</Label>
              <Input
                id="edit-tax-id"
                value={newSupplier.tax_id}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, tax_id: e.target.value }))}
                placeholder="Enter tax ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-payment-terms">Payment Terms</Label>
              <Input
                id="edit-payment-terms"
                value={newSupplier.payment_terms}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, payment_terms: e.target.value }))}
                placeholder="e.g., Net 30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-country">Country</Label>
              <CountryAutocomplete
                value={newSupplier.country}
                onChange={handleCountryChange}
                placeholder="Select country"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-currency">Currency</Label>
              <Input
                id="edit-currency"
                value={newSupplier.currency}
                disabled
                placeholder="Currency (auto-set from country)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={newSupplier.notes}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter any additional notes"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditSupplierOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSupplier}>
              Update Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}