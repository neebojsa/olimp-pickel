import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatSpecificationValue } from "@/lib/toolSpecUtils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Folder, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ToolSpecField {
  id: string;
  title: string;
  description?: string;
}

interface ToolCategory {
  id: string;
  title: string;
  picture_url?: string;
  children: ToolCategory[];
  specFields?: ToolSpecField[];
}

interface ToolCategorySelectorProps {
  onSelectionChange: (selection: {
    categoryPath: string[];
    categoryId: string;
    categoryTitle: string;
    specFields: { [key: string]: string };
  }) => void;
  initialSelection?: {
    categoryPath: string[];
    categoryId: string;
    categoryTitle: string;
    specFields: { [key: string]: string };
  };
}

export function ToolCategorySelector({ onSelectionChange, initialSelection }: ToolCategorySelectorProps) {
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [currentPath, setCurrentPath] = useState<ToolCategory[]>([]);
  const [specFieldValues, setSpecFieldValues] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (initialSelection && categories.length > 0) {
      setSpecFieldValues(initialSelection.specFields);
      
      // Restore the navigation path based on initialSelection
      const restorePath = () => {
        const { categoryPath } = initialSelection;
        const path: ToolCategory[] = [];
        let currentCategories = categories;
        
        // Navigate through each level of the category path
        for (const categoryTitle of categoryPath) {
          const foundCategory = currentCategories.find(cat => cat.title === categoryTitle);
          if (foundCategory) {
            path.push(foundCategory);
            currentCategories = foundCategory.children;
          } else {
            console.warn(`Category "${categoryTitle}" not found in path`);
            break;
          }
        }
        
        setCurrentPath(path);
      };
      
      restorePath();
    }
  }, [initialSelection, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data: categoryData, error: categoryError } = await supabase
        .from('tool_category_hierarchy')
        .select('*')
        .order('title', { ascending: true });

      if (categoryError) throw categoryError;

      const { data: specFieldData, error: specError } = await supabase
        .from('tool_spec_fields')
        .select('*');

      if (specError) throw specError;

      // Build hierarchical structure
      const categoryMap = new Map<string, ToolCategory>();
      
      // Initialize all categories
      categoryData?.forEach(cat => {
        categoryMap.set(cat.id, {
          id: cat.id,
          title: cat.title,
          picture_url: cat.picture_url,
          children: [],
          specFields: []
        });
      });

      // Build parent-child relationships
      const rootCategories: ToolCategory[] = [];
      categoryData?.forEach(cat => {
        const category = categoryMap.get(cat.id)!;
        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id);
          if (parent) {
            parent.children.push(category);
          }
        } else {
          rootCategories.push(category);
        }
      });

      // Add spec fields to leaf categories
      specFieldData?.forEach(field => {
        const category = categoryMap.get(field.category_id);
        if (category) {
          category.specFields?.push({
            id: field.id,
            title: field.title,
            description: field.description
          });
        }
      });

      setCategories(rootCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: ToolCategory) => {
    const newPath = [...currentPath, category];
    setCurrentPath(newPath);

    // If this is a leaf category (has spec fields), notify parent
    if (category.specFields && category.specFields.length > 0) {
      const pathTitles = newPath.map(c => c.title);
      onSelectionChange({
        categoryPath: pathTitles,
        categoryId: category.id,
        categoryTitle: category.title,
        specFields: specFieldValues
      });
    }
  };

  const handleBack = () => {
    setCurrentPath(prev => prev.slice(0, -1));
  };

  const handleSpecFieldChange = (fieldId: string, value: string) => {
    const newValues = { ...specFieldValues, [fieldId]: value };
    setSpecFieldValues(newValues);

    // Update parent with new values
    if (currentPath.length > 0) {
      const currentCategory = currentPath[currentPath.length - 1];
      const pathTitles = currentPath.map(c => c.title);
      onSelectionChange({
        categoryPath: pathTitles,
        categoryId: currentCategory.id,
        categoryTitle: currentCategory.title,
        specFields: newValues
      });
    }
  };

  const getCurrentCategories = (): ToolCategory[] => {
    if (currentPath.length === 0) return categories;
    return currentPath[currentPath.length - 1].children;
  };

  const isLeafCategory = (category: ToolCategory): boolean => {
    return category.children.length === 0 && category.specFields && category.specFields.length > 0;
  };

  const currentCategory = currentPath[currentPath.length - 1];
  const showSpecFields = currentCategory && isLeafCategory(currentCategory);

  if (loading) {
    return <div className="p-4 text-center">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Tool Category *</Label>
      
      {/* Breadcrumb */}
      {currentPath.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm text-muted-foreground">
            {currentPath.map(cat => cat.title).join(" > ")}
          </div>
        </div>
      )}

      {/* Category Grid */}
      {!showSpecFields && (
        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
          {getCurrentCategories().map((category) => (
            <Card 
              key={category.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleCategoryClick(category)}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center space-y-2">
                  {category.picture_url ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={category.picture_url} 
                        alt={category.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      {category.children.length > 0 ? (
                        <Folder className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <FolderOpen className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <span className="text-xs font-medium text-center leading-tight">
                    {category.title}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Specification Fields */}
      {showSpecFields && currentCategory && (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
          <div className="font-medium text-sm">
            Specifications for: {currentCategory.title}
          </div>
          
          {currentCategory.specFields?.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={`spec-${field.id}`} className="text-sm">
                {field.title}
              </Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
              <Input
                id={`spec-${field.id}`}
                value={specFieldValues[field.id] || ""}
                onChange={(e) => handleSpecFieldChange(field.id, e.target.value)}
                placeholder={`Enter ${field.title.toLowerCase()}`}
                className="text-sm"
              />
              {/* Show formatted preview */}
              {specFieldValues[field.id] && (
                <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                  Preview: {formatSpecificationValue(field.title, specFieldValues[field.id])}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Show selection summary */}
      {currentPath.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          Selected: {currentPath.map(c => c.title).join(" → ")}
        </div>
      )}
    </div>
  );
}