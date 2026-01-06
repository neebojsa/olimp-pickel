import { Dialog, DialogContent } from "@/components/ui/dialog";
import OrderConfirmationView from "@/pages/OrderConfirmationView";

interface OrderConfirmationViewDialogProps {
  orderConfirmationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderConfirmationViewDialog({ orderConfirmationId, open, onOpenChange }: OrderConfirmationViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[240mm] !w-auto max-h-[90vh] overflow-y-auto print:!max-w-none print:!w-full print:!h-full print:!max-h-none print:!p-0 print:!m-0 print:!shadow-none print:!border-none print:!rounded-none">
        <OrderConfirmationView orderConfirmationId={orderConfirmationId} hideBackButton={true} inDialog={true} />
      </DialogContent>
    </Dialog>
  );
}

