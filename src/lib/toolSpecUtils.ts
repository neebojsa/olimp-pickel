// Utility functions for formatting tool specifications

export const formatSpecificationValue = (key: string, value: string): string => {
  if (!value || !String(value).trim()) return '';
  
  const trimmedValue = String(value).trim();
  
  switch (key.toLowerCase()) {
    case 'length':
      return `L=${trimmedValue} mm`;
    case 'diameter':
      return `Ø${trimmedValue} mm`;
    case 'radius':
      return trimmedValue;
    case 'thickness':
      return `${trimmedValue} mm`;
    case 'angle':
      return `${trimmedValue}°`;
    case 'number of inserts':
      return `T${trimmedValue}`;
    default:
      return trimmedValue;
  }
};

export const formatToolSpecifications = (specifications: { [key: string]: any }): string => {
  if (!specifications) return '';
  
  const specEntries = Object.entries(specifications)
    .filter(([_, value]) => value && String(value).trim());
  
  return specEntries
    .map(([key, value]) => formatSpecificationValue(key, String(value)))
    .filter(formatted => formatted)
    .join(' - ');
};

export const formatToolName = (toolData: any, fallbackName: string): string => {
  if (!toolData?.toolCategory || !toolData?.specifications) {
    return fallbackName;
  }
  
  // Skip the main category (first element) and join subcategories
  const subcategories = toolData.toolCategory.slice(1);
  const categoryPath = subcategories.join(' - ');
  
  // Format specifications with special formatting
  const specString = formatToolSpecifications(toolData.specifications);
  
  return specString ? `${categoryPath} - ${specString}` : categoryPath;
};