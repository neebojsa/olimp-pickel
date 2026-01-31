// Gemini AI OCR Service
// Uses Google Gemini AI for intelligent document extraction
// Adapted from ai-powered-invoice library

import { GoogleGenerativeAI } from '@google/generative-ai';
import { OCRResult } from './ocrService';

export interface GeminiOCRConfig {
  apiKey?: string;
  model?: string;
  debug?: boolean;
}

export class GeminiOCRService {
  private genAI: GoogleGenerativeAI | null = null;
  private config: GeminiOCRConfig;
  private model: any = null;

  constructor(config: GeminiOCRConfig = {}) {
    const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    this.config = {
      apiKey: config.apiKey || envApiKey || '',
      model: config.model || 'gemini-2.5-pro', // Use gemini-2.5-pro (suggested in API errors, supports vision)
      debug: config.debug ?? true,
      ...config
    };

    // Debug logging to help diagnose issues
    if (this.config.debug) {
      console.log('Gemini OCR Service initialization:');
      console.log('- API Key provided:', !!this.config.apiKey);
      console.log('- API Key length:', this.config.apiKey ? this.config.apiKey.length : 0);
      console.log('- Environment variable exists:', !!envApiKey);
      console.log('- Model:', this.config.model);
    }

    if (this.config.apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.config.apiKey);
        // Try to initialize with the specified model
        this.model = this.genAI.getGenerativeModel({ model: this.config.model });
        if (this.config.debug) {
          console.log('✓ Gemini OCR Service initialized successfully with model:', this.config.model);
        }
      } catch (error) {
        console.error('✗ Failed to initialize Gemini AI with model', this.config.model, ':', error);
        // Try fallback models (based on API error suggestions)
        const fallbackModels = [
          'gemini-2.5-pro',      // Suggested in API error messages
          'gemini-2.0-pro-exp',  // Experimental model
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-pro',
          'gemini-pro-vision'
        ];
        for (const fallbackModel of fallbackModels) {
          try {
            this.model = this.genAI!.getGenerativeModel({ model: fallbackModel });
            this.config.model = fallbackModel;
            console.log('✓ Using fallback model:', fallbackModel);
            break;
          } catch (fallbackError) {
            console.warn('✗ Fallback model', fallbackModel, 'also failed:', fallbackError);
          }
        }
        if (!this.model) {
          console.error('✗ All Gemini models failed to initialize');
        }
      }
    } else {
      console.warn('⚠ Gemini API key not provided. Set VITE_GEMINI_API_KEY environment variable.');
      console.warn('⚠ Note: In Vercel, you must redeploy after adding environment variables for them to take effect.');
    }
  }

  /**
   * Check if Gemini service is available
   */
  isAvailable(): boolean {
    return this.genAI !== null && this.model !== null;
  }

  /**
   * Process a PDF or image file using Gemini AI
   */
  async processFile(file: File): Promise<OCRResult> {
    const startTime = Date.now();

    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available. Please check your API key.');
    }

    try {
      if (this.config.debug) {
        console.log('=== STARTING GEMINI AI PROCESSING ===');
        console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);
      }

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      const mimeType = file.type || this.getMimeTypeFromExtension(file.name);

      // Validate mime type
      if (!['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(mimeType)) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Prepare the prompt for invoice extraction
      const prompt = this.getExtractionPrompt();

      // Process with Gemini (both PDFs and images use the same inline data approach)
      const result = await this.processWithGemini(base64Data, mimeType, prompt);

      // Parse the extracted data (this also stores supplierInfo in result object)
      const extractedData = this.parseExtractedData(result);

      const ocrResult: OCRResult & { supplierInfo?: any } = {
        text: result.text || '',
        confidence: 0.85, // Gemini typically has high confidence
        processingTime: Date.now() - startTime,
        engine: 'gemini-ai',
        extractedData: extractedData,
        supplierInfo: (result as any).supplierInfo || null
      };

      if (this.config.debug) {
        console.log('=== GEMINI PROCESSING COMPLETE ===');
        console.log('Result:', ocrResult);
      }

      return ocrResult;

    } catch (error: any) {
      console.error('=== GEMINI PROCESSING ERROR ===');
      console.error('Error:', error);
      
      return {
        text: `Gemini AI Processing Failed\n\nFile: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(1)} KB\n\nError: ${error?.message || 'Unknown error'}\n\nPlease check:\n- Your Gemini API key is set correctly\n- The file format is supported\n- Your internet connection is working`,
        confidence: 0.1,
        processingTime: Date.now() - startTime,
        engine: 'gemini-error',
        extractedData: {
          supplier_name: '',
          document_type: 'invoice',
          subtotal_tax_excluded: 0,
          total_amount: 0,
          currency: 'BAM',
          issue_date: '',
          due_date: '',
          document_number: '',
          vat_rate: 0
        }
      };
    }
  }

  /**
   * Process file with Gemini AI
   * Supports both images and PDFs using inline data
   */
  private async processWithGemini(base64Data: string, mimeType: string, prompt: string): Promise<any> {
    if (!this.model) {
      throw new Error('Gemini model not initialized');
    }

    // Gemini supports both images and PDFs via inline data
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
      try {
        const result = await this.model.generateContent([
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]);

        const response = await result.response;
        const text = response.text();

        if (this.config.debug) {
          console.log('Gemini response text length:', text.length);
          console.log('Gemini response preview:', text.substring(0, 500));
        }

        // Try to extract JSON from the response
        // Look for JSON object in the response (may be wrapped in markdown code blocks)
        let jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (!jsonMatch) {
          jsonMatch = text.match(/\{[\s\S]*\}/);
        }

        if (jsonMatch) {
          try {
            const jsonString = jsonMatch[1] || jsonMatch[0];
            const jsonData = JSON.parse(jsonString);
            if (this.config.debug) {
              console.log('Successfully parsed JSON from Gemini response:', jsonData);
            }
            return { text, jsonData };
          } catch (e) {
            console.warn('Failed to parse JSON from Gemini response:', e);
            console.warn('JSON string:', jsonMatch[0]);
          }
        } else {
          console.warn('No JSON found in Gemini response');
        }

        return { text };
      } catch (error: any) {
        console.error('Error calling Gemini API:', error);
        throw new Error(`Gemini API error: ${error?.message || 'Unknown error'}`);
      }
    }

    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  /**
   * Get extraction prompt for invoice documents
   */
  private getExtractionPrompt(): string {
    return `Please extract all relevant information from this invoice document and provide it in the following structured JSON format:

{
  "supplier_name": "<Supplier/Company Name>",
  "supplier_address": "<Full address of the supplier>",
  "supplier_city": "<City of the supplier>",
  "supplier_country": "<Country of the supplier>",
  "supplier_phone": "<Phone number of the supplier>",
  "supplier_email": "<Email address of the supplier>",
  "supplier_website": "<Website URL of the supplier>",
  "supplier_tax_id": "<Tax ID/VAT number of the supplier>",
  "document_number": "<Invoice/Document Number>",
  "document_type": "invoice|quote|receipt|other",
  "issue_date": "<Issue Date in YYYY-MM-DD format>",
  "due_date": "<Due Date in YYYY-MM-DD format>",
  "subtotal_tax_excluded": <Subtotal amount without tax (number)>,
  "total_amount": <Total amount with tax (number)>,
  "currency": "<Currency code: EUR|USD|BAM|RSD>",
  "vat_rate": <VAT rate percentage (number)>,
  "description": "<Brief description of the document>"
}

Important:
- Extract dates in DD.MM.YYYY, DD/MM/YYYY, or YYYY-MM-DD format and convert to YYYY-MM-DD
- Extract amounts as numbers (remove currency symbols and spaces)
- Extract supplier contact information from the document header/footer (address, phone, email, website, tax ID, city, country)
- If currency is not specified, default to "BAM"
- If document_type is not clear, default to "invoice"
- Return ONLY valid JSON, no additional text or markdown formatting
- If a field cannot be found, use empty string "" for text fields or 0 for numbers`;
  }

  /**
   * Parse extracted data from Gemini response
   */
  private parseExtractedData(result: any): OCRResult['extractedData'] {
    const defaultData: OCRResult['extractedData'] = {
      supplier_name: '',
      document_type: 'invoice',
      subtotal_tax_excluded: 0,
      total_amount: 0,
      currency: 'BAM',
      issue_date: '',
      due_date: '',
      document_number: '',
      vat_rate: 0
    };

    if (!result.jsonData) {
      return defaultData;
    }

    const data = result.jsonData;

    // Store supplier info in the result object for later access
    if (data.supplier_address || data.supplier_phone || data.supplier_email) {
      (result as any).supplierInfo = {
        name: data.supplier_name || data.companyName || '',
        address: data.supplier_address || data.address || '',
        city: data.supplier_city || data.city || '',
        country: data.supplier_country || data.country || '',
        phone: data.supplier_phone || data.phone || data.telephone || '',
        email: data.supplier_email || data.email || '',
        website: data.supplier_website || data.website || data.url || '',
        tax_id: data.supplier_tax_id || data.tax_id || data.vat_number || data.taxNumber || ''
      };
    }

    return {
      supplier_name: data.supplier_name || data.companyName || '',
      document_number: data.document_number || data.invoiceNumber || '',
      document_type: (data.document_type || 'invoice').toLowerCase(),
      issue_date: this.formatDate(data.issue_date || data.invoiceDate || ''),
      due_date: this.formatDate(data.due_date || ''),
      subtotal_tax_excluded: parseFloat(data.subtotal_tax_excluded || data.taxableAmount || 0),
      total_amount: parseFloat(data.total_amount || data.total || data.amountPayable || 0),
      currency: (data.currency || 'BAM').toUpperCase(),
      vat_rate: parseFloat(data.vat_rate || 0),
      description: data.description || ''
    };
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(dateStr: string): string {
    if (!dateStr) return '';

    try {
      // Handle various date formats
      let date: Date | null = null;

      // Try parsing common formats
      if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          date = new Date(year, month - 1, day);
        }
      } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          date = new Date(year, month - 1, day);
        }
      } else if (dateStr.includes('-')) {
        date = new Date(dateStr);
      } else {
        date = new Date(dateStr);
      }

      if (date && !isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }

    return '';
  }

  /**
   * Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'tiff': 'image/tiff',
      'bmp': 'image/bmp'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}

// Export singleton instance
export const geminiOCRService = new GeminiOCRService();



