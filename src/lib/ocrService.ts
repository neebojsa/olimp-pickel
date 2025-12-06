// Enhanced OCR Service
// This service provides improved OCR capabilities using multiple engines for better accuracy

import { createWorker } from 'tesseract.js';

export interface OCRConfig {
  useMultipleEngines?: boolean;
  debug?: boolean;
  maxWorkers?: number;
  language?: string;
  confidenceThreshold?: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
  engine: string;
  extractedData: {
    supplier_name?: string;
    document_number?: string;
    subtotal_tax_excluded?: number;
    total_amount?: number;
    currency?: string;
    issue_date?: string;
    due_date?: string;
    document_type?: string;
    vat_rate?: number;
    items?: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
  };
}

export class OCRService {
  private config: OCRConfig;

  constructor(config: OCRConfig = {}) {
    this.config = {
      useMultipleEngines: true,
      debug: true, // Enable debug by default for better troubleshooting
      maxWorkers: 1,
      language: 'eng',
      confidenceThreshold: 0.6,
      ...config
    };
  }

  /**
   * Process a PDF file using enhanced OCR
   * @param file - PDF file to process
   * @returns Promise<OCRResult>
   */
  async processPDF(file: File): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      console.log('=== STARTING ENHANCED PDF PROCESSING ===');
      console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // First try to extract text from PDF using PDF.js
      console.log('Step 1: Attempting PDF text extraction...');
      let pdfText = '';
      try {
        pdfText = await this.extractTextFromPDF(file);
        console.log('PDF text extraction successful, length:', pdfText.length);
      } catch (pdfError) {
        console.log('PDF text extraction failed, falling back to OCR:', pdfError.message);
        pdfText = '';
      }
      
      let result: OCRResult;
      
      if (pdfText && pdfText.length > 50) {
        // Use extracted PDF text
        console.log('Using PDF extracted text');
        const parsedData = this.parseDocumentText(pdfText, 'pdf');
        result = {
          text: pdfText,
          confidence: 0.9, // High confidence for PDF text extraction
          processingTime: Date.now() - startTime,
          engine: 'pdfjs',
          extractedData: parsedData
        };
      } else {
        // Fall back to OCR processing - convert PDF pages to images first
        console.log('Falling back to OCR processing - converting PDF to images');
        result = await this.processPDFAsImage(file);
      }
      
      console.log('=== PDF PROCESSING COMPLETE ===');
      console.log('Final result:', result);
      
