import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string | React.ReactNode;
  cell?: (item: T, index: number) => React.ReactNode;
  className?: string;
  mobileLabel?: string; // Custom label for mobile view
  mobileOrder?: number; // Order in mobile view (lower = first)
  hideOnMobile?: boolean; // Hide this column on mobile
  isActionColumn?: boolean; // If true, render actions at bottom of card on mobile
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  rowClassName?: string | ((item: T) => string);
  emptyMessage?: string;
  mobileBreakpoint?: string; // Tailwind breakpoint class
  // Allow custom table header (for filters, etc.)
  customTableHeader?: React.ReactNode;
}

export function ResponsiveTable<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  rowClassName,
  emptyMessage = "No data available",
  mobileBreakpoint = "md",
  customTableHeader,
}: ResponsiveTableProps<T>) {
  // Filter columns that should be visible on mobile
  const mobileColumns = columns
    .filter(col => !col.hideOnMobile && !col.isActionColumn)
    .sort((a, b) => (a.mobileOrder ?? 999) - (b.mobileOrder ?? 999));
  
  const actionColumns = columns.filter(col => col.isActionColumn);

  const getRowClassName = (item: T) => {
    if (typeof rowClassName === "function") {
      return rowClassName(item);
    }
    return rowClassName || "";
  };

  const renderCellContent = (column: Column<T>, item: T, index: number) => {
    if (column.cell) {
      return column.cell(item, index);
    }
    // Fallback: try to access property by key
    const value = (item as any)[column.key];
    return value !== undefined && value !== null ? String(value) : "";
  };

  const extractHeaderText = (header: string | React.ReactNode): string => {
    if (typeof header === "string") return header;
    // Try to extract text from React node (simple case)
    if (React.isValidElement(header)) {
      const children = (header.props as any)?.children;
      if (typeof children === "string") return children;
      if (Array.isArray(children)) {
        const textParts = children
          .map((child: any) => typeof child === "string" ? child : null)
          .filter(Boolean);
        if (textParts.length > 0) return textParts.join(" ");
      }
    }
    return "";
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className={`hidden ${mobileBreakpoint}:block`}>
        <Table>
          {customTableHeader || (
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.className}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {data.map((item, index) => (
              <TableRow
                key={item.id || JSON.stringify(item)}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-muted/50",
                  getRowClassName(item)
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {renderCellContent(column, item, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className={`${mobileBreakpoint}:hidden space-y-3`}>
        {data.map((item, index) => (
          <Card
            key={item.id || JSON.stringify(item)}
            className={cn(
              "p-4 border",
              onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors",
              getRowClassName(item)
            )}
            onClick={(e) => {
              // Don't trigger row click if clicking on action buttons
              if ((e.target as HTMLElement).closest('button, [role="button"]')) {
                return;
              }
              onRowClick?.(item);
            }}
          >
            <div className="space-y-3">
              {/* Regular columns */}
              {mobileColumns.map((column) => {
                const content = renderCellContent(column, item, index);
                const label = column.mobileLabel || extractHeaderText(column.header) || column.key;
                
                // Skip if content is empty/null/undefined
                if (content === null || content === undefined || content === "") return null;

                return (
                  <div key={column.key} className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {label}
                    </span>
                    <div className="text-sm font-medium break-words">
                      {content}
                    </div>
                  </div>
                );
              })}
              
              {/* Action columns at bottom */}
              {actionColumns.length > 0 && (
                <div className="pt-2 border-t flex flex-wrap gap-2">
                  {actionColumns.map((column) => (
                    <div key={column.key} onClick={(e) => e.stopPropagation()}>
                      {renderCellContent(column, item, index)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
