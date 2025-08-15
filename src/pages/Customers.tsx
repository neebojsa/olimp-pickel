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
import { Building2, Mail, Globe, MapPin, Phone, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*');
    if (data) {
      const formattedCustomers = data.map(customer => ({
        ...customer,
        contactPerson: customer.name, // Placeholder mapping
        industry: "General", // Placeholder
        status: "Active", // Placeholder
        totalOrders: 0, // Would calculate from invoices
        totalValue: 0, // Would calculate from invoices
        lastOrderDate: new Date().toISOString().split('T')[0],
        paymentTerms: "Net 30", // Placeholder
        notes: "", // Placeholder
        webpage: "", // Placeholder
        country: "USA" // Placeholder
      }));
      setCustomers(formattedCustomers);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (!error) {
      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
      toast({
        title: "Customer Deleted",
        description: "The customer has been successfully deleted.",
      });
    }
  };

  const handleCustomerClick = (customer: any) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(true);
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
                <Input placeholder="Enter company name" />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input placeholder="Enter contact person" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="Enter email" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="Enter phone number" />
              </div>
              <div>
                <Label>Country</Label>
                <Input placeholder="Enter country" />
              </div>
              <div>
                <Label>Industry</Label>
                <Input placeholder="Enter industry" />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input placeholder="Enter full address" />
              </div>
              <div className="col-span-2">
                <Label>Website</Label>
                <Input placeholder="Enter website URL" />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input placeholder="Enter any notes" />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1">Save Customer</Button>
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
                  <TableHead>Industry</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
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
                <Button className="flex-1">
                  Create Work Order
                </Button>
                <Button variant="outline" className="flex-1">
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
    </div>
  );
}