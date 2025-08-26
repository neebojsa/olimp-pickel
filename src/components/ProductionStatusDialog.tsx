import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ProductionStatusDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  onSave: (status: string) => void;
  itemName: string;
}

export function ProductionStatusDialog({
  isOpen,
  onOpenChange,
  currentStatus,
  onSave,
  itemName
}: ProductionStatusDialogProps) {
  const [status, setStatus] = useState(currentStatus);

  const handleSave = () => {
    onSave(status);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Production Status - {itemName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="status">Production Status</Label>
            <Textarea
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="Enter production status..."
              rows={4}
              className="mt-2"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}