      return result;
      
    } catch (error: any) {
      console.error('=== PDF PROCESSING ERROR ===');
      console.error('Error processing PDF:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      const processingTime = Date.now() - startTime;
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      return this.createFallbackResult(file, errorMessage, processingTime);
    }
  }

  /**
   * Process an image file using enhanced OCR with multiple engines
   * @param file - Image file to process
   * @returns Promise<OCRResult>
   */
  async processImage(file: File): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      console.log('=== STARTING ENHANCED IMAGE PROCESSING ===');
      console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      let results: OCRResult[] = [];
      
      if (this.config.useMultipleEngines) {
        // Use multiple OCR engines for better accuracy
        console.log('Using multiple OCR engines for better accuracy...');
        
        // Run Tesseract.js OCR
        try {
          console.log('Running Tesseract.js OCR...');
          const tesseractResult = await this.performTesseractOCR(file);
          results.push(tesseractResult);
          console.log('Tesseract.js completed with confidence:', tesseractResult.confidence);
        } catch (error) {
          console.warn('Tesseract.js failed:', error);
        }
        
        // OCRAD.js removed - not installed
        // try {
        //   console.log('Running OCRAD.js OCR...');
        //   const ocradResult = await this.performOCRADOCR(file);
        //   results.push(ocradResult);
        //   console.log('OCRAD.js completed with confidence:', ocradResult.confidence);
        // } catch (error) {
        //   console.warn('OCRAD.js failed:', error);
        // }
      } else {
        // Use only Tesseract.js
        const tesseractResult = await this.performTesseractOCR(file);
        results.push(tesseractResult);
      }
      
      if (results.length === 0) {
        throw new Error('All OCR engines failed');
      }
      
      // Select the best result based on confidence and text length
      const bestResult = this.selectBestResult(results);
      
      console.log('=== IMAGE PROCESSING COMPLETE ===');
      console.log('Best result:', bestResult);
      
      return bestResult;
      
    } catch (error) {
      console.error('=== IMAGE PROCESSING ERROR ===');
      console.error('Error processing image:', error);
      
      const processingTime = Date.now() - startTime;
      return this.createFallbackResult(file, error.message, processingTime);
    }
  }

  /**
   * Process PDF by converting pages to images and running OCR
   */
  private async processPDFAsImage(file: File): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      console.log('Converting PDF to images for OCR processing...');
      const arrayBuffer = await file.arrayBuffer();
      
      // Import PDF.js dynamically
      const pdfjsLib = await import('pdfjs-dist');
      
      // Try to use local worker first, then fallback to CDN
      try {
        // Try local worker (Vite will handle the path)
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
        console.log('Using local PDF.js worker');
      } catch (localError) {
        console.warn('Local worker not available, trying CDN:', localError);
        // Fallback to CDN
        const workerUrls = [
          `https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs`,
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs`,
          `https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.js`
        ];
        
        let workerSet = false;
        for (const workerUrl of workerUrls) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
            workerSet = true;
            console.log('Using CDN PDF.js worker:', workerUrl);
            break;
          } catch (e) {
            continue;
          }
        }
        
        if (!workerSet) {
          throw new Error('Failed to set PDF.js worker');
        }
      }
      
      // Load PDF document
      let pdf: any = null;
      try {
        pdf = await pdfjsLib.getDocument({ 
          data: arrayBuffer,
          useWorkerFetch: false,
          isEvalSupported: false,
          verbosity: 0 // Reduce console noise
        }).promise;
        console.log('PDF loaded successfully, pages:', pdf.numPages);
      } catch (pdfError: any) {
        console.error('Failed to load PDF document:', pdfError);
        throw new Error(`Failed to load PDF: ${pdfError?.message || pdfError?.toString() || 'Unknown error'}`);
      }
      
      // Process first page (or all pages)
      const pagesToProcess = Math.min(pdf.numPages, 3); // Limit to first 3 pages for performance
      console.log(`Processing ${pagesToProcess} page(s) of PDF...`);
      
      let allText = '';
      let allConfidence = 0;
      let processedPages = 0;
      
      for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
        console.log(`Processing page ${pageNum}/${pagesToProcess}...`);
        const page = await pdf.getPage(pageNum);
        
        // Convert PDF page to canvas/image
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Failed to get canvas context');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Convert canvas to blob/file
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/png');
        });
        
        const imageFile = new File([blob], `page-${pageNum}.png`, { type: 'image/png' });
        
        // Run OCR on the image
        console.log(`Running OCR on page ${pageNum}...`);
        const pageResult = await this.performTesseractOCR(imageFile);
        
        allText += `\n--- Page ${pageNum} ---\n${pageResult.text}\n`;
        allConfidence += pageResult.confidence;
        processedPages++;
        
        console.log(`Page ${pageNum} OCR complete:`, {
          textLength: pageResult.text.length,
          confidence: pageResult.confidence
        });
      }
      
      const avgConfidence = processedPages > 0 ? allConfidence / processedPages : 0;
      const parsedData = this.parseDocumentText(allText, 'image');
      
      return {
        text: allText.trim(),
        confidence: avgConfidence,
        processingTime: Date.now() - startTime,
        engine: 'tesseract-pdf',
        extractedData: parsedData
      };
      
    } catch (error: any) {
      console.error('Error processing PDF as image:', error);
      console.error('Error stack:', error?.stack);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to process PDF with OCR: ${errorMsg}. Check console for details.`);
    }
  }

  /**
   * Extract text from PDF using PDF.js with improved error handling
   */
  private async extractTextFromPDF(file: File): Promise<string> {
    try {
      console.log('Starting PDF text extraction for:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      
      // Import PDF.js dynamically
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source - use version matching installed package (5.4.149)
      const workerUrls = [
        `https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs`,
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs`,
        `https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.js`,
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.js`
      ];
      
      let workerLoaded = false;
      for (const workerUrl of workerUrls) {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          console.log('Trying PDF.js worker from:', workerUrl);
          
          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
          console.log('PDF.js worker loaded successfully, processing', pdf.numPages, 'pages');
          
          let fullText = '';
          
          // Extract text from all pages
          for (let i = 1; i <= pdf.numPages; i++) {
            console.log(`Processing page ${i}/${pdf.numPages}`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n';
          }
          
          console.log('PDF text extraction completed, extracted', fullText.length, 'characters');
          return fullText;
        } catch (workerError) {
          console.warn('Worker failed from', workerUrl, ':', workerError);
          continue;
        }
      }
      
      throw new Error('All PDF.js workers failed to load');
      
    } catch (error) {
      console.error('Error reading PDF file:', error);
      throw new Error(`Failed to read PDF file: ${error.message}`);
    }
  }

  /**
   * Perform OCR using Tesseract.js with optimized settings
   */
  private async performTesseractOCR(file: File): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      console.log('Starting Tesseract.js OCR for:', file.name);
      console.log('File size:', file.size, 'bytes, Type:', file.type);
      
      // Create worker with progress logging
      const worker = await createWorker(this.config.language, 1, {
        logger: m => {
          console.log('Tesseract Progress:', m.status, m.progress ? `${Math.round(m.progress * 100)}%` : '', m);
        }
      });
      
      console.log('Tesseract worker created successfully');
      
      // Try different page segmentation modes for better results
      // Mode 6 = uniform block of text (good for invoices)
      // Mode 11 = sparse text (good for scanned documents)
      // Mode 12 = sparse text with OSD (good for complex layouts)
      const psmModes = ['6', '11', '12', '1']; // Try multiple modes
      
      let bestResult: { text: string; confidence: number } | null = null;
      let bestMode = '';
      
      for (const psmMode of psmModes) {
        try {
          console.log(`Trying PSM mode ${psmMode}...`);
          
          // Configure OCR for better accuracy
          await worker.setParameters({
            tessedit_pageseg_mode: psmMode,
            tessedit_ocr_engine_mode: '2', // LSTM OCR Engine
            tessedit_create_hocr: '0',
            tessedit_create_tsv: '0',
            tessedit_create_boxfile: '0'
          });
          
          const { data: { text, confidence } } = await worker.recognize(file);
          
          console.log(`PSM mode ${psmMode} result:`, {
            textLength: text.length,
            confidence: confidence,
            preview: text.substring(0, 100)
          });
          
          // Use the result with highest confidence and reasonable text length
          if (!bestResult || (confidence > bestResult.confidence && text.length > 10)) {
            bestResult = { text, confidence };
            bestMode = psmMode;
          }
        } catch (modeError) {
          console.warn(`PSM mode ${psmMode} failed:`, modeError);
          continue;
        }
      }
      
      if (!bestResult) {
        throw new Error('All PSM modes failed');
      }
      
      console.log(`Best result from PSM mode ${bestMode}:`, {
        textLength: bestResult.text.length,
        confidence: bestResult.confidence
      });
      
      await worker.terminate();
      
      const cleanedText = this.cleanOCRText(bestResult.text);
      const parsedData = this.parseDocumentText(cleanedText, 'image');
      
      const result = {
        text: cleanedText,
        confidence: bestResult.confidence / 100, // Convert to 0-1 scale
        processingTime: Date.now() - startTime,
        engine: `tesseract-psm${bestMode}`,
        extractedData: parsedData
      };
      
      console.log('Final OCR result:', result);
      return result;
      
    } catch (error: any) {
      console.error('Tesseract.js OCR failed:', error);
      console.error('Error stack:', error?.stack);
      throw new Error(`Tesseract OCR failed: ${error?.message || error?.toString() || 'Unknown error'}`);
    }
  }

  /**
   * Perform OCR using OCRAD.js
   * DISABLED - package not installed
   */
  // private async performOCRADOCR(file: File): Promise<OCRResult> {
  //   const startTime = Date.now();
  //   
  //   try {
  //     console.log('Starting OCRAD.js OCR for:', file.name);
  //     
  //     // Convert file to canvas for OCRAD
  //     const canvas = await this.fileToCanvas(file);
  //     const text = OCRAD(canvas);
  //     
  //     const cleanedText = this.cleanOCRText(text);
  //     const parsedData = this.parseDocumentText(cleanedText, 'image');
  //     
  //     // OCRAD doesn't provide confidence scores, so we estimate based on text length
  //     const confidence = Math.min(0.8, Math.max(0.3, cleanedText.length / 100));
  //     
  //     return {
  //       text: cleanedText,
  //       confidence,
  //       processingTime: Date.now() - startTime,
  //       engine: 'ocrad',
  //       extractedData: parsedData
  //     };
  //     
  //   } catch (error) {
  //     console.error('OCRAD.js OCR failed:', error);
  //     throw error;
  //   }
  // }

  /**
   * Convert file to canvas for OCRAD processing
   * DISABLED - package not installed
   */
  // private async fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  //   return new Promise((resolve, reject) => {
  //     const canvas = document.createElement('canvas');
  //     const ctx = canvas.getContext('2d');
  //     const img = new Image();
  //     
  //     img.onload = () => {
  //       canvas.width = img.width;
  //       canvas.height = img.height;
  //       ctx?.drawImage(img, 0, 0);
  //       resolve(canvas);
  //     };
  //     
  //     img.onerror = () => {
  //       reject(new Error('Failed to load image'));
  //     };
  //     
  //     img.src = URL.createObjectURL(file);
  //   });
  // }

  /**
   * Select the best OCR result from multiple engines
   */
  private selectBestResult(results: OCRResult[]): OCRResult {
    if (results.length === 1) {
      return results[0];
    }
    
    // Score each result based on confidence and text quality
    const scoredResults = results.map(result => {
      let score = result.confidence;
      
      // Bonus for longer text (more content extracted)
      score += Math.min(0.2, result.text.length / 1000);
      
      // Bonus for having structured data
      const dataScore = Object.keys(result.extractedData).length * 0.05;
      score += dataScore;
      
      // Penalty for very short text
      if (result.text.length < 10) {
        score -= 0.3;
      }
      
      return { ...result, score };
    });
    
    // Sort by score and return the best
    scoredResults.sort((a, b) => b.score - a.score);
    
    console.log('OCR Results scored:', scoredResults.map(r => ({ 
      engine: r.engine, 
      confidence: r.confidence, 
      textLength: r.text.length, 
      score: r.score 
    })));
    
    return scoredResults[0];
  }

  /**
   * Clean OCR text to fix common errors
   */
  private cleanOCRText(text: string): string {
    let cleaned = text;
    
    // Common OCR character substitutions
    const corrections = [
      // Cyrillic to Latin corrections
      { from: /[а-я]/g, to: (match: string) => this.cyrillicToLatin(match) },
      
      // Common OCR mistakes
      { from: /\b0\b/g, to: 'O' }, // Zero to O in words
      { from: /\b1\b/g, to: 'I' }, // One to I in words
      { from: /\b5\b/g, to: 'S' }, // Five to S in words
      { from: /\b8\b/g, to: 'B' }, // Eight to B in words
      
      // Fix spacing issues
      { from: /\s+/g, to: ' ' }, // Multiple spaces to single space
      { from: /(\d+)\s*([A-Za-z])/g, to: '$1 $2' }, // Space between numbers and letters
      
      // Fix common punctuation issues
      { from: /\.\s*\./g, to: '.' }, // Multiple periods
      { from: /,\s*,/g, to: ',' }, // Multiple commas
    ];
    
    // Apply corrections
    corrections.forEach(correction => {
      if (typeof correction.to === 'function') {
        cleaned = cleaned.replace(correction.from, correction.to);
      } else {
        cleaned = cleaned.replace(correction.from, correction.to);
      }
    });
    
    return cleaned.trim();
  }

  /**
   * Convert Cyrillic characters to Latin (basic mapping)
   */
  private cyrillicToLatin(char: string): string {
    const cyrillicToLatinMap: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'ž', 'з': 'z',
      'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
      'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'č',
      'ш': 'š', 'ђ': 'đ', 'ј': 'j', 'љ': 'lj', 'њ': 'nj', 'ћ': 'ć', 'џ': 'dž',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ж': 'Ž', 'З': 'Z',
      'И': 'I', 'Ј': 'J', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P',
      'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Č',
      'Ш': 'Š', 'Ђ': 'Đ', 'Ј': 'J', 'Љ': 'Lj', 'Њ': 'Nj', 'Ћ': 'Ć', 'Џ': 'Dž'
    };
    
    return cyrillicToLatinMap[char] || char;
  }

  /**
   * Intelligently parse document text to extract structured data
   */
  private parseDocumentText(text: string, source: 'pdf' | 'image'): OCRResult['extractedData'] {
    console.log('Parsing document text, source:', source, 'text length:', text.length);
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('Document lines:', lines.slice(0, 10)); // Show first 10 lines
    
    const result: OCRResult['extractedData'] = {};
    
    // Extract supplier name (usually in first few lines, longest meaningful text)
    const supplierLines = lines.slice(0, 8);
    for (const line of supplierLines) {
      if (line.length > 3 && 
          !line.match(/^\d/) && 
          !line.match(/[€$£]/) && 
          !line.match(/^\d+[.,]\d{2}/) &&
          !line.match(/^(datum|total|ukupno|iznos|faktura|račun)/i) &&
          !line.match(/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/) &&
          line.length < 100) {
        result.supplier_name = line.trim();
        console.log('Found supplier:', result.supplier_name);
        break;
      }
    }
    
    // Extract amounts with improved patterns
    const amountPatterns = [
      /ukupno[:\s]*(\d+[.,]\d{2})/gi,
      /total[:\s]*(\d+[.,]\d{2})/gi,
      /iznos[:\s]*(\d+[.,]\d{2})/gi,
      /za platiti[:\s]*(\d+[.,]\d{2})/gi,
      /za naplatu[:\s]*(\d+[.,]\d{2})/gi,
      /(\d+[.,]\d{2})\s*(?:EUR|USD|BAM|RSD|€|\$)/gi,
      /(\d+[.,]\d{2})\s*[€$£BAM]?/g,
      /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g,
      /(\d+[.,]\d{2})/g
    ];
    
    const amounts: number[] = [];
    amountPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          let cleanMatch = match.replace(/[^\d.,]/g, '');
          if (cleanMatch.includes(',')) {
            const parts = cleanMatch.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
              cleanMatch = parts[0] + '.' + parts[1];
            } else {
              cleanMatch = cleanMatch.replace(/,/g, '');
            }
          }
          
          const amount = parseFloat(cleanMatch);
          if (!isNaN(amount) && amount > 0 && amount < 1000000) {
            amounts.push(amount);
            console.log('Found amount:', amount, 'from match:', match);
          }
        });
      }
    });
    
    if (amounts.length > 0) {
      amounts.sort((a, b) => b - a);
      result.total_amount = amounts[0];
      result.subtotal_tax_excluded = Math.round((amounts[0] / 1.2) * 100) / 100;
      result.vat_rate = 20;
      
      console.log('Extracted amounts:', amounts);
      console.log('Total amount:', result.total_amount);
    }
    
    // Extract currency
    const currencyPatterns = [
      /(\d+[.,]\d{2})\s*(EUR|USD|BAM|RSD)/gi,
      /(EUR|USD|BAM|RSD)/gi
    ];
    
    for (const pattern of currencyPatterns) {
      const match = text.match(pattern);
      if (match) {
        const currency = match[0].replace(/[\d.,\s]/g, '').toUpperCase();
        if (['EUR', 'USD', 'BAM', 'RSD'].includes(currency)) {
          result.currency = currency;
          break;
        }
      }
    }
    
    if (!result.currency) {
      result.currency = 'BAM';
    }
    
    // Extract dates with improved patterns - prioritize dd.mm.yyyy format (most common)
    console.log('Starting date extraction from text (length:', text.length, ')');
    console.log('Text sample:', text.substring(0, 500));
    
    interface DateMatch {
      date: string;
      dateStr: string;
      isDeliveryDate: boolean;
      context: string;
    }
    
    const dateMatches: DateMatch[] = [];
    
    // First pass: extract dates with labels (prioritize dot-separated format)
    const labeledPatterns = [
      // Delivery dates (to exclude)
      { pattern: /(datum\s+isporuke|delivery\s+date|datum\s+dostave)[:\s]*(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4})/gi, isDelivery: true },
      { pattern: /(datum\s+isporuke|delivery\s+date|datum\s+dostave)[:\s]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/gi, isDelivery: true },
      // Issue dates
      { pattern: /(datum\s+izdavanja|issue\s+date|datum)[:\s]*(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4})/gi, isDelivery: false },
      { pattern: /(datum\s+izdavanja|issue\s+date|datum)[:\s]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/gi, isDelivery: false },
      // Due dates
      { pattern: /(datum\s+dospijeća|due\s+date|dospijeća|rok\s+plaćanja)[:\s]*(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4})/gi, isDelivery: false },
      { pattern: /(datum\s+dospijeća|due\s+date|dospijeća|rok\s+plaćanja)[:\s]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/gi, isDelivery: false }
    ];
    
    labeledPatterns.forEach(({ pattern, isDelivery }) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        let dateStr = match[2] || match[0];
        // Clean up the date string - remove extra spaces but keep separators
        dateStr = dateStr.replace(/\s+/g, '').trim();
        if (dateStr) {
          const parsedDate = this.parseDateFromString(dateStr);
          if (parsedDate) {
            dateMatches.push({
              date: parsedDate.toISOString(),
              dateStr: dateStr,
              isDeliveryDate: isDelivery,
              context: match[0]
            });
            console.log(`Found ${isDelivery ? 'delivery' : 'labeled'} date:`, dateStr, 'from:', match[0]);
          }
        }
      });
    });
    
    // Second pass: extract standalone dates - prioritize dd.mm.yyyy format (most common)
    const standalonePatterns = [
      // Most common: dd.mm.yyyy (with optional spaces, with or without word boundaries)
      // Try with word boundaries first, then without to catch edge cases
      /\b(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4})\b/g,
      /(?:^|[^\d])(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4})(?:[^\d]|$)/g,
      // 2-digit year variant
      /\b(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{2})\b/g,
      // Other formats with slashes and dashes
      /\b(\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/g,
      /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2})\b/g,
      /\b(\d{4}[./-]\d{1,2}[./-]\d{1,2})\b/g,
      // Serbian month names
      /\b(\d{1,2}\s+(?:januar|februar|mart|april|maj|jun|jul|avgust|septembar|oktobar|novembar|decembar)\s+\d{4})\b/gi
    ];
    
    standalonePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        let dateStr = match[1] || match[0];
        // Clean up the date string - remove extra spaces but keep separators
        dateStr = dateStr.replace(/\s+/g, '').trim();
        
        // Check if this date is already captured or near a delivery date label
        const matchIndex = match.index || 0;
        const contextStart = Math.max(0, matchIndex - 50);
        const contextEnd = Math.min(text.length, matchIndex + (match[0]?.length || 0) + 50);
        const context = text.substring(contextStart, contextEnd).toLowerCase();
        
        // Skip if it's a delivery date
        const isDeliveryDate = /datum\s+isporuke|delivery\s+date|datum\s+dostave/.test(context);
        
        // Skip if already captured (compare cleaned date strings)
        const alreadyCaptured = dateMatches.some(dm => {
          const dmCleaned = dm.dateStr.replace(/\s+/g, '');
          const currentCleaned = dateStr.replace(/\s+/g, '');
          return dmCleaned === currentCleaned;
        });
        
        if (!alreadyCaptured && !isDeliveryDate && dateStr) {
          const parsedDate = this.parseDateFromString(dateStr);
          if (parsedDate) {
            dateMatches.push({
              date: parsedDate.toISOString(),
              dateStr: dateStr,
              isDeliveryDate: false,
              context: context
            });
            console.log('Found standalone date:', dateStr, 'from context:', context.substring(0, 100));
          } else {
            console.warn('Failed to parse date:', dateStr);
          }
        }
      });
    });
    
    // Filter out delivery dates and sort by date
    let validDates = dateMatches
      .filter(dm => !dm.isDeliveryDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // If no dates found with regular patterns, try more aggressive extraction
    if (validDates.length === 0) {
      console.log('No dates found with regular patterns, trying aggressive extraction...');
      
      // Very aggressive pattern - match any sequence that looks like a date
      const aggressivePatterns = [
        // Any sequence of 2-4 digits, separator, 1-2 digits, separator, 2-4 digits
        /\b(\d{1,4}[./\-\s]+\d{1,2}[./\-\s]+\d{2,4})\b/g,
        // Month names with any format
        /\b(\d{1,2}[./\-\s]+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[./\-\s]+\d{2,4})\b/gi,
        // Any 8-digit sequence that could be a date (YYYYMMDD or DDMMYYYY)
        /\b(\d{8})\b/g
      ];
      
      aggressivePatterns.forEach(pattern => {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
          let dateStr = match[1] || match[0];
          dateStr = dateStr.replace(/\s+/g, '').trim();
          
          // Skip if already captured
          const alreadyCaptured = dateMatches.some(dm => {
            const dmCleaned = dm.dateStr.replace(/\s+/g, '');
            const currentCleaned = dateStr.replace(/\s+/g, '');
            return dmCleaned === currentCleaned;
          });
          
          // Check context for delivery date
          const matchIndex = match.index || 0;
          const contextStart = Math.max(0, matchIndex - 30);
          const contextEnd = Math.min(text.length, matchIndex + dateStr.length + 30);
          const context = text.substring(contextStart, contextEnd).toLowerCase();
          const isDeliveryDate = /datum\s+isporuke|delivery\s+date|datum\s+dostave/.test(context);
          
          if (!alreadyCaptured && !isDeliveryDate && dateStr) {
            // Handle 8-digit dates (YYYYMMDD or DDMMYYYY)
            if (/^\d{8}$/.test(dateStr)) {
              let parsedDate: Date | null = null;
              
              // Try YYYYMMDD format first
              const year1 = parseInt(dateStr.substring(0, 4), 10);
              const month1 = parseInt(dateStr.substring(4, 6), 10);
              const day1 = parseInt(dateStr.substring(6, 8), 10);
              
              if (year1 >= 1900 && year1 <= 2100 && month1 >= 1 && month1 <= 12 && day1 >= 1 && day1 <= 31) {
                const date1 = new Date(year1, month1 - 1, day1);
                if (!isNaN(date1.getTime()) && date1.getFullYear() === year1 && date1.getMonth() === month1 - 1 && date1.getDate() === day1) {
                  parsedDate = date1;
                  console.log('Found 8-digit date (YYYYMMDD):', dateStr);
                }
              }
              
              // If YYYYMMDD didn't work, try DDMMYYYY format
              if (!parsedDate) {
                const day2 = parseInt(dateStr.substring(0, 2), 10);
                const month2 = parseInt(dateStr.substring(2, 4), 10);
                const year2 = parseInt(dateStr.substring(4, 8), 10);
                
                if (year2 >= 1900 && year2 <= 2100 && month2 >= 1 && month2 <= 12 && day2 >= 1 && day2 <= 31) {
                  const date2 = new Date(year2, month2 - 1, day2);
                  if (!isNaN(date2.getTime()) && date2.getFullYear() === year2 && date2.getMonth() === month2 - 1 && date2.getDate() === day2) {
                    parsedDate = date2;
                    console.log('Found 8-digit date (DDMMYYYY):', dateStr);
                  }
                }
              }
              
              if (parsedDate) {
                dateMatches.push({
                  date: parsedDate.toISOString(),
                  dateStr: dateStr,
                  isDeliveryDate: false,
                  context: context
                });
              }
            } else {
              // Try to parse as regular date
              const parsedDate = this.parseDateFromString(dateStr);
              if (parsedDate) {
                dateMatches.push({
                  date: parsedDate.toISOString(),
                  dateStr: dateStr,
                  isDeliveryDate: false,
                  context: context
                });
                console.log('Found date with aggressive pattern:', dateStr);
              }
            }
          }
        });
      });
      
      // Re-filter and sort after aggressive extraction
      validDates = dateMatches
        .filter(dm => !dm.isDeliveryDate)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    
    if (validDates.length > 0) {
      // First (oldest) date is issue date
      const issueDate = new Date(validDates[0].date);
      result.issue_date = issueDate.toISOString().split('T')[0];
      console.log('Issue date (oldest):', result.issue_date, 'from:', validDates[0].dateStr);
      
      // Second date (if exists) is due date
      if (validDates.length > 1) {
        const dueDate = new Date(validDates[1].date);
        result.due_date = dueDate.toISOString().split('T')[0];
        console.log('Due date (second oldest):', result.due_date, 'from:', validDates[1].dateStr);
      } else {
        // If no due date found, add 15 days to issue date
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 15);
        result.due_date = dueDate.toISOString().split('T')[0];
        console.log('Due date (calculated: issue_date + 15 days):', result.due_date);
      }
      
      console.log('Extracted dates (excluding delivery dates):', validDates.map(d => ({ 
        dateStr: d.dateStr, 
        parsed: new Date(d.date).toISOString().split('T')[0] 
      })));
    }
    
    // Extract document number
    const docPatterns = [
      /(?:faktura|račun|invoice|doc|no)[\s:]*([A-Z0-9-]+)/i,
      /(?:broj|number)[\s:]*([A-Z0-9-]+)/i,
      /([A-Z]{2,}\d{4,})/g
    ];
    
    for (const pattern of docPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.document_number = match[1] || match[0];
        break;
      }
    }
    
    // Determine document type
    const docTypePatterns = [
      { pattern: /faktura/i, type: 'invoice' },
      { pattern: /račun/i, type: 'invoice' },
      { pattern: /invoice/i, type: 'invoice' },
      { pattern: /ponuda/i, type: 'quote' },
      { pattern: /quote/i, type: 'quote' },
      { pattern: /potvrda/i, type: 'receipt' },
      { pattern: /receipt/i, type: 'receipt' }
    ];
    
    for (const { pattern, type } of docTypePatterns) {
      if (pattern.test(text)) {
        result.document_type = type;
        break;
      }
    }
    
    if (!result.document_type) {
      result.document_type = 'invoice';
    }
    
    console.log('Parsed document data:', result);
    return result;
  }

  /**
   * Parse date from string in various formats
   * Supports: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD.MM.YYYY, and Serbian month names
   */
  private parseDateFromString(dateStr: string): Date | null {
    if (!dateStr || !dateStr.trim()) {
      return null;
    }
    
    try {
      // Handle Serbian month names (e.g., "15 januar 2024")
      const serbianMonths: { [key: string]: number } = {
        'januar': 1, 'januara': 1, 'jan': 1,
        'februar': 2, 'februara': 2, 'feb': 2,
        'mart': 3, 'marta': 3, 'mar': 3,
        'april': 4, 'aprila': 4, 'apr': 4,
        'maj': 5, 'maja': 5, 'may': 5,
        'jun': 6, 'juna': 6, 'june': 6,
        'jul': 7, 'jula': 7, 'july': 7,
        'avgust': 8, 'avgusta': 8, 'august': 8, 'aug': 8,
        'septembar': 9, 'septembra': 9, 'sep': 9, 'september': 9,
        'oktobar': 10, 'oktobra': 10, 'oct': 10, 'october': 10,
        'novembar': 11, 'novembra': 11, 'nov': 11, 'november': 11,
        'decembar': 12, 'decembra': 12, 'dec': 12, 'december': 12
      };
      
      // Check for Serbian month format
      const serbianMatch = dateStr.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
      if (serbianMatch) {
        const day = parseInt(serbianMatch[1], 10);
        const monthName = serbianMatch[2].toLowerCase();
        const year = parseInt(serbianMatch[3], 10);
        const month = serbianMonths[monthName];
        
        if (month && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      
      // Handle numeric formats
      let parts: string[] = [];
      let separator = '';
      
      if (dateStr.includes('/')) {
        parts = dateStr.split('/');
        separator = '/';
      } else if (dateStr.includes('-')) {
        parts = dateStr.split('-');
        separator = '-';
      } else if (dateStr.includes('.')) {
        parts = dateStr.split('.');
        separator = '.';
      } else {
        // Try to parse as-is
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
        return null;
      }
      
      if (parts.length !== 3) {
        return null;
      }
      
      // Clean parts
      parts = parts.map(p => p.trim().replace(/[^\d]/g, ''));
      
      let day: number, month: number, year: number;
      
      // Determine format: DD/MM/YYYY vs YYYY/MM/DD
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        // DD/MM/YYYY format (most common in Balkans)
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
        
        // Handle 2-digit years
        if (year < 100) {
          if (year < 50) {
            year += 2000; // 00-49 -> 2000-2049
          } else {
            year += 1900; // 50-99 -> 1950-1999
          }
        }
      }
      
      // Validate
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return null;
      }
      
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
        return null;
      }
      
      const date = new Date(year, month - 1, day);
      
      // Verify the date is valid (handles invalid dates like Feb 30)
      if (isNaN(date.getTime()) || 
          date.getDate() !== day || 
          date.getMonth() !== month - 1 || 
          date.getFullYear() !== year) {
        return null;
      }
      
      return date;
    } catch (error) {
      console.error('Error parsing date:', error, 'Input:', dateStr);
      return null;
    }
  }

  /**
   * Format date for input fields
   */
  private formatDateForInput(dateStr: string): string {
    try {
      let date: Date;
      
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          
          if (day > 12) {
            date = new Date(year, month - 1, day);
          } else {
            date = new Date(year, month - 1, day);
          }
        }
      } else if (dateStr.includes('-')) {
        date = new Date(dateStr);
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  /**
   * Create fallback result when processing fails
   */
  private createFallbackResult(file: File, error: string, processingTime: number): OCRResult {
    const fallbackData = {
      supplier_name: '',
      document_type: 'invoice',
      subtotal_tax_excluded: 0,
      total_amount: 0,
      currency: 'BAM',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      document_number: '',
      vat_rate: 20
    };
    
    return {
      text: `Document Processing Failed\n\nFile: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(1)} KB\n\nError: ${error}\n\nPlease manually enter the document details below.`,
      confidence: 0.1,
      processingTime,
      engine: 'fallback',
      extractedData: fallbackData
    };
  }
}

// Export singleton instance
export const ocrService = new OCRService();

