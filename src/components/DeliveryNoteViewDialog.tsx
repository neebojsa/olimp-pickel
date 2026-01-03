import { Dialog, DialogContent } from "@/components/ui/dialog";
import DeliveryNoteView from "@/pages/DeliveryNoteView";

interface DeliveryNoteViewDialogProps {
  deliveryNoteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeliveryNoteViewDialog({ deliveryNoteId, open, onOpenChange }: DeliveryNoteViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[240mm] !w-auto max-h-[90vh] overflow-y-auto print:!max-w-none print:!w-full print:!h-full print:!max-h-none print:!p-0 print:!m-0 print:!shadow-none print:!border-none print:!rounded-none">
        <DeliveryNoteView deliveryNoteId={deliveryNoteId} hideBackButton={true} inDialog={true} />
      </DialogContent>
    </Dialog>
  );
}

