import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Material } from '@/types';
import { updateMaterial } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";

interface EditMaterialDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: Material | null;
  onMaterialUpdated: () => void;
}

const EditMaterialDialog = ({ open, setOpen, item, onMaterialUpdated }: EditMaterialDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    price: '',
    priceUnit: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        category: item.category || '',
        quantity: item.quantity || 0,
        price: item.price?.toString() || '',
        priceUnit: item.priceUnit || ''
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    try {
      await updateMaterial(item.id, {
        ...item,
        name: formData.name,
        category: formData.category,
        quantity: formData.quantity,
        price: formData.price ? parseFloat(formData.price) : undefined,
        priceUnit: formData.priceUnit
      });
      
      toast({
        title: "Success",
        description: "Material updated successfully.",
      });
      
      setOpen(false);
      onMaterialUpdated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update material. Please try again.",
      });
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Material</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="steel">Steel</SelectItem>
                <SelectItem value="aluminum">Aluminum</SelectItem>
                <SelectItem value="plastic">Plastic</SelectItem>
                <SelectItem value="wood">Wood</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priceUnit">Unit</Label>
              <Select value={formData.priceUnit} onValueChange={(value) => setFormData({ ...formData, priceUnit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="meter">meter</SelectItem>
                  <SelectItem value="piece">piece</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMaterialDialog;