import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NumericInput } from "./NumericInput";

interface StandardizedProfile {
  id: string;
  shape_id: string;
  designation: string;
  kg_per_meter: number;
  dimensions: any; // JSONB
  cross_sectional_area: number | null;
  created_at: string;
  updated_at: string;
}

interface StandardizedProfilesManagementProps {
  shapeId: string;
  shapeName: string;
  onClose: () => void;
}

export function StandardizedProfilesManagement({ shapeId, shapeName, onClose }: StandardizedProfilesManagementProps) {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<StandardizedProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<StandardizedProfile | null>(null);
  const [formData, setFormData] = useState({
    designation: "",
    kg_per_meter: "",
    cross_sectional_area: "",
    dimensions_json: ""
  });

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('standardized_profiles')
        .select('*')
        .eq('shape_id', shapeId)
        .order('designation', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load profiles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [shapeId]);

  const filteredProfiles = profiles.filter(profile => {
    const searchLower = searchTerm.toLowerCase();
    return (
      profile.designation.toLowerCase().includes(searchLower) ||
      profile.kg_per_meter.toString().includes(searchLower)
    );
  });

  const handleAddProfile = async () => {
    if (!formData.designation.trim()) {
      toast({
        title: "Validation Error",
        description: "Designation is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.kg_per_meter || parseFloat(formData.kg_per_meter) <= 0) {
      toast({
        title: "Validation Error",
        description: "Weight per meter (kg/m) is required and must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    try {
      let dimensions = null;
      if (formData.dimensions_json.trim()) {
        try {
          dimensions = JSON.parse(formData.dimensions_json);
        } catch (e) {
          toast({
            title: "Validation Error",
            description: "Invalid JSON format for dimensions",
            variant: "destructive"
          });
          return;
        }
      }

      const { error } = await supabase
        .from('standardized_profiles')
        .insert([{
          shape_id: shapeId,
          designation: formData.designation.trim(),
          kg_per_meter: parseFloat(formData.kg_per_meter),
          cross_sectional_area: formData.cross_sectional_area ? parseFloat(formData.cross_sectional_area) : null,
          dimensions: dimensions
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile added successfully",
      });

      setFormData({ designation: "", kg_per_meter: "", cross_sectional_area: "", dimensions_json: "" });
      setIsAddFormOpen(false);
      await fetchProfiles();
    } catch (error: any) {
      console.error('Error adding profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add profile",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;

    if (!formData.designation.trim()) {
      toast({
        title: "Validation Error",
        description: "Designation is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.kg_per_meter || parseFloat(formData.kg_per_meter) <= 0) {
      toast({
        title: "Validation Error",
        description: "Weight per meter (kg/m) is required and must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    try {
      let dimensions = null;
      if (formData.dimensions_json.trim()) {
        try {
          dimensions = JSON.parse(formData.dimensions_json);
        } catch (e) {
          toast({
            title: "Validation Error",
            description: "Invalid JSON format for dimensions",
            variant: "destructive"
          });
          return;
        }
      }

      const { error } = await supabase
        .from('standardized_profiles')
        .update({
          designation: formData.designation.trim(),
          kg_per_meter: parseFloat(formData.kg_per_meter),
          cross_sectional_area: formData.cross_sectional_area ? parseFloat(formData.cross_sectional_area) : null,
          dimensions: dimensions
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setEditingProfile(null);
      setFormData({ designation: "", kg_per_meter: "", cross_sectional_area: "", dimensions_json: "" });
      setIsAddFormOpen(false);
      await fetchProfiles();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProfile = async (profileId: string, designation: string) => {
    try {
      const { error } = await supabase
        .from('standardized_profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Profile "${designation}" deleted successfully`,
      });

      await fetchProfiles();
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete profile",
        variant: "destructive"
      });
    }
  };

  const handleOpenEditForm = (profile: StandardizedProfile) => {
    setEditingProfile(profile);
    setFormData({
      designation: profile.designation,
      kg_per_meter: profile.kg_per_meter.toString(),
      cross_sectional_area: profile.cross_sectional_area?.toString() || "",
      dimensions_json: profile.dimensions ? JSON.stringify(profile.dimensions, null, 2) : ""
    });
    setIsAddFormOpen(true);
  };

  const handleCancelForm = () => {
    setEditingProfile(null);
    setFormData({ designation: "", kg_per_meter: "", cross_sectional_area: "", dimensions_json: "" });
    setIsAddFormOpen(false);
  };

  const formatDimensions = (dimensions: any) => {
    if (!dimensions) return "-";
    if (typeof dimensions === 'object') {
      return Object.entries(dimensions)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
    }
    return String(dimensions);
  };

  return (
    <div className="space-y-4">
      {/* Search and Add Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search profiles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsAddFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Profile
        </Button>
      </div>

      {/* Add/Edit Form */}
      {isAddFormOpen && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <h3 className="font-semibold mb-4">
            {editingProfile ? "Edit Profile" : "Add New Profile"}
          </h3>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="designation">Designation *</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g., UPN 100, L 50x50x5, HEA 200"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kg_per_meter">Weight (kg/m) *</Label>
                <NumericInput
                  id="kg_per_meter"
                  value={formData.kg_per_meter ? parseFloat(formData.kg_per_meter) : 0}
                  onChange={(val) => setFormData({ ...formData, kg_per_meter: val.toString() })}
                  min={0}
                  step={0.001}
                  placeholder="e.g., 10.6"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cross_sectional_area">Cross-Sectional Area (cm²)</Label>
                <NumericInput
                  id="cross_sectional_area"
                  value={formData.cross_sectional_area ? parseFloat(formData.cross_sectional_area) : 0}
                  onChange={(val) => setFormData({ ...formData, cross_sectional_area: val.toString() })}
                  min={0}
                  step={0.01}
                  placeholder="e.g., 13.5"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dimensions_json">Dimensions (JSON)</Label>
              <textarea
                id="dimensions_json"
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.dimensions_json}
                onChange={(e) => setFormData({ ...formData, dimensions_json: e.target.value })}
                placeholder='{"h": 100, "b": 50, "tw": 5.5, "tf": 8.5}'
              />
              <p className="text-xs text-muted-foreground">
                Enter dimensions as JSON object (e.g., {"{"}"h": 100, "b": 50{"}"})
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelForm}>
                Cancel
              </Button>
              <Button onClick={editingProfile ? handleUpdateProfile : handleAddProfile}>
                {editingProfile ? "Update" : "Add"} Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profiles Table */}
      {loading ? (
        <div className="text-center py-8">Loading profiles...</div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? "No profiles found matching your search." : "No profiles found. Add your first profile to get started."}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Designation</TableHead>
                <TableHead>Weight (kg/m)</TableHead>
                <TableHead>Cross-Sectional Area (cm²)</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.designation}</TableCell>
                  <TableCell>{profile.kg_per_meter.toFixed(3)}</TableCell>
                  <TableCell>{profile.cross_sectional_area ? profile.cross_sectional_area.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={formatDimensions(profile.dimensions)}>
                    {formatDimensions(profile.dimensions)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEditForm(profile)}
                      >
                        <Edit2 className="h-4 w-4" />
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
                            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{profile.designation}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProfile(profile.id, profile.designation)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
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
      )}
    </div>
  );
}



