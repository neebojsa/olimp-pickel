import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Package, Wrench, ShoppingCart, TrendingUp, FileText, Printer } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

interface HistoryEntry {
  date: string;
  time: string;
  activity: string;
  details?: string;
  reference?: string;
}

interface PartHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  historyData: HistoryEntry[];
}

export default function PartHistoryDialog({ isOpen, onClose, item, historyData }: PartHistoryDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  const getActivityIcon = (activity: string) => {
    switch (activity.toLowerCase()) {
      case "created in system":
        return <Package className="h-4 w-4 text-blue-600" />;
      case "work order created":
        return <Wrench className="h-4 w-4 text-orange-600" />;
      case "work order completed":
        return <Wrench className="h-4 w-4 text-green-600" />;
      case "sold":
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case "ordered":
        return <ShoppingCart className="h-4 w-4 text-purple-600" />;
      case "stock added":
        return <Package className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {item?.category === "Materials" ? "Material Details" : "Part History"} - {item?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="font-semibold">{item?.name}</h3>
                {item?.part_number && (
                  <p className="text-sm text-muted-foreground">Part #: {item.part_number}</p>
                )}
                {item?.description && item.description.trim() && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
              <Button onClick={handlePrint} variant="outline" className="no-print">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {historyData.length > 0 ? (
                  historyData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg shadow-sm hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {getActivityIcon(entry.activity)}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{entry.date}</span>
                          <Clock className="h-3 w-3 ml-2" />
                          <span>{entry.time}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{entry.activity}</p>
                        {entry.details && (
                          <p className="text-sm text-muted-foreground">{entry.details}</p>
                        )}
                        {entry.reference && (
                          <p className="text-xs text-muted-foreground">Ref: {entry.reference}</p>
                        )}
                        {entry.createdBy && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                            User: {entry.createdBy}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No history records found for this part.</p>
                    <p className="text-sm">History tracking will show future activities.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 1in;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .max-h-\\[60vh\\] {
            max-height: none !important;
          }
          
          .overflow-y-auto {
            overflow: visible !important;
          }
          
          .max-w-4xl {
            max-width: 100% !important;
          }
          
          .space-y-2 > * + * {
            margin-top: 0.5rem !important;
          }
          
          .border {
            border: 1px solid #e5e7eb !important;
          }
          
          .text-muted-foreground {
            color: #6b7280 !important;
          }
          
          .bg-muted\\/50:hover {
            background: none !important;
          }
          
          .transition-colors {
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
}