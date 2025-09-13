import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Shield, Palette, Bell, Lock, Globe, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { resizeImageFile, validateImageFile } from "@/lib/imageUtils";
import { CountryAutocomplete } from "@/components/CountryAutocomplete";

export default function Settings() {
  const { toast } = useToast();
  
  // Profile state
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    department: "",
    avatar_url: ""
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Preferences state
  const [preferences, setPreferences] = useState({
    dark_mode: false,
    theme_color: "blue",
    font_size: "medium",
    push_notifications: true,
    email_notifications: true,
    work_order_notifications: true,
    inventory_notifications: true,
    system_notifications: false,
    security_notifications: true,
    language: "en",
    timezone: "utc-5",
    date_format: "mdy"
  });

  // Company data state
  const [companyData, setCompanyData] = useState({
    company_name: "",
    legal_name: "",
    tax_id: "",
    registration_number: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    phone: "",
    email: "",
    website: "",
    logo_url: ""
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchCompanyInfo(),
      fetchUserProfile(),
      fetchUserPreferences()
    ]);
  };

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return;
    }
    
    if (data) {
      setProfileData(data);
    }
  };

  const fetchUserPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user preferences:', error);
      return;
    }
    
    if (data) {
      setPreferences(data);
    }
  };

  const fetchCompanyInfo = async () => {
    const { data, error } = await supabase.from('company_info').select('*').limit(1).maybeSingle();
    if (error) {
      console.error('Error fetching company info:', error);
      return;
    }
    if (data) {
      setCompanyData(data);
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      // Validate file type
      if (!validateImageFile(file)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG or PNG image.",
          variant: "destructive",
        });
        return null;
      }

      // Resize image while maintaining aspect ratio
      const resizedFile = await resizeImageFile(file, 200, 200, 0.8);
      
      // Convert to base64
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          resolve(base64String);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(resizedFile);
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to process logo. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      if (!validateImageFile(file)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG or PNG image.",
          variant: "destructive",
        });
        return null;
      }

      const resizedFile = await resizeImageFile(file, 200, 200, 0.8);
      
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          resolve(base64String);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(resizedFile);
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to process avatar. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSaveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let avatarUrl = profileData.avatar_url;
    if (avatarFile) {
      avatarUrl = await handleAvatarUpload(avatarFile);
      if (!avatarUrl) return;
    }

    const profileInfo = { ...profileData, avatar_url: avatarUrl, user_id: user.id };

    const { data: existingData } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingData) {
      const { error } = await supabase
        .from('user_profiles')
        .update(profileInfo)
        .eq('user_id', user.id);
      
      if (error) {
        toast({
          title: "Save failed",
          description: `Failed to update profile: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('user_profiles')
        .insert([profileInfo]);
      
      if (error) {
        toast({
          title: "Save failed", 
          description: `Failed to save profile: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
    }

    setProfileData(profileInfo);
    setAvatarFile(null);
    toast({
      title: "Profile saved",
      description: "Your profile has been updated successfully.",
    });
  };

  const handleSavePreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const preferencesData = { ...preferences, user_id: user.id };

    const { data: existingData } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingData) {
      const { error } = await supabase
        .from('user_preferences')
        .update(preferencesData)
        .eq('user_id', user.id);
      
      if (error) {
        toast({
          title: "Save failed",
          description: `Failed to update preferences: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('user_preferences')
        .insert([preferencesData]);
      
      if (error) {
        toast({
          title: "Save failed",
          description: `Failed to save preferences: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Preferences saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleSaveCompany = async () => {
    let logoUrl = companyData.logo_url;
    
    if (logoFile) {
      logoUrl = await handleLogoUpload(logoFile);
      if (!logoUrl) return;
    }

    const companyInfo = { ...companyData, logo_url: logoUrl };

    const { data: existingData, error: fetchError } = await supabase.from('company_info').select('id').limit(1).maybeSingle();
    
    if (fetchError) {
      console.error('Fetch error:', fetchError);
      toast({
        title: "Save failed",
        description: "Failed to check existing company information.",
        variant: "destructive",
      });
      return;
    }
    
    if (existingData) {
      const { error } = await supabase.from('company_info').update(companyInfo).eq('id', existingData.id);
      if (error) {
        console.error('Update error:', error);
        toast({
          title: "Save failed",
          description: `Failed to update company information: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase.from('company_info').insert([companyInfo]);
      if (error) {
        console.error('Insert error:', error);
        toast({
          title: "Save failed",
          description: `Failed to save company information: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
    }

    setCompanyData(companyInfo);
    setLogoFile(null);
    toast({
      title: "Company information saved",
      description: "Company details have been updated successfully.",
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and system settings.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information and profile details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileData.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{profileData.first_name?.[0]}{profileData.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}>Change Avatar</Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAvatarFile(file);
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setProfileData(prev => ({ ...prev, avatar_url: e.target?.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <p className="text-sm text-muted-foreground">JPG, GIF or PNG. Max size 1MB.</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={profileData.first_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="First Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={profileData.last_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Last Name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email Address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={profileData.department} onValueChange={(value) => setProfileData(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="quality">Quality Control</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} className="px-8">
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Manage your company's official information and branding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={companyData.logo_url || "/placeholder.svg"} />
                  <AvatarFallback>LOGO</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('logo-upload')?.click()}>
                    Change Logo
                  </Button>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setCompanyData(prev => ({ ...prev, logo_url: e.target?.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <p className="text-sm text-muted-foreground">PNG or JPG. Max size 2MB.</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    value={companyData.company_name}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input 
                    id="legalName" 
                    value={companyData.legal_name}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, legal_name: e.target.value }))}
                    placeholder="Legal Company Name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input 
                    id="taxId" 
                    value={companyData.tax_id}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, tax_id: e.target.value }))}
                    placeholder="Tax Identification Number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regNumber">Registration Number</Label>
                  <Input 
                    id="regNumber" 
                    value={companyData.registration_number}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, registration_number: e.target.value }))}
                    placeholder="Business Registration Number"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address" 
                  value={companyData.address}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street Address"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    value={companyData.city}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input 
                    id="state" 
                    value={companyData.state}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State/Province"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input 
                    id="postalCode" 
                    value={companyData.postal_code}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="Postal Code"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <CountryAutocomplete
                  id="country" 
                  value={companyData.country}
                  onChange={(value) => setCompanyData(prev => ({ ...prev, country: value }))}
                  placeholder="Country"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone</Label>
                  <Input 
                    id="companyPhone" 
                    value={companyData.phone}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Company Phone Number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input 
                    id="companyEmail" 
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="info@company.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input 
                  id="website" 
                  value={companyData.website}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://www.company.com"
                />
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveCompany} className="px-8">
                  Save Company Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your account security and authentication methods.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <Button>Update Password</Button>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Two-Factor Authentication</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable 2FA</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Active Sessions</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Current Session</p>
                      <p className="text-xs text-muted-foreground">Chrome on Windows • Started 2 hours ago</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                User Permissions & Roles
              </CardTitle>
              <CardDescription>Manage user access levels and system permissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Current Role</Label>
                    <p className="text-sm text-muted-foreground">Your current access level in the system</p>
                  </div>
                  <Badge>Administrator</Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">System Permissions</h4>
                  {[
                    { name: "Inventory Management", description: "Add, edit, and delete inventory items", enabled: true },
                    { name: "Work Order Creation", description: "Create and modify work orders", enabled: true },
                    { name: "Financial Data Access", description: "View accounting and financial reports", enabled: true },
                    { name: "User Management", description: "Manage staff and user accounts", enabled: false },
                  ].map((permission) => (
                    <div key={permission.name} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{permission.name}</Label>
                        <p className="text-sm text-muted-foreground">{permission.description}</p>
                      </div>
                      <Switch checked={permission.enabled} disabled />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance & Theme
              </CardTitle>
              <CardDescription>Customize the look and feel of your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
                  </div>
                  <Switch 
                    checked={preferences.dark_mode} 
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, dark_mode: checked }))} 
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Theme Color</Label>
                  <Select value={preferences.theme_color} onValueChange={(value) => setPreferences(prev => ({ ...prev, theme_color: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select value={preferences.font_size} onValueChange={(value) => setPreferences(prev => ({ ...prev, font_size: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSavePreferences} className="px-8">
                  Save Appearance Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Control how and when you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications in the browser</p>
                  </div>
                  <Switch 
                    checked={preferences.push_notifications} 
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, push_notifications: checked }))} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch 
                    checked={preferences.email_notifications} 
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, email_notifications: checked }))} 
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Notification Types</h4>
                  {[
                    { name: "Work Order Updates", key: "work_order_notifications", description: "When work orders are created or modified" },
                    { name: "Inventory Alerts", key: "inventory_notifications", description: "Low stock and inventory updates" },
                    { name: "System Maintenance", key: "system_notifications", description: "Scheduled maintenance and downtime" },
                    { name: "Account Security", key: "security_notifications", description: "Login attempts and security alerts" },
                  ].map((notif) => (
                    <div key={notif.name} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{notif.name}</Label>
                        <p className="text-sm text-muted-foreground">{notif.description}</p>
                      </div>
                      <Switch 
                        checked={preferences[notif.key as keyof typeof preferences] as boolean} 
                        onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, [notif.key]: checked }))} 
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSavePreferences} className="px-8">
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>Configure system-wide preferences and regional settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={preferences.language} onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={preferences.timezone} onValueChange={(value) => setPreferences(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc-8">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="utc-6">Central Time (UTC-6)</SelectItem>
                      <SelectItem value="utc-5">Eastern Time (UTC-5)</SelectItem>
                      <SelectItem value="utc+0">Greenwich Mean Time (UTC+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={preferences.date_format} onValueChange={(value) => setPreferences(prev => ({ ...prev, date_format: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Themes</h4>
                  <div className="space-y-2">
                    <Label>Application Theme</Label>
                    <Select 
                      value={preferences.theme_color} 
                      onValueChange={(value) => {
                        setPreferences(prev => ({ ...prev, theme_color: value }));
                        // Apply theme immediately
                        document.documentElement.setAttribute('data-theme', value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blue">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                            Ocean Blue
                          </div>
                        </SelectItem>
                        <SelectItem value="green">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            Forest Green
                          </div>
                        </SelectItem>
                        <SelectItem value="purple">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                            Royal Purple
                          </div>
                        </SelectItem>
                        <SelectItem value="orange">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                            Sunset Orange
                          </div>
                        </SelectItem>
                        <SelectItem value="rose">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-rose-500"></div>
                            Rose Pink
                          </div>
                        </SelectItem>
                        <SelectItem value="slate">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-slate-500"></div>
                            Slate Gray
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">Choose your preferred color theme for the application</p>
                  </div>
                </div>
                
                <Separator />

                <div className="flex justify-end">
                  <Button onClick={handleSavePreferences} className="px-8">
                    Save System Settings
                  </Button>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Data & Privacy</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Export Data
                    </Button>
                    <p className="text-xs text-muted-foreground">Download a copy of your account data</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Button variant="destructive" className="w-full justify-start">
                      Delete Account
                    </Button>
                    <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}