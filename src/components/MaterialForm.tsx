import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Circle, Square, Hexagon, Cylinder } from "lucide-react";

interface MaterialFormProps {
  onMaterialChange: (materialData: MaterialData) => void;
  initialData?: Partial<MaterialData>;
}

export interface MaterialData {
  surfaceFinish: string;
  shape: string;
  material: string;
  dimensions: { [key: string]: string };
  generatedName: string;
}

const surfaceFinishOptions = [
  "Cold Drawn",
  "Hot Rolled", 
  "Polished",
  "Chromed",
  "Hardened+Chromed"
];

const shapeOptions = [
  "Round bar",
  "Rectangular bar",
  "Square bar", 
  "Hex bar",
  "Round tube",
  "Rectangular tube",
  "Square tube",
  "Sheet"
];

const materialOptions = [
  "s355",
  "s235",
  "C45",
  "AlSiMg1", 
  "X153CrMoV12",
  "16MnCr5",
  "1.4305",
  "1.4301"
];

const getShapeIcon = (shape: string) => {
  if (shape.includes("Round")) return Circle;
  if (shape.includes("Square")) return Square;  
  if (shape.includes("Hex")) return Hexagon;
  if (shape.includes("Rectangular")) return Square;
  if (shape.includes("Sheet")) return Square;
  return Circle;
};

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

const generateMaterialName = (surfaceFinish: string, shape: string, material: string, dimensions: { [key: string]: string }) => {
  const parts = [material, shape, surfaceFinish];
  
  // Add key dimensions to name
  const sizeFields = getSizeFields(shape);
  const sizeParts = sizeFields
    .filter(field => dimensions[field.key])
    .map(field => `${dimensions[field.key]}${field.key === 'length' ? 'L' : ''}`)
    .slice(0, 2); // Only show first 2 dimensions to keep name short
  
  if (sizeParts.length > 0) {
    parts.splice(1, 0, sizeParts.join('x'));
  }
  
  return parts.filter(Boolean).join(' - ');
};

export function MaterialForm({ onMaterialChange, initialData }: MaterialFormProps) {
  const [surfaceFinish, setSurfaceFinish] = useState(initialData?.surfaceFinish || "");
  const [shape, setShape] = useState(initialData?.shape || "");
  const [material, setMaterial] = useState(initialData?.material || "");
  const [dimensions, setDimensions] = useState(initialData?.dimensions || {});
  const [customSurfaceFinish, setCustomSurfaceFinish] = useState("");
  const [customShape, setCustomShape] = useState("");
  const [customMaterial, setCustomMaterial] = useState("");

  const updateMaterialData = (updates: Partial<MaterialData>) => {
    const newSurfaceFinish = updates.surfaceFinish ?? surfaceFinish;
    const newShape = updates.shape ?? shape;
    const newMaterial = updates.material ?? material;
    const newDimensions = updates.dimensions ?? dimensions;
    
    const generatedName = generateMaterialName(newSurfaceFinish, newShape, newMaterial, newDimensions);
    
    onMaterialChange({
      surfaceFinish: newSurfaceFinish,
      shape: newShape,
      material: newMaterial,
      dimensions: newDimensions,
      generatedName
    });
  };

  const handleSurfaceFinishChange = (value: string) => {
    setSurfaceFinish(value);
    updateMaterialData({ surfaceFinish: value });
  };

  const handleShapeChange = (value: string) => {
    setShape(value);
    setDimensions({}); // Reset dimensions when shape changes
    updateMaterialData({ shape: value, dimensions: {} });
  };

  const handleMaterialChange = (value: string) => {
    setMaterial(value);
    updateMaterialData({ material: value });
  };

  const handleDimensionChange = (key: string, value: string) => {
    const newDimensions = { ...dimensions, [key]: value };
    setDimensions(newDimensions);
    updateMaterialData({ dimensions: newDimensions });
  };

  const ShapeIcon = getShapeIcon(shape);
  const sizeFields = getSizeFields(shape);

  return (
    <div className="space-y-4">
      {/* Surface Finish */}
      <div className="grid gap-2">
        <Label htmlFor="surface_finish">Surface Finish *</Label>
        <Select value={surfaceFinish} onValueChange={handleSurfaceFinishChange}>
          <SelectTrigger id="surface_finish">
            <SelectValue placeholder="Select surface finish" />
          </SelectTrigger>
          <SelectContent>
            {surfaceFinishOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            <SelectItem value="custom">+ Add Custom</SelectItem>
          </SelectContent>
        </Select>
        {surfaceFinish === "custom" && (
          <Input
            value={customSurfaceFinish}
            onChange={(e) => {
              setCustomSurfaceFinish(e.target.value);
              updateMaterialData({ surfaceFinish: e.target.value });
            }}
            placeholder="Enter custom surface finish"
          />
        )}
      </div>

      {/* Shape */}
      <div className="grid gap-2">
        <Label htmlFor="shape">Shape *</Label>
        <Select value={shape} onValueChange={handleShapeChange}>
          <SelectTrigger id="shape">
            <SelectValue placeholder="Select shape" />
          </SelectTrigger>
          <SelectContent>
            {shapeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            <SelectItem value="custom">+ Add Custom</SelectItem>
          </SelectContent>
        </Select>
        {shape === "custom" && (
          <Input
            value={customShape}
            onChange={(e) => {
              setCustomShape(e.target.value);
              updateMaterialData({ shape: e.target.value });
            }}
            placeholder="Enter custom shape"
          />
        )}
      </div>

      {/* Material */}
      <div className="grid gap-2">
        <Label htmlFor="material_type">Material *</Label>
        <Select value={material} onValueChange={handleMaterialChange}>
          <SelectTrigger id="material_type">
            <SelectValue placeholder="Select material" />
          </SelectTrigger>
          <SelectContent>
            {materialOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            <SelectItem value="custom">+ Add Custom</SelectItem>
          </SelectContent>
        </Select>
        {material === "custom" && (
          <Input
            value={customMaterial}
            onChange={(e) => {
              setCustomMaterial(e.target.value);
              updateMaterialData({ material: e.target.value });
            }}
            placeholder="Enter custom material"
          />
        )}
      </div>

      {/* Dynamic Size Fields */}
      {shape && shape !== "custom" && sizeFields.length > 0 && (
        <div className="grid gap-2">
          <Label className="flex items-center gap-2">
            <ShapeIcon className="w-4 h-4" />
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
                    <Input
                      id={field.key}
                      type="number"
                      step="0.1"
                      value={dimensions[field.key] || ""}
                      onChange={(e) => handleDimensionChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generated Name Preview */}
      {surfaceFinish && shape && material && (
        <div className="grid gap-2">
          <Label>Generated Material Name</Label>
          <div className="p-3 bg-muted rounded-md text-sm font-medium">
            {generateMaterialName(
              surfaceFinish === "custom" ? customSurfaceFinish : surfaceFinish,
              shape === "custom" ? customShape : shape,
              material === "custom" ? customMaterial : material,
              dimensions
            )}
          </div>
        </div>
      )}
    </div>
  );
}