import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart } from "lucide-react";

interface MaterialReorderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  material: any;
  onSuccess: () => void;
}

export function MaterialReorderDialog({ isOpen, onClose, material, onSuccess }: MaterialReorderDialogProps) {
  const [lengthMm, setLengthMm] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    // Validation
    if (!lengthMm || parseFloat(lengthMm) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid length",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if there's already a pending reorder
      const { data: existingReorder } = await supabase
        .from('material_reorders' as any)
        .select('id')
        .eq('inventory_id', material.id)
        .eq('status', 'pending')
        .single();

      if (existingReorder) {
        toast({
          title: "Error",
          description: "This material already has a pending reorder",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Create reorder
      const { error } = await supabase
        .from('material_reorders' as any)
        .insert({
          inventory_id: material.id,
          length_mm: parseFloat(lengthMm),
          notes: notes || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Reorder created for ${lengthMm}mm`
      });

      // Reset form
      setLengthMm('');
      setNotes('');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating reorder:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create reorder",
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
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Mark Material for Reorder
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-base font-semibold">{material?.name}</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Mark this material to get a quote for reordering
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="length">Length to Reorder (mm) *</Label>
            <Input
              id="length"
              type="number"
              min="0"
              step="0.1"
              value={lengthMm}
              onChange={(e) => setLengthMm(e.target.value)}
              placeholder="e.g. 3000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this reorder (optional)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Reorder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
