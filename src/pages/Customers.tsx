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
import { Building2, Mail, Globe, MapPin, Phone, Plus, Trash2, FileText } from "lucide-react";
import jsPDF from 'jspdf';
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CountryAutocomplete } from "@/components/CountryAutocomplete";
import { countryToCurrency } from "@/lib/currencyUtils";

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

export default function Customers() {
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    industry: '',
    country: '',
    currency: 'EUR',
    webpage: '',
    vatNumber: '',
    notes: '',
    declarationNumbers: ''
  });

  useEffect(() => {
    fetchCustomers();
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    const { data } = await supabase.from('company_info').select('*').single();
    if (data) {
      setCompanyInfo(data);
    }
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*');
    if (data) {
      const formattedCustomers = data.map(customer => ({
        ...customer,
        contactPerson: customer.contact_person || customer.name,
        industry: customer.industry || "General",
        status: "Active", // Placeholder
        totalOrders: 0, // Would calculate from invoices
        totalValue: 0, // Would calculate from invoices
        lastOrderDate: new Date().toISOString().split('T')[0],
        paymentTerms: "Net 30", // Placeholder
        notes: "", // Placeholder
        webpage: customer.webpage || "",
        declaration_numbers: customer.declaration_numbers || []
      }));
      setCustomers(formattedCustomers);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        console.error('Delete error:', error);
        toast({
          title: "Error",
          description: `Failed to delete customer: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
      toast({
        title: "Customer Deleted",
        description: "The customer has been successfully deleted.",
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the customer.",
        variant: "destructive"
      });
    }
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive"
      });
      return;
    }

    const declarationNumbersArray = newCustomer.declarationNumbers
      .split(',')
      .map(num => num.trim())
      .filter(num => num.length > 0);

    const { data, error } = await supabase
      .from('customers')
      .insert([{
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        address: newCustomer.address,
        country: newCustomer.country,
        currency: newCustomer.currency,
        contact_person: newCustomer.contactPerson,
        industry: newCustomer.industry,
        webpage: newCustomer.webpage,
        vat_number: newCustomer.vatNumber,
        declaration_numbers: declarationNumbersArray.length > 0 ? declarationNumbersArray : null
      }])
      .select();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save customer",
        variant: "destructive"
      });
    } else {
      await fetchCustomers();
      setIsAddCustomerOpen(false);
      setNewCustomer({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        industry: '',
        country: '',
        currency: 'EUR',
        webpage: '',
        vatNumber: '',
        notes: '',
        declarationNumbers: ''
      });
      toast({
        title: "Success",
        description: "Customer saved successfully"
      });
    }
  };

  const handleCustomerClick = (customer: any) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(true);
  };

  const handleEditCustomer = () => {
    setNewCustomer({
      name: selectedCustomer.name,
      contactPerson: selectedCustomer.contactPerson || '',
      email: selectedCustomer.email || '',
      phone: selectedCustomer.phone || '',
      address: selectedCustomer.address || '',
      industry: selectedCustomer.industry || '',
      country: selectedCustomer.country || '',
      currency: selectedCustomer.currency || 'EUR',
      webpage: selectedCustomer.webpage || '',
      vatNumber: selectedCustomer.vat_number || '',
      notes: selectedCustomer.notes || '',
      declarationNumbers: selectedCustomer.declaration_numbers?.join(', ') || ''
    });
    setIsCustomerDialogOpen(false);
    setIsEditCustomerOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive"
      });
      return;
    }

    const declarationNumbersArray = newCustomer.declarationNumbers
      .split(',')
      .map(num => num.trim())
      .filter(num => num.length > 0);

    const { error } = await supabase
      .from('customers')
      .update({
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        address: newCustomer.address,
        country: newCustomer.country,
        currency: newCustomer.currency,
        contact_person: newCustomer.contactPerson,
        industry: newCustomer.industry,
        webpage: newCustomer.webpage,
        vat_number: newCustomer.vatNumber,
        declaration_numbers: declarationNumbersArray.length > 0 ? declarationNumbersArray : null
      })
      .eq('id', selectedCustomer.id);

    if (!error) {
      toast({
        title: "Customer Updated",
        description: "The customer has been successfully updated.",
      });
      
      await fetchCustomers();
      setNewCustomer({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        industry: '',
        country: '',
        currency: 'EUR',
        webpage: '',
        vatNumber: '',
        notes: '',
        declarationNumbers: ''
      });
      setIsEditCustomerOpen(false);
    } else {
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive"
      });
    }
  };

  const generateStockReport = async (customer: any) => {
    try {
      // Fetch inventory items for this customer (only Parts category)
      const { data: inventoryItems } = await supabase
        .from('inventory')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('category', 'Parts');

      if (!inventoryItems || inventoryItems.length === 0) {
        toast({
          title: "No Stock Items",
          description: `No parts found for ${customer.name}`,
          variant: "destructive"
        });
        return;
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const itemsPerPage = 15;
      
      // Company header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Stock Report - ${customer.name}`, 20, 20);
      
      // Date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const currentDate = new Date().toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      pdf.text(`Generated: ${currentDate}`, 20, 30);
      
      let yPosition = 50;
      let itemCount = 0;
      
      // Function to convert image to base64 for PDF
      const getImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };
      
      for (let i = 0; i < inventoryItems.length; i++) {
        const item = inventoryItems[i];
        
        // Check for new page (15 items per page)
        if (itemCount >= itemsPerPage) {
          pdf.addPage();
          yPosition = 30;
          itemCount = 0;
          
          // Redraw header on new page
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Stock Report - ${customer.name} (cont.)`, 20, 20);
          yPosition = 40;
        }
        
        const rowHeight = 16;
        const imageSize = 12;
        
        // Image section
        let imageBase64 = null;
        if (item.photo_url) {
          try {
            imageBase64 = await getImageAsBase64(item.photo_url);
          } catch (error) {
            console.log('Failed to load image:', item.photo_url);
          }
        }
        
        if (imageBase64) {
          try {
            pdf.addImage(imageBase64, 'JPEG', 20, yPosition - 2, imageSize, imageSize);
          } catch (error) {
            // Fallback to placeholder if image fails
            pdf.setFillColor(245, 245, 245);
            pdf.roundedRect(20, yPosition - 2, imageSize, imageSize, 2, 2, 'F');
            pdf.setFontSize(6);
            pdf.setTextColor(120, 120, 120);
            pdf.text('IMG', 24, yPosition + 4);
          }
        } else {
          // Image placeholder with rounded appearance
          pdf.setFillColor(245, 245, 245);
          pdf.roundedRect(20, yPosition - 2, imageSize, imageSize, 2, 2, 'F');
          pdf.setFontSize(6);
          pdf.setTextColor(120, 120, 120);
          pdf.text('IMG', 24, yPosition + 4);
        }
        
        // Reset text formatting
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        // Part name (Description)
        const partName = item.name || '';
        const maxNameLength = 30;
        const displayName = partName.length > maxNameLength ? partName.substring(0, maxNameLength) + '...' : partName;
        pdf.text(displayName, 40, yPosition + 5);
        
        // Part number
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.part_number || 'N/A', 120, yPosition + 5);
        
        // Production status
        const status = item.production_status || 'N/A';
        const maxStatusLength = 12;
        const displayStatus = status.length > maxStatusLength ? status.substring(0, maxStatusLength) + '...' : status;
        pdf.text(displayStatus, 150, yPosition + 5);
        
        // Quantity
        pdf.setFont('helvetica', 'bold');
        const quantityText = item.quantity?.toString() || '0';
        pdf.text(quantityText, 180, yPosition + 5);
        
        yPosition += rowHeight;
        itemCount++;
      }
      
      // Save PDF
      const fileName = `Stock_Report_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "Report Generated",
        description: `Clean stock report for ${customer.name} has been generated with ${inventoryItems.length} items.`,
      });
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate stock report",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input 
                  placeholder="Enter company name" 
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input 
                  placeholder="Enter contact person" 
                  value={newCustomer.contactPerson}
                  onChange={(e) => setNewCustomer({...newCustomer, contactPerson: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email" 
                  placeholder="Enter email" 
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  placeholder="Enter phone number" 
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <Label>Country</Label>
                <CountryAutocomplete
                  value={newCustomer.country}
                  onChange={(value) => {
                    const currency = countryToCurrency[value] || 'EUR';
                    setNewCustomer({...newCustomer, country: value, currency});
                  }}
                  placeholder="Select country"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input 
                  placeholder="Currency" 
                  value={newCustomer.currency}
                  onChange={(e) => setNewCustomer({...newCustomer, currency: e.target.value})}
                  className="bg-muted/50"
                  readOnly
                />
              </div>
              <div>
                <Label>Industry</Label>
                <Input 
                  placeholder="Enter industry" 
                  value={newCustomer.industry}
                  onChange={(e) => setNewCustomer({...newCustomer, industry: e.target.value})}
                />
              </div>
              <div>
                <Label>VAT Number</Label>
                <Input 
                  placeholder="Enter VAT number" 
                  value={newCustomer.vatNumber}
                  onChange={(e) => setNewCustomer({...newCustomer, vatNumber: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input 
                  placeholder="Enter full address" 
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>Website</Label>
                <Input 
                  placeholder="Enter website URL" 
                  value={newCustomer.webpage}
                  onChange={(e) => setNewCustomer({...newCustomer, webpage: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>Declaration Numbers</Label>
                <Input 
                  placeholder="Enter declaration numbers (comma-separated)" 
                  value={newCustomer.declarationNumbers}
                  onChange={(e) => setNewCustomer({...newCustomer, declarationNumbers: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter multiple declaration numbers separated by commas (e.g., "DEC001, DEC002")
                </p>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input 
                  placeholder="Enter any notes" 
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleSaveCustomer}>Save Customer</Button>
              <Button variant="outline" onClick={() => setIsAddCustomerOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <button 
                        onClick={() => handleCustomerClick(customer)}
                        className="text-primary hover:underline font-medium text-left"
                      >
                        {customer.name}
                      </button>
                    </TableCell>
                    <TableCell>{customer.contactPerson}</TableCell>
                    <TableCell>{customer.country}</TableCell>
                    <TableCell>{customer.currency || 'EUR'}</TableCell>
                    <TableCell>{customer.industry}</TableCell>
                    <TableCell className="text-sm">
                      <a href={`mailto:${customer.email}`} className="hover:underline">
                        {customer.email}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">{customer.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(customer.status)}
                      >
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.totalOrders}</TableCell>
                    <TableCell className="font-medium">
                      ${customer.totalValue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => generateStockReport(customer)}
                          title="Generate Stock Report"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete Customer">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{customer.name}"? This action cannot be undone and will remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)}>
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
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
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
                      <p className="font-medium">{selectedCustomer.contactPerson}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{selectedCustomer.industry}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Terms</p>
                      <p className="font-medium">{selectedCustomer.paymentTerms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge
                        variant="outline"
                        className={getStatusColor(selectedCustomer.status)}
                      >
                        {selectedCustomer.status}
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
                      <a href={`mailto:${selectedCustomer.email}`} className="hover:underline">
                        {selectedCustomer.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a href={selectedCustomer.webpage} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {selectedCustomer.webpage}
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{selectedCustomer.address}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Declaration Numbers */}
              {selectedCustomer.declaration_numbers && selectedCustomer.declaration_numbers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Declaration Numbers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {selectedCustomer.declaration_numbers.map((number, index) => (
                        <Badge key={index} variant="secondary">
                          {number}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{selectedCustomer.totalOrders}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${selectedCustomer.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Average Order</p>
                      <p className="text-2xl font-bold">
                        ${(selectedCustomer.totalValue / selectedCustomer.totalOrders).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Last Order</p>
                      <p className="text-lg font-medium">{selectedCustomer.lastOrderDate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedCustomer.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={handleEditCustomer}>
                  Edit Customer
                </Button>
                <Button variant="outline" className="flex-1">
                  View Order History
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input
                id="edit-name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contact">Contact Person</Label>
              <Input
                id="edit-contact"
                value={newCustomer.contactPerson}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, contactPerson: e.target.value }))}
                placeholder="Enter contact person name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-industry">Industry</Label>
              <Input
                id="edit-industry"
                value={newCustomer.industry}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, industry: e.target.value }))}
                placeholder="Enter industry"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-country">Country</Label>
              <CountryAutocomplete
                id="edit-country"
                value={newCustomer.country}
                onChange={(value) => {
                  const currency = countryToCurrency[value] || 'EUR';
                  setNewCustomer(prev => ({ ...prev, country: value, currency }));
                }}
                placeholder="Select country"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-currency">Currency</Label>
              <Input
                id="edit-currency"
                value={newCustomer.currency}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, currency: e.target.value }))}
                placeholder="Currency"
                className="bg-muted/50"
                readOnly
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-webpage">Website</Label>
              <Input
                id="edit-webpage"
                value={newCustomer.webpage}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, webpage: e.target.value }))}
                placeholder="Enter website URL"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-vat">VAT Number</Label>
              <Input
                id="edit-vat"
                value={newCustomer.vatNumber}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, vatNumber: e.target.value }))}
                placeholder="Enter VAT number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-declaration-numbers">Declaration Numbers</Label>
              <Input
                id="edit-declaration-numbers"
                value={newCustomer.declarationNumbers}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, declarationNumbers: e.target.value }))}
                placeholder="Enter declaration numbers (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Enter multiple declaration numbers separated by commas
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter any additional notes"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditCustomerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCustomer}>
              Update Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}