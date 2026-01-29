import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SortOption {
  id: string;
  label: string;
  field: string;
  direction: "asc" | "desc";
}

export interface SortSelectProps {
  value?: string; // Format: "field:direction" e.g. "name:asc"
  onChange: (value: string) => void;
  options: SortOption[];
  placeholder?: string;
  className?: string;
}

export function SortSelect({ value, onChange, options, placeholder = "Sort", className }: SortSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={`${option.field}:${option.direction}`}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
