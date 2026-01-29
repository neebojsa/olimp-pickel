import { useState, useEffect } from "react";
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
import { formatCurrency } from "@/lib/currencyUtils";
import { NumericInput } from "./NumericInput";

interface PriceCalculatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  part: any;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'results';

interface CalculationData {
  // Step 1: Material
  materialId: string;
  materialName: string;
  materialInfo: any;
  lengthPerPieceMm: number;
  materialPrice: number;
  materialPriceUnit: 'per_kg' | 'per_m';
  
  // Step 2: Setup
  setupHours: number;
  setupMinutes: number;
  setupRatePerHour: number;
  
  // Step 3-5: Operations
  sawingHours: number;
  sawingMinutes: number;
  sawingRatePerHour: number;
  
  millingHours: number;
  millingMinutes: number;
  millingRatePerHour: number;
  
  turningHours: number;
  turningMinutes: number;
  turningRatePerHour: number;
  
  // Step 6: Secondary operations
  secondaryOperations: Array<{ name: string; pricePerPiece: number }>;
  
  // Step 7: Quantity & Transport
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

export function PriceCalculatorDialog({ isOpen, onClose, part, onSuccess }: PriceCalculatorDialogProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [data, setData] = useState<CalculationData>({
    materialId: "",
    materialName: "",
    materialInfo: null,
    lengthPerPieceMm: 0,
    materialPrice: 0,
    materialPriceUnit: 'per_kg',
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
    secondaryOperations: [
      { name: "Surface protection", pricePerPiece: 0 },
      { name: "Grinding", pricePerPiece: 0 },
      { name: "Engraving", pricePerPiece: 0 },
      { name: "Welding", pricePerPiece: 0 }
    ],
    quantity: 0,
    transportCost: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && part) {
      // Get currency from customer
      if (part.customer_id) {
        fetchCustomerCurrency();
      }
      fetchMaterials();
      // Load saved calculation if exists
      loadSavedCalculation();
    }
  }, [isOpen, part]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setData({
        materialId: "",
        materialName: "",
        materialInfo: null,
        lengthPerPieceMm: 0,
        materialPrice: 0,
        materialPriceUnit: 'per_kg',
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
        secondaryOperations: [
          { name: "Surface protection", pricePerPiece: 0 },
          { name: "Grinding", pricePerPiece: 0 },
          { name: "Engraving", pricePerPiece: 0 },
          { name: "Welding", pricePerPiece: 0 }
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
      const { data } = await supabase
        .from('inventory')
        .select('price_calculation')
        .eq('id', part.id)
        .single();
      
      if (data?.price_calculation) {
        setData(data.price_calculation);
        setCurrentStep('results');
        return true;
      }
    } catch (error) {
      // No saved calculation, start fresh
    }
    return false;
  };

  const handleNext = () => {
    if (currentStep === 7) {
      calculateAndShowResults();
    } else {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep === 'results') {
      setCurrentStep(7);
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

  // Calculate material cost per piece
  const calculateMaterialCostPerPiece = (): number => {
    if (!data.materialInfo || !data.lengthPerPieceMm || !data.materialPrice) return 0;
    
    if (data.materialPriceUnit === 'per_kg') {
      const weightKg = calculateMaterialWeightPerPiece(data.materialInfo, data.lengthPerPieceMm);
      return weightKg * data.materialPrice;
    } else {
      // per_m
      return (data.lengthPerPieceMm / 1000) * data.materialPrice;
    }
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

  // Calculate totals
  const calculateTotals = () => {
    const materialCostPerPiece = calculateMaterialCostPerPiece();
    const materialCostTotal = materialCostPerPiece * data.quantity;
    
    const setup = calculateSetupCost();
    
    const sawingCostPerPiece = calculateOperationCost(data.sawingHours, data.sawingMinutes, data.sawingRatePerHour);
    const sawingCostTotal = sawingCostPerPiece * data.quantity;
    
    const millingCostPerPiece = calculateOperationCost(data.millingHours, data.millingMinutes, data.millingRatePerHour);
    const millingCostTotal = millingCostPerPiece * data.quantity;
    
    const turningCostPerPiece = calculateOperationCost(data.turningHours, data.turningMinutes, data.turningRatePerHour);
    const turningCostTotal = turningCostPerPiece * data.quantity;
    
    const secondaryOpsPerPiece = data.secondaryOperations.reduce((sum, op) => sum + op.pricePerPiece, 0);
    const secondaryOpsTotal = secondaryOpsPerPiece * data.quantity;
    
    const transportPerPiece = data.quantity > 0 ? data.transportCost / data.quantity : 0;
    
    const totalPerPiece = materialCostPerPiece + setup.perPiece + sawingCostPerPiece + 
                         millingCostPerPiece + turningCostPerPiece + secondaryOpsPerPiece + transportPerPiece;
    
    const totalForQuantity = materialCostTotal + setup.total + sawingCostTotal + 
                            millingCostTotal + turningCostTotal + secondaryOpsTotal + data.transportCost;
    
    const weightPerPiece = data.materialInfo ? calculateMaterialWeightPerPiece(data.materialInfo, data.lengthPerPieceMm) : (part?.weight || 0);
    const totalWeight = weightPerPiece * data.quantity;
    
    return {
      materialCostPerPiece,
      materialCostTotal,
      setup,
      sawingCostPerPiece,
      sawingCostTotal,
      millingCostPerPiece,
      millingCostTotal,
      turningCostPerPiece,
      turningCostTotal,
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
              
              <div className="space-y-2">
                <Label>Select Material</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={materialSearchTerm}
                    onChange={(e) => setMaterialSearchTerm(e.target.value)}
                    placeholder="Search materials..."
                    className="pl-10"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredMaterials.map((material) => (
                    <Card
                      key={material.id}
                      className={`cursor-pointer hover:bg-muted transition-colors ${
                        data.materialId === material.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        setData({
                          ...data,
                          materialId: material.id,
                          materialName: material.name,
                          materialInfo: material.materials_used
                        });
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="font-medium">{material.name}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Length per piece (mm)</Label>
                <NumericInput
                  value={data.lengthPerPieceMm}
                  onChange={(val) => setData({ ...data, lengthPerPieceMm: val })}
                  min={0}
                  step={0.1}
                />
              </div>

              <div className="space-y-2">
                <Label>Material Price</Label>
                <div className="flex gap-2">
                  <NumericInput
                    value={data.materialPrice}
                    onChange={(val) => setData({ ...data, materialPrice: val })}
                    min={0}
                    step={0.01}
                    className="flex-1"
                  />
                  <Select
                    value={data.materialPriceUnit}
                    onValueChange={(val: 'per_kg' | 'per_m') => setData({ ...data, materialPriceUnit: val })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_kg">/{currency}/kg</SelectItem>
                      <SelectItem value="per_m">/{currency}/m</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {data.materialInfo && data.lengthPerPieceMm > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Weight per piece: {calculateMaterialWeightPerPiece(data.materialInfo, data.lengthPerPieceMm).toFixed(3)} kg
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 2: Machining Setup</h3>
              
              <div className="space-y-2">
                <Label>Setup Time</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Hours</Label>
                    <NumericInput
                      value={data.setupHours}
                      onChange={(val) => setData({ ...data, setupHours: val })}
                      min={0}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Minutes</Label>
                    <NumericInput
                      value={data.setupMinutes}
                      onChange={(val) => setData({ ...data, setupMinutes: val })}
                      min={0}
                      max={59}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Setup Rate ({currency}/hour)</Label>
                <NumericInput
                  value={data.setupRatePerHour}
                  onChange={(val) => setData({ ...data, setupRatePerHour: val })}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
          )}

          {(currentStep === 3 || currentStep === 4 || currentStep === 5) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Step {currentStep}: {currentStep === 3 ? 'Sawing' : currentStep === 4 ? 'Milling' : 'Turning'}
              </h3>
              
              <div className="space-y-2">
                <Label>Time per piece</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Hours</Label>
                    <NumericInput
                      value={currentStep === 3 ? data.sawingHours : currentStep === 4 ? data.millingHours : data.turningHours}
                      onChange={(val) => {
                        if (currentStep === 3) setData({ ...data, sawingHours: val });
                        else if (currentStep === 4) setData({ ...data, millingHours: val });
                        else setData({ ...data, turningHours: val });
                      }}
                      min={0}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Minutes</Label>
                    <NumericInput
                      value={currentStep === 3 ? data.sawingMinutes : currentStep === 4 ? data.millingMinutes : data.turningMinutes}
                      onChange={(val) => {
                        if (currentStep === 3) setData({ ...data, sawingMinutes: val });
                        else if (currentStep === 4) setData({ ...data, millingMinutes: val });
                        else setData({ ...data, turningMinutes: val });
                      }}
                      min={0}
                      max={59}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hourly Rate ({currency}/hour)</Label>
                <NumericInput
                  value={currentStep === 3 ? data.sawingRatePerHour : currentStep === 4 ? data.millingRatePerHour : data.turningRatePerHour}
                  onChange={(val) => {
                    if (currentStep === 3) setData({ ...data, sawingRatePerHour: val });
                    else if (currentStep === 4) setData({ ...data, millingRatePerHour: val });
                    else setData({ ...data, turningRatePerHour: val });
                  }}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 6: Secondary Operations</h3>
              
              <div className="space-y-3">
                {data.secondaryOperations.map((op, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>{op.name}</Label>
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
                    {index >= 4 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = data.secondaryOperations.filter((_, i) => i !== index);
                          setData({ ...data, secondaryOperations: updated });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
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
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 7: Quantity & Transport</h3>
              
              <div className="space-y-2">
                <Label>Quantity (pcs)</Label>
                <NumericInput
                  value={data.quantity}
                  onChange={(val) => setData({ ...data, quantity: val })}
                  min={0}
                />
              </div>

              {data.quantity > 0 && (
                <div className="text-sm text-muted-foreground">
                  {(() => {
                    const weightPerPiece = data.materialInfo 
                      ? calculateMaterialWeightPerPiece(data.materialInfo, data.lengthPerPieceMm)
                      : (part?.weight || 0);
                    const totalWeight = weightPerPiece * data.quantity;
                    return `Total weight: ${totalWeight.toFixed(2)} kg`;
                  })()}
                </div>
              )}

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

                    {(totals.sawingCostPerPiece > 0 || totals.millingCostPerPiece > 0 || totals.turningCostPerPiece > 0) && (
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
                  <Button variant="outline" onClick={() => setCurrentStep(7)}>
                    Edit
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button onClick={handleNext}>
                  {currentStep === 7 ? 'Finish' : 'Next'}
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
