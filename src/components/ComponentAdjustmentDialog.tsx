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
import { ShapeImage } from "@/components/ShapeImage";
import { NumericInput } from "@/components/NumericInput";
import { getCurrencyForCountry } from "@/lib/currencyUtils";

interface ComponentAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  component: any;
  onSuccess: () => void;
  initialType?: 'add' | 'subtract';
}

export function ComponentAdjustmentDialog({ isOpen, onClose, component, onSuccess, initialType = 'add' }: ComponentAdjustmentDialogProps) {
  const { staff, canSeePrices } = useAuth();
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>(initialType);
  const [quantity, setQuantity] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [currency, setCurrency] = useState<string>('EUR');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shapes, setShapes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, country, currency')
        .order('name', { ascending: true });
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Error fetching stock locations:', error);
    }
  };

  const fetchShapes = async () => {
    try {
      const { data, error } = await supabase
        .from('shapes' as any)
        .select('id, name, image_url, updated_at');
      if (error) {
        console.error('Error fetching shapes:', error);
        return;
      }
      if (data) {
        setShapes(data);
      }
    } catch (error: any) {
      console.error('Error fetching shapes:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShapes();
      fetchSuppliers();
      fetchStockLocations();
      // Reset form when dialog opens
      setQuantity('');
      setNotes('');
      setSupplierId('');
      setCurrency('EUR');
      setUnitPrice('');
      setLocation('');
      setAdjustmentType(initialType);
    }
  }, [isOpen, initialType]);

  const handleSubmit = async () => {
    if (!component?.id) {
      toast({
        title: "Error",
        description: "Component not found",
        variant: "destructive"
      });
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const currentQty = component.quantity || 0;
      let newQty: number;

      if (adjustmentType === 'add') {
        newQty = currentQty + quantityNum;
      } else {
        // Subtract
        if (quantityNum > currentQty) {
          toast({
            title: "Error",
            description: `Cannot subtract more than current quantity (${currentQty})`,
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
        newQty = currentQty - quantityNum;
      }

      // Update inventory
      const updatePayload: Record<string, unknown> = { quantity: newQty };
      if (adjustmentType === 'add') {
        const supplierName = supplierId ? (suppliers.find(s => s.id === supplierId)?.name || null) : null;
        updatePayload.supplier = supplierName;
        updatePayload.currency = currency || null;
        updatePayload.unit_price = canSeePrices() && unitPrice ? parseFloat(unitPrice) || 0 : (component.unit_price ?? 0);
        updatePayload.location = location || null;
      }

      const { error: updateError } = await supabase
        .from('inventory')
        .update(updatePayload)
        .eq('id', component.id);

      if (updateError) throw updateError;

      // Create adjustment record
      const adjustmentPayload: Record<string, unknown> = {
        inventory_id: component.id,
        adjustment_type: adjustmentType,
        length_mm: 0, // Components use quantity_pieces, not length
        quantity_pieces: quantityNum,
        created_by_staff_id: staff?.id || null,
        notes: notes || null
      };
      if (adjustmentType === 'add') {
        adjustmentPayload.supplier_id = supplierId || null;
        adjustmentPayload.unit_price = canSeePrices() && unitPrice ? parseFloat(unitPrice) : null;
        adjustmentPayload.price_unit = null; // Components are per piece
        adjustmentPayload.location = location || null;
      } else {
        adjustmentPayload.supplier_id = null;
        adjustmentPayload.unit_price = null;
        adjustmentPayload.price_unit = null;
        adjustmentPayload.location = null;
      }

      const { error: adjustmentError } = await supabase
        .from('material_adjustments')
        .insert(adjustmentPayload);

      if (adjustmentError) {
        console.error('Error creating adjustment record:', adjustmentError);
        // Don't fail the whole operation if adjustment record fails
      }

      toast({
        title: "Success",
        description: `${adjustmentType === 'add' ? 'Added' : 'Removed'} ${quantityNum} ${component.unit || 'piece'}${quantityNum !== 1 ? 's' : ''}`
      });

      // Reset form
      setQuantity('');
      setNotes('');
      setSupplierId('');
      setCurrency('EUR');
      setUnitPrice('');
      setLocation('');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adjusting component:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to adjust component quantity",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {adjustmentType === 'add' ? 'Add Component Stock' : 'Remove Component Stock'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            {component?.materials_used && (() => {
              const materialInfo = component.materials_used || {};
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
              <Label className="text-base font-semibold">{component?.name}</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Current quantity: {component?.quantity || 0} {component?.unit || 'piece'}{component?.quantity !== 1 ? 's' : ''}
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
                setQuantity('');
                setSupplierId('');
                setCurrency('EUR');
                setUnitPrice('');
                setLocation('');
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
            <Button
              type="button"
              variant={adjustmentType === 'subtract' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setAdjustmentType('subtract');
                setQuantity('');
              }}
            >
              <Minus className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity to {adjustmentType === 'add' ? 'Add' : 'Remove'} *
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="1"
                value={quantity}
                placeholder="0"
                onChange={(e) => setQuantity(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
              />
              <p className="text-xs text-muted-foreground">
                {adjustmentType === 'subtract' && component?.quantity && (
                  <>Maximum: {component.quantity} {component?.unit || 'piece'}{component.quantity !== 1 ? 's' : ''}</>
                )}
              </p>
            </div>

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

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                      <SelectItem value="CHF">CHF (₣)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                      <SelectItem value="CNY">CNY (¥)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="BAM">KM (BAM)</SelectItem>
                      <SelectItem value="RSD">RSD (РСД)</SelectItem>
                      <SelectItem value="PLN">PLN (zł)</SelectItem>
                      <SelectItem value="CZK">CZK (Kč)</SelectItem>
                      <SelectItem value="SEK">SEK (kr)</SelectItem>
                      <SelectItem value="NOK">NOK (kr)</SelectItem>
                      <SelectItem value="DKK">DKK (kr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {canSeePrices() && (
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Unit Price</Label>
                    <NumericInput
                      id="unit_price"
                      value={unitPrice ? parseFloat(unitPrice) : 0}
                      onChange={(val) => setUnitPrice(val.toString())}
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                    />
                  </div>
                )}

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
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this adjustment..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
