import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencyForCountry, getCurrencySymbol } from "@/lib/currencyUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ShapeImage } from "@/components/ShapeImage";

interface MaterialAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  material: any;
  onSuccess: () => void;
}

export function MaterialAdjustmentDialog({ isOpen, onClose, material, onSuccess }: MaterialAdjustmentDialogProps) {
  const { staff } = useAuth();
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [lengthMm, setLengthMm] = useState<string>('');
  const [quantityPieces, setQuantityPieces] = useState<string>('1');
  const [supplierId, setSupplierId] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [priceUnit, setPriceUnit] = useState<'per_kg' | 'per_meter'>('per_kg');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const [currency, setCurrency] = useState<string>('EUR');
  const [availableAdditions, setAvailableAdditions] = useState<any[]>([]);
  const [removalData, setRemovalData] = useState<{ [key: string]: { length: string; notes: string } }>({});
  const [materialProfile, setMaterialProfile] = useState<any>(null);
  const [shapes, setShapes] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      fetchStockLocations();
      if (adjustmentType === 'subtract') {
        fetchAvailableAdditions();
      }
      // Fetch material profile for weight calculation
      if (material?.id) {
        fetchMaterialProfile();
      }
    }
  }, [isOpen, adjustmentType, material?.id]);

  const calculateKgPerMeter = (materialInfo: any): number => {
    if (!materialInfo) return 0;
    
    // For profile-based shapes, check if kg_per_meter is stored in dimensions
    if (materialInfo.calculationType === 'profile_table') {
      if (materialInfo.dimensions?.kg_per_meter) {
        return parseFloat(materialInfo.dimensions.kg_per_meter) || 0;
      }
      // If not in dimensions, we'll fetch from profile table separately
      return 0;
    }
    
    // For simple formula shapes, calculate using geometric formulas + density
    const densities: { [key: string]: number } = {
      's355': 7850, 's235': 7850, 'c45': 7850, 'C45': 7850, 'C60': 7850, 'c60': 7850,
      '42CrMo4': 7850, '42crmo4': 7850, '16MnCr5': 7850, '16mncr5': 7850,
      '1.4305': 8000, '1.4301': 8000
    };
    
    const materialGrade = (materialInfo.material || '').toString();
    const density = densities[materialGrade.toLowerCase()] || densities[materialGrade] || 7850;
    const dims = materialInfo.dimensions || {};
    let crossSectionalArea = 0;
    const toMeters = (mm: any) => (parseFloat(mm) || 0) / 1000;
    
    switch (materialInfo.shape) {
      case "Round bar":
        if (dims.diameter) {
          const r = toMeters(dims.diameter) / 2;
          crossSectionalArea = Math.PI * r * r;
        }
        break;
      case "Square bar":
        if (dims.side) {
          const side = toMeters(dims.side);
          crossSectionalArea = side * side;
        }
        break;
      case "Rectangular bar":
        if (dims.width && dims.height) {
          crossSectionalArea = toMeters(dims.width) * toMeters(dims.height);
        }
        break;
      case "Hex bar":
        if (dims.diameter) {
          const a = toMeters(dims.diameter) / 2;
          crossSectionalArea = (3 * Math.sqrt(3) / 2) * a * a;
        }
        break;
      case "Round tube":
        if (dims.outerDiameter && dims.wallThickness) {
          const outerR = toMeters(dims.outerDiameter) / 2;
          const innerR = outerR - toMeters(dims.wallThickness);
          crossSectionalArea = Math.PI * (outerR * outerR - innerR * innerR);
        }
        break;
      case "Square tube":
        if (dims.side && dims.wallThickness) {
          const outer = toMeters(dims.side);
          const inner = outer - 2 * toMeters(dims.wallThickness);
          crossSectionalArea = outer * outer - inner * inner;
        }
        break;
      case "Rectangular tube":
        if (dims.width && dims.height && dims.wallThickness) {
          const outerW = toMeters(dims.width);
          const outerH = toMeters(dims.height);
          const innerW = outerW - 2 * toMeters(dims.wallThickness);
          const innerH = outerH - 2 * toMeters(dims.wallThickness);
          crossSectionalArea = outerW * outerH - innerW * innerH;
        }
        break;
    }
    
    return crossSectionalArea * density;
  };

  const fetchMaterialProfile = async () => {
    if (!material?.id) return;
    try {
      // Fetch material from inventory
      const { data: materialData, error } = await supabase
        .from('inventory')
        .select('materials_used')
        .eq('id', material.id)
        .single() as any;
      
      if (error) {
        console.error('Error fetching material data:', error);
        return;
      }
      
      let kgPerMeter = 0;
      
      // First, try to calculate from materials_used (works for both profile and simple formula)
      if (materialData?.materials_used) {
        kgPerMeter = calculateKgPerMeter(materialData.materials_used);
      }
      
      // If calculation returned 0 and materials_used has profileId, fetch from database
      const materialsUsed = materialData.materials_used as any;
      if (kgPerMeter === 0 && materialsUsed?.profileId) {
        const { data: profile, error: profileError } = await supabase
          .from('standardized_profiles' as any)
          .select('kg_per_meter')
          .eq('id', materialsUsed.profileId)
          .single() as any;
        
        if (!profileError && profile?.kg_per_meter) {
          kgPerMeter = profile.kg_per_meter;
        } else if (profileError) {
          console.error('Error fetching profile:', profileError);
        }
      }
      
      // Set the profile if we have a valid kg_per_meter
      if (kgPerMeter > 0) {
        setMaterialProfile({ kg_per_meter: kgPerMeter });
      } else {
        console.warn('Could not calculate kg_per_meter for material:', material.id, materialData.materials_used);
      }
    } catch (error) {
      console.error('Error fetching material profile:', error);
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

  const fetchAvailableAdditions = async () => {
    if (!material?.id) return;
    
    try {
      // Fetch all additions
      const { data: additions, error: additionsError } = await supabase
        .from('material_adjustments' as any)
        .select('*')
        .eq('inventory_id', material.id)
        .eq('adjustment_type', 'add')
        .order('created_at', { ascending: true });

      if (additionsError) throw additionsError;

      // Fetch all subtractions
      const { data: subtractions, error: subtractionsError } = await supabase
        .from('material_adjustments' as any)
        .select('*')
        .eq('inventory_id', material.id)
        .eq('adjustment_type', 'subtract')
        .order('created_at', { ascending: true });

      if (subtractionsError) throw subtractionsError;

      // Calculate remaining quantity for each addition using FIFO
      const additionsWithRemaining = (additions || []).map((add: any) => {
        const addTotalMm = add.length_mm * add.quantity_pieces;
        return {
          ...add,
          originalTotalMm: addTotalMm,
          remainingMm: addTotalMm
        };
      });

      // Apply FIFO logic: subtract from oldest additions first
      // Process subtractions in chronological order
      const sortedSubtractions = [...(subtractions || [])].sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      let remainingToSubtract = sortedSubtractions.reduce((sum: number, sub: any) => 
        sum + (sub.length_mm * sub.quantity_pieces), 0
      );
      
      // Subtract from additions in FIFO order (oldest first)
      for (const add of additionsWithRemaining) {
        if (remainingToSubtract <= 0) break;
        
        const addTotal = add.originalTotalMm;
        if (remainingToSubtract >= addTotal) {
          // This addition is completely consumed
          add.remainingMm = 0;
          remainingToSubtract -= addTotal;
        } else {
          // Partial consumption
          add.remainingMm = addTotal - remainingToSubtract;
          remainingToSubtract = 0;
        }
      }

      // Filter out additions with no remaining quantity
      const available = additionsWithRemaining.filter((add: any) => add.remainingMm > 0);
      setAvailableAdditions(available);
    } catch (error) {
      console.error('Error fetching available additions:', error);
    }
  };

  const handleSubmit = async () => {
    if (adjustmentType === 'add') {
      // Validation for add
      if (!lengthMm || parseFloat(lengthMm) <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid length",
          variant: "destructive"
        });
        return;
      }

      if (!quantityPieces || parseInt(quantityPieces) <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid quantity of pieces",
          variant: "destructive"
        });
        return;
      }

      setIsSubmitting(true);

      try {
        const length = parseFloat(lengthMm);
        const pieces = parseInt(quantityPieces);
        const totalMm = length * pieces;
        
        // Calculate new quantity
        const currentQty = material.quantity || 0;
        const newQty = currentQty + totalMm;

        // Update inventory quantity
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ quantity: newQty })
          .eq('id', material.id);

        if (updateError) throw updateError;

        // Insert adjustment record
        const { error: insertError } = await supabase
          .from('material_adjustments')
          .insert({
            inventory_id: material.id,
            adjustment_type: 'add',
            length_mm: length,
            quantity_pieces: pieces,
            supplier_id: supplierId || null,
            unit_price: unitPrice ? parseFloat(unitPrice) : null,
            price_unit: priceUnit,
            location: location || null,
            notes: notes || null,
            created_by_staff_id: staff?.id || null
          });

        if (insertError) throw insertError;

        // If adding stock, check if there's a pending reorder and complete it
        const { data: pendingReorder } = await supabase
          .from('material_reorders' as any)
          .select('id')
          .eq('inventory_id', material.id)
          .eq('status', 'pending')
          .single();

        if (pendingReorder) {
          await supabase
            .from('material_reorders' as any)
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', pendingReorder.id);
        }

        toast({
          title: "Success",
          description: `Material added: ${pieces} piece${pieces > 1 ? 's' : ''} × ${length}mm = ${totalMm}mm total`
        });

        // Reset form
        setLengthMm('');
        setQuantityPieces('1');
        setSupplierId('');
        setUnitPrice('');
        setLocation('');
        setNotes('');
        setAdjustmentType('add');
        
        onSuccess();
        onClose();
      } catch (error: any) {
        console.error('Error adjusting material:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to adjust material quantity",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Validation for subtract - check if at least one removal has length entered
      const removalsWithLength = Object.entries(removalData).filter(
        ([_, data]) => data.length && parseFloat(data.length) > 0
      );

      if (removalsWithLength.length === 0) {
        toast({
          title: "Error",
          description: "Please enter length to remove for at least one addition",
          variant: "destructive"
        });
        return;
      }

      // Validate each removal
      let totalToRemove = 0;
      for (const [addId, data] of removalsWithLength) {
        const lengthToRemove = parseFloat(data.length);
        const addition = availableAdditions.find((add: any) => add.id === addId);
        
        if (!addition) continue;
        
        if (lengthToRemove > addition.remainingMm) {
          toast({
            title: "Error",
            description: `Cannot remove ${lengthToRemove}mm from addition (only ${addition.remainingMm.toFixed(0)}mm available)`,
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
        
        totalToRemove += lengthToRemove;
      }

      // Calculate new quantity
      const currentQty = material.quantity || 0;
      const newQty = currentQty - totalToRemove;

      if (newQty < 0) {
        toast({
          title: "Error",
          description: "Cannot subtract more than current quantity",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(true);

      try {
        // Update inventory quantity
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ quantity: newQty })
          .eq('id', material.id);

        if (updateError) throw updateError;

        // Create subtract adjustments for each removal
        const subtractPromises = removalsWithLength.map(([addId, data]) => {
          const lengthToRemove = parseFloat(data.length);
          return supabase
            .from('material_adjustments')
            .insert({
              inventory_id: material.id,
              adjustment_type: 'subtract',
              length_mm: lengthToRemove,
              quantity_pieces: 1,
              supplier_id: null,
              unit_price: null,
              price_unit: null,
              location: null,
              created_by_staff_id: staff?.id || null,
              notes: data.notes || null
            });
        });

        const results = await Promise.all(subtractPromises);
        const errors = results.filter(r => r.error);
        
        if (errors.length > 0) {
          throw errors[0].error;
        }

        toast({
          title: "Success",
          description: `Removed ${totalToRemove.toFixed(0)}mm from ${removalsWithLength.length} addition${removalsWithLength.length > 1 ? 's' : ''}`
        });

        // Reset form
        setRemovalData({});
        
        onSuccess();
        onClose();
      } catch (error: any) {
        console.error('Error removing material:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to remove material quantity",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {adjustmentType === 'add' ? 'Add Material Stock' : 'Remove Material Stock'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            {material?.materials_used && (() => {
              const materialInfo = material.materials_used || {};
              const shape = materialInfo?.shape || "";
              const shapeId = materialInfo?.shapeId || null;
              const shapeData = Array.isArray(shapes) ? shapes.find(s => s.id === shapeId || s.name === shape) : null;
              return (
                <ShapeImage 
                  shapeName={shape} 
                  shapeId={shapeId || undefined}
                  imageUrl={shapeData?.image_url || null}
                  size={80}
                />
              );
            })()}
            <div>
              <Label className="text-base font-semibold">{material?.name}</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Current quantity: {material?.quantity || 0} mm total
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={adjustmentType === 'add' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setAdjustmentType('add');
                setRemovalData({});
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stock
            </Button>
            <Button
              type="button"
              variant={adjustmentType === 'subtract' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setAdjustmentType('subtract');
                fetchAvailableAdditions();
                if (material?.id) {
                  fetchMaterialProfile();
                }
              }}
            >
              <Minus className="h-4 w-4 mr-2" />
              Remove Stock
            </Button>
          </div>

          {adjustmentType === 'add' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="length">Length (mm) *</Label>
                  <Input
                    id="length"
                    type="number"
                    min="0"
                    step="0.1"
                    value={lengthMm || ""}
                    onChange={(e) => setLengthMm(e.target.value)}
                    placeholder="0"
                    className="w-[120px]"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pieces">Quantity (pieces) *</Label>
                  <Input
                    id="pieces"
                    type="number"
                    min="1"
                    value={quantityPieces || ""}
                    onChange={(e) => setQuantityPieces(e.target.value)}
                    placeholder="0"
                    className="w-[120px]"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
              </div>

              {lengthMm && quantityPieces && (
                <div className="p-3 bg-muted rounded-md text-sm">
                  <strong>Total:</strong> {parseInt(quantityPieces)} piece{parseInt(quantityPieces) > 1 ? 's' : ''} × {parseFloat(lengthMm)}mm = {(parseFloat(lengthMm) * parseInt(quantityPieces)).toFixed(1)}mm
                </div>
              )}
            </>
          ) : (
            <>
              {availableAdditions.length === 0 ? (
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">No available stock to remove</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select additions to remove from:</Label>
                  <ScrollArea className="h-[400px] border rounded-md p-4">
                    <div className="space-y-4">
                      {availableAdditions.map((add: any) => {
                        const supplierName = suppliers.find(s => s.id === add.supplier_id)?.name || 'N/A';
                        const removal = removalData[add.id] || { length: '', notes: '' };
                        const remainingMeters = add.remainingMm / 1000;
                        let addKg = 0;
                        let addValue = 0;
                        
                        if (materialProfile?.kg_per_meter) {
                          addKg = remainingMeters * materialProfile.kg_per_meter;
                        }
                        
                        if (add.price_unit === 'per_meter' && add.unit_price) {
                          addValue = remainingMeters * add.unit_price;
                        } else if (add.price_unit === 'per_kg' && add.unit_price && addKg > 0) {
                          addValue = addKg * add.unit_price;
                        }
                        
                        const supplier = suppliers.find(s => s.id === add.supplier_id);
                        const currency = supplier?.currency || 'EUR';
                        
                        return (
                          <div
                            key={add.id}
                            className="p-3 border rounded-md"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                              {/* Column 1: Basic Info */}
                              <div className="space-y-1">
                                <div className="font-medium text-sm">
                                  {add.quantity_pieces} piece{add.quantity_pieces > 1 ? 's' : ''} × {add.length_mm}mm
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Remaining: {add.remainingMm.toFixed(0)}mm
                                </div>
                                {/* Weight display */}
                                <div className="text-xs font-semibold text-blue-600">
                                  {materialProfile?.kg_per_meter ? (
                                    addKg > 0 ? `${addKg.toFixed(2)} kg` : '0.00 kg'
                                  ) : 'N/A'}
                                </div>
                                {/* Price/Value display */}
                                <div className="text-xs font-semibold text-blue-600">
                                  {add.unit_price && add.price_unit ? (
                                    addValue > 0 ? `${getCurrencySymbol(currency)}${addValue.toFixed(2)}` : `${getCurrencySymbol(currency)}0.00`
                                  ) : 'N/A'}
                                </div>
                              </div>
                              
                              {/* Column 2: Details */}
                              <div className="space-y-1 text-xs text-muted-foreground">
                                {supplierName !== 'N/A' && <div>Supplier: {supplierName}</div>}
                                {add.location && <div>Location: {add.location}</div>}
                                {add.unit_price && (
                                  <div>
                                    Price: {add.unit_price.toFixed(2)} /{add.price_unit === 'per_kg' ? 'kg' : 'm'}
                                  </div>
                                )}
                                <div>Added: {format(new Date(add.created_at), "MMM d, yyyy")}</div>
                                {add.notes && <div className="italic">Notes: {add.notes}</div>}
                              </div>
                              
                              {/* Column 3: Empty for spacing */}
                              <div></div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                              <div className="space-y-1">
                                <Label htmlFor={`remove-length-${add.id}`} className="text-xs">
                                  Length to Remove (mm)
                                </Label>
                                <Input
                                  id={`remove-length-${add.id}`}
                                  type="number"
                                  min="0"
                                  max={add.remainingMm}
                                  step="0.1"
                                  value={removal.length || ""}
                                  placeholder="0"
                                  className="w-[120px]"
                                  onWheel={(e) => e.currentTarget.blur()}
                                  onChange={(e) => {
                                    setRemovalData({
                                      ...removalData,
                                      [add.id]: {
                                        ...removal,
                                        length: e.target.value
                                      }
                                    });
                                  }}
                                  placeholder="0"
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`remove-notes-${add.id}`} className="text-xs">
                                  Notes
                                </Label>
                                <Input
                                  id={`remove-notes-${add.id}`}
                                  type="text"
                                  value={removal.notes}
                                  onChange={(e) => {
                                    setRemovalData({
                                      ...removalData,
                                      [add.id]: {
                                        ...removal,
                                        notes: e.target.value
                                      }
                                    });
                                  }}
                                  placeholder="Optional"
                                  className="h-8"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  
                  {/* Summary Footer */}
                  {availableAdditions.length > 0 && (() => {
                    const totalRemainingMm = availableAdditions.reduce((sum, add) => sum + add.remainingMm, 0);
                    const totalRemainingMeters = totalRemainingMm / 1000;
                    
                    // Calculate total weight in kg using material's kg_per_meter
                    let totalKg = 0;
                    if (materialProfile?.kg_per_meter) {
                      totalKg = totalRemainingMeters * materialProfile.kg_per_meter;
                    }
                    
                    // Calculate total value
                    let totalValue = 0;
                    availableAdditions.forEach((add: any) => {
                      if (add.price_unit === 'per_meter' && add.unit_price) {
                        // If priced per meter, calculate value directly
                        totalValue += (add.remainingMm / 1000) * add.unit_price;
                      } else if (add.price_unit === 'per_kg' && add.unit_price && materialProfile?.kg_per_meter) {
                        // If priced per kg, calculate weight first then value
                        const addMeters = add.remainingMm / 1000;
                        const addKg = addMeters * materialProfile.kg_per_meter;
                        totalValue += addKg * add.unit_price;
                      }
                    });
                    
                    // Get currency from first addition's supplier or default to EUR
                    const firstAddition = availableAdditions[0];
                    const firstSupplier = suppliers.find(s => s.id === firstAddition?.supplier_id);
                    const currency = firstSupplier?.currency || 'EUR';
                    
                    return (
                      <div className="mt-4 pt-4 border-t-2 border-gray-400">
                        <div className="grid grid-cols-3 gap-4 text-sm font-medium">
                          <div>
                            <span className="text-muted-foreground block mb-1">Total Remaining:</span>
                            <div className="text-lg font-semibold">{totalRemainingMeters.toFixed(2)} m</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-1">Total Weight:</span>
                            <div className="text-lg font-semibold">
                              {totalKg > 0 ? `${totalKg.toFixed(2)} kg` : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-1">Total Value:</span>
                            <div className="text-lg font-semibold">
                              {totalValue > 0 ? `${getCurrencySymbol(currency)}${totalValue.toFixed(2)}` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {adjustmentType === 'add' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select 
                  value={supplierId} 
                  onValueChange={(value) => {
                    setSupplierId(value);
                    const selectedSupplier = suppliers.find(s => s.id === value);
                    if (selectedSupplier) {
                      const supplierCurrency = selectedSupplier.currency || 
                        (selectedSupplier.country ? getCurrencyForCountry(selectedSupplier.country) : 'EUR');
                      setCurrency(supplierCurrency);
                    }
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      id="unitPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitPrice || ""}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-[120px]"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPriceUnit(priceUnit === 'per_kg' ? 'per_meter' : 'per_kg')}
                      className="whitespace-nowrap"
                    >
                      {getCurrencySymbol(currency)}/{priceUnit === 'per_kg' ? 'kg' : 'm'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.name}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this stock (optional)"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (adjustmentType === 'subtract' && availableAdditions.length === 0)}>
            {isSubmitting ? 'Saving...' : (adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
