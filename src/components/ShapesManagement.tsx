import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Search, Settings, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StandardizedProfilesManagement } from "./StandardizedProfilesManagement";
import { validateImageFile, resizeImageFile } from "@/lib/imageUtils";

interface Shape {
  id: string;
  name: string;
  calculation_type: 'simple_formula' | 'profile_table';
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function ShapesManagement() {
  const { toast } = useToast();
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingShape, setEditingShape] = useState<Shape | null>(null);
  const [selectedShapeForProfiles, setSelectedShapeForProfiles] = useState<Shape | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    calculation_type: "simple_formula" as 'simple_formula' | 'profile_table',
    description: "",
    image_url: "" as string | null
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fetchShapes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shapes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setShapes(data || []);
    } catch (error: any) {
      console.error('Error fetching shapes:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load shapes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShapes();
  }, []);

  const filteredShapes = shapes.filter(shape => {
    const searchLower = searchTerm.toLowerCase();
    return (
      shape.name.toLowerCase().includes(searchLower) ||
      shape.calculation_type.toLowerCase().includes(searchLower) ||
      (shape.description && shape.description.toLowerCase().includes(searchLower))
    );
  });

  const handleAddShape = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Shape name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      // Upload image if a new file was selected
      let imageUrl = formData.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadShapeImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          // User can still save without image if upload fails
          console.warn('Image upload failed, but continuing with shape creation');
        }
      }

      const { error } = await supabase
        .from('shapes')
        .insert([{
          name: formData.name.trim(),
          calculation_type: formData.calculation_type,
          description: formData.description.trim() || null,
          image_url: imageUrl || null
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shape added successfully",
      });

      setFormData({ name: "", calculation_type: "simple_formula", description: "", image_url: null });
      setImageFile(null);
      setImagePreview(null);
      setIsAddFormOpen(false);
      await fetchShapes();
    } catch (error: any) {
      console.error('Error adding shape:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add shape",
        variant: "destructive"
      });
    }
  };

  const handleUpdateShape = async () => {
    if (!editingShape) return;

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Shape name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      // Upload image if a new file was selected
      let imageUrl = formData.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadShapeImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          // Keep existing image if upload fails
          console.warn('Image upload failed, keeping existing image');
        }
      }

      const { error } = await supabase
        .from('shapes')
        .update({
          name: formData.name.trim(),
          calculation_type: formData.calculation_type,
          description: formData.description.trim() || null,
          image_url: imageUrl || null
        })
        .eq('id', editingShape.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shape updated successfully",
      });

      setEditingShape(null);
      setFormData({ name: "", calculation_type: "simple_formula", description: "", image_url: null });
      setImageFile(null);
      setImagePreview(null);
      setIsAddFormOpen(false);
      await fetchShapes();
    } catch (error: any) {
      console.error('Error updating shape:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update shape",
        variant: "destructive"
      });
    }
  };

  const handleDeleteShape = async (shapeId: string, shapeName: string) => {
    try {
      const { error } = await supabase
        .from('shapes')
        .delete()
        .eq('id', shapeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Shape "${shapeName}" deleted successfully`,
      });

      await fetchShapes();
    } catch (error: any) {
      console.error('Error deleting shape:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete shape",
        variant: "destructive"
      });
    }
  };

  const handleOpenEditForm = (shape: Shape) => {
    setEditingShape(shape);
    setFormData({
      name: shape.name,
      calculation_type: shape.calculation_type,
      description: shape.description || "",
      image_url: shape.image_url || null
    });
    setImageFile(null);
    setImagePreview(shape.image_url || null);
    setIsAddFormOpen(true);
  };

  const handleCancelForm = () => {
    setEditingShape(null);
    setFormData({ name: "", calculation_type: "simple_formula", description: "", image_url: null });
    setImageFile(null);
    setImagePreview(null);
    setIsAddFormOpen(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!validateImageFile(file)) {
      toast({
        title: "Invalid File",
        description: "Please select a valid image file (.jpg, .jpeg, or .png)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setImageFile(file);
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: null });
  };

  const uploadShapeImage = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      // Resize image to max 800x600 while maintaining aspect ratio
      const resizedFile = await resizeImageFile(file, 800, 600, 0.85);
      
      const fileExt = resizedFile.name.split('.').pop();
      const fileName = `shape-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('shape-images')
        .upload(filePath, resizedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        toast({
          title: "Upload Failed",
          description: "Failed to upload image. Please try again.",
          variant: "destructive"
        });
        return null;
      }

      const { data } = supabase.storage.from('shape-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Failed",
        description: "An error occurred while uploading the image.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const getCalculationTypeDescription = (type: string) => {
    switch (type) {
      case 'simple_formula':
        return 'Weight calculated using geometric formulas + density';
      case 'profile_table':
        return 'Weight calculated using kg/m from standardized profiles';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Add Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search shapes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsAddFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Shape
        </Button>
      </div>

      {/* Add/Edit Form */}
      {isAddFormOpen && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <h3 className="font-semibold mb-4">
            {editingShape ? "Edit Shape" : "Add New Shape"}
          </h3>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="shape_name">Shape Name *</Label>
                <Input
                  id="shape_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Round bar, Angle, UPN"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="calculation_type">Calculation Type *</Label>
                <Select
                  value={formData.calculation_type}
                  onValueChange={(value: 'simple_formula' | 'profile_table') => 
                    setFormData({ ...formData, calculation_type: value })
                  }
                >
                  <SelectTrigger id="calculation_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple_formula">Simple Formula</SelectItem>
                    <SelectItem value="profile_table">Profile Table</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Circular cross-section bar"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shape_image">Shape Image</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Shape preview"
                      className="w-40 h-30 object-contain border rounded border-input bg-muted"
                      style={{ width: '160px', height: '120px' }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-40 h-30 border-2 border-dashed border-muted-foreground/25 rounded flex items-center justify-center bg-muted/50" style={{ width: '160px', height: '120px' }}>
                    <span className="text-xs text-muted-foreground text-center px-2">No image</span>
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="shape_image"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleImageSelect}
                    disabled={isUploadingImage}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepted formats: JPG, JPEG, PNG (max 5MB)
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelForm} disabled={isUploadingImage}>
                Cancel
              </Button>
              <Button onClick={editingShape ? handleUpdateShape : handleAddShape} disabled={isUploadingImage}>
                {isUploadingImage ? "Uploading..." : editingShape ? "Update" : "Add"} Shape
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Shapes Table */}
      {loading ? (
        <div className="text-center py-8">Loading shapes...</div>
      ) : filteredShapes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? "No shapes found matching your search." : "No shapes found. Add your first shape to get started."}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Calculation Type</TableHead>
                <TableHead>How Weight is Calculated</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShapes.map((shape) => (
                <TableRow key={shape.id}>
                  <TableCell>
                    {shape.image_url ? (
                      <img
                        src={shape.image_url}
                        alt={shape.name}
                        className="w-40 h-30 object-contain border rounded bg-muted"
                        style={{ width: '160px', height: '120px' }}
                      />
                    ) : (
                      <div className="w-40 h-30 border border-dashed border-muted-foreground/25 rounded flex items-center justify-center bg-muted/50 text-xs text-muted-foreground" style={{ width: '160px', height: '120px' }}>
                        No image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{shape.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      shape.calculation_type === 'simple_formula' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {shape.calculation_type === 'simple_formula' ? 'Simple Formula' : 'Profile Table'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getCalculationTypeDescription(shape.calculation_type)}
                  </TableCell>
                  <TableCell>{shape.description || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {shape.calculation_type === 'profile_table' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedShapeForProfiles(shape)}
                          title="Manage Profiles"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEditForm(shape)}
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
                            <AlertDialogTitle>Delete Shape</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{shape.name}"? This will also delete all associated profiles. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteShape(shape.id, shape.name)}
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

      {/* Profiles Management Dialog */}
      {selectedShapeForProfiles && (
        <Dialog open={!!selectedShapeForProfiles} onOpenChange={(open) => !open && setSelectedShapeForProfiles(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Profiles: {selectedShapeForProfiles.name}</DialogTitle>
            </DialogHeader>
            <StandardizedProfilesManagement 
              shapeId={selectedShapeForProfiles.id}
              shapeName={selectedShapeForProfiles.name}
              onClose={() => setSelectedShapeForProfiles(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}



