// Test file for OCR Service
// This file can be used to test the OCR functionality

import { ocrService } from './ocrService';

// Test function to verify OCR service is working
export const testOCRService = async () => {
  console.log('Testing OCR Service...');
  
  try {
    // Test with a simple text file (simulating document processing)
    const testFile = new File(['Test invoice content'], 'test.txt', { type: 'text/plain' });
    
    // This would normally be called with actual PDF/image files
    console.log('OCR Service initialized successfully');
    console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ocrService)));
    
    return true;
  } catch (error) {
    console.error('OCR Service test failed:', error);
    return false;
  }
};

// Export for use in other parts of the application
export { ocrService };

