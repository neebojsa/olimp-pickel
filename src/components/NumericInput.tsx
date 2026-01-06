import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

interface NumericInputProps {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  id?: string;
  increment?: number; // Custom increment amount (default: 1 or step)
  decrement?: number; // Custom decrement amount (default: 1 or step)
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  className = "",
  id,
  increment,
  decrement
}: NumericInputProps) {
  const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
  const incAmount = increment ?? step;
  const decAmount = decrement ?? step;

  const handleIncrement = () => {
    const newValue = numValue + incAmount;
    onChange(max !== undefined ? Math.min(newValue, max) : newValue);
  };

  const handleDecrement = () => {
    const newValue = numValue - decAmount;
    onChange(min !== undefined ? Math.max(newValue, min) : newValue);
  };

  return (
    <div className="relative w-40">
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => {
          const val = parseFloat(e.target.value) || 0;
          let finalVal = val;
          if (min !== undefined) finalVal = Math.max(finalVal, min);
          if (max !== undefined) finalVal = Math.min(finalVal, max);
          onChange(finalVal);
        }}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={`text-center rounded-full pr-6 pl-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden ${className}`}
        style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 border-0 shadow-none hover:bg-muted"
        onClick={handleDecrement}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 border-0 shadow-none hover:bg-muted"
        onClick={handleIncrement}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

