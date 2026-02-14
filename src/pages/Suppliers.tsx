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
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, Globe, MapPin, Phone, Plus, Trash2, CreditCard, Filter, X, Pencil } from "lucide-react";
import { DragDropImageUpload } from "@/components/DragDropImageUpload";
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForInput } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { CountryAutocomplete } from "@/components/CountryAutocomplete";
import { getCurrencyForCountry } from "@/lib/currencyUtils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  // Column header filters
  const [countryFilter, setCountryFilter] = useState({ search: "", selected: "all" });
  const [isCountryFilterOpen, setIsCountryFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [supplierPhoto, setSupplierPhoto] = useState<File | null>(null);
  const [supplierPhotoPreview, setSupplierPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const uploadSupplierPhoto = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('supplier-photos').upload(fileName, file);
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }
    const { data } = supabase.storage.from('supplier-photos').getPublicUrl(fileName);
    return data.publicUrl;
  };

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

    setIsUploadingPhoto(true);
    let photoUrl: string | null = null;
    if (supplierPhoto) {
      photoUrl = await uploadSupplierPhoto(supplierPhoto);
      if (!photoUrl) {
        toast({
          title: "Error",
          description: "Failed to upload photo. Please try again.",
          variant: "destructive"
        });
        setIsUploadingPhoto(false);
        return;
      }
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
        currency: newSupplier.currency,
        photo_url: photoUrl
      }])
      .select();

    setIsUploadingPhoto(false);
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
      setSupplierPhoto(null);
      setSupplierPhotoPreview(null);
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

  const handleEditSupplier = (supplier: any) => {
    setSelectedSupplier(supplier);
    setNewSupplier({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      website: supplier.website || '',
      tax_id: supplier.tax_id || '',
      payment_terms: supplier.payment_terms || 'Net 30',
      notes: supplier.notes || '',
      country: supplier.country || '',
      currency: supplier.currency || 'EUR'
    });
    setSupplierPhoto(null);
    setSupplierPhotoPreview(supplier.photo_url || null);
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

    setIsUploadingPhoto(true);
    let photoUrl: string | null = selectedSupplier.photo_url || null;
    if (supplierPhoto) {
      photoUrl = await uploadSupplierPhoto(supplierPhoto);
      if (!photoUrl) {
        toast({
          title: "Error",
          description: "Failed to upload photo. Please try again.",
          variant: "destructive"
        });
        setIsUploadingPhoto(false);
        return;
      }
    } else if (!supplierPhotoPreview) {
      photoUrl = null;
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
        currency: newSupplier.currency,
        photo_url: photoUrl
      })
      .eq('id', selectedSupplier.id);

    setIsUploadingPhoto(false);
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
      setSupplierPhoto(null);
      setSupplierPhotoPreview(null);
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

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesCountry = countryFilter.selected === "all" || supplier.country === countryFilter.selected;
    const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
    return matchesCountry && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);
  
  // Get unique countries for filter
  const uniqueCountries = [...new Set(suppliers.map(s => s.country).filter(Boolean))].sort();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Suppliers</h1>
        <Dialog open={isAddSupplierOpen} onOpenChange={(open) => {
          setIsAddSupplierOpen(open);
          if (open) {
            setSupplierPhoto(null);
            setSupplierPhotoPreview(null);
          }
        }}>
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
              <div className="col-span-2">
                <Label>Photo</Label>
                <DragDropImageUpload
                  value={supplierPhoto}
                  onChange={(file) => {
                    setSupplierPhoto(file);
                    if (file) setSupplierPhotoPreview(URL.createObjectURL(file));
                    else setSupplierPhotoPreview(null);
                  }}
                  onRemove={() => {
                    setSupplierPhoto(null);
                    setSupplierPhotoPreview(null);
                  }}
                />
              </div>
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
              <Button className="flex-1" onClick={handleSaveSupplier} disabled={isUploadingPhoto}>
                {isUploadingPhoto ? "Saving..." : "Save Supplier"}
              </Button>
              <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-none bg-transparent text-foreground shadow-none md:rounded-lg md:bg-card md:text-card-foreground md:shadow-sm">
        <CardHeader className="md:p-6 p-4">
          <CardTitle>Supplier Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
            {/* Desktop Table with Filters */}
            <div className="hidden md:block w-full max-w-full min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]"></TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Country
                        <Popover open={isCountryFilterOpen} onOpenChange={setIsCountryFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${countryFilter.selected !== "all" ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="start">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label>Filter by Country</Label>
                                {countryFilter.selected !== "all" && (
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setCountryFilter({ search: "", selected: "all" });
                                  }}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <div>
                                <Label>Search</Label>
                                <Input
                                  placeholder="Search countries..."
                                  value={countryFilter.search}
                                  onChange={(e) => setCountryFilter({ ...countryFilter, search: e.target.value })}
                                />
                              </div>
                              <div className="max-h-60 overflow-y-auto">
                                <Select value={countryFilter.selected} onValueChange={(value) => {
                                  setCountryFilter({ ...countryFilter, selected: value });
                                  setIsCountryFilterOpen(false);
                                }}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Countries</SelectItem>
                                    {uniqueCountries
                                      .filter(c => !countryFilter.search || c.toLowerCase().includes(countryFilter.search.toLowerCase()))
                                      .map(country => (
                                        <SelectItem key={country} value={country}>{country}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Status
                        <Popover open={isStatusFilterOpen} onOpenChange={setIsStatusFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Filter className={`h-3 w-3 ${statusFilter !== "all" ? 'text-primary' : ''}`} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48" align="start">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Filter by Status</Label>
                                {statusFilter !== "all" && (
                                  <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <Select value={statusFilter} onValueChange={(value) => {
                                setStatusFilter(value);
                                setIsStatusFilterOpen(false);
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Status</SelectItem>
                                  <SelectItem value="Active">Active</SelectItem>
                                  <SelectItem value="On Hold">On Hold</SelectItem>
                                  <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="w-[120px]">
                        <div className="h-10 w-[120px] flex-shrink-0 flex items-center justify-center">
                          {supplier.photo_url ? (
                            <img src={supplier.photo_url} alt={supplier.name} className="max-h-full max-w-full w-auto h-auto object-contain" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button 
                          onClick={() => handleSupplierClick(supplier)}
                          className="text-primary hover:underline font-medium text-left"
                        >
                          {supplier.name}
                        </button>
                      </TableCell>
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
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSupplier(supplier);
                            }}
                            title="Edit Supplier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 w-full max-w-full min-w-0">
              {paginatedSuppliers.map((supplier) => (
                <Card
                  key={supplier.id}
                  className="p-4 border cursor-pointer hover:bg-muted/50 transition-colors rounded-lg"
                  onClick={() => handleSupplierClick(supplier)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-[120px] flex-shrink-0 flex items-center justify-center">
                        {supplier.photo_url ? (
                          <img src={supplier.photo_url} alt={supplier.name} className="max-h-full max-w-full w-auto h-auto object-contain" />
                        ) : (
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSupplierClick(supplier);
                          }}
                          className="block text-sm font-medium text-primary hover:underline text-left"
                        >
                          {supplier.name}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</span>
                      <div className="text-sm font-medium">{supplier.country || '-'}</div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Terms</span>
                      <div className="text-sm font-medium">{supplier.payment_terms}</div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                      <Badge
                        variant="outline"
                        className={getStatusColor(supplier.status)}
                      >
                        {supplier.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Orders</span>
                      <div className="text-sm font-medium">{supplier.totalOrders}</div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Value</span>
                      <div className="text-sm font-medium">${supplier.totalValue.toLocaleString()}</div>
                    </div>
                    <div className="pt-2 border-t flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditSupplier(supplier)}
                        className="flex-1"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="flex-1">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredSuppliers.length)} of {filteredSuppliers.length} suppliers
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
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {selectedSupplier?.photo_url ? (
                  <img src={selectedSupplier.photo_url} alt={selectedSupplier.name} className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <DialogTitle className="text-2xl">{selectedSupplier?.name}</DialogTitle>
            </div>
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
              <Label>Photo</Label>
              <DragDropImageUpload
                value={supplierPhoto || supplierPhotoPreview}
                onChange={(file) => {
                  setSupplierPhoto(file);
                  if (file) setSupplierPhotoPreview(URL.createObjectURL(file));
                  else setSupplierPhotoPreview(selectedSupplier?.photo_url || null);
                }}
                onRemove={() => {
                  setSupplierPhoto(null);
                  setSupplierPhotoPreview(null);
                }}
              />
            </div>
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
            <Button onClick={handleUpdateSupplier} disabled={isUploadingPhoto}>
              {isUploadingPhoto ? "Updating..." : "Update Supplier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}