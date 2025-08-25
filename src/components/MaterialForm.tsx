import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Circle, Square, Hexagon, Cylinder } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface MaterialFormProps {
  onMaterialChange: (materialData: MaterialData) => void;
  initialData?: Partial<MaterialData>;
}

interface MaterialLibraryItem {
  id: string;
  material_type: string;
  grade: string;
  material_number: string;
  density: number;
  description: string;
}

export interface MaterialData {
  surfaceFinish: string;
  shape: string;
  material: string;
  materialLibraryItem?: MaterialLibraryItem;
  dimensions: { [key: string]: string };
  generatedName: string;
  priceUnit: 'per_kg' | 'per_meter';
}

// Surface finish options
const surfaceFinishOptions = [
  'Cold Drawn',
  'Hot Rolled',
  'Polished',
  'Chromed',
  'Hardened+Chromed',
  'Anodized',
  'Galvanized',
  'Custom'
];

// Shape options
const shapeOptions = [
  'Round bar',
  'Rectangular bar',
  'Square bar',
  'Hex bar',
  'Round tube',
  'Rectangular tube',
  'Square tube',
  'Sheet',
  'Custom'
];

// Material types for filtering
const materialTypes = ['Steel', 'Bronze', 'Aluminium'];

const getShapeIcon = (shape: string) => {
  if (shape.includes('Round')) return Circle;
  if (shape.includes('Square')) return Square;
  if (shape.includes('Hex')) return Hexagon;
  if (shape.includes('Rectangular')) return Square;
  if (shape.includes('Sheet')) return Square;
  return Circle;
};

const getSizeFields = (shape: string) => {
  switch (shape) {
    case 'Round bar':
      return [
        { key: 'diameter', label: 'Diameter (mm)', placeholder: 'e.g. 20' },
        { key: 'length', label: 'Length (mm)', placeholder: 'e.g. 3000' }
      ];
    case 'Rectangular bar':
      return [
        { key: 'width', label: 'Width (mm)', placeholder: 'e.g. 40' },
        { key: 'height', label: 'Height (mm)', placeholder: 'e.g. 20' },
        { key: 'length', label: 'Length (mm)', placeholder: 'e.g. 3000' }
      ];
    case 'Square bar':
      return [
        { key: 'side', label: 'Side (mm)', placeholder: 'e.g. 25' },
        { key: 'length', label: 'Length (mm)', placeholder: 'e.g. 3000' }
      ];
    case 'Hex bar':
      return [
        { key: 'diameter', label: 'Across Flats (mm)', placeholder: 'e.g. 19' },
        { key: 'length', label: 'Length (mm)', placeholder: 'e.g. 3000' }
      ];
    case 'Round tube':
      return [
        { key: 'outerDiameter', label: 'Outer Ø (mm)', placeholder: 'e.g. 25' },
        { key: 'wallThickness', label: 'Wall Thickness (mm)', placeholder: 'e.g. 2' },
        { key: 'length', label: 'Length (mm)', placeholder: 'e.g. 3000' }
      ];
    case 'Rectangular tube':
      return [
        { key: 'width', label: 'Width (mm)', placeholder: 'e.g. 40' },
        { key: 'height', label: 'Height (mm)', placeholder: 'e.g. 20' },
        { key: 'wallThickness', label: 'Wall Thickness (mm)', placeholder: 'e.g. 2' },
        { key: 'length', label: 'Length (mm)', placeholder: 'e.g. 3000' }
      ];
    case 'Square tube':
      return [
        { key: 'side', label: 'Side (mm)', placeholder: 'e.g. 25' },
        { key: 'wallThickness', label: 'Wall Thickness (mm)', placeholder: 'e.g. 2' },
        { key: 'length', label: 'Length (mm)', placeholder: 'e.g. 3000' }
      ];
    case 'Sheet':
      return [
        { key: 'thickness', label: 'Thickness (mm)', placeholder: 'e.g. 5' },
        { key: 'width', label: 'Width (mm)', placeholder: 'e.g. 1000' },
        { key: 'length', label: 'Length (mm)', placeholder: 'e.g. 2000' }
      ];
    default:
      return [];
  }
};

