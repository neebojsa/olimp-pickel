import React, { useState, useEffect } from "react";
import { Plus, MapPin, Users, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StockLocation {
  id: string;
  name: string;
  description?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
}

interface Staff {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  password_hash?: string;
  page_permissions?: string[];
  can_see_prices?: boolean;
  can_see_customers?: boolean;
}

const Settings = () => {
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StockLocation | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const { toast } = useToast();

  const [locationForm, setLocationForm] = useState({
    name: "",
    description: "",
    address: "",
    is_active: true
  });

  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    is_active: true,
    password: "",
    page_permissions: [] as string[],
    can_see_prices: false,
    can_see_customers: false
  });

  useEffect(() => {
    fetchStockLocations();
    fetchStaff();
  }, []);

  const fetchStockLocations = async () => {
    const { data, error } = await supabase
      .from('stock_locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch stock locations",
        variant: "destructive"
      });
    } else {
      setStockLocations(data || []);
    }
  };

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch staff",
        variant: "destructive"
      });
    } else {
      const processedStaff = (data || []).map(staff => ({
        ...staff,
        page_permissions: Array.isArray(staff.page_permissions) 
          ? staff.page_permissions.filter((p): p is string => typeof p === 'string')
          : []
      }));
      setStaff(processedStaff);
    }
  };

  const handleSaveLocation = async () => {
    if (!locationForm.name.trim()) {
      toast({
        title: "Error",
        description: "Location name is required",
        variant: "destructive"
      });
      return;
    }

    if (editingLocation) {
      const { error } = await supabase
        .from('stock_locations')
        .update(locationForm)
        .eq('id', editingLocation.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update location",
          variant: "destructive"
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('stock_locations')
        .insert([locationForm]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create location",
          variant: "destructive"
        });
        return;
      }
    }

    toast({
      title: "Success",
      description: `Location ${editingLocation ? 'updated' : 'created'} successfully`
    });

    setLocationForm({ name: "", description: "", address: "", is_active: true });
    setEditingLocation(null);
    setIsLocationDialogOpen(false);
    fetchStockLocations();
  };

  const handleSaveStaff = async () => {
    if (!staffForm.name.trim()) {
      toast({
        title: "Error",
        description: "Staff name is required",
        variant: "destructive"
      });
      return;
    }

    if (!staffForm.email.trim()) {
      toast({
        title: "Error",
        description: "Email is required for login access",
        variant: "destructive"
      });
      return;
    }

    if (!editingStaff && !staffForm.password.trim()) {
      toast({
        title: "Error",
        description: "Password is required for new staff members",
        variant: "destructive"
      });
      return;
    }

    const staffData = {
      name: staffForm.name,
      email: staffForm.email,
      phone: staffForm.phone,
      position: staffForm.position,
      department: staffForm.department,
      is_active: staffForm.is_active,
      page_permissions: staffForm.page_permissions,
      can_see_prices: staffForm.can_see_prices,
      can_see_customers: staffForm.can_see_customers,
      ...(staffForm.password ? { password_hash: staffForm.password } : {})
    };

    if (editingStaff) {
      const { error } = await supabase
        .from('staff')
        .update(staffData)
        .eq('id', editingStaff.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update staff member",
          variant: "destructive"
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('staff')
        .insert([staffData]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create staff member",
          variant: "destructive"
        });
        return;
      }
    }

    toast({
      title: "Success",
      description: `Staff member ${editingStaff ? 'updated' : 'created'} successfully`
    });

    setStaffForm({ 
      name: "", 
      email: "", 
      phone: "", 
      position: "", 
      department: "", 
      is_active: true,
      password: "",
      page_permissions: [],
      can_see_prices: false,
      can_see_customers: false
    });
    setEditingStaff(null);
    setIsStaffDialogOpen(false);
    fetchStaff();
  };

  const handleDeleteLocation = async (id: string) => {
    const { error } = await supabase
      .from('stock_locations')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Location deleted successfully"
      });
      fetchStockLocations();
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Staff member deleted successfully"
      });
      fetchStaff();
    }
  };

  const openLocationDialog = (location?: StockLocation) => {
    if (location) {
      setEditingLocation(location);
      setLocationForm({
        name: location.name,
        description: location.description || "",
        address: location.address || "",
        is_active: location.is_active
      });
    } else {
      setEditingLocation(null);
      setLocationForm({ name: "", description: "", address: "", is_active: true });
    }
    setIsLocationDialogOpen(true);
  };

  const availablePages = [
    "inventory", "work-orders", "customers", "suppliers", 
    "invoicing", "accounting", "labels", "settings"
  ];

  const openStaffDialog = (staffMember?: Staff) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setStaffForm({
        name: staffMember.name,
        email: staffMember.email || "",
        phone: staffMember.phone || "",
        position: staffMember.position || "",
        department: staffMember.department || "",
        is_active: staffMember.is_active,
        password: "",
        page_permissions: staffMember.page_permissions || [],
        can_see_prices: staffMember.can_see_prices || false,
        can_see_customers: staffMember.can_see_customers || false
      });
    } else {
      setEditingStaff(null);
      setStaffForm({ 
        name: "", 
        email: "", 
        phone: "", 
        position: "", 
        department: "", 
        is_active: true,
        password: "",
        page_permissions: [],
        can_see_prices: false,
        can_see_customers: false
      });
    }
    setIsStaffDialogOpen(true);
  };

  const handlePagePermissionToggle = (page: string) => {
    setStaffForm(prev => ({
      ...prev,
      page_permissions: prev.page_permissions.includes(page)
        ? prev.page_permissions.filter(p => p !== page)
        : [...prev.page_permissions, page]
    }));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage stock locations and staff members</p>
      </div>

      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="locations">Stock Locations</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Stock Locations</h2>
              <p className="text-muted-foreground">Manage warehouse and storage locations</p>
            </div>
            <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openLocationDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingLocation ? 'Edit' : 'Add'} Stock Location</DialogTitle>
                  <DialogDescription>
                    {editingLocation ? 'Update' : 'Create a new'} stock location for inventory management
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="location-name">Name *</Label>
                    <Input
                      id="location-name"
                      value={locationForm.name}
                      onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                      placeholder="e.g., Main Warehouse, Storage Room A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location-description">Description</Label>
                    <Textarea
                      id="location-description"
                      value={locationForm.description}
                      onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location-address">Address</Label>
                    <Textarea
                      id="location-address"
                      value={locationForm.address}
                      onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                      placeholder="Physical address"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="location-active"
                      checked={locationForm.is_active}
                      onCheckedChange={(checked) => setLocationForm({ ...locationForm, is_active: checked })}
                    />
                    <Label htmlFor="location-active">Active</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsLocationDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveLocation}>
                      {editingLocation ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stockLocations.map((location) => (
              <Card key={location.id} className={!location.is_active ? "opacity-50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {location.name}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openLocationDialog(location)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Location</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{location.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteLocation(location.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {!location.is_active && (
                    <span className="text-xs text-muted-foreground">Inactive</span>
                  )}
                </CardHeader>
                <CardContent>
                  {location.description && (
                    <p className="text-sm text-muted-foreground mb-2">{location.description}</p>
                  )}
                  {location.address && (
                    <p className="text-xs text-muted-foreground">{location.address}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Staff</h2>
              <p className="text-muted-foreground">Manage team members and employees</p>
            </div>
            <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openStaffDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingStaff ? 'Edit' : 'Add'} Staff Member</DialogTitle>
                  <DialogDescription>
                    {editingStaff ? 'Update' : 'Add a new'} team member
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="staff-name">Name *</Label>
                    <Input
                      id="staff-name"
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="staff-email">Email</Label>
                    <Input
                      id="staff-email"
                      type="email"
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      placeholder="email@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="staff-phone">Phone</Label>
                    <Input
                      id="staff-phone"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="staff-position">Position</Label>
                    <Input
                      id="staff-position"
                      value={staffForm.position}
                      onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })}
                      placeholder="Job title"
                    />
                  </div>
                   <div>
                     <Label htmlFor="staff-department">Department</Label>
                     <Input
                       id="staff-department"
                       value={staffForm.department}
                       onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                       placeholder="Department name"
                     />
                   </div>
                   
                   <div>
                     <Label htmlFor="staff-password">
                       Password {!editingStaff && '*'}
                     </Label>
                     <Input
                       id="staff-password"
                       type="password"
                       value={staffForm.password}
                       onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                       placeholder={editingStaff ? "Leave empty to keep current password" : "Enter password"}
                     />
                   </div>

                   <div className="space-y-3">
                     <Label>Page Permissions</Label>
                     <div className="grid grid-cols-2 gap-2">
                       {availablePages.map((page) => (
                         <div key={page} className="flex items-center space-x-2">
                           <Switch
                             id={`permission-${page}`}
                             checked={staffForm.page_permissions.includes(page)}
                             onCheckedChange={() => handlePagePermissionToggle(page)}
                           />
                           <Label 
                             htmlFor={`permission-${page}`}
                             className="text-sm capitalize"
                           >
                             {page.replace('-', ' ')}
                           </Label>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div className="space-y-3">
                     <Label>Data Permissions</Label>
                     <div className="space-y-2">
                       <div className="flex items-center space-x-2">
                         <Switch
                           id="can-see-prices"
                           checked={staffForm.can_see_prices}
                           onCheckedChange={(checked) => setStaffForm(prev => ({ ...prev, can_see_prices: checked }))}
                         />
                         <Label htmlFor="can-see-prices">Can see prices</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <Switch
                           id="can-see-customers"
                           checked={staffForm.can_see_customers}
                           onCheckedChange={(checked) => setStaffForm(prev => ({ ...prev, can_see_customers: checked }))}
                         />
                         <Label htmlFor="can-see-customers">Can see customers</Label>
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex items-center space-x-2">
                     <Switch
                       id="staff-active"
                       checked={staffForm.is_active}
                       onCheckedChange={(checked) => setStaffForm({ ...staffForm, is_active: checked })}
                     />
                     <Label htmlFor="staff-active">Active</Label>
                   </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsStaffDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveStaff}>
                      {editingStaff ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {staff.map((member) => (
              <Card key={member.id} className={!member.is_active ? "opacity-50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {member.name}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openStaffDialog(member)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{member.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteStaff(member.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {!member.is_active && (
                    <span className="text-xs text-muted-foreground">Inactive</span>
                  )}
                </CardHeader>
                <CardContent>
                  {member.position && (
                    <p className="text-sm font-medium">{member.position}</p>
                  )}
                  {member.department && (
                    <p className="text-sm text-muted-foreground">{member.department}</p>
                  )}
                  {member.email && (
                    <p className="text-xs text-muted-foreground mt-2">{member.email}</p>
                  )}
                  {member.phone && (
                    <p className="text-xs text-muted-foreground">{member.phone}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;