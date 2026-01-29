import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/dateUtils";

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateItem: {
    id: string;
    name: string;
    part_number?: string | null;
    created_at: string;
  } | null;
  onSaveAnyway?: () => void;
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  duplicateItem,
  onSaveAnyway,
}: DuplicateWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Detected</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              An item with identical data already exists in the system.
            </p>
            {duplicateItem && (
              <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
                <p className="font-semibold">Existing Item:</p>
                <p><strong>Name:</strong> {duplicateItem.name}</p>
                {duplicateItem.part_number && (
                  <p><strong>Part #:</strong> {duplicateItem.part_number}</p>
                )}
                <p><strong>Created:</strong> {formatDate(duplicateItem.created_at)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  ID: {duplicateItem.id}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Please review the existing item or modify your data to create a unique entry.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          {onSaveAnyway && (
            <AlertDialogAction
              onClick={onSaveAnyway}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Save Anyway
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
