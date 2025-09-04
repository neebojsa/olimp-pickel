import { useState, useEffect } from "react";
import { Plus, ChevronRight, ChevronDown, Upload, Trash2, Edit2, Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ToolSpecField {
  id: string;
  title: string;
  description?: string;
}

interface ToolCategory {
  id: string;
  title: string;
  picture?: string;
  children: ToolCategory[];
  expanded?: boolean;
  specFields?: ToolSpecField[];
}

interface ToolManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToolManagementDialog({ open, onOpenChange }: ToolManagementDialogProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [editingSpecFields, setEditingSpecFields] = useState<string | null>(null);
  const [newFieldTitle, setNewFieldTitle] = useState("");

  // Fetch categories from database
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data: dbCategories, error } = await supabase
        .from('tool_category_hierarchy')
        .select('*')
        .order('title');

      if (error) throw error;

      const { data: specFields, error: fieldsError } = await supabase
        .from('tool_spec_fields')
        .select('*');

      if (fieldsError) throw fieldsError;

      // Build hierarchical structure
      const categoryMap = new Map<string, ToolCategory>();
      const rootCategories: ToolCategory[] = [];

      // First pass: create all categories
      dbCategories?.forEach(cat => {
        const category: ToolCategory = {
          id: cat.id,
          title: cat.title,
          picture: cat.picture_url || undefined,
          children: [],
          specFields: specFields?.filter(field => field.category_id === cat.id)
            .map(field => ({
              id: field.id,
              title: field.title,
              description: field.description || undefined
            })) || []
        };
        categoryMap.set(cat.id, category);
      });

      // Second pass: build hierarchy
      dbCategories?.forEach(cat => {
        const category = categoryMap.get(cat.id);
        if (!category) return;

        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id);
          if (parent) {
            parent.children.push(category);
          }
        } else {
          rootCategories.push(category);
        }
      });

      setCategories(rootCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load categories when dialog opens
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const addCategory = async (parentId?: string) => {
    if (!newCategoryTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category title",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('tool_category_hierarchy')
        .insert([{
          title: newCategoryTitle,
          parent_id: parentId || null
        }]);

      if (error) throw error;

      setNewCategoryTitle("");
      setEditingCategory(null);
      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Category added successfully"
      });
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('tool_category_hierarchy')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (categoryId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      // Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${categoryId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(`tool-categories/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(`tool-categories/${fileName}`);

      // Update category with image URL
      const { error: updateError } = await supabase
        .from('tool_category_hierarchy')
        .update({ picture_url: publicUrl })
        .eq('id', categoryId);

      if (updateError) throw updateError;

      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addSpecField = async (categoryId: string) => {
    if (!newFieldTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a field title",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('tool_spec_fields')
        .insert([{
          category_id: categoryId,
          title: newFieldTitle
        }]);

      if (error) throw error;

      setNewFieldTitle("");
      setEditingSpecFields(null);
      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Specification field added successfully"
      });
    } catch (error) {
      console.error('Error adding spec field:', error);
      toast({
        title: "Error",
        description: "Failed to add specification field",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSpecField = async (fieldId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('tool_spec_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Specification field deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting spec field:', error);
      toast({
        title: "Error",
        description: "Failed to delete specification field",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (categoryId: string) => {
    const updateExpanded = (items: ToolCategory[]): ToolCategory[] => {
      return items.map(item => {
        if (item.id === categoryId) {
          return { ...item, expanded: !item.expanded };
        }
        return { ...item, children: updateExpanded(item.children) };
      });
    };
    setCategories(updateExpanded(categories));
  };

  const renderCategory = (category: ToolCategory, level: number = 0) => {
    const hasChildren = category.children.length > 0;
    const isExpanded = category.expanded;

    return (
      <div key={category.id} className="w-full">
        <Card className="mb-2">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2" style={{ marginLeft: `${level * 20}px` }}>
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(category.id)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {!hasChildren && <div className="w-6" />}
                
                {hasChildren ? (
                  isExpanded ? (
                    <FolderOpen className="h-4 w-4 text-primary" />
                  ) : (
                    <Folder className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <div className="w-4 h-4 rounded bg-muted" />
                )}
                
                <div className="flex items-center gap-3">
                  {category.picture && (
                    <img 
                      src={category.picture} 
                      alt={category.title}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <span className="font-medium">{category.title}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(category.id, e)}
                  className="hidden"
                  id={`image-${category.id}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => document.getElementById(`image-${category.id}`)?.click()}
                  className="h-8 w-8 p-0"
                >
                  <Upload className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCategory(category.id)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCategory(category.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {editingCategory === category.id && (
              <div className="mt-3 flex gap-2" style={{ marginLeft: `${(level + 1) * 20}px` }}>
                <Input
                  placeholder="New subcategory title"
                  value={newCategoryTitle}
                  onChange={(e) => setNewCategoryTitle(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => addCategory(category.id)}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingCategory(null);
                    setNewCategoryTitle("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Specification Fields for Leaf Categories */}
            {!hasChildren && (
              <div className="mt-3" style={{ marginLeft: `${(level + 1) * 20}px` }}>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Specification Fields</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSpecFields(category.id)}
                    className="h-7"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Field
                  </Button>
                </div>

                {/* Existing Fields */}
                {category.specFields && category.specFields.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {category.specFields.map(field => (
                      <div key={field.id} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                        <span className="text-sm">{field.title}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSpecField(field.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Field Form */}
                {editingSpecFields === category.id && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Field title (e.g., Length, Diameter)"
                      value={newFieldTitle}
                      onChange={(e) => setNewFieldTitle(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => addSpecField(category.id)}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSpecFields(null);
                        setNewFieldTitle("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {category.children.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Tool Management System</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          <div className="mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="New root category title"
                value={editingCategory === null ? newCategoryTitle : ""}
                onChange={(e) => setNewCategoryTitle(e.target.value)}
                disabled={editingCategory !== null}
              />
              <Button
                onClick={() => addCategory()}
                disabled={editingCategory !== null}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Root Category
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {categories.map(category => renderCategory(category))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}