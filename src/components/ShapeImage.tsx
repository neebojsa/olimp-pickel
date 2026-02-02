import React, { useRef, useLayoutEffect } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShapeImageProps {
  shapeName: string;
  shapeId?: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
}

/**
 * Component to display shape images with fallback placeholder
 * Displays uploaded shape image at specified size (default 80×60px), maintaining aspect ratio
 */
export function ShapeImage({ 
  shapeName, 
  shapeId, 
  imageUrl, 
  size = 80,
  className = "" 
}: ShapeImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const actualSize = typeof size === 'number' ? size : 80;
  const width = actualSize;
  const height = actualSize * 0.75; // 4:3 aspect ratio (80:60)

  // Use useLayoutEffect to set styles synchronously before paint
  useLayoutEffect(() => {
    if (containerRef.current) {
      const element = containerRef.current;
      
      // Set with important flag using setProperty - this is the ONLY way to set !important
      element.style.setProperty('width', `${width}px`, 'important');
      element.style.setProperty('height', `${height}px`, 'important');
      element.style.setProperty('min-width', `${width}px`, 'important');
      element.style.setProperty('min-height', `${height}px`, 'important');
      element.style.setProperty('max-width', `${width}px`, 'important');
      element.style.setProperty('max-height', `${height}px`, 'important');
      element.style.setProperty('flex-shrink', '0', 'important');
    }
  }, [width, height, actualSize, size]);

  if (imageUrl) {
    return (
      <div 
        ref={containerRef}
        className={cn("flex items-center justify-center rounded overflow-hidden", className)}
        data-shape-size={actualSize}
        data-size-prop={size}
        data-width={width}
        data-height={height}
      >
        <img
          src={imageUrl}
          alt={shapeName}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain',
            display: 'block'
          }}
          loading="lazy"
          key={imageUrl}
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="flex flex-col items-center justify-center w-full h-full text-muted-foreground">
                  <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span class="text-xs">${shapeName}</span>
                </div>
              `;
            }
          }}
        />
      </div>
    );
  }

  // Fallback placeholder when no image is provided
  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col items-center justify-center rounded text-muted-foreground",
        className
      )}
      data-shape-size={actualSize}
      data-size-prop={size}
      data-width={width}
      data-height={height}
    >
      <Package className="w-6 h-6 mb-1 opacity-50" />
      <span className="text-xs text-center px-2">{shapeName}</span>
    </div>
  );
}
