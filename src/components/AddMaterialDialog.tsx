import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MaterialForm, MaterialData } from "@/components/MaterialForm";
import { useState } from "react";
import { createMaterial } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";

interface AddMaterialDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onMaterialAdded: () => void;
}

const AddMaterialDialog = ({ open, setOpen, onMaterialAdded }: AddMaterialDialogProps) => {
  const [materialData, setMaterialData] = useState<MaterialData | null>(null);
  const { toast } = useToast();

  const handleMaterialChange = (data: MaterialData) => {
    setMaterialData(data);
  };

  const handleSave = async () => {
    if (!materialData) return;

    try {
      await createMaterial({
        name: materialData.generatedName,
        category: materialData.material.toLowerCase(),
        quantity: 0,
        price: undefined,
        priceUnit: materialData.priceUnit,
        surfaceFinish: materialData.surfaceFinish,
        shape: materialData.shape,
        material: materialData.material,
        dimensions: materialData.dimensions
      });
      
      toast({
        title: "Success",
        description: "Material added successfully.",
      });
      
      setOpen(false);
      setMaterialData(null);
      onMaterialAdded();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add material. Please try again.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Material</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <MaterialForm onMaterialChange={handleMaterialChange} />
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!materialData}>
              Add Material
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddMaterialDialog;