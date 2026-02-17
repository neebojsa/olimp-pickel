import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PRESET_UNITS = ["piece", "meter", "kWh", "kg"];

interface UnitSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function UnitSelect({ value, onValueChange, disabled, className }: UnitSelectProps) {
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const { toast } = useToast();

  const fetchCustomUnits = async () => {
    const { data } = await supabase.from("custom_units").select("name").order("name");
    setCustomUnits((data || []).map((r) => r.name));
  };

  useEffect(() => {
    fetchCustomUnits();
  }, []);

  const allUnits = [...PRESET_UNITS, ...customUnits];

  const handleAddUnit = async () => {
    const trimmed = newUnitName.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Please enter a unit name", variant: "destructive" });
      return;
    }
    if (PRESET_UNITS.includes(trimmed.toLowerCase())) {
      toast({ title: "Error", description: "This unit already exists as a preset", variant: "destructive" });
      return;
    }
    if (customUnits.some((u) => u.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Error", description: "This unit already exists", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("custom_units").insert({ name: trimmed });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Error", description: "This unit already exists", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to add unit", variant: "destructive" });
      }
      return;
    }
    await fetchCustomUnits();
    onValueChange(trimmed);
    setNewUnitName("");
    setIsAddOpen(false);
    toast({ title: "Unit Added", description: `"${trimmed}" has been saved for future use.` });
  };

  return (
    <div className={className}>
      <Select
        value={value && value !== "__add__" ? value : "piece"}
        onValueChange={(v) => {
          if (v === "__add__") {
            setIsAddOpen(true);
          } else {
            onValueChange(v);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="piece" />
        </SelectTrigger>
        <SelectContent>
          {allUnits.map((u) => (
            <SelectItem key={u} value={u}>
              {u}
            </SelectItem>
          ))}
          <SelectItem value="__add__" className="text-primary font-medium">
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add new unit
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Add new unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Label>Unit name</Label>
            <Input
              placeholder="e.g. liter, box"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddUnit()}
            />
            <Button size="sm" onClick={handleAddUnit} className="w-full">
              Add & use
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
