# Persistent Sorting Implementation Summary

## Overview
This document summarizes the implementation of persistent sorting across multiple pages/tabs in the application. Sorting preferences are stored in localStorage (keyed by userId + pageKey) and persist across sessions.

## Files Created

### 1. `src/components/SortSelect.tsx`
- Reusable dropdown component for selecting sort options
- Supports ascending/descending directions
- Takes `options` array, `value`, `onChange` handler

### 2. `src/hooks/useSortPreference.tsx`
- Custom hook for managing sort preferences
- Uses localStorage with key format: `sortPref:{userId}:{storageKey}`
- Returns: `{ sortPreference, savePreference, isLoading }`
- TODO: Can be extended to use Supabase user_preferences table with jsonb column

### 3. `src/lib/sortUtils.ts`
- Utility function `sortItems<T>()` for applying sorting to arrays
- Handles null/undefined values, strings, numbers, dates
- Generic implementation works with any data type

## Pages Implemented

### ✅ 1. Inventory (`src/pages/Inventory.tsx`)
**Tabs:** Parts, Materials, Tools, Machines

**Sort Options:**
- Recently added (Newest → Oldest / Oldest → Newest)
- A–Z / Z–A
- Price (Low → High / High → Low) - *only if canSeePrices()*
- Total Value (Low → High / High → Low) - *only if canSeePrices()*
- Best seller

**Storage Keys:**
- `inventory:parts`
- `inventory:materials`
- `inventory:tools`
- `inventory:machines`

**Implementation:**
- Sort dropdown added to each tab's filter bar
- Sorting applied in `getFilteredItems()` function
- Respects permission checks for price-related sorts

### ✅ 2. Work Orders (`src/pages/WorkOrders.tsx`)
**Sort Options:**
- Recently added (Newest → Oldest / Oldest → Newest)

**Storage Key:** `workorders`

**Implementation:**
- Sort dropdown added above the work orders table
- Sorting applied after filtering, before pagination

### ✅ 3. Invoicing (`src/pages/Invoicing.tsx`)
**Sort Options:**
- Recently added (Newest → Oldest / Oldest → Newest)
- Total (Low → High / High → Low)
- Customer (A–Z / Z–A)

**Storage Key:** `invoicing`

**Implementation:**
- Sort dropdown added above overview cards
- Sorting applied after filtering
- Uses `sortedInvoices` instead of `filteredInvoices` in render

## Pages Remaining (Pattern to Follow)

### 4. Accounting (`src/pages/Accounting.tsx`)
**Required Sort Options:**
- Recently added (asc/desc)
- Amount (asc/desc)

**Storage Key:** `accounting`

**Pattern:**
```typescript
// 1. Import
import { SortSelect, SortOption } from "@/components/SortSelect";
import { useSortPreference } from "@/hooks/useSortPreference";
import { sortItems } from "@/lib/sortUtils";

// 2. Add hook
const sortPreference = useSortPreference("accounting");

// 3. Define options
const sortOptions: SortOption[] = [
  { id: "created_at:desc", label: "Recently added (Newest → Oldest)", field: "created_at", direction: "desc" },
  { id: "created_at:asc", label: "Recently added (Oldest → Newest)", field: "created_at", direction: "asc" },
  { id: "amount:asc", label: "Amount (Low → High)", field: "amount", direction: "asc" },
  { id: "amount:desc", label: "Amount (High → Low)", field: "amount", direction: "desc" },
];

// 4. Apply sorting after filtering
let sortedItems = [...filteredItems];
if (sortPreference.sortPreference) {
  sortedItems = sortItems(sortedItems, sortPreference.sortPreference, (item, field) => {
    switch (field) {
      case "created_at": return item.created_at ? new Date(item.created_at) : null;
      case "amount": return item.amount || 0;
      default: return null;
    }
  });
}

// 5. Add UI component
<SortSelect
  value={sortPreference.sortPreference ? `${sortPreference.sortPreference.field}:${sortPreference.sortPreference.direction}` : ""}
  onChange={(value) => {
    const [field, direction] = value.split(":");
    sortPreference.savePreference({ field, direction: direction as "asc" | "desc" });
  }}
  options={sortOptions}
  placeholder="Sort"
/>
```

### 5. Cost Management (`src/pages/CostManagement.tsx`)
**Required Sort Options:**
- Recently added (asc/desc)
- Amount (asc/desc)
- Due date (asc/desc)

**Storage Key:** `costmanagement`

### 6. Customers (`src/pages/Customers.tsx`)
**Required Sort Options:**
- A–Z / Z–A
- Recently added (asc/desc)
- Total Value (asc/desc)
- Total Orders (asc/desc)

**Storage Key:** `customers`

### 7. Suppliers (`src/pages/Suppliers.tsx`)
**Required Sort Options:**
- A–Z / Z–A
- Recently added (asc/desc)
- Total Value (asc/desc)
- Total Orders (asc/desc)

**Storage Key:** `suppliers`

### 8. Other Docs (`src/pages/OtherDocs.tsx` or similar)
**Required Sort Options:** (for ALL tabs)
- Recently added (asc/desc)

**Storage Key:** `otherdocs:{tabName}` (one per tab)

### 9. Staff and Locations (`src/pages/StaffAndLocation.tsx`)
**Required Sort Options:**
- A–Z / Z–A
- Recently added (asc/desc)

**Storage Key:** `staffandlocations`

## Field Mappings

When implementing sorting, map fields as follows:

- **created_at**: `item.created_at ? new Date(item.created_at) : null`
- **name**: `item.name || ""`
- **part_number**: `item.part_number || ""`
- **unit_price**: `item.unit_price || 0`
- **amount**: `item.amount || 0`
- **total_value**: Calculate based on quantity × price
- **customer_name**: `item.customers?.name || ""`
- **due_date**: `item.due_date ? new Date(item.due_date) : null`
- **total_orders**: Count of related invoices/orders (may require aggregation)

## Permission Handling

For pages with price-related sorts:
- Check `canSeePrices()` before including price sort options
- If user can't see prices, exclude price-related options from `sortOptions` array

## Testing Checklist

For each implemented page:
- [ ] Sort dropdown appears in UI
- [ ] All sort options work correctly
- [ ] Ascending/descending both work
- [ ] Preference persists after page refresh
- [ ] Preference persists after logout/login
- [ ] Default sort works when no preference is set
- [ ] Mobile layout doesn't break (375px width)

## Notes

- Storage uses localStorage with userId from `useAuth().staff.id`
- Format: `sortPref:{userId}:{storageKey}`
- Value format: `{ field: string, direction: "asc" | "desc" }`
- Future enhancement: Store in Supabase `user_preferences` table with jsonb column for better multi-device sync
