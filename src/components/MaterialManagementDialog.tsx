import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShapesManagement } from "./ShapesManagement";
import { NumericInput } from "./NumericInput";

interface Material {
  id: string;
  grade: string;
  material_type: string;
  material_number: string | null;
  description: string | null;
  density: number | null;
  created_at: string;
  updated_at: string;
}

interface MaterialManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialManagementDialog({
  open,
  onOpenChange
}: MaterialManagementDialogProps) {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    grade: "",
    material_type: "",
    material_number: "",
    description: "",
    density: ""
  });

  // Fetch materials from database
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      console.log('Fetching materials from database...');
      
      const { data, error } = await supabase
        .from('materials_library')
        .select('*')
        .order('material_type', { ascending: true })
        .order('grade', { ascending: true });

      if (error) {
        console.error('Error fetching materials:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} materials from database:`, data);
      setMaterials(data || []);
      
      if (data && data.length > 0) {
        console.log('Materials loaded successfully');
      } else {
        console.warn('No materials found in database');
      }
    } catch (error: any) {
      console.error('Error fetching materials:', error);
      const errorMessage = error?.message || "Failed to load materials";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMaterials();
    }
  }, [open]);

  // Filter materials based on search term
  const filteredMaterials = materials.filter(material => {
    const searchLower = searchTerm.toLowerCase();
    return (
      material.grade.toLowerCase().includes(searchLower) ||
      material.material_type.toLowerCase().includes(searchLower) ||
      (material.material_number && material.material_number.toLowerCase().includes(searchLower)) ||
      (material.description && material.description.toLowerCase().includes(searchLower))
    );
  });

  // Get unique material types for the select dropdown
  const materialTypes = Array.from(new Set(materials.map(m => m.material_type))).sort();

  const handleAddMaterial = async () => {
    // Validation
    if (!formData.grade.trim()) {
      toast({
        title: "Validation Error",
        description: "Material grade is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.material_type.trim()) {
      toast({
        title: "Validation Error",
        description: "Material type is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const insertData: any = {
        grade: formData.grade.trim(),
        material_type: formData.material_type.trim(),
        material_number: formData.material_number.trim() || null,
        description: formData.description.trim() || null,
        density: formData.density ? parseFloat(formData.density) : null
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/75cf3fad-9e2e-4472-b4c3-e606cf8f2f9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MaterialManagementDialog.tsx:134',message:'handleAddMaterial - entry',data:{insertData,formData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      console.log('Attempting to insert material:', insertData);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/75cf3fad-9e2e-4472-b4c3-e606cf8f2f9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MaterialManagementDialog.tsx:138',message:'Before supabase insert',data:{insertData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // #region agent log
      const authSession = await supabase.auth.getSession();
      fetch('http://127.0.0.1:7242/ingest/75cf3fad-9e2e-4472-b4c3-e606cf8f2f9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MaterialManagementDialog.tsx:140',message:'Supabase auth session check',data:{hasSession:!!authSession.data.session,userId:authSession.data.session?.user?.id,role:authSession.data.session?.user?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const { data, error } = await supabase
        .from('materials_library')
        .insert([insertData])
        .select();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/75cf3fad-9e2e-4472-b4c3-e606cf8f2f9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MaterialManagementDialog.tsx:145',message:'After supabase insert',data:{hasData:!!data,dataLength:data?.length,hasError:!!error,errorMessage:error?.message,errorCode:error?.code,errorDetails:error?.details,errorHint:error?.hint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Show detailed error in toast
        const errorDetails = [
          error.message,
          error.details && `Details: ${error.details}`,
          error.hint && `Hint: ${error.hint}`,
          error.code && `Code: ${error.code}`
        ].filter(Boolean).join('\n');
        
        toast({
          title: "Database Error",
          description: errorDetails,
          variant: "destructive",
          duration: 10000
        });
        throw error;
      }

      console.log('Material inserted successfully:', data);
      
      if (!data || data.length === 0) {
        console.warn('Insert succeeded but no data returned');
        toast({
          title: "Warning",
          description: "Material may have been added but not returned. Please refresh.",
          variant: "default"
        });
      }

      toast({
        title: "Success",
        description: "Material added successfully",
      });

      // Reset form
      setFormData({
        grade: "",
        material_type: "",
        material_number: "",
        description: "",
        density: ""
      });
      setIsAddFormOpen(false);
      
      // Refresh list
      await fetchMaterials();
    } catch (error: any) {
      console.error('Error adding material:', error);
      const errorMessage = error?.message || error?.details || error?.hint || "Failed to add material. Please check the console for details.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDeleteMaterial = async (materialId: string, grade: string) => {
    try {
      const { error } = await supabase
        .from('materials_library')
        .delete()
        .eq('id', materialId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Material "${grade}" deleted successfully`,
      });

      // Refresh list
      await fetchMaterials();
    } catch (error: any) {
      console.error('Error deleting material:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete material",
        variant: "destructive"
      });
    }
  };

  const handleOpenEditForm = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      grade: material.grade,
      material_type: material.material_type,
      material_number: material.material_number || "",
      description: material.description || "",
      density: material.density?.toString() || ""
    });
    setIsAddFormOpen(true);
  };

  const handleUpdateMaterial = async () => {
    if (!editingMaterial) return;

    // Validation
    if (!formData.grade.trim()) {
      toast({
        title: "Validation Error",
        description: "Material grade is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.material_type.trim()) {
      toast({
        title: "Validation Error",
        description: "Material type is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const updateData: any = {
        grade: formData.grade.trim(),
        material_type: formData.material_type.trim(),
        material_number: formData.material_number.trim() || null,
        description: formData.description.trim() || null,
        density: formData.density ? parseFloat(formData.density) : null
      };

      const { error } = await supabase
        .from('materials_library')
        .update(updateData)
        .eq('id', editingMaterial.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Material updated successfully",
      });

      // Reset form
      setEditingMaterial(null);
      setFormData({
        grade: "",
        material_type: "",
        material_number: "",
        description: "",
        density: ""
      });
      setIsAddFormOpen(false);
      
      // Refresh list
      await fetchMaterials();
    } catch (error: any) {
      console.error('Error updating material:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update material",
        variant: "destructive"
      });
    }
  };

  const handleCancelForm = () => {
    setEditingMaterial(null);
    setFormData({
      grade: "",
      material_type: "",
      material_number: "",
      description: "",
      density: ""
    });
    setIsAddFormOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Material Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="grades" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grades">Material Grades</TabsTrigger>
            <TabsTrigger value="shapes">Shapes Management</TabsTrigger>
          </TabsList>

          <TabsContent value="grades" className="space-y-4">
        <div className="space-y-4">
          {/* Search and Add Button */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={fetchMaterials}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button onClick={() => setIsAddFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Material
              </Button>
            </div>
          </div>

          {/* Add/Edit Form */}
          {isAddFormOpen && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold mb-4">
                {editingMaterial ? "Edit Material" : "Add New Material"}
              </h3>
              <div className="grid gap-4">
                {/* First line: Material Type and Custom Input */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="material_type">Material Type *</Label>
                    <Select
                      value={formData.material_type && materialTypes.includes(formData.material_type) ? formData.material_type : "custom"}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setFormData({ ...formData, material_type: "" });
                        } else {
                          setFormData({ ...formData, material_type: value });
                        }
                      }}
                    >
                      <SelectTrigger id="material_type">
                        <SelectValue placeholder="Select or enter type" />
                      </SelectTrigger>
                      <SelectContent>
                        {materialTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Add Custom Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    {(formData.material_type === "" || !materialTypes.includes(formData.material_type)) && (
                      <>
                        <Label htmlFor="custom_material_type">Enter Material Type *</Label>
                        <Input
                          id="custom_material_type"
                          value={formData.material_type}
                          onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                          placeholder="Enter material type (e.g., Steel, Aluminum, Brass)"
                        />
                      </>
                    )}
                  </div>
                </div>
                {/* Second line: Material Grade and Material Number */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="grade">Material Grade *</Label>
                    <Input
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="e.g., C45, 1.4301, AlMg3"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="material_number">Material Number</Label>
                    <Input
                      id="material_number"
                      value={formData.material_number}
                      onChange={(e) => setFormData({ ...formData, material_number: e.target.value })}
                      placeholder="e.g., 1.0503, 1.4301"
                    />
                  </div>
                </div>
                {/* Third line: Density and Description */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="density">Density (g/cm³)</Label>
                    <NumericInput
                      id="density"
                      value={formData.density ? parseFloat(formData.density) : 0}
                      onChange={(val) => setFormData({ ...formData, density: val.toString() })}
                      min={0}
                      step={0.01}
                      placeholder="e.g., 7.85"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Carbon steel - unalloyed"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelForm}>
                    Cancel
                  </Button>
                  <Button onClick={editingMaterial ? handleUpdateMaterial : handleAddMaterial}>
                    {editingMaterial ? "Update" : "Add"} Material
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Materials Table */}
          {loading ? (
            <div className="text-center py-8">Loading materials...</div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No materials found matching your search." : "No materials found. Add your first material to get started."}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material Grade</TableHead>
                    <TableHead>Material Type</TableHead>
                    <TableHead>Material Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Density</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.grade}</TableCell>
                      <TableCell>{material.material_type}</TableCell>
                      <TableCell>{material.material_number || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate" title={material.description || undefined}>
                        {material.description || "-"}
                      </TableCell>
                      <TableCell>{material.density ? `${material.density} g/cm³` : "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEditForm(material)}
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
                                <AlertDialogTitle>Delete Material</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{material.grade}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteMaterial(material.id, material.grade)}
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
          </TabsContent>

          <TabsContent value="shapes">
            <ShapesManagement />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

