import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Search, Check } from "lucide-react";
import { MaterialSearch } from "./MaterialSearch";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencyForCountry, getCurrencySymbol } from "@/lib/currencyUtils";
import { ShapeIcon } from "./ShapeIcon";
import { NumericInput } from "./NumericInput";

interface MaterialFormProps {
  onMaterialChange: (materialData: MaterialData) => void;
  initialData?: Partial<MaterialData>;
}

export interface MaterialData {
  surfaceFinish: string;
  shape: string;
  shapeId?: string;
  calculationType?: 'simple_formula' | 'profile_table';
  material: string;
  dimensions: { [key: string]: string };
  profileId?: string;
  profileDesignation?: string;
  generatedName: string;
  priceUnit: string;
  supplier?: string;
  supplierId?: string;
  currency?: string;
  location?: string;
}

const surfaceFinishOptions = [
  "Cold Drawn",
  "Hot Rolled", 
  "Polished",
  "Chromed",
  "Hardened+Chromed"
];

interface Shape {
  id: string;
  name: string;
  calculation_type: 'simple_formula' | 'profile_table';
  description: string | null;
}

interface StandardizedProfile {
  id: string;
  designation: string;
  kg_per_meter: number;
  dimensions: any;
}

interface MaterialGradeUsage {
  grade: string;
  count: number;
}

type SelectionStep = 'shape' | 'material' | 'surfaceFinish' | 'summary';

const getSizeFields = (shape: string) => {
  switch (shape) {
    case "Round bar":
      return [
        { key: "diameter", label: "Diameter (mm)", placeholder: "e.g. 20" },
        { key: "length", label: "Length (mm)", placeholder: "e.g. 3000" }
      ];
    case "Rectangular bar":
      return [
        { key: "width", label: "Width (mm)", placeholder: "e.g. 40" },
        { key: "height", label: "Height (mm)", placeholder: "e.g. 20" },
        { key: "length", label: "Length (mm)", placeholder: "e.g. 3000" }
      ];
    case "Square bar":
      return [
        { key: "side", label: "Side (mm)", placeholder: "e.g. 25" },
        { key: "length", label: "Length (mm)", placeholder: "e.g. 3000" }
      ];
    case "Hex bar":
      return [
        { key: "diameter", label: "Across Flats (mm)", placeholder: "e.g. 19" },
        { key: "length", label: "Length (mm)", placeholder: "e.g. 3000" }
      ];
    case "Round tube":
      return [
        { key: "outerDiameter", label: "Outer Ø (mm)", placeholder: "e.g. 25" },
        { key: "wallThickness", label: "Wall Thickness (mm)", placeholder: "e.g. 2" },
        { key: "length", label: "Length (mm)", placeholder: "e.g. 3000" }
      ];
    case "Rectangular tube":
      return [
        { key: "width", label: "Width (mm)", placeholder: "e.g. 40" },
        { key: "height", label: "Height (mm)", placeholder: "e.g. 20" },
        { key: "wallThickness", label: "Wall Thickness (mm)", placeholder: "e.g. 2" },
        { key: "length", label: "Length (mm)", placeholder: "e.g. 3000" }
      ];
    case "Square tube":
      return [
        { key: "side", label: "Side (mm)", placeholder: "e.g. 25" },
        { key: "wallThickness", label: "Wall Thickness (mm)", placeholder: "e.g. 2" },
        { key: "length", label: "Length (mm)", placeholder: "e.g. 3000" }
      ];
    case "Sheet":
      return [
        { key: "thickness", label: "Thickness (mm)", placeholder: "e.g. 5" },
        { key: "width", label: "Width (mm)", placeholder: "e.g. 1000" },
        { key: "length", label: "Length (mm)", placeholder: "e.g. 2000" }
      ];
    default:
      return [];
  }
};

const generateMaterialName = (
  surfaceFinish: string, 
  shape: string, 
  material: string, 
  dimensions: { [key: string]: string },
  profileDesignation?: string
) => {
  const parts = [material];
  
  if (profileDesignation) {
    parts.push(profileDesignation);
  } else {
    parts.push(shape);
  }
  
  parts.push(surfaceFinish);
  
  if (!profileDesignation) {
  const sizeFields = getSizeFields(shape);
  const sizeParts = sizeFields
    .filter(field => dimensions[field.key])
    .map(field => `${dimensions[field.key]}${field.key === 'length' ? 'L' : ''}`)
      .slice(0, 2);
  
  if (sizeParts.length > 0) {
    parts.splice(1, 0, sizeParts.join('x'));
    }
  } else {
    if (dimensions.length) {
      parts.splice(2, 0, `${dimensions.length}L`);
    }
  }
  
  return parts.filter(Boolean).join(' - ');
};