function generateMaterialName(surfaceFinish: string, shape: string, material: string, dimensions: { [key: string]: string }, materialLibraryItem?: MaterialLibraryItem): string {
  const dimArray = Object.entries(dimensions)
    .filter(([_, value]) => value)
    .map(([key, value]) => {
      if (key === 'length') return `${value}L`;
      return value;
    });
  
  const dimString = dimArray.join('x');
  
  // Use grade from library if available, otherwise use material input
  const materialName = materialLibraryItem ? materialLibraryItem.grade : material;
  
  return `${materialName} - ${dimString} - ${shape} - ${surfaceFinish}`;
}

export const MaterialForm: React.FC<MaterialFormProps> = ({ onMaterialChange, initialData }) => {
  const [surfaceFinish, setSurfaceFinish] = useState(initialData?.surfaceFinish || '');
  const [shape, setShape] = useState(initialData?.shape || '');
  const [material, setMaterial] = useState(initialData?.material || '');
  const [materialLibraryItem, setMaterialLibraryItem] = useState<MaterialLibraryItem | undefined>(initialData?.materialLibraryItem);
  const [dimensions, setDimensions] = useState<{ [key: string]: string }>(initialData?.dimensions || {});
  const [priceUnit, setPriceUnit] = useState<'per_kg' | 'per_meter'>(initialData?.priceUnit || 'per_kg');
  const [materialsLibrary, setMaterialsLibrary] = useState<MaterialLibraryItem[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<MaterialLibraryItem[]>([]);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('');
  const [materialSearchOpen, setMaterialSearchOpen] = useState(false);

  // Fetch materials library on component mount
  useEffect(() => {
    const fetchMaterialsLibrary = async () => {
      const { data, error } = await supabase
        .from('materials_library')
        .select('*')
        .order('material_type', { ascending: true })
        .order('grade', { ascending: true });
      
      if (data && !error) {
        setMaterialsLibrary(data);
        setFilteredMaterials(data);
      }
    };
    
    fetchMaterialsLibrary();
  }, []);

  // Filter materials by type
  useEffect(() => {
    if (selectedMaterialType && selectedMaterialType !== 'all') {
      setFilteredMaterials(materialsLibrary.filter(m => m.material_type === selectedMaterialType));
    } else {
      setFilteredMaterials(materialsLibrary);
    }
  }, [selectedMaterialType, materialsLibrary]);

  // Memoized callback to prevent unnecessary re-renders
  const handleMaterialDataChange = useCallback((
    surfaceFinish: string,
    shape: string,
    material: string,
    materialLibraryItem: MaterialLibraryItem | undefined,
    dimensions: { [key: string]: string },
    priceUnit: 'per_kg' | 'per_meter'
  ) => {
    const generatedName = generateMaterialName(surfaceFinish, shape, material, dimensions, materialLibraryItem);
    const materialData: MaterialData = {
      surfaceFinish,
      shape,
      material,
      materialLibraryItem,
      dimensions,
      generatedName,
      priceUnit
    };
    onMaterialChange(materialData);
  }, [onMaterialChange]);

  useEffect(() => {
    handleMaterialDataChange(surfaceFinish, shape, material, materialLibraryItem, dimensions, priceUnit);
  }, [surfaceFinish, shape, material, materialLibraryItem, dimensions, priceUnit, handleMaterialDataChange]);

  const handleMaterialChange = (value: string) => {
    setMaterial(value);
    // Clear library selection if user types custom material
    if (materialLibraryItem && value !== materialLibraryItem.grade) {
      setMaterialLibraryItem(undefined);
    }
  };

  const handleMaterialLibrarySelect = (libraryItem: MaterialLibraryItem) => {
    setMaterialLibraryItem(libraryItem);
    setMaterial(libraryItem.grade);
    setMaterialSearchOpen(false);
  };

  const handleDimensionChange = (key: string, value: string) => {
    setDimensions(prev => ({ ...prev, [key]: value }));
  };

  const ShapeIcon = getShapeIcon(shape);
  const sizeFields = getSizeFields(shape);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Material Specification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Surface Finish */}
        <div className="space-y-2">
          <Label htmlFor="surface-finish">Surface Finish</Label>
          <Select value={surfaceFinish} onValueChange={setSurfaceFinish}>
            <SelectTrigger>
              <SelectValue placeholder="Select surface finish" />
            </SelectTrigger>
            <SelectContent>
              {surfaceFinishOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Shape */}
        <div className="space-y-2">
          <Label htmlFor="shape">Shape</Label>
          <Select value={shape} onValueChange={setShape}>
            <SelectTrigger>
              <SelectValue placeholder="Select shape" />
            </SelectTrigger>
            <SelectContent>
              {shapeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Material Selection */}
        <div className="space-y-2">
          <Label htmlFor="material">Material</Label>
          <div className="space-y-2">
            <Select value={selectedMaterialType} onValueChange={setSelectedMaterialType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by material type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Materials</SelectItem>
                {materialTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Popover open={materialSearchOpen} onOpenChange={setMaterialSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={materialSearchOpen}
                  className="w-full justify-between"
                >
                  {materialLibraryItem 
                    ? `${materialLibraryItem.grade} (${materialLibraryItem.material_number})`
                    : material || "Search materials..."
                  }
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search materials by grade or number..." />
                  <CommandEmpty>No material found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {filteredMaterials.map((item) => (
                      <CommandItem
                        key={item.id}
                        onSelect={() => handleMaterialLibrarySelect(item)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            materialLibraryItem?.id === item.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{item.grade} ({item.material_number})</span>
                          <span className="text-sm text-muted-foreground">{item.description}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            
            <Input
              placeholder="Or enter custom material"
              value={materialLibraryItem ? '' : material}
              onChange={(e) => handleMaterialChange(e.target.value)}
              className={materialLibraryItem ? 'opacity-50' : ''}
              disabled={!!materialLibraryItem}
            />
            {materialLibraryItem && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMaterialLibraryItem(undefined);
                  setMaterial('');
                }}
                className="w-full"
              >
                Clear selection and use custom material
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Size Fields */}
        {shape && shape !== 'Custom' && sizeFields.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ShapeIcon className="w-4 h-4" />
              Dimensions
            </Label>
            <div className="grid gap-3">
              {sizeFields.map((field) => (
                <div key={field.key} className="grid gap-1">
                  <Label htmlFor={field.key} className="text-sm">
                    {field.label}
                  </Label>
                  <Input
                    id={field.key}
                    type="number"
                    step="0.1"
                    value={dimensions[field.key] || ''}
                    onChange={(e) => handleDimensionChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price Unit */}
        <div className="space-y-2">
          <Label htmlFor="price-unit">Price Unit</Label>
          <Select value={priceUnit} onValueChange={(value: 'per_kg' | 'per_meter') => setPriceUnit(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select price unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_kg">Per Kilogram</SelectItem>
              <SelectItem value="per_meter">Per Meter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generated Name Preview */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Generated Material Name:</h3>
          <p className="text-sm text-muted-foreground">
            {generateMaterialName(surfaceFinish, shape, material, dimensions, materialLibraryItem)}
          </p>
          {materialLibraryItem && (
            <div className="mt-3 space-y-1">
              <p className="text-sm">
                <span className="font-medium">Material Number:</span> {materialLibraryItem.material_number}
              </p>
              <p className="text-sm">
                <span className="font-medium">Density:</span> {materialLibraryItem.density} g/cm³
              </p>
              <p className="text-sm">
                <span className="font-medium">Type:</span> {materialLibraryItem.material_type}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};