import { supabase } from '@/integrations/supabase/client';

interface InventoryRow {
  name: string;
  part_number?: string;
  production_status?: string;
  quantity: number;
  weight?: number;
  unit_price: number;
  currency: string;
  category: string;
  customer_id: string;
}

export async function importInventoryFromSpreadsheet(spreadsheetUrl?: string, staffId?: string): Promise<{ success: number; errors: number; }> {
  try {
    console.log('Starting import from Google Sheets');
    
    // Use provided URL or fallback to the original URL
    const url = spreadsheetUrl || 'https://docs.google.com/spreadsheets/d/1NHGvuqTJA0VzyO9HmR-BhkyOTNeW43xue7JUEWrlTqw/edit?usp=sharing';
    
    // Convert Google Sheets URL to CSV format for easier parsing
    const csvUrl = url.replace('/edit#gid=', '/export?format=csv&gid=')
                     .replace('/edit?usp=sharing', '/export?format=csv')
                     .replace('/edit', '/export?format=csv');
    
    console.log('Fetching data from:', csvUrl);
    
    // Fetch the spreadsheet data
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    // Parse CSV data (simple parsing - assumes no commas in quoted fields)
    const rows = csvText.split('\n').map(row => {
      const cells = [];
      let currentCell = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());
      
      return cells;
    }).filter(row => row.some(cell => cell.trim())); // Remove empty rows
    
    const customerId = '0b915160-f7e9-4b7c-8de1-b3aeeff11b05'; // IB.F Berger
    
    // Skip header row and process data rows
    const dataRows = rows.slice(1);
    
    const inventoryItems: InventoryRow[] = [];

    for (const row of dataRows) {
      // Map columns: Description, Art-Nr, Action, inStock, Weight, Price
      const [description, artNr, action, inStock, weight, price] = row;
      
      // Skip rows with empty descriptions
      if (!description || !description.trim()) continue;
      
      // Parse quantity (default to 0 if empty)
      const quantity = inStock ? parseInt(inStock) || 0 : 0;
      
      // Parse weight (remove KG suffix and convert to number)
      let weightNum: number | undefined;
      if (weight && weight.includes('KG')) {
        const weightValue = parseFloat(weight.replace('KG', '').trim());
        if (!isNaN(weightValue)) weightNum = weightValue;
      }
      
      // Parse price (remove € and comma, convert to number)
      let unitPrice = 0;
      if (price && price.includes('€')) {
        const priceValue = parseFloat(price.replace('€', '').replace(',', '').trim());
        if (!isNaN(priceValue)) unitPrice = priceValue;
      }
      
      inventoryItems.push({
        name: description.trim(),
        part_number: artNr?.trim() || undefined,
        production_status: action?.trim() || undefined,
        quantity,
        weight: weightNum,
        unit_price: unitPrice,
        currency: 'EUR',
        category: 'Parts', // Default category
        customer_id: customerId,
        created_by_staff_id: staffId || null
      });
    }

  console.log(`Preparing to insert ${inventoryItems.length} inventory items...`);
  
  // Insert in batches to avoid hitting size limits
  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < inventoryItems.length; i += batchSize) {
    const batch = inventoryItems.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from('inventory')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
        errorCount += batch.length;
      } else {
        console.log(`Successfully inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} items)`);
        successCount += batch.length;
      }
    } catch (err) {
      console.error(`Exception inserting batch ${Math.floor(i/batchSize) + 1}:`, err);
      errorCount += batch.length;
    }
  }
  
  return {
    success: successCount,
    errors: errorCount
  };
} catch (error) {
  console.error('Import failed:', error);
  throw error;
}
}