import { useState } from "react";
import { Plus, ChevronRight, ChevronDown, Upload, Trash2, Edit2, Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ToolCategory {
  id: string;
  title: string;
  picture?: string;
  children: ToolCategory[];
  expanded?: boolean;
}

interface ToolManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToolManagementDialog({ open, onOpenChange }: ToolManagementDialogProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ToolCategory[]>([
    {
      id: "1",
      title: "Cutting Tools",
      children: [
        {
          id: "1-1",
          title: "End Mills",
          children: [
            { id: "1-1-1", title: "Flat End Mills", children: [] },
            { id: "1-1-2", title: "Ball End Mills", children: [] }
          ]
        },
        { id: "1-2", title: "Drills", children: [] }
      ]
    },
    {
      id: "2", 
      title: "Measuring Tools",
      children: []
    }
  ]);
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");

  const addCategory = (parentId?: string) => {
    if (!newCategoryTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category title",
        variant: "destructive"
      });
      return;
    }

    const newCategory: ToolCategory = {
      id: Date.now().toString(),
      title: newCategoryTitle,
      children: []
    };

    if (parentId) {
      const addToParent = (items: ToolCategory[]): ToolCategory[] => {
        return items.map(item => {
          if (item.id === parentId) {
            return { ...item, children: [...item.children, newCategory] };
          }
          return { ...item, children: addToParent(item.children) };
        });
      };
      setCategories(addToParent(categories));
    } else {
      setCategories([...categories, newCategory]);
    }

    setNewCategoryTitle("");
    setEditingCategory(null);
    
    toast({
      title: "Success",
      description: "Category added successfully"
    });
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

  const deleteCategory = (categoryId: string) => {
    const removeCategory = (items: ToolCategory[]): ToolCategory[] => {
      return items.filter(item => item.id !== categoryId).map(item => ({
        ...item,
        children: removeCategory(item.children)
      }));
    };
    setCategories(removeCategory(categories));
    
    toast({
      title: "Success",
      description: "Category deleted successfully"
    });
  };

  const handleImageUpload = (categoryId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const updateImage = (items: ToolCategory[]): ToolCategory[] => {
          return items.map(item => {
            if (item.id === categoryId) {
              return { ...item, picture: e.target?.result as string };
            }
            return { ...item, children: updateImage(item.children) };
          });
        };
        setCategories(updateImage(categories));
      };
      reader.readAsDataURL(file);
    }
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