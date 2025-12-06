import { format } from "date-fns";

/**
 * Format a date to dd/mm/yyyy format consistently across the application
 * @param date - Date object, ISO string, or date string
 * @returns Formatted date string in dd/mm/yyyy format
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDate:', date);
      return '';
    }
    
    return format(dateObj, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', date);
    return '';
  }
};

/**
 * Format a date to dd/mm/yyyy HH:mm format for date-time displays
 * @param date - Date object, ISO string, or date string
 * @returns Formatted date-time string in dd/mm/yyyy HH:mm format
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDateTime:', date);
      return '';
    }
    
    return format(dateObj, 'dd/MM/yyyy HH:mm');
  } catch (error) {
    console.error('Error formatting date-time:', error, 'Input:', date);
    return '';
  }
};

/**
 * Format a date for input fields (YYYY-MM-DD format)
 * @param date - Date object, ISO string, or date string
 * @returns Formatted date string in YYYY-MM-DD format for HTML date inputs
 */
export const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDateForInput:', date);
      return '';
    }
    
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting date for input:', error, 'Input:', date);
    return '';
  }
};

/**
 * Parse a date from dd/mm/yyyy format to Date object
 * @param dateString - Date string in dd/mm/yyyy format
 * @returns Date object or null if invalid
 */
export const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  try {
    // Split the date string and create Date object
    const parts = dateString.split('/');
    if (parts.length !== 3) {
      console.warn('Invalid date format provided to parseDate:', dateString);
      return null;
    }
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in Date constructor
    const year = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    
    // Verify the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date created from parseDate:', dateString);
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', error, 'Input:', dateString);
    return null;
  }
};

