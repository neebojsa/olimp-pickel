import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calculator, Search, Plus, X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, getCurrencySymbol } from "@/lib/currencyUtils";
import { NumericInput } from "./NumericInput";

interface PriceCalculatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  part: any;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 'results';

export interface Step1MaterialRow {
  materialId: string;
  materialName: string;
  materialInfo: any;
  lengthPerPieceMm: number;
  materialPrice: number;
  materialPriceUnit: 'per_kg' | 'per_m';
}

export interface Step2ComponentRow {
  componentId: string;
  componentName: string;
  quantity: number;
  componentPrice: number;
  componentPriceUnit: 'per_kg' | 'per_m';
}

interface CalculationData {
  // Step 1: Materials (one or more per part)
  step1Materials?: Step1MaterialRow[];
  // Step 2: Components (one or more per part)
  step2Components?: Step2ComponentRow[];
  // Legacy single-material fields (for backward compat with saved data)
  materialId?: string;
  materialName?: string;
  materialInfo?: any;
  lengthPerPieceMm?: number;
  materialPrice?: number;
  materialPriceUnit?: 'per_kg' | 'per_m';
  
  // Step 2: Setup
  setupHours: number;
  setupMinutes: number;
  setupRatePerHour: number;
  
  // Step 2: Setup + Sawing + Milling + Turning
  sawingHours: number;
  sawingMinutes: number;
  sawingRatePerHour: number;
  
  millingHours: number;
  millingMinutes: number;
  millingRatePerHour: number;
  
  turningHours: number;
  turningMinutes: number;
  turningRatePerHour: number;
  
  weldingHours: number;
  weldingMinutes: number;
  weldingRatePerHour: number;
  
  // Step 3: Secondary operations
  secondaryOperations: Array<{ name: string; pricePerPiece: number }>;
  
  // Step 4: Quantity & Transport
  quantity: number;
  transportCost: number;
}

// Material weight calculation helper
const calculateMaterialWeightPerPiece = (materialInfo: any, lengthMm: number): number => {
  if (!materialInfo?.material || !materialInfo?.dimensions) return 0;

  // For profile-based shapes
  if (materialInfo.calculationType === 'profile_table' && materialInfo.dimensions.kg_per_meter) {
    const kgPerMeter = parseFloat(materialInfo.dimensions.kg_per_meter) || 0;
    return kgPerMeter * (lengthMm / 1000);
  }

  // For simple formula shapes
  const densities: { [key: string]: number } = {
    's355': 7850, 's235': 7850, 'C45': 7850,
    'AlSiMg1': 2700,
    'X153CrMoV12': 7700, '16MnCr5': 7850,
    '1.4305': 8000, '1.4301': 8000
  };
  
  const density = densities[materialInfo.material.toLowerCase()] || 7850;
  const dims = materialInfo.dimensions;
  const toMeters = (mm: number) => mm / 1000;
  let volume = 0;

  const lengthM = toMeters(lengthMm);

  switch (materialInfo.shape) {
    case "Round bar":
      if (dims.diameter) {
        const radius = toMeters(parseFloat(dims.diameter)) / 2;
        volume = Math.PI * radius * radius * lengthM;
      }
      break;
    case "Square bar":
      if (dims.side) {
        const side = toMeters(parseFloat(dims.side));
        volume = side * side * lengthM;
      }
      break;
    case "Rectangular bar":
      if (dims.width && dims.height) {
        volume = toMeters(parseFloat(dims.width)) * toMeters(parseFloat(dims.height)) * lengthM;
      }
      break;
    case "Hex bar":
      if (dims.diameter) {
        const s = toMeters(parseFloat(dims.diameter)) / 2;
        const area = 3 * Math.sqrt(3) / 2 * s * s;
        volume = area * lengthM;
      }
      break;
    case "Round tube":
      if (dims.outerDiameter && dims.wallThickness) {
        const outerRadius = toMeters(parseFloat(dims.outerDiameter)) / 2;
        const innerRadius = outerRadius - toMeters(parseFloat(dims.wallThickness));
        volume = Math.PI * (outerRadius * outerRadius - innerRadius * innerRadius) * lengthM;
      }
      break;
    case "Square tube":
      if (dims.side && dims.wallThickness) {
        const outer = toMeters(parseFloat(dims.side));
        const inner = outer - 2 * toMeters(parseFloat(dims.wallThickness));
        volume = (outer * outer - inner * inner) * lengthM;
      }
      break;
    case "Rectangular tube":
      if (dims.width && dims.height && dims.wallThickness) {
        const w = toMeters(parseFloat(dims.width));
        const h = toMeters(parseFloat(dims.height));
        const t = toMeters(parseFloat(dims.wallThickness));
        volume = (w * h - (w - 2 * t) * (h - 2 * t)) * lengthM;
      }
      break;
    case "Sheet":
      if (dims.thickness && dims.width) {
        volume = toMeters(parseFloat(dims.thickness)) * toMeters(parseFloat(dims.width)) * lengthM;
      }
      break;
  }

  return volume * density; // kg
};

