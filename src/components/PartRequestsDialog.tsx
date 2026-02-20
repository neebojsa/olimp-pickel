import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

export interface PartRequest {
  id: string;
  inventory_id: string;
  requester_first_name: string;
  request_text: string;
  created_at: string;
  status: "active" | "processed" | "cancelled";
}

const getRequestStatusColor = (status: string) => {
  switch (status) {
    case "processed":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "cancelled":
      return "bg-red-500/10 text-red-700 border-red-200";
    case "active":
    default:
      return "bg-blue-500/10 text-blue-700 border-blue-200";
  }
};

interface PartRequestsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  part: { id: string; name: string } | null;
  onRequestsUpdated?: () => void;
}

export function PartRequestsDialog({
  isOpen,
  onClose,
  part,
  onRequestsUpdated,
}: PartRequestsDialogProps) {
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && part?.id) {
      fetchRequests();
    }
  }, [isOpen, part?.id]);

  const fetchRequests = async () => {
    if (!part?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("part_requests" as any)
        .select("id, inventory_id, requester_first_name, request_text, created_at, status")
        .eq("inventory_id", part.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests((data as PartRequest[]) || []);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to load requests",
        variant: "destructive",
      });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: "active" | "processed" | "cancelled") => {
    try {
      const { error } = await supabase
        .from("part_requests" as any)
        .update({ status: newStatus })
        .eq("id", requestId);
      if (error) throw error;
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
      );
      onRequestsUpdated?.();
      toast({
        title: "Status Updated",
        description: `Request marked as ${newStatus}.`,
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Requests - {part?.name || "Part"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests for this part.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3 bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {req.requester_first_name}: {req.request_text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(req.created_at)}
                    </p>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            getRequestStatusColor(req.status || "active"),
                            "cursor-pointer hover:opacity-80 capitalize"
                          )}
                        >
                          {(req.status || "active")}
                        </Badge>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-2" align="end">
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleStatusChange(req.id, "active")}
                        >
                          Active
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleStatusChange(req.id, "processed")}
                        >
                          Processed
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleStatusChange(req.id, "cancelled")}
                        >
                          Cancelled
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
