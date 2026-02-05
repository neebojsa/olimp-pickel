import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ShapeImage } from "@/components/ShapeImage";

interface ComponentAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  component: any;
  onSuccess: () => void;
  initialType?: 'add' | 'subtract';
}

export function ComponentAdjustmentDialog({ isOpen, onClose, component, onSuccess, initialType = 'add' }: ComponentAdjustmentDialogProps) {
  const { staff } = useAuth();
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>(initialType);
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shapes, setShapes] = useState<any[]>([]);
  const { toast } = useToast();

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
      // Reset form when dialog opens
      setQuantity('');
      setNotes('');
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

      // Update inventory quantity
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newQty })
        .eq('id', component.id);

      if (updateError) throw updateError;

      // Create adjustment record (simpler than materials - just quantity)
      const { error: adjustmentError } = await supabase
        .from('material_adjustments')
        .insert({
          inventory_id: component.id,
          adjustment_type: adjustmentType,
          length_mm: null,
          quantity_pieces: quantityNum,
          supplier_id: null,
          unit_price: null,
          price_unit: null,
          location: null,
          created_by_staff_id: staff?.id || null,
          notes: notes || null
        });

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
      <DialogContent className="sm:max-w-[500px]">
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