function normalizeToStep1Materials(payload: any): Step1MaterialRow[] {
  if (payload?.step1Materials && Array.isArray(payload.step1Materials) && payload.step1Materials.length > 0) {
    return payload.step1Materials;
  }
  if (payload?.materialId || payload?.materialInfo) {
    return [{
      materialId: payload.materialId || "",
      materialName: payload.materialName || "",
      materialInfo: payload.materialInfo ?? null,
      lengthPerPieceMm: payload.lengthPerPieceMm ?? 0,
      materialPrice: payload.materialPrice ?? 0,
      materialPriceUnit: (payload.materialPriceUnit || 'per_kg') as 'per_kg' | 'per_m'
    }];
  }
  return [];
}

export function PriceCalculatorDialog({ isOpen, onClose, part, onSuccess }: PriceCalculatorDialogProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [materials, setMaterials] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [componentSearchTerm, setComponentSearchTerm] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const savedCalculationLoadedRef = useRef(false);
  const getStep1Materials = (d: CalculationData): Step1MaterialRow[] => {
    const arr = d.step1Materials ?? [];
    if (arr.length > 0) return arr;
    if (d.materialInfo || d.materialId) {
      return [{
        materialId: d.materialId || "",
        materialName: d.materialName || "",
        materialInfo: d.materialInfo ?? null,
        lengthPerPieceMm: d.lengthPerPieceMm ?? 0,
        materialPrice: d.materialPrice ?? 0,
        materialPriceUnit: (d.materialPriceUnit || 'per_kg') as 'per_kg' | 'per_m'
      }];
    }
    return [];
  };
  const [data, setData] = useState<CalculationData>({
    step1Materials: [],
    step2Components: [],
    setupHours: 0,
    setupMinutes: 0,
    setupRatePerHour: 0,
    sawingHours: 0,
    sawingMinutes: 0,
    sawingRatePerHour: 0,
    millingHours: 0,
    millingMinutes: 0,
    millingRatePerHour: 0,
    turningHours: 0,
    turningMinutes: 0,
    turningRatePerHour: 0,
    weldingHours: 0,
    weldingMinutes: 0,
    weldingRatePerHour: 0,
    secondaryOperations: [
      { name: "Grinding", pricePerPiece: 0 },
      { name: "Engraving", pricePerPiece: 0 },
      { name: "Painting", pricePerPiece: 0 },
      { name: "Powder Coating", pricePerPiece: 0 },
      { name: "Hot dip galvanising", pricePerPiece: 0 },
      { name: "Electrogalvanising", pricePerPiece: 0 },
      { name: "Anodizing", pricePerPiece: 0 },
      { name: "Carburization", pricePerPiece: 0 },
      { name: "Nitriding", pricePerPiece: 0 },
      { name: "Tempering", pricePerPiece: 0 },
      { name: "Chromating", pricePerPiece: 0 },
      { name: "Nickel electroplating", pricePerPiece: 0 },
      { name: "Bluing", pricePerPiece: 0 }
    ],
    quantity: 0,
    transportCost: 0
  });

  const { toast } = useToast();

  const fetchComponents = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name')
        .eq('category', 'Components')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setComponents(data || []);
    } catch (error) {
      console.error('Error fetching components:', error);
      toast({ title: "Error", description: "Failed to load components", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (isOpen && part) {
      if (part.customer_id) fetchCustomerCurrency();
      fetchMaterials();
      fetchComponents();
      loadSavedCalculation();
    }
  }, [isOpen, part]);

  // Load Step 1 materials from part.materials_used when part and materials list are available (skip if saved was loaded)
  useEffect(() => {
    if (!isOpen || !part || materials.length === 0 || savedCalculationLoadedRef.current) return;
    const partMaterials = part.materials_used;
    if (Array.isArray(partMaterials) && partMaterials.length > 0) {
      const rows: Step1MaterialRow[] = partMaterials
        .filter((pm: any) => pm && (pm.name || pm.materialName))
        .map((pm: any) => {
          const name = pm.name || pm.materialName || "";
          const lengthMm = typeof pm.lengthPerPiece === 'string' ? parseFloat(pm.lengthPerPiece) || 0 : (pm.lengthPerPiece ?? 0);
          const invMaterial = materials.find((m: any) => (m.name || "").toLowerCase() === name.toLowerCase());
          return {
            materialId: invMaterial?.id || "",
            materialName: name,
            materialInfo: invMaterial?.materials_used ?? null,
            lengthPerPieceMm: lengthMm,
            materialPrice: 0,
            materialPriceUnit: 'per_kg' as const
          };
        });
      if (rows.length > 0) {
        setData(prev => ({ ...prev, step1Materials: rows }));
      }
    } else {
      setData(prev => ({
        ...prev,
        step1Materials: (prev.step1Materials && prev.step1Materials.length > 0) ? prev.step1Materials : [{
          materialId: "",
          materialName: "",
          materialInfo: null,
          lengthPerPieceMm: 0,
          materialPrice: 0,
          materialPriceUnit: 'per_kg'
        }]
      }));
    }
  }, [isOpen, part?.id, part?.materials_used, materials]);

  // Load Step 2 components from part.components_used when part and components list are available (skip if saved was loaded)
  useEffect(() => {
    if (!isOpen || !part || components.length === 0 || savedCalculationLoadedRef.current) return;
    const partComponents = part.components_used;
    if (Array.isArray(partComponents) && partComponents.length > 0) {
      const rows: Step2ComponentRow[] = partComponents
        .filter((pc: any) => pc && (pc.name || pc.componentName))
        .map((pc: any) => {
          const name = pc.name || pc.componentName || "";
          const qty = typeof pc.quantity === 'number' ? pc.quantity : (parseFloat(pc.quantity) || 1);
          const invComponent = components.find((c: any) => (c.name || "").toLowerCase() === name.toLowerCase());
          return {
            componentId: invComponent?.id || "",
            componentName: name,
            quantity: qty,
            componentPrice: 0,
            componentPriceUnit: 'per_kg' as const
          };
        });
      if (rows.length > 0) {
        setData(prev => ({ ...prev, step2Components: rows }));
      }
    } else {
      setData(prev => ({
        ...prev,
        step2Components: (prev.step2Components && prev.step2Components.length > 0) ? prev.step2Components : [{
          componentId: "",
          componentName: "",
          quantity: 0,
          componentPrice: 0,
          componentPriceUnit: 'per_kg'
        }]
      }));
    }
  }, [isOpen, part?.id, part?.components_used, components]);

  useEffect(() => {
    if (isOpen) {
      savedCalculationLoadedRef.current = false;
      setCurrentStep(1);
      setData({
        step1Materials: [],
        step2Components: [],
        setupHours: 0,
        setupMinutes: 0,
        setupRatePerHour: 0,
        sawingHours: 0,
        sawingMinutes: 0,
        sawingRatePerHour: 0,
        millingHours: 0,
        millingMinutes: 0,
        millingRatePerHour: 0,
        turningHours: 0,
        turningMinutes: 0,
        turningRatePerHour: 0,
        weldingHours: 0,
        weldingMinutes: 0,
        weldingRatePerHour: 0,
        secondaryOperations: [
          { name: "Grinding", pricePerPiece: 0 },
          { name: "Engraving", pricePerPiece: 0 },
          { name: "Painting", pricePerPiece: 0 },
          { name: "Powder Coating", pricePerPiece: 0 },
          { name: "Hot dip galvanising", pricePerPiece: 0 },
          { name: "Electrogalvanising", pricePerPiece: 0 },
          { name: "Anodizing", pricePerPiece: 0 },
          { name: "Carburization", pricePerPiece: 0 },
          { name: "Nitriding", pricePerPiece: 0 },
          { name: "Tempering", pricePerPiece: 0 },
          { name: "Chromating", pricePerPiece: 0 },
          { name: "Nickel electroplating", pricePerPiece: 0 },
          { name: "Bluing", pricePerPiece: 0 }
        ],
        quantity: 0,
        transportCost: 0
      });
    }
  }, [isOpen]);

  const fetchCustomerCurrency = async () => {
    if (!part?.customer_id) {
      // Default to part currency or EUR
      setCurrency(part?.currency || "EUR");
      return;
    }
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('currency, country')
        .eq('id', part.customer_id)
        .single();
      
      if (customer?.currency) {
        setCurrency(customer.currency);
      } else if (customer?.country) {
        // Use getCurrencyForCountry if available
        const { getCurrencyForCountry } = await import("@/lib/currencyUtils");
        setCurrency(getCurrencyForCountry(customer.country));
      } else {
        setCurrency(part?.currency || "EUR");
      }
    } catch (error) {
      console.error('Error fetching customer currency:', error);
      setCurrency(part?.currency || "EUR");
    }
  };

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, materials_used')
        .eq('category', 'Materials')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        title: "Error",
        description: "Failed to load materials",
        variant: "destructive"
      });
    }
  };

  const loadSavedCalculation = async (): Promise<boolean> => {
    if (!part?.id) return false;
    try {
      const { data: row } = await supabase
        .from('inventory')
        .select('price_calculation')
        .eq('id', part.id)
        .single();
      
      if (row?.price_calculation) {
        const payload = row.price_calculation as any;
        const step1 = normalizeToStep1Materials(payload);
        setData({ ...payload, step1Materials: step1.length > 0 ? step1 : undefined });
        setCurrentStep('results');
        savedCalculationLoadedRef.current = true;
        return true;
      }
    } catch (error) {
      // No saved calculation, start fresh
    }
    return false;
  };

  const handleNext = () => {
    if (currentStep === 5) {
      calculateAndShowResults();
    } else {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep === 'results') {
      setCurrentStep(5);
    } else if (typeof currentStep === 'number' && currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const calculateAndShowResults = () => {
    setCurrentStep('results');
  };

  const handleSave = async () => {
    if (!part?.id) return;
    
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ price_calculation: data } as any)
        .eq('id', part.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Price calculation saved"
      });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save calculation",
        variant: "destructive"
      });
    }
  };

  // Calculate material cost per piece (sum over all Step 1 materials)
  const calculateMaterialCostPerPiece = (): number => {
    const rows = getStep1Materials(data);
    return rows.reduce((sum, row) => {
      if (!row.materialPrice) return sum;
      if (row.materialPriceUnit === 'per_kg') {
        if (!row.materialInfo || !row.lengthPerPieceMm) return sum;
        const weightKg = calculateMaterialWeightPerPiece(row.materialInfo, row.lengthPerPieceMm);
        return sum + weightKg * row.materialPrice;
      }
      return sum + (row.lengthPerPieceMm / 1000) * row.materialPrice;
    }, 0);
  };

  // Calculate setup cost
  const calculateSetupCost = (): { total: number; perPiece: number } => {
    const totalHours = data.setupHours + (data.setupMinutes / 60);
    const total = totalHours * data.setupRatePerHour;
    const perPiece = data.quantity > 0 ? total / data.quantity : 0;
    return { total, perPiece };
  };

  // Calculate operation cost per piece
  const calculateOperationCost = (hours: number, minutes: number, rate: number): number => {
    const totalHours = hours + (minutes / 60);
    return totalHours * rate;
  };

  const calculateComponentCostPerPiece = (): number => {
    const rows = getStep2Components(data);
    return rows.reduce((sum, row) => sum + (row.quantity || 0) * (row.componentPrice || 0), 0);
  };

  // Calculate totals
  const calculateTotals = () => {
    const materialCostPerPiece = calculateMaterialCostPerPiece();
    const materialCostTotal = materialCostPerPiece * data.quantity;

    const componentCostPerPiece = calculateComponentCostPerPiece();
    const componentCostTotal = componentCostPerPiece * data.quantity;
    
    const setup = calculateSetupCost();
    
    const sawingCostPerPiece = calculateOperationCost(data.sawingHours, data.sawingMinutes, data.sawingRatePerHour);
    const sawingCostTotal = sawingCostPerPiece * data.quantity;
    
    const millingCostPerPiece = calculateOperationCost(data.millingHours, data.millingMinutes, data.millingRatePerHour);
    const millingCostTotal = millingCostPerPiece * data.quantity;
    
    const turningCostPerPiece = calculateOperationCost(data.turningHours, data.turningMinutes, data.turningRatePerHour);
    const turningCostTotal = turningCostPerPiece * data.quantity;
    
    const weldingCostPerPiece = calculateOperationCost(data.weldingHours ?? 0, data.weldingMinutes ?? 0, data.weldingRatePerHour ?? 0);
    const weldingCostTotal = weldingCostPerPiece * data.quantity;
    
    const secondaryOpsPerPiece = data.secondaryOperations.reduce((sum, op) => sum + op.pricePerPiece, 0);
    const secondaryOpsTotal = secondaryOpsPerPiece * data.quantity;
    
    const transportPerPiece = data.quantity > 0 ? data.transportCost / data.quantity : 0;
    
    const totalPerPiece = materialCostPerPiece + componentCostPerPiece + setup.perPiece + sawingCostPerPiece + 
                         millingCostPerPiece + turningCostPerPiece + weldingCostPerPiece + secondaryOpsPerPiece + transportPerPiece;
    
    const totalForQuantity = materialCostTotal + componentCostTotal + setup.total + sawingCostTotal + 
                            millingCostTotal + turningCostTotal + weldingCostTotal + secondaryOpsTotal + data.transportCost;
    
    const rows = getStep1Materials(data);
    const weightPerPiece = rows.length > 0
      ? rows.reduce((s, row) => s + (row.materialInfo && row.lengthPerPieceMm ? calculateMaterialWeightPerPiece(row.materialInfo, row.lengthPerPieceMm) : 0), 0)
      : (part?.weight || 0);
    const totalWeight = weightPerPiece * data.quantity;
    
    return {
      materialCostPerPiece,
      materialCostTotal,
      componentCostPerPiece,
      componentCostTotal,
      setup,
      sawingCostPerPiece,
      sawingCostTotal,
      millingCostPerPiece,
      millingCostTotal,
      turningCostPerPiece,
      turningCostTotal,
      weldingCostPerPiece,
      weldingCostTotal,
      secondaryOpsPerPiece,
      secondaryOpsTotal,
      transportPerPiece,
      totalPerPiece,
      totalForQuantity,
      weightPerPiece,
      totalWeight
    };
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(materialSearchTerm.toLowerCase())
  );
  const filteredComponents = components.filter(c =>
    (c.name || "").toLowerCase().includes(componentSearchTerm.toLowerCase())
  );

  const step1Rows = getStep1Materials(data);

  const getStep2Components = (d: CalculationData): Step2ComponentRow[] => {
    const arr = d.step2Components ?? [];
    if (arr.length > 0) return arr;
    return [];
  };
  const step2Rows = getStep2Components(data);

  const setStep2Component = (index: number, patch: Partial<Step2ComponentRow>) => {
    const next = [...step2Rows];
    if (!next[index]) return;
    next[index] = { ...next[index], ...patch };
    setData(prev => ({ ...prev, step2Components: next }));
  };

  const addStep2Component = (component?: any) => {
    const newRow: Step2ComponentRow = component ? {
      componentId: component.id,
      componentName: component.name,
      quantity: 1,
      componentPrice: 0,
      componentPriceUnit: 'per_kg'
    } : {
      componentId: "",
      componentName: "",
      quantity: 0,
      componentPrice: 0,
      componentPriceUnit: 'per_kg'
    };
    if (component) {
      const rows = data.step2Components || [];
      const emptyIndex = rows.findIndex(r => !r.componentId && !r.componentName);
      if (emptyIndex >= 0) {
        setData(prev => {
          const next = [...(prev.step2Components || [])];
          next[emptyIndex] = { ...newRow, quantity: next[emptyIndex].quantity || 1 };
          return { ...prev, step2Components: next };
        });
        return;
      }
    }
    setData(prev => ({ ...prev, step2Components: [...(prev.step2Components || []), newRow] }));
  };

  const removeStep2Component = (index: number) => {
    const next = step2Rows.filter((_, i) => i !== index);
    setData(prev => ({ ...prev, step2Components: next.length > 0 ? next : [] }));
  };

  const setStep1Material = (index: number, patch: Partial<Step1MaterialRow>) => {
    const next = [...step1Rows];
    if (!next[index]) return;
    next[index] = { ...next[index], ...patch };
    setData(prev => ({ ...prev, step1Materials: next }));
  };

  const addStep1Material = (material?: any) => {
    const newRow: Step1MaterialRow = material ? {
      materialId: material.id,
      materialName: material.name,
      materialInfo: material.materials_used ?? null,
      lengthPerPieceMm: 0,
      materialPrice: 0,
      materialPriceUnit: 'per_kg'
    } : {
      materialId: "",
      materialName: "",
      materialInfo: null,
      lengthPerPieceMm: 0,
      materialPrice: 0,
      materialPriceUnit: 'per_kg'
    };
    if (material) {
      const rows = data.step1Materials || [];
      const emptyIndex = rows.findIndex(r => !r.materialId && !r.materialName);
      if (emptyIndex >= 0) {
        setData(prev => {
          const next = [...(prev.step1Materials || [])];
          next[emptyIndex] = { ...newRow, lengthPerPieceMm: next[emptyIndex].lengthPerPieceMm || 0 };
          return { ...prev, step1Materials: next };
        });
        return;
      }
    }
    setData(prev => ({ ...prev, step1Materials: [...(prev.step1Materials || []), newRow] }));
  };

  const removeStep1Material = (index: number) => {
    const next = step1Rows.filter((_, i) => i !== index);
    setData(prev => ({ ...prev, step1Materials: next.length > 0 ? next : [] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Price Calculator - {part?.name || 'Part'}
            {part?.part_number && (
              <>
                <span className="text-gray-500"> | </span>
                <span className="text-gray-500">{part.part_number}</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 1: Material Cost</h3>
              <p className="text-sm text-muted-foreground">Materials from the part are loaded below. Enter prices and adjust any field as needed.</p>

              {step1Rows.length === 0 ? (
                <div className="text-sm text-muted-foreground">No materials. Add one from the library below.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_100px_24px_120px_90px_auto] gap-y-2 gap-x-4 w-full max-w-4xl">
                  <div className="contents">
                    <span className="text-sm font-medium text-muted-foreground py-2 md:col-span-1">Material</span>
                    <span className="text-sm font-medium text-muted-foreground py-2 text-center md:col-span-1">Length (mm)</span>
                    <span className="hidden md:block w-6 md:col-span-1" aria-hidden />
                    <span className="text-sm font-medium text-muted-foreground py-2 text-center md:col-span-1">Price</span>
                    <span className="hidden md:block md:col-span-1 w-[90px]" aria-hidden />
                    <span className="hidden md:block w-8 md:col-span-1" aria-hidden />
                  </div>
                  {step1Rows.map((row, index) => (
                    <div className="contents" key={index}>
                      <div
                        className="min-w-0 w-full max-w-[360px] h-9 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm md:col-span-1 truncate"
                        title={row.materialName || "Select from library below"}
                      >
                        {row.materialName ? (
                          <span className="truncate">{row.materialName}</span>
                        ) : (
                          <span className="text-muted-foreground">Select from library below</span>
                        )}
                      </div>
                      <NumericInput
                        value={row.lengthPerPieceMm}
                        onChange={(val) => setStep1Material(index, { lengthPerPieceMm: val })}
                        min={0}
                        step={0.1}
                        className="min-w-0 md:col-span-1"
                      />
                      <span className="hidden md:inline-block md:col-span-1 w-4 flex-shrink-0" aria-hidden />
                      <NumericInput
                        value={row.materialPrice}
                        onChange={(val) => setStep1Material(index, { materialPrice: val })}
                        min={0}
                        step={0.01}
                        className="min-w-0 md:col-span-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep1Material(index, { materialPriceUnit: row.materialPriceUnit === 'per_kg' ? 'per_m' : 'per_kg' })}
                        className="h-9 w-[90px] whitespace-nowrap justify-center md:col-span-1"
                      >
                        {getCurrencySymbol(currency)}/{row.materialPriceUnit === 'per_kg' ? 'kg' : 'm'}
                      </Button>
                      <div className="flex items-center justify-center w-8 md:col-span-1">
                        {step1Rows.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStep1Material(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Add material from library</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={materialSearchTerm}
                    onChange={(e) => setMaterialSearchTerm(e.target.value)}
                    placeholder="Search materials..."
                    className="pl-10"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredMaterials.map((material) => (
                    <Card
                      key={material.id}
                      className="cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => addStep1Material(material)}
                    >
                      <CardContent className="p-3">
                        <div className="font-medium">{material.name}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 2: Components</h3>
              <p className="text-sm text-muted-foreground">Select components from the library below. Enter quantity and price per unit for each.</p>

              {step2Rows.length === 0 ? (
                <div className="text-sm text-muted-foreground">No components. Add one from the library below.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_100px_24px_120px_auto] gap-y-2 gap-x-4 w-full max-w-4xl">
                  <div className="contents">
                    <span className="text-sm font-medium text-muted-foreground py-2 md:col-span-1">Component</span>
                    <span className="text-sm font-medium text-muted-foreground py-2 text-center md:col-span-1">Quantity</span>
                    <span className="hidden md:block w-6 md:col-span-1" aria-hidden />
                    <span className="text-sm font-medium text-muted-foreground py-2 text-center md:col-span-1">Price ({getCurrencySymbol(currency)}/piece)</span>
                    <span className="hidden md:block w-8 md:col-span-1" aria-hidden />
                  </div>
                  {step2Rows.map((row, index) => (
                    <div className="contents" key={index}>
                      <div
                        className="min-w-0 w-full max-w-[360px] h-9 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm md:col-span-1 truncate"
                        title={row.componentName || "Select from library below"}
                      >
                        {row.componentName ? (
                          <span className="truncate">{row.componentName}</span>
                        ) : (
                          <span className="text-muted-foreground">Select from library below</span>
                        )}
                      </div>
                      <NumericInput
                        value={row.quantity}
                        onChange={(val) => setStep2Component(index, { quantity: val })}
                        min={0}
                        step={1}
                        className="min-w-0 md:col-span-1"
                      />
                      <span className="hidden md:inline-block md:col-span-1 w-4 flex-shrink-0" aria-hidden />
                      <NumericInput
                        value={row.componentPrice}
                        onChange={(val) => setStep2Component(index, { componentPrice: val })}
                        min={0}
                        step={0.01}
                        className="min-w-0 md:col-span-1"
                      />
                      <div className="flex items-center justify-center w-8 md:col-span-1">
                        {step2Rows.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStep2Component(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Add component from library</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={componentSearchTerm}
                    onChange={(e) => setComponentSearchTerm(e.target.value)}
                    placeholder="Search components..."
                    className="pl-10"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredComponents.map((component) => (
                    <Card
                      key={component.id}
                      className="cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => addStep2Component(component)}
                    >
                      <CardContent className="p-3">
                        <div className="font-medium">{component.name}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 3: Setup & Machining</h3>
              <div className="grid gap-y-3 gap-x-4" style={{ gridTemplateColumns: '6rem 120px 120px 120px', width: 'max-content' }}>
                <div className="contents">
                  <span className="text-sm font-medium text-muted-foreground py-2">Operation</span>
                  <span className="text-sm font-medium text-muted-foreground py-2 text-center">Hours</span>
                  <span className="text-sm font-medium text-muted-foreground py-2 text-center">Minutes</span>
                  <span className="text-sm font-medium text-muted-foreground py-2 text-center">Hourly Rate ({currency})</span>
                </div>
                <div className="contents">
                  <Label className="text-sm py-2 flex items-center">Setup</Label>
                  <NumericInput value={data.setupHours} onChange={(val) => setData({ ...data, setupHours: val })} min={0} />
                  <NumericInput value={data.setupMinutes} onChange={(val) => setData({ ...data, setupMinutes: val })} min={0} max={59} />
                  <NumericInput value={data.setupRatePerHour} onChange={(val) => setData({ ...data, setupRatePerHour: val })} min={0} step={0.01} />
                </div>
                <div className="contents">
                  <Label className="text-sm py-2 flex items-center">Sawing</Label>
                  <NumericInput value={data.sawingHours} onChange={(val) => setData({ ...data, sawingHours: val })} min={0} />
                  <NumericInput value={data.sawingMinutes} onChange={(val) => setData({ ...data, sawingMinutes: val })} min={0} max={59} />
                  <NumericInput value={data.sawingRatePerHour} onChange={(val) => setData({ ...data, sawingRatePerHour: val })} min={0} step={0.01} />
                </div>
                <div className="contents">
                  <Label className="text-sm py-2 flex items-center">Milling</Label>
                  <NumericInput value={data.millingHours} onChange={(val) => setData({ ...data, millingHours: val })} min={0} />
                  <NumericInput value={data.millingMinutes} onChange={(val) => setData({ ...data, millingMinutes: val })} min={0} max={59} />
                  <NumericInput value={data.millingRatePerHour} onChange={(val) => setData({ ...data, millingRatePerHour: val })} min={0} step={0.01} />
                </div>
                <div className="contents">
                  <Label className="text-sm py-2 flex items-center">Turning</Label>
                  <NumericInput value={data.turningHours} onChange={(val) => setData({ ...data, turningHours: val })} min={0} />
                  <NumericInput value={data.turningMinutes} onChange={(val) => setData({ ...data, turningMinutes: val })} min={0} max={59} />
                  <NumericInput value={data.turningRatePerHour} onChange={(val) => setData({ ...data, turningRatePerHour: val })} min={0} step={0.01} />
                </div>
                <div className="contents">
                  <Label className="text-sm py-2 flex items-center">Welding</Label>
                  <NumericInput value={data.weldingHours ?? 0} onChange={(val) => setData({ ...data, weldingHours: val })} min={0} />
                  <NumericInput value={data.weldingMinutes ?? 0} onChange={(val) => setData({ ...data, weldingMinutes: val })} min={0} max={59} />
                  <NumericInput value={data.weldingRatePerHour ?? 0} onChange={(val) => setData({ ...data, weldingRatePerHour: val })} min={0} step={0.01} />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 4: Secondary Operations</h3>
              <p className="text-sm text-muted-foreground">Enter price per piece for each operation. All amounts in {getCurrencySymbol(currency)}/piece.</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.secondaryOperations.map((op, index) => (
                  <div key={index} className="flex flex-col gap-1.5">
                    <Label className="text-sm whitespace-nowrap truncate" title={op.name || 'Custom'}>
                      {op.name || 'Custom'} ({getCurrencySymbol(currency)}/piece)
                    </Label>
                    <NumericInput
                      value={op.pricePerPiece}
                      onChange={(val) => {
                        const updated = [...data.secondaryOperations];
                        updated[index].pricePerPiece = val;
                        setData({ ...data, secondaryOperations: updated });
                      }}
                      min={0}
                      step={0.01}
                    />
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setData({
                    ...data,
                    secondaryOperations: [...data.secondaryOperations, { name: "", pricePerPiece: 0 }]
                  });
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Operation
              </Button>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 5: Quantity & Transport</h3>
              
              <div className="space-y-2">
                <Label>Quantity (pcs)</Label>
                <NumericInput
                  value={data.quantity}
                  onChange={(val) => setData({ ...data, quantity: val })}
                  min={0}
                />
              </div>

              {data.quantity > 0 && (() => {
                const rows = getStep1Materials(data);
                const weightPerPiece = rows.length > 0
                  ? rows.reduce((s, row) => s + (row.materialInfo && row.lengthPerPieceMm ? calculateMaterialWeightPerPiece(row.materialInfo, row.lengthPerPieceMm) : 0), 0)
                  : (part?.weight || 0);
                const totalWeight = weightPerPiece * data.quantity;
                return (
                  <div className="text-sm text-muted-foreground">
                    Total weight: {totalWeight.toFixed(2)} kg
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label>Transport Cost ({currency})</Label>
                <NumericInput
                  value={data.transportCost}
                  onChange={(val) => setData({ ...data, transportCost: val })}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
          )}

          {currentStep === 'results' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Price Calculation Results</h3>
              
              {(() => {
                const totals = calculateTotals();
                return (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="font-semibold">Materials</div>
                        <div className="flex justify-between text-sm">
                          <span>Cost per piece:</span>
                          <span>{formatCurrency(totals.materialCostPerPiece, currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total ({data.quantity} pcs):</span>
                          <span>{formatCurrency(totals.materialCostTotal, currency)}</span>
                        </div>
                        {totals.weightPerPiece > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span>Weight per piece:</span>
                              <span>{totals.weightPerPiece.toFixed(3)} kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Total weight:</span>
                              <span>{totals.totalWeight.toFixed(2)} kg</span>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {(totals.componentCostPerPiece > 0 || totals.componentCostTotal > 0) && (
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <div className="font-semibold">Components</div>
                          <div className="flex justify-between text-sm">
                            <span>Cost per piece:</span>
                            <span>{formatCurrency(totals.componentCostPerPiece, currency)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Total ({data.quantity} pcs):</span>
                            <span>{formatCurrency(totals.componentCostTotal, currency)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="font-semibold">Machining Setup</div>
                        <div className="flex justify-between text-sm">
                          <span>Total setup cost:</span>
                          <span>{formatCurrency(totals.setup.total, currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Per piece:</span>
                          <span>{formatCurrency(totals.setup.perPiece, currency)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {(totals.sawingCostPerPiece > 0 || totals.millingCostPerPiece > 0 || totals.turningCostPerPiece > 0 || totals.weldingCostPerPiece > 0) && (
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <div className="font-semibold">Operations</div>
                          {totals.sawingCostPerPiece > 0 && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span>Sawing per piece:</span>
                                <span>{formatCurrency(totals.sawingCostPerPiece, currency)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Sawing total:</span>
                                <span>{formatCurrency(totals.sawingCostTotal, currency)}</span>
                              </div>
                            </>
                          )}
                          {totals.millingCostPerPiece > 0 && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span>Milling per piece:</span>
                                <span>{formatCurrency(totals.millingCostPerPiece, currency)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Milling total:</span>
                                <span>{formatCurrency(totals.millingCostTotal, currency)}</span>
                              </div>
                            </>
                          )}
                          {totals.turningCostPerPiece > 0 && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span>Turning per piece:</span>
                                <span>{formatCurrency(totals.turningCostPerPiece, currency)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Turning total:</span>
                                <span>{formatCurrency(totals.turningCostTotal, currency)}</span>
                              </div>
                            </>
                          )}
                          {totals.weldingCostPerPiece > 0 && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span>Welding per piece:</span>
                                <span>{formatCurrency(totals.weldingCostPerPiece, currency)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Welding total:</span>
                                <span>{formatCurrency(totals.weldingCostTotal, currency)}</span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {totals.secondaryOpsPerPiece > 0 && (
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <div className="font-semibold">Secondary Operations</div>
                          {data.secondaryOperations.filter(op => op.pricePerPiece > 0).map((op, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{op.name || 'Custom'}:</span>
                              <span>{formatCurrency(op.pricePerPiece * data.quantity, currency)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm border-t pt-2 mt-2">
                            <span>Subtotal per piece:</span>
                            <span>{formatCurrency(totals.secondaryOpsPerPiece, currency)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Subtotal total:</span>
                            <span>{formatCurrency(totals.secondaryOpsTotal, currency)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {data.transportCost > 0 && (
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <div className="font-semibold">Transport</div>
                          <div className="flex justify-between text-sm">
                            <span>Total transport:</span>
                            <span>{formatCurrency(data.transportCost, currency)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Per piece:</span>
                            <span>{formatCurrency(totals.transportPerPiece, currency)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="border-primary bg-primary/5">
                      <CardContent className="p-4 space-y-2">
                        <div className="text-lg font-bold">Total Price per Piece</div>
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(totals.totalPerPiece, currency)}
                        </div>
                        <div className="text-lg font-semibold mt-4">Total Price for Quantity</div>
                        <div className="text-xl font-bold text-primary">
                          {formatCurrency(totals.totalForQuantity, currency)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={handleBack} disabled={typeof currentStep === 'number' && currentStep === 1}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-2">
              {currentStep === 'results' ? (
                <>
                  <Button variant="outline" onClick={() => setCurrentStep(5)}>
                    Edit
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button onClick={handleNext}>
                  {currentStep === 5 ? 'Finish' : 'Next'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
