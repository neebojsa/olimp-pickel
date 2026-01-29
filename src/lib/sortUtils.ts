export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export function sortItems<T>(items: T[], config: SortConfig | null, getValue: (item: T, field: string) => any): T[] {
  if (!config) return items;

  const sorted = [...items].sort((a, b) => {
    const valueA = getValue(a, config.field);
    const valueB = getValue(b, config.field);

    // Handle null/undefined values
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return config.direction === "asc" ? -1 : 1;
    if (valueB == null) return config.direction === "asc" ? 1 : -1;

    // Compare values
    let comparison = 0;
    if (typeof valueA === "string" && typeof valueB === "string") {
      comparison = valueA.localeCompare(valueB);
    } else if (typeof valueA === "number" && typeof valueB === "number") {
      comparison = valueA - valueB;
    } else if (valueA instanceof Date && valueB instanceof Date) {
      comparison = valueA.getTime() - valueB.getTime();
    } else {
      // Fallback: convert to string
      comparison = String(valueA).localeCompare(String(valueB));
    }

    return config.direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}