export function MaterialForm({ onMaterialChange, initialData }: MaterialFormProps) {
  // Progressive selection state
  const [currentStep, setCurrentStep] = useState<SelectionStep>(() => {
    // If initialData has all selections, start at summary
    if (initialData?.shape && initialData?.material && initialData?.surfaceFinish) {
      return 'summary';
    } else if (initialData?.shape && initialData?.material) {
      return 'surfaceFinish';
    } else if (initialData?.shape) {
      return 'material';
    }
    return 'shape';
  });

  const [surfaceFinish, setSurfaceFinish] = useState(initialData?.surfaceFinish || "");
  const [shape, setShape] = useState(initialData?.shape || "");
  const [shapeId, setShapeId] = useState(initialData?.shapeId || "");
  const [calculationType, setCalculationType] = useState<'simple_formula' | 'profile_table' | undefined>(initialData?.calculationType);
  const [material, setMaterial] = useState(initialData?.material || "");
  const [dimensions, setDimensions] = useState(initialData?.dimensions || {});
  const [profileId, setProfileId] = useState(initialData?.profileId || "");
  const [profileDesignation, setProfileDesignation] = useState(initialData?.profileDesignation || "");
  const [priceUnit, setPriceUnit] = useState(initialData?.priceUnit || "/kg");
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || "");
  const [currency, setCurrency] = useState(initialData?.currency || "EUR");
  const [location, setLocation] = useState(initialData?.location || "");
  const [customSurfaceFinish, setCustomSurfaceFinish] = useState("");
  const [customShape, setCustomShape] = useState("");
  const [customMaterial, setCustomMaterial] = useState("");

  // Data fetching state
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [profiles, setProfiles] = useState<StandardizedProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const [frequentlyUsedGrades, setFrequentlyUsedGrades] = useState<MaterialGradeUsage[]>([]);
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [materialSearchResults, setMaterialSearchResults] = useState<any[]>([]);

  // Filter shapes for display (only the ones mentioned in requirements)
  // Note: Database may have "Channel" and "I-beam" instead of "UPN", "HEA", "HEB"
  const displayShapes = [
    "Round bar",
    "Square bar", 
    "Rectangular bar",
    "Hex bar",
    "Round tube",
    "Square tube",
    "Rectangular tube",
    "Sheet",
    "Angle",
    "UPN",
    "HEA",
    "HEB",
    "Channel",  // Database name for UPN
    "I-beam"    // Database name for HEA/HEB
  ];

  useEffect(() => {
    const fetchShapes = async () => {
      try {
        const { data, error } = await supabase
          .from('shapes')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setShapes(data || []);
      } catch (error) {
        console.error('Error fetching shapes:', error);
      }
    };

    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, name, country, currency')
          .order('name', { ascending: true });

        if (error) throw error;
        setSuppliers(data || []);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };

    const fetchStockLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('stock_locations')
          .select('id, name, description')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) throw error;
        setStockLocations(data || []);
      } catch (error) {
        console.error('Error fetching stock locations:', error);
      }
    };

    const fetchFrequentlyUsedGrades = async () => {
      try {
        // Query inventory to count material grade usage
        const { data, error } = await supabase
          .from('inventory')
          .select('materials_used')
          .eq('category', 'Materials')
          .not('materials_used', 'is', null);

        if (error) throw error;

        // Count occurrences of each material grade
        const gradeCounts: Record<string, number> = {};
        data?.forEach((item: any) => {
          if (item.materials_used?.material) {
            const grade = item.materials_used.material;
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
          }
        });

        // Convert to array and sort by count
        const sorted = Object.entries(gradeCounts)
          .map(([grade, count]) => ({ grade, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8); // Top 8 most used

        setFrequentlyUsedGrades(sorted);
      } catch (error) {
        console.error('Error fetching frequently used grades:', error);
      }
    };

    fetchShapes();
    fetchSuppliers();
    fetchStockLocations();
    fetchFrequentlyUsedGrades();
  }, []);

  // Fetch profiles when a profile-based shape is selected
  useEffect(() => {
    if (shapeId && calculationType === 'profile_table') {
      const fetchProfiles = async () => {
        setLoadingProfiles(true);
        try {
          const { data, error } = await supabase
            .from('standardized_profiles')
            .select('*')
            .eq('shape_id', shapeId)
            .order('designation', { ascending: true });

          if (error) throw error;
          setProfiles(data || []);
        } catch (error) {
          console.error('Error fetching profiles:', error);
        } finally {
          setLoadingProfiles(false);
        }
      };

      fetchProfiles();
    } else {
      setProfiles([]);
    }
  }, [shapeId, calculationType]);

  // Search materials
  useEffect(() => {
    if (!materialSearchTerm || materialSearchTerm.length < 2) {
      setMaterialSearchResults([]);
      return;
    }

    const searchMaterials = async () => {
      try {
        const { data, error } = await supabase
          .from('materials_library')
          .select('*')
          .or(`grade.ilike.%${materialSearchTerm}%,material_number.ilike.%${materialSearchTerm}%,description.ilike.%${materialSearchTerm}%`)
          .limit(10);

        if (error) throw error;
        setMaterialSearchResults(data || []);
      } catch (error) {
        console.error('Error searching materials:', error);
      }
    };

    const timer = setTimeout(searchMaterials, 300);
    return () => clearTimeout(timer);
  }, [materialSearchTerm]);

  const updateMaterialData = (updates: Partial<MaterialData>) => {
    const newSurfaceFinish = updates.surfaceFinish ?? surfaceFinish;
    const newShape = updates.shape ?? shape;
    const newShapeId = updates.shapeId ?? shapeId;
    const newCalculationType = updates.calculationType ?? calculationType;
    const newMaterial = updates.material ?? material;
    const newDimensions = updates.dimensions ?? dimensions;
    const newProfileId = updates.profileId ?? profileId;
    const newProfileDesignation = updates.profileDesignation ?? profileDesignation;
    const newPriceUnit = updates.priceUnit ?? priceUnit;
    const newSupplierId = updates.supplierId ?? supplierId;
    const newCurrency = updates.currency ?? currency;
    const newLocation = updates.location ?? location;
    
    const generatedName = generateMaterialName(
      newSurfaceFinish === "custom" ? customSurfaceFinish : newSurfaceFinish,
      newShape === "custom" ? customShape : newShape,
      newMaterial === "custom" ? customMaterial : newMaterial,
      newDimensions,
      newProfileDesignation
    );
    
    const selectedSupplier = suppliers.find(s => s.id === newSupplierId);
    
    onMaterialChange({
      surfaceFinish: newSurfaceFinish === "custom" ? customSurfaceFinish : newSurfaceFinish,
      shape: newShape === "custom" ? customShape : newShape,
      shapeId: newShapeId,
      calculationType: newCalculationType,
      material: newMaterial === "custom" ? customMaterial : newMaterial,
      dimensions: newDimensions,
      profileId: newProfileId,
      profileDesignation: newProfileDesignation,
      generatedName,
      priceUnit: newPriceUnit,
      supplierId: newSupplierId,
      supplier: selectedSupplier?.name,
      currency: newCurrency,
      location: newLocation
    });
  };

  const handleShapeSelect = (shapeName: string) => {
    // Map display names back to database names if needed
    const dbShapeName = shapeName === "Channel (UPN)" ? "Channel" :
                       shapeName === "Beam (HEA / HEB)" ? "I-beam" :
                       shapeName;
    
    const selectedShape = shapes.find(s => s.name === dbShapeName || s.name === shapeName);
    if (selectedShape) {
      setShape(selectedShape.name);
      setShapeId(selectedShape.id);
      setCalculationType(selectedShape.calculation_type);
      
      if (selectedShape.calculation_type === 'profile_table') {
        setDimensions({ length: "" });
      } else {
        setDimensions({});
      }
      
      updateMaterialData({ 
        shape: selectedShape.name, 
        shapeId: selectedShape.id,
        calculationType: selectedShape.calculation_type,
        profileId: "",
        profileDesignation: "",
        dimensions: selectedShape.calculation_type === 'profile_table' ? { length: "" } : {}
      });
      
      setCurrentStep('material');
    }
  };

  const handleMaterialSelect = (grade: string) => {
    setMaterial(grade);
    updateMaterialData({ material: grade });
    setCurrentStep('surfaceFinish');
    setMaterialSearchTerm("");
    setMaterialSearchResults([]);
  };

  const handleSurfaceFinishSelect = (finish: string) => {
    setSurfaceFinish(finish);
    updateMaterialData({ surfaceFinish: finish });
    setCurrentStep('summary');
  };

  const handleDimensionChange = (key: string, value: string) => {
    const newDimensions = { ...dimensions, [key]: value };
    setDimensions(newDimensions);
    updateMaterialData({ dimensions: newDimensions });
  };

  const handleProfileChange = (profileIdValue: string) => {
    const selectedProfile = profiles.find(p => p.id === profileIdValue);
    if (selectedProfile) {
      setProfileId(selectedProfile.id);
      setProfileDesignation(selectedProfile.designation);
      const newDimensions = { 
        ...dimensions, 
        length: dimensions.length || "",
        kg_per_meter: selectedProfile.kg_per_meter.toString()
      };
      setDimensions(newDimensions);
      updateMaterialData({ 
        profileId: selectedProfile.id,
        profileDesignation: selectedProfile.designation,
        dimensions: newDimensions
      });
    }
  };

  const selectedProfile = profiles.find(p => p.id === profileId);
  const sizeFields = getSizeFields(shape);

  // Get filtered shapes that match display list
  // Sort to ensure consistent ordering: bars first, then tubes, then sheets, then profiles
  const availableShapes = shapes
    .filter(s => displayShapes.includes(s.name))
    .sort((a, b) => {
      const order = [
        "Round bar", "Square bar", "Rectangular bar", "Hex bar",
        "Round tube", "Square tube", "Rectangular tube",
        "Sheet",
        "Angle", "UPN", "HEA", "HEB", "Channel", "I-beam"
      ];
      const indexA = order.indexOf(a.name);
      const indexB = order.indexOf(b.name);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

  return (
    <div className="space-y-4">
      {/* Progressive Selection Section */}
      <div className="relative min-h-[400px] md:min-h-[300px]">
        {/* Step 1: Shape Selection */}
        {currentStep === 'shape' && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Select Material Shape</h3>
              <p className="text-sm text-muted-foreground">Choose the shape of your material</p>
            </div>
            {availableShapes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Loading shapes...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {availableShapes.map((shapeOption) => {
                // User-friendly display names
                // Map database names to display names
                const displayName = 
                  shapeOption.name === "UPN" ? "Channel (UPN)" :
                  shapeOption.name === "HEA" ? "Beam (HEA)" :
                  shapeOption.name === "HEB" ? "Beam (HEB)" :
                  shapeOption.name === "Channel" ? "Channel (UPN)" :
                  shapeOption.name === "I-beam" ? "Beam (HEA / HEB)" :
                  shapeOption.name;
                  
                  return (
                    <button
                      key={shapeOption.id}
                      onClick={() => handleShapeSelect(displayName)}
                      className="group relative flex flex-col items-center justify-center p-4 md:p-6 rounded-lg border-2 border-border hover:border-primary transition-all duration-200 hover:shadow-lg bg-card"
                    >
                      <div className="w-16 h-16 md:w-20 md:h-20 mb-3 text-primary">
                        <ShapeIcon shape={shapeOption.name} size={64} />
                      </div>
                      <span className="text-xs md:text-sm font-medium text-center">{displayName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Material Grade Selection */}
        {currentStep === 'material' && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep('shape')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h3 className="text-lg font-semibold">Select Material Grade</h3>
                <p className="text-sm text-muted-foreground">Selected: {shape}</p>
              </div>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
                  value={materialSearchTerm}
                  onChange={(e) => setMaterialSearchTerm(e.target.value)}
                  placeholder="Search material grade (e.g., C45, 1.4301)..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Frequently Used Grades */}
            {frequentlyUsedGrades.length > 0 && !materialSearchTerm && (
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">Frequently Used</Label>
                <div className="flex flex-wrap gap-2">
                  {frequentlyUsedGrades.map((item) => (
                    <Button
                      key={item.grade}
                      variant="outline"
                      onClick={() => handleMaterialSelect(item.grade)}
                      className="h-auto py-2 px-4"
                    >
                      {item.grade}
                      <Badge variant="secondary" className="ml-2">
                        {item.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {materialSearchTerm && materialSearchResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Search Results</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {materialSearchResults.map((mat) => (
                    <Card
                      key={mat.id}
                      className="cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleMaterialSelect(mat.grade)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{mat.grade}</div>
                            {mat.material_type && (
                              <Badge variant="secondary" className="mt-1">
                                {mat.material_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Input Option */}
            {materialSearchTerm && materialSearchResults.length === 0 && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMaterial(materialSearchTerm);
                    updateMaterialData({ material: materialSearchTerm });
                    setCurrentStep('surfaceFinish');
                  }}
                  className="w-full"
                >
                  Use "{materialSearchTerm}"
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Surface Finish Selection */}
        {currentStep === 'surfaceFinish' && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep('material')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h3 className="text-lg font-semibold">Select Surface Finish</h3>
                <p className="text-sm text-muted-foreground">
                  {shape} • {material}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {surfaceFinishOptions.map((finish) => (
                <button
                  key={finish}
                  onClick={() => handleSurfaceFinishSelect(finish)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    surfaceFinish === finish
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary hover:shadow-md'
                  }`}
                >
                  <div className="font-medium">{finish}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {currentStep === 'summary' && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep('surfaceFinish')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h3 className="text-lg font-semibold">Material Summary</h3>
              </div>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 text-primary">
                      <ShapeIcon shape={shape} size={48} />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Shape</div>
                      <div className="font-semibold">{shape}</div>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="text-sm text-muted-foreground">Material Grade</div>
                    <div className="font-semibold">{material}</div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="text-sm text-muted-foreground">Surface Finish</div>
                    <div className="font-semibold">{surfaceFinish}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Profile Selection (for profile-based shapes) */}
      {currentStep === 'summary' && calculationType === 'profile_table' && shape && shape !== "custom" && (
      <div className="grid gap-2">
          <Label>Standardized Profile *</Label>
          <Select 
            value={profileId} 
            onValueChange={handleProfileChange}
            disabled={loadingProfiles}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingProfiles ? "Loading profiles..." : "Select profile"} />
          </SelectTrigger>
          <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.designation} ({profile.kg_per_meter} kg/m)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
          {selectedProfile && selectedProfile.dimensions && (
            <div className="text-xs text-muted-foreground mt-1">
              Dimensions: {Object.entries(selectedProfile.dimensions)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ")}
            </div>
        )}
      </div>
      )}

      {/* Dynamic Size Fields */}
      {currentStep === 'summary' && shape && shape !== "custom" && (
        calculationType === 'simple_formula' ? (
          sizeFields.length > 0 && (
        <div className="grid gap-2">
          <Label className="flex items-center gap-2">
            Dimensions
          </Label>
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-3">
                {sizeFields.map((field) => (
                  <div key={field.key} className="grid gap-1">
                    <Label htmlFor={field.key} className="text-sm">
                      {field.label}
                    </Label>
                    <NumericInput
                      id={field.key}
                      value={dimensions[field.key] || 0}
                      onChange={(val) => handleDimensionChange(field.key, val.toString())}
                      min={0}
                      step={0.1}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
          )
        ) : calculationType === 'profile_table' ? (
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              Length (meters) *
            </Label>
            <NumericInput
              value={dimensions.length || 0}
              onChange={(val) => handleDimensionChange('length', val.toString())}
              min={0}
              step={0.01}
              placeholder="e.g., 6.0"
            />
            {selectedProfile && (
              <div className="text-xs text-muted-foreground mt-1">
                Weight per meter: {selectedProfile.kg_per_meter} kg/m
                {dimensions.length && parseFloat(dimensions.length) > 0 && (
                  <span className="ml-2 font-medium">
                    Total weight: {(selectedProfile.kg_per_meter * parseFloat(dimensions.length)).toFixed(2)} kg
                  </span>
                )}
              </div>
            )}
          </div>
        ) : null
      )}

      {/* Supplier, Price Per Unit, Location in three columns */}
      {currentStep === 'summary' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select 
                value={supplierId} 
                onValueChange={(value) => {
                  const selectedSupplier = suppliers.find(s => s.id === value);
                  const supplierCurrency = selectedSupplier?.currency || 
                    (selectedSupplier?.country ? getCurrencyForCountry(selectedSupplier.country) : currency);
                  setSupplierId(value);
                  setCurrency(supplierCurrency);
                  updateMaterialData({ supplierId: value, currency: supplierCurrency });
                }}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price_unit">Price Per Unit *</Label>
              <Button
                type="button"
                variant="outline"
                id="price_unit"
                onClick={() => {
                  const newPriceUnit = priceUnit === "/kg" ? "/m" : "/kg";
                  setPriceUnit(newPriceUnit);
                  updateMaterialData({ priceUnit: newPriceUnit });
                }}
                className="w-full justify-center font-medium"
              >
                {priceUnit === "/kg" ? "/kg" : "/m"}
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Select 
                value={location} 
                onValueChange={(value) => {
                  setLocation(value);
                  updateMaterialData({ location: value });
                }}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.name}>
                      {loc.name} {loc.description && `- ${loc.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
