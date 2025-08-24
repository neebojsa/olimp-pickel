import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Material } from '@/types';

interface ViewMaterialDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: Material | null;
}

const ViewMaterialDialog = ({ open, setOpen, item }: ViewMaterialDialogProps) => {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Material Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <Badge variant="secondary">{item.category}</Badge>
          </div>
          
          <div className="grid gap-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span>{item.quantity}</span>
            </div>
            
            {item.price && item.priceUnit && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span>${item.price}/{item.priceUnit}</span>
              </div>
            )}
            
            {item.surfaceFinish && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Surface Finish:</span>
                <span>{item.surfaceFinish}</span>
              </div>
            )}
            
            {item.shape && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shape:</span>
                <span>{item.shape}</span>
              </div>
            )}
            
            {item.material && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material:</span>
                <span>{item.material}</span>
              </div>
            )}
          </div>

          {item.dimensions && Object.keys(item.dimensions).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Dimensions:</h4>
              <div className="grid gap-1">
                {Object.entries(item.dimensions).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key}:</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewMaterialDialog;