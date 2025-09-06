// Utility functions for formatting tool specifications

// Mapping of spec field UUIDs to their names
const specFieldMapping: { [uuid: string]: string } = {
  '73720edd-75fd-4319-af01-40466be6097d': 'Length',
  '750e3bb7-1fe6-46a6-bd3e-25bad19cc0d4': 'Radius',
  '45008473-bdb5-4ed2-a6d5-c0c85520615b': 'Diameter',
  '4492e089-d79b-46e8-98ec-8c499f52a6e6': 'Angle',
  '6a289abf-7465-4955-96aa-8bb9b95124b5': 'Number of Inserts'
};

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
    .map(([key, value]) => {
      // Map UUID key to readable name
      const fieldName = specFieldMapping[key] || key;
      return formatSpecificationValue(fieldName, String(value));
    })
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