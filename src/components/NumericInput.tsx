import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

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
  suffix?: string;
  showSteppers?: boolean;
  containerClassName?: string;
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = "0",
  className = "",
  id,
  increment,
  decrement,
  suffix,
  showSteppers = true,
  containerClassName
}: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Convert value to display format: empty string if 0 or empty, otherwise the value
  // Handle both string and number types, and preserve decimal values
  const displayValue = (() => {
    if (value === "" || value === null || value === undefined) return "";
    const numVal = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numVal) || numVal === 0) return "";
    return value.toString();
  })();
  const numValue = typeof value === 'string' ? (value === "" ? 0 : parseFloat(value) || 0) : (value || 0);
  const incAmount = increment ?? step;
  const decAmount = decrement ?? step;

  // Prevent wheel events from changing the value
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleWheel = (e: WheelEvent) => {
      if (document.activeElement === input) {
        e.preventDefault();
      }
    };

    input.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      input.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleIncrement = () => {
    const newValue = numValue + incAmount;
    onChange(max !== undefined ? Math.min(newValue, max) : newValue);
  };

  const handleDecrement = () => {
    const newValue = numValue - decAmount;
    onChange(min !== undefined ? Math.max(newValue, min) : newValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    // Allow empty string - don't convert to 0 immediately
    if (inputVal === "") {
      onChange(0);
      return;
    }
    const val = parseFloat(inputVal);
    if (isNaN(val)) {
      // If invalid, keep as 0 but don't show in input
      onChange(0);
      return;
    }
    let finalVal = val;
    if (min !== undefined) finalVal = Math.max(finalVal, min);
    if (max !== undefined) finalVal = Math.min(finalVal, max);
    onChange(finalVal);
  };

  const handleBlur = () => {
    // On blur, if empty, ensure it's 0 for form submission
    // But don't force display - let placeholder show
    if (displayValue === "" || displayValue === null || displayValue === undefined || numValue === 0) {
      // Keep as 0 but input will show placeholder
    }
  };

  const hasSuffix = !!suffix;
  // Layout: { -, value, suffix, + } — suffix between value and + button
  const inputPaddingClass = showSteppers
    ? hasSuffix
      ? "pl-6 pr-12 text-center" // extra pr for suffix between value and +
      : "pl-6 pr-6 text-center"
    : hasSuffix
      ? "pl-4 pr-10 text-center"
      : "pl-3 pr-3 text-center";

  return (
    <div className={cn("relative w-[120px]", containerClassName)}>
      <Input
        ref={inputRef}
        id={id}
        type="number"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={cn(
          "rounded-md [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden",
          inputPaddingClass,
          className
        )}
        style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
      />
      {showSteppers && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md p-0 border-0 shadow-none hover:bg-muted"
            onClick={handleDecrement}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md p-0 border-0 shadow-none hover:bg-muted"
            onClick={handleIncrement}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </>
      )}
      {hasSuffix && (
        <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

