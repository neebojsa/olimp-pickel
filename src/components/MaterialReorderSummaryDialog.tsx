import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MaterialReorderSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReorderItem {
  materialName: string;
  lengthMm: number;
}

// Translation function for Serbian
const translateToSerbian = (materialName: string): string => {
  // Translate surface finishes (must match exactly as they appear in material names)
  const surfaceFinishTranslations: { [key: string]: string } = {
    "Cold Drawn": "Hladno vučena",
    "Hot Rolled": "Vruće valjana",
    "Polished": "Polirana",
    "Chromed": "Hromirana",
    "Hardened+Chromed": "Kaljena+hromirana"
  };

  // Translate shapes (lowercase versions as they appear in material names)
  const shapeTranslations: { [key: string]: string } = {
    "round bar": "okrugla šipka",
    "square bar": "kvadratna šipka",
    "rectangular bar": "pravougaona šipka",
    "hex bar": "šestougaona šipka",
    "round tube": "okrugla cev",
    "square tube": "kvadratna cev",
    "rectangular tube": "pravougaona cev",
    "sheet": "lim",
    "angle": "ugaona šipka",
    "channel": "šina",
    "i-beam": "I-profila",
    "upn": "šina",
    "hea": "I-profila",
    "heb": "I-profila"
  };

  let translated = materialName;

  // Replace surface finishes first (they appear at the beginning)
  // Format: "Hot Rolled round bar..." -> "Vruće valjana round bar..."
  Object.entries(surfaceFinishTranslations).forEach(([en, sr]) => {
    // Match at the start of string, case-insensitive
    const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}\\s+`, 'i');
    translated = translated.replace(regex, `${sr} `);
  });

  // Replace shapes (they appear after surface finish)
  // Format: "...round bar..." -> "...okrugla šipka..."
  Object.entries(shapeTranslations).forEach(([en, sr]) => {
    // Match whole words, case-insensitive
    const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    translated = translated.replace(regex, sr);
  });

  return translated;
};

export function MaterialReorderSummaryDialog({ isOpen, onClose }: MaterialReorderSummaryDialogProps) {
  const [reorderItems, setReorderItems] = useState<ReorderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchReorderSummary();
    }
  }, [isOpen]);

  const fetchReorderSummary = async () => {
    setIsLoading(true);
    try {
      // Fetch all pending reorders with material information
      const { data: reorders, error: reordersError } = await supabase
        .from('material_reorders' as any)
        .select('id, inventory_id, length_mm, status')
        .eq('status', 'pending');

      if (reordersError) throw reordersError;

      if (!reorders || reorders.length === 0) {
        setReorderItems([]);
        setIsLoading(false);
        return;
      }

      // Get unique inventory IDs
      const inventoryIds = [...new Set((reorders as any[]).map(r => r.inventory_id))];

      // Fetch material inventory items
      const { data: materials, error: materialsError } = await supabase
        .from('inventory')
        .select('id, name, materials_used')
        .in('id', inventoryIds)
        .eq('category', 'Materials');

      if (materialsError) throw materialsError;

      // Map reorders to materials
      const items: ReorderItem[] = [];
      (reorders as any[]).forEach((reorder: any) => {
        const material = (materials || []).find((m: any) => m.id === reorder.inventory_id);
        if (material) {
          items.push({
            materialName: material.name || '',
            lengthMm: reorder.length_mm || 0
          });
        }
      });

      setReorderItems(items);
    } catch (error: any) {
      console.error('Error fetching reorder summary:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch reorder summary",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummaryText = (): string => {
    return reorderItems
      .map(item => {
        const translatedName = translateToSerbian(item.materialName);
        return `${translatedName} --- ${item.lengthMm} mm`;
      })
      .join('\n');
  };

  const handleCopy = async () => {
    const text = generateSummaryText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Reorder summary copied to clipboard"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Pregled narudžbi za nabavku</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Loading reorders...</p>
              </div>
            ) : reorderItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No pending reorders</p>
              </div>
            ) : (
              reorderItems.map((item, index) => {
                const translatedName = translateToSerbian(item.materialName);
                return (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-muted/50 font-mono text-sm"
                  >
                    {translatedName} --- {item.lengthMm} mm
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
