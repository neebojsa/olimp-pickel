/**
 * Fuzzy string matching utilities
 * Used for OCR text matching with ~80% similarity threshold
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity percentage between two strings (0-100)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  if (str1.length === 0 || str2.length === 0) return 0;

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.round(similarity * 100) / 100;
}

/**
 * Normalize text for better fuzzy matching
 * Normalizes whitespace and punctuation variations, handles common OCR errors
 */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Normalize whitespace (multiple spaces to single space)
    .replace(/\s+/g, ' ')
    // Normalize dash variations - treat all dash types as same
    .replace(/[-–—−]/g, '-')
    // Normalize common OCR character errors (be careful not to break words)
    // Only normalize if it's clearly a number context
    .trim();
}

/**
 * Find fuzzy match in text with ~80% similarity threshold
 * Returns the index where the match starts, or -1 if no match found
 * Improved to handle punctuation variations and OCR errors
 */
export function findFuzzyMatch(text: string, pattern: string, threshold: number = 80): number {
  if (!pattern || pattern.trim().length === 0) return -1;
  
  const normalizedPattern = normalizeForMatching(pattern);
  const normalizedText = normalizeForMatching(text);
  
  // Try exact match first (after normalization)
  const exactIndex = normalizedText.indexOf(normalizedPattern);
  if (exactIndex !== -1) {
    // Find the position in original text
    return findPositionInOriginal(text, normalizedText, exactIndex);
  }
  
  // Try fuzzy matching word by word (more flexible)
  const patternWords = normalizedPattern.split(/\s+/).filter(w => w.length > 0);
  if (patternWords.length === 0) return -1;
  
  const textWords = normalizedText.split(/\s+/);
  
  // Look for pattern words in sequence (allow gaps)
  for (let i = 0; i <= textWords.length - patternWords.length; i++) {
    let matchedWords = 0;
    let totalSimilarity = 0;
    let wordPositions: number[] = [];
    
    let textWordIndex = i;
    for (let j = 0; j < patternWords.length && textWordIndex < textWords.length; j++) {
      // Try current word and next few words (allow skipping)
      let bestMatch = 0;
      let bestIndex = textWordIndex;
      
      for (let k = 0; k < 3 && (textWordIndex + k) < textWords.length; k++) {
        const similarity = calculateSimilarity(patternWords[j], textWords[textWordIndex + k]);
        if (similarity > bestMatch) {
          bestMatch = similarity;
          bestIndex = textWordIndex + k;
        }
      }
      
      if (bestMatch >= threshold - 10) { // Slightly lower threshold for individual words
        matchedWords++;
        totalSimilarity += bestMatch;
        wordPositions.push(bestIndex);
        textWordIndex = bestIndex + 1;
      } else {
        textWordIndex++;
      }
    }
    
    // If most words match with good similarity, consider it a match
    const avgSimilarity = matchedWords > 0 ? totalSimilarity / matchedWords : 0;
    const wordMatchRatio = matchedWords / patternWords.length;
    
    if (wordMatchRatio >= 0.75 && avgSimilarity >= threshold - 15) {
      // Find the actual position in the original text
      if (wordPositions.length > 0) {
        const firstWordPos = wordPositions[0];
        const wordsBeforeMatch = textWords.slice(0, firstWordPos).join(' ');
        return findPositionInOriginal(text, normalizedText, wordsBeforeMatch.length + (wordsBeforeMatch.length > 0 ? 1 : 0));
      }
    }
  }
  
  // Try substring matching with sliding window (character-level)
  const patternLength = normalizedPattern.length;
  const minLength = Math.max(3, Math.floor(patternLength * 0.7)); // At least 70% of pattern length
  
  for (let i = 0; i <= normalizedText.length - minLength; i++) {
    // Try different substring lengths
    for (let len = minLength; len <= Math.min(patternLength + 5, normalizedText.length - i); len++) {
      const substring = normalizedText.substring(i, i + len);
      const similarity = calculateSimilarity(normalizedPattern, substring);
      
      if (similarity >= threshold) {
        return findPositionInOriginal(text, normalizedText, i);
      }
    }
  }
  
  return -1;
}

/**
 * Find position in original text based on normalized text position
 */
function findPositionInOriginal(original: string, normalized: string, normalizedPos: number): number {
  // Simple approximation - find the closest position in original
  // This is a simplified version, could be improved
  if (normalizedPos === 0) return 0;
  
  const normalizedBefore = normalized.substring(0, normalizedPos);
  const originalLower = original.toLowerCase();
  
  // Try to find matching position
  let pos = 0;
  let normalizedIndex = 0;
  
  for (let i = 0; i < original.length && normalizedIndex < normalizedPos; i++) {
    const char = originalLower[i];
    if (char === normalizedBefore[normalizedIndex] || 
        (char.match(/[\s-]/) && normalizedBefore[normalizedIndex]?.match(/[\s-]/))) {
      normalizedIndex++;
      if (normalizedIndex === normalizedPos) {
        return i + 1;
      }
    }
    pos = i;
  }
  
  return Math.min(pos, original.length);
}

/**
 * Extract value after a matched pattern in text
 * Returns the extracted value or null if not found
 * @param preferDate - If true, prioritize date extraction over number extraction
 * @param preferDocumentNumber - If true, prioritize document number extraction (alphanumeric with dashes/slashes)
 */
