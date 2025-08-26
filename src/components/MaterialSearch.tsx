import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

interface MaterialSearchProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

interface Material {
  id: string;
  grade: string;
  material_type: string;
  material_number?: string;
  description?: string;
  density?: number;
}

export function MaterialSearch({ value, onValueChange, placeholder = "Search materials..." }: MaterialSearchProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState<Material[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Search materials from library
  const searchMaterials = async (term: string) => {
    if (!term || term.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials_library')
        .select('*')
        .or(
          `grade.ilike.%${term}%,material_number.ilike.%${term}%,description.ilike.%${term}%`
        )
        .limit(10);

      if (error) {
        console.error('Error searching materials:', error);
        return;
      }

      setSuggestions(data || []);
    } catch (error) {
      console.error('Error searching materials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchMaterials(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update search term when value prop changes
  useEffect(() => {
    setSearchTerm(value);
    // Find selected material if value matches a grade
    if (value) {
      supabase
        .from('materials_library')
        .select('*')
        .eq('grade', value)
        .maybeSingle()
        .then(({ data }) => {
          setSelectedMaterial(data);
        });
    } else {
      setSelectedMaterial(null);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setShowSuggestions(true);
    
    // If user is typing, clear selection and update parent immediately
    if (newValue !== value) {
      setSelectedMaterial(null);
      onValueChange(newValue);
    }
  };

  const handleSuggestionClick = (material: Material) => {
    setSearchTerm(material.grade);
    setSelectedMaterial(material);
    setShowSuggestions(false);
    onValueChange(material.grade);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const toggleSuggestions = () => {
    setShowSuggestions(!showSuggestions);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className="pl-10 pr-10"
          />
          {suggestions.length > 0 && (
            <button
              type="button"
              onClick={toggleSuggestions}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSuggestions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <Card className="absolute z-10 mt-1 w-full max-h-60 overflow-auto">
            <CardContent className="p-2">
              {suggestions.map((material) => (
                <div
                  key={material.id}
                  onClick={() => handleSuggestionClick(material)}
                  className="cursor-pointer rounded-md p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{material.grade}</span>
                        <Badge variant="secondary" className="text-xs">
                          {material.material_type}
                        </Badge>
                        {material.material_number && (
                          <Badge variant="outline" className="text-xs">
                            {material.material_number}
                          </Badge>
                        )}
                      </div>
                      {material.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {material.description}
                        </p>
                      )}
                    </div>
                    {material.density && (
                      <div className="text-sm text-muted-foreground">
                        ρ = {material.density} g/cm³
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Selected Material Details */}
      {selectedMaterial && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold">Selected Material:</Label>
                <Badge className="bg-primary/10 text-primary">{selectedMaterial.grade}</Badge>
                <Badge variant="secondary">{selectedMaterial.material_type}</Badge>
                {selectedMaterial.material_number && (
                  <Badge variant="outline">{selectedMaterial.material_number}</Badge>
                )}
              </div>
              
              {selectedMaterial.description && (
                <div>
                  <Label className="text-sm font-medium">Description:</Label>
                  <p className="text-sm text-muted-foreground">{selectedMaterial.description}</p>
                </div>
              )}

              {selectedMaterial.density && (
                <div className="flex items-center gap-4 p-3 bg-accent/50 rounded-lg">
                  <div className="flex flex-col items-center">
                    <Label className="text-sm font-medium">Density</Label>
                    <div className="text-lg font-bold text-primary">
                      {selectedMaterial.density} g/cm³
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}