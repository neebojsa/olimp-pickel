import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Search, Settings } from "lucide-react";
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

interface Shape {
  id: string;
  name: string;
  calculation_type: 'simple_formula' | 'profile_table';
  description: string | null;
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
    description: ""
  });

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
      const { error } = await supabase
        .from('shapes')
        .insert([{
          name: formData.name.trim(),
          calculation_type: formData.calculation_type,
          description: formData.description.trim() || null
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shape added successfully",
      });

      setFormData({ name: "", calculation_type: "simple_formula", description: "" });
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
      const { error } = await supabase
        .from('shapes')
        .update({
          name: formData.name.trim(),
          calculation_type: formData.calculation_type,
          description: formData.description.trim() || null
        })
        .eq('id', editingShape.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shape updated successfully",
      });

      setEditingShape(null);
      setFormData({ name: "", calculation_type: "simple_formula", description: "" });
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
      description: shape.description || ""
    });
    setIsAddFormOpen(true);
  };

  const handleCancelForm = () => {
    setEditingShape(null);
    setFormData({ name: "", calculation_type: "simple_formula", description: "" });
    setIsAddFormOpen(false);
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelForm}>
                Cancel
              </Button>
              <Button onClick={editingShape ? handleUpdateShape : handleAddShape}>
                {editingShape ? "Update" : "Add"} Shape
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