export function extractValueAfterPattern(
  text: string, 
  pattern: string, 
  threshold: number = 80,
  preferDate: boolean = false,
  preferDocumentNumber: boolean = false
): string | null {
  const matchIndex = findFuzzyMatch(text, pattern, threshold);
  
  if (matchIndex === -1) {
    return null;
  }
  
  // Find the end of the pattern match
  const patternLength = pattern.length;
  let searchStart = matchIndex + patternLength;
  
  // Skip whitespace and common separators
  while (searchStart < text.length && /[\s:;,\-]/.test(text[searchStart])) {
    searchStart++;
  }
  
  if (searchStart >= text.length) {
    return null;
  }
  
  // Extract the value - try to get a meaningful value
  // Look for numbers, dates, or text until end of line or next significant separator
  const remainingText = text.substring(searchStart);
  
  // If preferDocumentNumber is true, try document number patterns first
  if (preferDocumentNumber) {
    // Document numbers can be: alphanumeric with dashes, slashes, dots
    // Examples: "12345", "INV-2024-001", "2024/001", "FA-123/2024", etc.
    // Look for sequences of alphanumeric characters with separators
    const docNumberMatch = remainingText.match(/^[\w\-/.\s]+/);
    if (docNumberMatch) {
      const docNum = docNumberMatch[0].trim();
      // Must contain at least one digit or letter, and be reasonable length (3-50 chars)
      if (/[\dA-Za-z]/.test(docNum) && docNum.length >= 2 && docNum.length <= 50) {
        // Stop at common separators that indicate end of document number
        const cleanDocNum = docNum.split(/[\s\n:;,\|]/)[0].trim();
        if (cleanDocNum.length >= 2) {
          return cleanDocNum;
        }
      }
    }
    
    // Try more specific pattern: alphanumeric with common separators
    const docNumberPattern = remainingText.match(/^[A-Za-z0-9][A-Za-z0-9\-/.\s]{1,49}/);
    if (docNumberPattern) {
      const docNum = docNumberPattern[0].trim();
      // Stop at whitespace or common separators
      const cleanDocNum = docNum.split(/[\s\n:;,\|]/)[0].trim();
      if (cleanDocNum.length >= 2) {
        return cleanDocNum;
      }
    }
  }
  
  // If preferDate is true, try date patterns first
  if (preferDate) {
    // Try to extract date in various formats
    // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    const dateMatch1 = remainingText.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/);
    if (dateMatch1) {
      return dateMatch1[0].trim();
    }
    
    // YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD
    const dateMatch2 = remainingText.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
    if (dateMatch2) {
      return dateMatch2[0].trim();
    }
    
    // DD.MM.YY or DD/MM/YY (2-digit year)
    const dateMatch3 = remainingText.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2})(?!\d)/);
    if (dateMatch3) {
      return dateMatch3[0].trim();
    }
    
    // More flexible date pattern - digits with separators
    const dateMatch4 = remainingText.match(/^[\d./\-]+\s*(?=\s|$|[^\d./\-])/);
    if (dateMatch4) {
      const dateStr = dateMatch4[0].trim();
      // Verify it looks like a date (has at least one separator)
      if (/[./\-]/.test(dateStr) && dateStr.length >= 6) {
        return dateStr;
      }
    }
  }
  
  // Try to extract number (for amounts, quantities)
  // But skip if it looks like part of a date
  const numberMatch = remainingText.match(/^[\d.,\s]+/);
  if (numberMatch && !preferDate) {
    return numberMatch[0].trim();
  }
  
  // Try to extract date (if not already tried)
  if (!preferDate) {
    // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    const dateMatch1 = remainingText.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/);
    if (dateMatch1) {
      return dateMatch1[0].trim();
    }
    
    // YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD
    const dateMatch2 = remainingText.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
    if (dateMatch2) {
      return dateMatch2[0].trim();
    }
    
    // More flexible date pattern
    const dateMatch3 = remainingText.match(/^[\d./\-]+\s*(?=\s|$|[^\d./\-])/);
    if (dateMatch3) {
      const dateStr = dateMatch3[0].trim();
      if (/[./\-]/.test(dateStr) && dateStr.length >= 6) {
        return dateStr;
      }
    }
  }
  
  // Try to extract document number pattern (alphanumeric with separators) if not already tried
  if (!preferDocumentNumber && !preferDate) {
    // Look for alphanumeric sequences that might be document numbers
    const docNumberMatch = remainingText.match(/^[A-Za-z0-9][A-Za-z0-9\-/.\s]{1,49}/);
    if (docNumberMatch) {
      const docNum = docNumberMatch[0].trim();
      // Stop at whitespace or common separators that indicate end
      const cleanDocNum = docNum.split(/[\s\n:;,\|]/)[0].trim();
      // Must contain at least one digit or letter and be reasonable length
      if (cleanDocNum.length >= 2 && /[\dA-Za-z]/.test(cleanDocNum) && cleanDocNum.length <= 50) {
        return cleanDocNum;
      }
    }
  }
  
  // Try to extract text until end of line or next colon/semicolon
  const textMatch = remainingText.match(/^[^\n:;]+/);
  if (textMatch) {
    const text = textMatch[0].trim();
    // If it looks like a document number (alphanumeric with separators), return it
    if (/^[A-Za-z0-9][A-Za-z0-9\-/.\s]*$/.test(text) && text.length >= 2 && text.length <= 50) {
      return text.split(/[\s\n:;,\|]/)[0].trim();
    }
    return text;
  }
  
  // Fallback: return first word (but prefer alphanumeric sequences)
  const alphanumericMatch = remainingText.match(/^[A-Za-z0-9\-/.]+\S*/);
  if (alphanumericMatch) {
    return alphanumericMatch[0].trim();
  }
  
  const wordMatch = remainingText.match(/^\S+/);
  if (wordMatch) {
    return wordMatch[0].trim();
  }
  
  return null;
}

