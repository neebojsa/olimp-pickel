import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectProps<T> {
  items: T[];
  value: string;
  onSelect: (item: T | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemSearchText: (item: T) => string;
  disabled?: boolean;
  className?: string;
  /** Optional: when set, adds a clear/empty option at top. onSelect(null) when user picks it. */
  allowClear?: boolean;
  /** Optional: show part_number as subtitle in dropdown items */
  showPartNumber?: boolean;
  getItemPartNumber?: (item: T) => string | undefined;
}

export function SearchableSelect<T>({
  items,
  value,
  onSelect,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  getItemValue,
  getItemLabel,
  getItemSearchText,
  disabled = false,
  className,
  allowClear = false,
  showPartNumber = true,
  getItemPartNumber,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedItem = items.find((item) => getItemValue(item) === value);
  const displayLabel = selectedItem ? getItemLabel(selectedItem) : placeholder;

  const filteredItems = items.filter((item) => {
    const searchText = (searchTerm || "").toLowerCase();
    if (!searchText) return true;
    const itemSearchText = getItemSearchText(item).toLowerCase();
    return itemSearchText.includes(searchText);
  });

  const handleSelect = (item: T) => {
    onSelect(item);
    setOpen(false);
    setSearchTerm("");
  };

  const partNumber = getItemPartNumber && selectedItem ? getItemPartNumber(selectedItem) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between text-left font-normal h-auto min-h-[40px] py-2 whitespace-normal",
            className
          )}
        >
          {selectedItem ? (
            <span className="flex-1 break-words pr-2">
              {displayLabel}
              {showPartNumber && partNumber && (
                <span className="text-muted-foreground"> | {partNumber}</span>
              )}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__empty__"
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                  className="items-start py-2"
                >
                  <Check className={cn("mr-2 h-4 w-4 mt-1 shrink-0", !value ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground">{placeholder}</span>
                </CommandItem>
              )}
              {filteredItems.map((item) => {
                const itemValue = getItemValue(item);
                const itemLabel = getItemLabel(item);
                const itemPartNumber = getItemPartNumber?.(item);
                const isSelected = itemValue === value;

                return (
                  <CommandItem
                    key={itemValue}
                    value={getItemSearchText(item)}
                    onSelect={() => handleSelect(item)}
                    className="items-start py-2"
                  >
                    <Check className={cn("mr-2 h-4 w-4 mt-1 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="break-words">{itemLabel}</span>
                      {showPartNumber && itemPartNumber && (
                        <span className="text-xs text-muted-foreground">Part #: {itemPartNumber}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
