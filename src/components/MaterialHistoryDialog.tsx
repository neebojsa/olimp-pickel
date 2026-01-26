import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getCurrencySymbol } from "@/lib/currencyUtils";

interface MaterialHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  material: any;
}

interface MaterialAdjustment {
  id: string;
  adjustment_type: 'add' | 'subtract';
  length_mm: number;
  quantity_pieces: number;
  supplier_id: string | null;
  unit_price: number | null;
  price_unit: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export function MaterialHistoryDialog({ isOpen, onClose, material }: MaterialHistoryDialogProps) {
  const [adjustments, setAdjustments] = useState<MaterialAdjustment[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [materialProfile, setMaterialProfile] = useState<any>(null);
  const [additionsForPricing, setAdditionsForPricing] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && material?.id) {
      // Reset state when opening
      setMaterialProfile(null);
      setAdjustments([]);
      setAdditionsForPricing([]);
      fetchAdjustments();
      fetchSuppliers();
      fetchMaterialProfile();
      fetchAdditionsForPricing();
    } else if (!isOpen) {
      // Reset state when closing
      setMaterialProfile(null);
      setAdjustments([]);
      setAdditionsForPricing([]);
    }
  }, [isOpen, material?.id]);

  // Re-fetch profile when material changes
  useEffect(() => {
    if (isOpen && material?.id && !materialProfile) {
      fetchMaterialProfile();
    }
  }, [isOpen, material?.id, materialProfile]);

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
        .select('id, name, currency');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchAdditionsForPricing = async () => {
    if (!material?.id) return;
    try {
      const { data, error } = await supabase
        .from('material_adjustments' as any)
        .select('*')
        .eq('inventory_id', material.id)
        .eq('adjustment_type', 'add')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAdditionsForPricing(data || []);
    } catch (error) {
      console.error('Error fetching additions for pricing:', error);
    }
  };

  const fetchAdjustments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('material_adjustments')
        .select('*')
        .eq('inventory_id', material.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAdjustments(data || []);
    } catch (error: any) {
      console.error('Error fetching material history:', error);
      toast({
        title: "Error",
        description: "Failed to load adjustment history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate value for a removal based on FIFO logic
  const calculateRemovalValue = (removal: MaterialAdjustment): number => {
    if (!materialProfile?.kg_per_meter) return 0;
    
    const removalMm = removal.length_mm * removal.quantity_pieces;
    const removalMeters = removalMm / 1000;
    const removalKg = removalMeters * materialProfile.kg_per_meter;
    
    // Find additions that existed before this removal
    const removalDate = new Date(removal.created_at);
    const additionsBeforeRemoval = additionsForPricing.filter(
      (add: any) => new Date(add.created_at) <= removalDate
    );
    
    if (additionsBeforeRemoval.length === 0) return 0;
    
    // Find all removals that happened before this one to calculate remaining stock
    const removalsBefore = adjustments.filter(
      (adj: any) => adj.adjustment_type === 'subtract' && 
                     new Date(adj.created_at) < removalDate
    );
    
    // Calculate remaining stock per addition using FIFO
    const additionsWithRemaining = additionsBeforeRemoval.map((add: any) => {
      const addTotalMm = add.length_mm * add.quantity_pieces;
      return { ...add, remainingMm: addTotalMm };
    });
    
    // Apply previous removals using FIFO
    const sortedRemovalsBefore = [...removalsBefore].sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let remainingToSubtract = sortedRemovalsBefore.reduce((sum: number, sub: any) => 
      sum + (sub.length_mm * sub.quantity_pieces), 0
    );
    
    for (const add of additionsWithRemaining) {
      if (remainingToSubtract <= 0) break;
      const addTotal = add.remainingMm;
      if (remainingToSubtract >= addTotal) {
        add.remainingMm = 0;
        remainingToSubtract -= addTotal;
      } else {
        add.remainingMm = addTotal - remainingToSubtract;
        remainingToSubtract = 0;
      }
    }
    
    // Now calculate value for this removal using FIFO from remaining additions
    let totalValue = 0;
    let remainingToValue = removalMm;
    
    const sortedAdditions = [...additionsWithRemaining].sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    for (const add of sortedAdditions) {
      if (remainingToValue <= 0) break;
      if (add.remainingMm <= 0) continue;
      if (!add.unit_price || !add.price_unit) continue;
      
      const usedMm = Math.min(remainingToValue, add.remainingMm);
      const usedMeters = usedMm / 1000;
      const usedKg = usedMeters * materialProfile.kg_per_meter;
      
      let addValue = 0;
      if (add.price_unit === 'per_meter') {
        addValue = usedMeters * add.unit_price;
      } else if (add.price_unit === 'per_kg') {
        addValue = usedKg * add.unit_price;
      }
      
      totalValue += addValue;
      remainingToValue -= usedMm;
    }
    
    return totalValue;
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return null;
    return suppliers.find(s => s.id === supplierId)?.name;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Material History
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold">{material?.name}</p>
            <p className="text-sm font-semibold text-blue-600">
              Current quantity: {material?.quantity || 0} mm
              {materialProfile?.kg_per_meter && (() => {
                const currentMeters = (material?.quantity || 0) / 1000;
                const currentKg = currentMeters * materialProfile.kg_per_meter;
                return ` | ${currentKg.toFixed(2)} kg`;
              })()}
            </p>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">Loading history...</p>
              </div>
            ) : adjustments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No adjustment history yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the + and - buttons to adjust material quantity
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {adjustments.map((adjustment) => {
                  const totalMm = adjustment.length_mm * adjustment.quantity_pieces;
                  const totalMeters = totalMm / 1000;
                  const supplierName = getSupplierName(adjustment.supplier_id);
                  let totalKg = 0;
                  let totalValue = 0;
                  
                  // Calculate weight using material profile
                  if (materialProfile?.kg_per_meter) {
                    totalKg = totalMeters * materialProfile.kg_per_meter;
                  }
                  
                  // Calculate value based on price unit
                  if (adjustment.adjustment_type === 'add') {
                    // For additions, use stored price
                    if (adjustment.unit_price && adjustment.price_unit) {
                      if (adjustment.price_unit === 'per_meter') {
                        totalValue = totalMeters * adjustment.unit_price;
                      } else if (adjustment.price_unit === 'per_kg' && totalKg > 0) {
                        totalValue = totalKg * adjustment.unit_price;
                      }
                    }
                  } else {
                    // For removals, calculate value based on FIFO from additions
                    totalValue = calculateRemovalValue(adjustment);
                  }
                  
                  // Get currency from supplier or default to EUR
                  // For removals, try to get currency from the additions used
                  let currency = 'EUR';
                  if (adjustment.supplier_id) {
                    const supplier = suppliers.find(s => s.id === adjustment.supplier_id);
                    currency = supplier?.currency || 'EUR';
                  } else if (adjustment.adjustment_type === 'subtract' && additionsForPricing.length > 0) {
                    // For removals without supplier, use currency from first addition
                    const firstAddition = additionsForPricing[0];
                    if (firstAddition.supplier_id) {
                      const supplier = suppliers.find(s => s.id === firstAddition.supplier_id);
                      currency = supplier?.currency || 'EUR';
                    }
                  }
                  
                  return (
                    <div
                      key={adjustment.id}
                      className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="grid grid-cols-3 gap-4">
                        {/* Column 1: Type and Quantity */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {adjustment.adjustment_type === 'add' ? (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Plus className="h-4 w-4" />
                                <span className="font-semibold text-sm">Added</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <Minus className="h-4 w-4" />
                                <span className="font-semibold text-sm">Removed</span>
                              </div>
                            )}
                          </div>
                          <div className="font-medium text-sm">
                            {adjustment.quantity_pieces} piece{adjustment.quantity_pieces > 1 ? 's' : ''} × {adjustment.length_mm}mm
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total: {totalMm}mm
                          </div>
                          {/* Weight display */}
                          <div className="text-xs font-semibold text-blue-600">
                            {materialProfile?.kg_per_meter ? (
                              totalKg > 0 ? `${totalKg.toFixed(2)} kg` : '0.00 kg'
                            ) : 'N/A'}
                          </div>
                          {/* Price/Value display */}
                          <div className="text-xs font-semibold text-blue-600">
                            {adjustment.adjustment_type === 'add' ? (
                              // For additions, check if price info exists
                              adjustment.unit_price && adjustment.price_unit ? (
                                totalValue > 0 ? `${getCurrencySymbol(currency)}${totalValue.toFixed(2)}` : `${getCurrencySymbol(currency)}0.00`
                              ) : 'N/A'
                            ) : (
                              // For removals, always show calculated value if we have material profile
                              materialProfile?.kg_per_meter ? (
                                totalValue > 0 ? `${getCurrencySymbol(currency)}${totalValue.toFixed(2)}` : `${getCurrencySymbol(currency)}0.00`
                              ) : 'N/A'
                            )}
                          </div>
                        </div>
                        
                        {/* Column 2: Details */}
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {supplierName && (
                            <div>
                              <span className="font-medium">Supplier:</span> {supplierName}
                            </div>
                          )}
                          {adjustment.location && (
                            <div>
                              <span className="font-medium">Location:</span> {adjustment.location}
                            </div>
                          )}
                          {adjustment.unit_price && (
                            <div>
                              <span className="font-medium">Price:</span> {adjustment.unit_price.toFixed(2)} /{adjustment.price_unit === 'per_kg' ? 'kg' : 'm'}
                            </div>
                          )}
                          <div>
                            {format(new Date(adjustment.created_at), "MMM d, yyyy 'at' HH:mm")}
                          </div>
                        </div>
                        
                        {/* Column 3: Notes */}
                        <div className="text-xs text-muted-foreground">
                          {adjustment.notes && (
                            <div className="italic">Notes: {adjustment.notes}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
