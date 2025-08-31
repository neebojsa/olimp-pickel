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

export async function importInventoryFromSpreadsheet() {
  const customerId = '0b915160-f7e9-4b7c-8de1-b3aeeff11b05'; // IB.F Berger
  
  // Raw data from the spreadsheet (excluding header rows)
  const rawData = [
    ['Stromwandlerhalter Ø80 4"/4"', 'ESK 2202416', '', '6', '10.5 KG', '€204.32'],
    ['Kettenspanner', '0413 520', '', '30', '1.2 KG', '€19.36'],
    ['Mitnehmerzapfen', '0413 561', '', '26', '0.6 KG', '€18.60'],
    ['Coupling for Knickschutzfeder Halter', '', '', '7', '', ''],
    ['Knickschutzfeder Halter', '0413 658', '5 for stock', '5', '', ''],
    ['Knickschutzfeder Halter', '0413 655', '5 for stock', '5', '10.0 KG', '€242.90'],
    ['Rotationshebel', '0413 670', '', '20', '8.3 KG', '€333.30'],
    ['Schwenkbügel V3', '0413 671-2', '', '19', '12.5 KG', '€301.80'],
    ['Nutationsbügel', '0413 672', '', '16', '5.1 KG', '€169.50'],
    ['Rotationshebel', '0413 690', '10 pcs for stock. Machining in progress. 04/09', '', '10.2 KG', '€426.70'],
    ['', '0413 671-V', '', '5', '', '€321.00'],
    ['Laufrollen Komplete', '', '', '', '16.0 KG', ''],
    ['Welle zu Laufrolle D=30x250', '0414 821', '', '16', '1.3 KG', '€57.00'],
    ['Flansch zu Laufrolle', '0414 822', '', '27', '0.1 KG', '€10.40'],
    ['Welle zu Aufhängung', '0414 823', 'Another 5 pcs for stock. 02/09', '5', '2.7 KG', '€45.40'],
    ['Laufrollen D= 80x224', '0414 845', 'Another 30 for stock', '10', '3.5 KG', '€74.60'],
    ['Ring zu Laufrolle D=80', '0414 847', '', '21', '0.1 KG', '€15.50'],
    ['Traeger zu Laufrolle D=80', '0414 851', '', '6', '1.1 KG', '€25.80'],
    ['Distanzrohr zu Laufrolle', '0414 853', '', '13', '0.2 KG', '€17.10'],
    ['Distanzscheibe 30x24x1', '2221 635', '', '20', '0.0 KG', '€2.90'],
    ['SKF Spherical Roller Bearing', '22206 E', '', '8', '0.2 KG', ''],
    ['', '0444 022', '', '', '6.7 KG', '€227.40'],
    ['Gehäuse NW 80', '0801 139', '', '', '4.5 KG', ''],
    ['Hydraulic Cylinder', '0831 512', '4 pc in production', '3', '56.0 KG', '€1,295.00'],
    ['Kolbenstange', '0831 593', '', '8', '16.0 KG', '€341.80'],
    ['Piston', '0831 594', '', '10', '2.2 KG', '€85.80'],
    ['Sealings for Cylinder 0831 512', '', '', '11', '', ''],
    ['SCHWENKZYLINDER (№: 306-309)', '0831 585', '', '12', '7.2 KG', '€371.56'],
    ['Kolbenstange (№: 365-368)', '0833 079', '', '30', '4.5 KG', '€137.40'],
    ['Gear', '0833 024', 'Production 50 pcs in progress. Machining in progress. 12/09', '', '0.2 KG', '€66.12'],
    ['Bushing for Kolbenstange 0833 079', '', '', '5', '', ''],
    ['Sealings for Cylinder 0831 585', '', '', '17', '', ''],
    ['Austrittsstutzen D 100 Gehartet', '0833 027', '', '10', '2.1 KG', '€54.80'],
    ['Dichtungsflansch', '0833 053', '', '', '1.3 KG', ''],
    ['Gleitlagergehäuse', '0833 054', '', '', '3.2 KG', ''],
    ['Keilsegment', '0833 058', '', '20', '0.1 KG', '€20.50'],
    ['Klemmring innen', '0833 059', '', '7', '1.0 KG', '€24.10'],
    ['Klemmring aussen', '0833 060', '', '9', '1.0 KG', '€22.20'],
    ['Verschleissring Zu Schwenkhebel', '0833 071', '20 to ship + 30 for stock.', '', '0.2 KG', '€10.00'],
    ['Bolzen Kurz', '0833 572', '', '15', '0.3 KG', '€17.00'],
    ['Gehäuse Siebschalter', '0833 573', '', '2', '1.5 KG', '€118.85'],
    ['Messscheibe Siebschalter', '0833 574', '', '', '0.3 KG', '€17.50'],
    ['Abdeckblesh Siebschalter', '0833 575', '', '24', '0.3 KG', '€40.30'],
    ['Distanzring', '0833 579', '', '4', '0.1 KG', '€8.22'],
    ['Halter zu Abdeckung', '0833 580', '', '27', '0.4 KG', '€21.20'],
    ['Förderzylinder D 180/600', '0843 001', '', '9', '33.0 KG', '€555.00'],
    ['Verschleissring', '0833 003', '', '', '5.7 KG', '€240.00'],
    ['Verschleissplatte D180 mm', '0843 002', '', '19', '10.0 KG', '€535.00'],
    ['Verschleissplatte D 150 mm', '0833 002', '', '1', '10.0 KG', '€535.00'],
    ['Deckel zu Kolben', 'ME: 0873 101 AC: 4140 8731 01', '', '5', '0.4 KG', '€19.10'],
    ['Verschleißplatte', '0873 106', '', '30', '3.4 KG', '€215.00'],
    ['Verschleissring', 'ME: 0873 105 AC: 4140 8731 05', '', '20', '1.2 KG', '€108.56'],
    ['Forderzylinder', '0873 140', '', '15', '13.0 KG', '€352.00'],
    ['Nippel 1"', '0903 823', '', '40', '0.1 KG', '€6.20'],
    ['Bohrstangenhalter Special nose', '', '', '2', '', '€169.30'],
    ['Bohrstangenhalter / Buchse', '263 684 98', '', '14', '4.9 KG', '€169.30'],
    ['Bohrstangenhalter / Buchse', '263 685 98', '', '', '6.8 KG', '€248.00'],
    ['Bohrstangenführung Platte', '263 685 98-1', '', '50', '0.6 KG', '€6.30'],
    ['Bohrstangenhalter spezial', '263 685 98-2', '', '', '12.9 KG', '€400.00'],
    ['Bohrstangenführung', '263 685 98-2', '', '8', '6.5 KG', '€152.00'],
    ['KLEMMSTÜCK', '263 934 08', '', '32', '2.1 KG', '€76.30'],
    ['Mutter Amecoil M16', '289 221 28', '', '22', '1.0 KG', '€41.22'],
    ['Füllventil', '3115 0262 00', 'Done!', '120', '0.1 KG', '€26.30'],
    ['Füllventil', '3115 3768 00', '', '', '', '€32.00'],
    ['Füllventil cap', '', '', '14', '', ''],
    ['Scheibe', '3115 0284 00', '', '27', '', '€5.40'],
    ['Nippel', '3115 0642 00', '', '100', '0.1 KG', '€11.00'],
    ['Testventil', '3115 2196 81', '', '16', '0.0 KG', '€15.20'],
    ['Scheibe', '3128 0482 00', '50 for stock. 04/09', '', '0.1 KG', '€8.00'],
    ['Platte Ø 174/3', '3128 0485 00', '', '2', '0.4 KG', '€10.80'],
    ['Distanzstück', '3128 0784 09', '', '17', '3.7 KG', '€105.10'],
    ['Distanz', '3128 0609 00', '', '10', '0.7 KG', '€23.30'],
    ['Distanz', '3128 0610 00', '', '20', '0.3 KG', '€17.00'],
    ['Distanzstück', '3128 0621 00', '6 for stock. Material suppling', '1', '5.8 KG', '€106.00'],
    ['Distanzstück', '3128 0691 00', '', '36', '0.3 KG', '€11.70'],
    ['Konsole', '3128 0710 00', '', '10', '0.4 KG', '€6.10'],
    ['Bügel', '3128 0711 00', '', '35', '0.3 KG', '€5.45'],
    ['Distanzstück', '3128 0784 06', '', '5', '4.3 KG', '€37.10'],
    ['Distanzstück', '3128 0784 07', '', '', '7.5 KG', '€109.40'],
    ['Pulley wheel', '3128 0781 90', '', '8', '1.0 KG', '€68.40'],
    ['Scheibe', '3128 0785 34', '', '20', '2.6 KG', '€42.40'],
    ['Distanzstück', '3128 0785 70', '', '9', '', '€61.00'],
    ['Distanzstück', '3128 0785 71', '', '10', '', '€113.00'],
    ['Hydrauliknippel', '3128 0785 43', '', '10', '0.4 KG', '€24.74'],
    ['Gabelstück', '3128 2008 00', '', '10', '1.3 KG', '€97.24'],
    ['Halter', '3128 2459 00', '', '', '', ''],
    ['Führung', '3128 2809 61', '', '8', '2.2 KG', '€133.25'],
    ['Führung', '3128 2809 64', '', '20', '1.9 KG', '€134.25'],
    ['Seilführung', '3128 3040 24', '', '11', '0.1 KG', '€11.16'],
    ['Adapter', '3128 3051 49', '', '20', '0.2 KG', '€10.96'],
    ['Klemme', '3128 3055 61', '', '18', '0.2 KG', '€6.40'],
    ['Klemme', '3128 3055 62', '', '11', '0.3 KG', '€7.55'],
    ['Bohrstahlführung Links', '3128 3056 22', '', '24', '5.3 KG', '€98.10'],
    ['Bohrstahlführung Rechts', '3128 3056 23', '', '33', '5.3 KG', '€98.10'],
    ['Clamp', '3128 3023 00', '', '25', '1.1 KG', '€67.20'],
    ['Clamp', '3128 3057 29', '', '15', '1.6 KG', '€66.72'],
    ['Clamp', '3128 3057 96', '', '16', '1.3 KG', '€56.10'],
    ['Clamp', '3128 3063 18', '', '5', '0.9 KG', '€55.65'],
    ['Abstreifer', '3128 3061 74', '', '16', '2.3 KG', '€67.20'],
    ['Plate', '3128 3065 42', '', '30', '0.2 KG', '€18.60'],
    ['Seilhalter', '3128 3080 67', '', '15', '0.1 KG', '€12.80'],
    ['Seilhalter', '3128 3080 68', '', '30', '0.1 KG', '€10.30'],
    ['Flanschhalbplatte', '3128 3102 49', '', '10', '1.1 KG', '€31.00'],
    ['Gabelstück', '3128 3104 06', '', '8', '1.2 KG', '€105.20'],
    ['Kabelklemme', '3128 3119 28', '30 for stock. 12/09', '', '0.2 KG', '€10.90'],
    ['Nippel', '3128 3150 37', '', '23', '0.7 KG', '€25.20'],
    ['Flanschhalbplatte 2 / St 53', '3128 3152 94', 'Done! Zinc galvanizing left. 29/09', '100', '1.1 KG', '€26.80'],
    ['Flanschhalbplatte 1 / St 53', '3128 3152 95', '100 pcs in production. Cutting in progress', '', '1.4 KG', '€42.40'],
    ['Schotthalter', '3128 3164 69', '', '10', '8.2 KG', '€372.20'],
    ['Aufnahme platte di=59 - Special customer request - NOT hardened', '3128 3025 50 st-SQR', '', '', '', '€98.50'],
    ['Aufnahme platte di=59 - NOT hardened', '3128 3025 50 st', '', '', '2.7 KG', '€98.50'],
    ['Aufnahme platte di=59 - Hardened', '3128 3025 49 st', '', '5', '2.7 KG', '€98.50'],
    ['Aufnahme platte di=49- Hardened', '3128 3025 49 st', '', '10', '3.2 KG', '€98.50'],
    ['Langnippel 7/8 Jic', '3176 7969 00', '', '15', '0.3 KG', '€9.90'],
    ['Langnippel 1 1/16 Jic', '3176 7970 00', '', '30', '0.5 KG', '€11.90'],
    ['Mutter Zu Nippel (3176 7969 00)', '0263 3212 00', '', '', '0.1 KG', '€1.00'],
    ['Mutter Zu Nippel (3176 7970 00)', '0263 3215 00', '', '', '0.1 KG', '€1.10'],
    ['Brecket for wheel', '320 417 08', '8 pcs in production. 29/08', '', '8.2 KG', '€351.00'],
    ['Platte Mittelführung', '325 124 98', '', '12', '8.4 KG', '€339.00'],
    ['Bohrstangenhalter / Puffer', '325 321 68', '', '', '', '€511.00'],
    ['Wheel', '332 779 38', '', '10', '5.1 KG', '€176.70'],
    ['Platte', '344 661 28', '', '30', '1.0 KG', '€15.72'],
    ['DISTANZRING', '345 710 92', '', '25', '0.1 KG', '€7.04'],
    ['Mounting Flange', '0413 831', '', '20', '0.8 KG', '€47.56'],
    ['Spacer Ring', '4140 4149 32', '', '10', '0.7 KG', '€19.10'],
    ['Spacer Ring', '4140 4149 35', '', '30', '0.2 KG', '€11.05'],
    ['Halter Endschalter', '550 123 95', '', '10', '3.5 KG', '€195.22'],
    ['Cover Plate', '550 216 57', '', '10', '1.6 KG', '€59.90'],
    ['Sandvic Cover', '550 455 00', '', '9', '9.2 KG', '€380.00'],
    ['Sandvic Cover', '550 468 53', '', '2', '9.2 KG', '€380.00'],
    ['Gleitplatte', '0414 959', '', '2', '0.3 KG', '€16.24'],
    ['Platte', '550 49 491', '', '12', '0.8 KG', '€22.70'],
    ['Distanzplatte 1mm', '550 919 28', '', '11', '0.1 KG', '€9.23'],
    ['Distanzplatte 2mm', '550 919 29', '', '11', '0.2 KG', '€9.28'],
    ['Distanzplatte 3mm', '550 919 30', '', '10', '0.3 KG', '€10.32'],
    ['Distanzplatte 5mm', '550 919 32', '', '10', '0.5 KG', '€11.36'],
    ['Distanzplatte 1mm', '550 919 34', '', '11', '0.1 KG', '€6.62'],
    ['Gleitstück', '550 919 40', '', '41', '0.6 KG', '€19.40'],
    ['Plate', '551 000 70', '', '18', '3.7 KG', '€172.56'],
    ['Klammer', '551 583 73', '', '32', '0.9 KG', '€46.00'],
    ['Klammer spezial', '', '', '15', '0.9 KG', '€113.36'],
    ['Pin', '551 833 03', '', '25', '', '€13.26'],
    ['Plate', '551 995 04', '', '10', '0.0 KG', '€8.92'],
    ['Plate', '551 995 05', '', '35', '0.2 KG', '€12.60'],
    ['Plate', '552 027 68', '', '24', '4.4 KG', '€222.20'],
    ['VENTIL (Swellexkopf)', '6003 5417 00', '150 for stock. 29/08', '', '0.0 KG', '€12.52'],
    ['VENTIL (Swellexkopf)', '6003 5418 00', '150 for stock. 01/09', '', '0.0 KG', '€15.02'],
    ['Manom. Koppling', '6003 9595 00', '30 for stock. 12/09', '', '0.1 KG', '€22.96'],
    ['Swellex Kopf Standard', '8613 2441 05', '', '', '1.7 KG', ''],
    ['Buchse DM 57 331 912 31 Buchse DM 48 331 912 32', 'DM 57 331 912 31', '', '', '1.7 KG', ''],
    ['Concrete nozzle steel 4" Putzmeister short (350 mm)', '', '', '', '3.6 KG', '€35.62'],
    ['Concrete nozzle steel 4" Putzmeister (PM500)', '', '', '15', '4.6 KG', '€36.42'],
    ['Concrete nozzle steel 3 ¼" Meyco', '', '', '85', '4.1 KG', '€36.50'],
    ['Concrete nozzle steel 3 ¼" Meyco 250 mm short', '', '', '', '3.5 KG', '€36.60'],
    ['Concrete nozzle steel 3 ¼" Meyco (dm40 x L350) Fröschnitz', '', '', '28', '4.5 KG', '€39.12'],
    ['Concrete nozzle steel 3" Meyco', '', '', '42', '4.0 KG', '€35.62'],
    ['Concrete nozzle Gold', '', '', '1', '3.7 KG', '€37.12'],
    ['4" Panzerschlauch A', '', '', '15', '3.7 KG', '€69.00'],
    ['4" Panzerschlauch B', '', '', '15', '3.5 KG', '€69.00'],
    ['Hardoxblech 5mm FÜR BSH 110', '', '', '15', '0.2 KG', '€9.12'],
    ['Hardoxblech 8mm FÜR BSH 110', '', '50 pcs for stock. 04/09', '', '0.3 KG', '€13.62'],
    ['Hardoxblech 5mm FÜR BSH 110 wide', '', '', '26', '0.3 KG', '€10.96'],
    ['Hardoxblech 8mm FÜR BSH 110 wide', '', '', '31', '0.5 KG', '€15.18'],
    ['Schlagpaka IBO 32', '', '', '30', '3.5 KG', '€53.50'],
    ['Schlagpaka IBO 38', '', '', '10', '3.5 KG', '€53.50'],
    ['Bolzen M10 (security hole 1 mm)', '', 'Done!', '170', '0.1 KG', '€1.00'],
    ['Bolzen Tulfes m10. Lenght 80 mm (stainless steel)', '', '', '', '0.1 KG', '€5.85'],
    ['Grundplatte Rahmen spezial', '', '', '', '6.0 KG', '€176.00'],
    ['Bohrstangenhalter NEW (Complet)', '', '', '4', '21.7 KG', '€928.63'],
    ['BOHRSTAHLHALTER', '', '', '', '30.0 KG', '€406.00'],
    ['Halter Feuerlöcher 600 mm economic version', '', '', '', '6.5 KG', '€44.10'],
    ['Halter Feuerlöcher 700 mm economic version', '', '', '', '6.9 KG', '€45.10'],
    ['Halter Feuerlöcher 660', '', '', '', '15.2 KG', '€60.00'],
    ['Halter Feuerlöcher 500', '', '', '', '12.2 KG', '€34.00'],
    ['Locking screw', '20782438', '', '62', '0.5 KG', '€28.00'],
    ['Locking screw', '20782568', '', '16', '0.5 KG', '€26.00'],
    ['Plate 80 x 80 x 5 mm', '', '', '', '0.2 KG', '€0.91'],
    ['Wasser fang tase kleine', '', '', '', '', ''],
    ['Hardox platte Nr.1 Ø510x16', '', '', '', '19.7 KG', '€323.00'],
    ['Hardox platte Nr.2 Ø510x16', '', '', '', '18.2 KG', '€331.00'],
    ['Plates for rubber 16MnCr5', '', '88 pcs in production. Machining will be complete in three days. Then we need a week to harden it so it will be complete by 05/09', '', '5.0 KG', '€258.00'],
    ['Plates for rubber HARDOX', '', '', '', '5.0 KG', '€220.00'],
    ['Reduzierung 100-60', '', '', '', '', ''],
    ['', '3128 3175 77', '', '', '', '€410.00'],
    ['', '30299518', '', '', '', '€239.00'],
    ['GABEL KLEIN', '3128 0893 00', '', '', '', '€219.00'],
    ['Hammerplate A', '3128 0784 45', '', '3', '2.5 KG', '€156.00'],
    ['Hammerplate B', '3128 0784 37', '', '10', '2.0 KG', '€175.00'],
    ['Endsplate rechts', '3128 2012 02', '', '11', '1.5 KG', '€119.00'],
    ['Endsplate Links', '3128 3012 73', '12 pcs in production', '1', '1.5 KG', '€119.00'],
    ['Mounting plate 10 mm blue', '', '', '10', '', '€18.90'],
    ['Mounting plate 1 mm Stainless Steel', '', '', '20', '', '€3.90']
  ];

  const inventoryItems: InventoryRow[] = [];

  for (const row of rawData) {
    const [name, partNumber, productionStatus, quantityStr, weightStr, priceStr] = row;
    
    // Skip rows with empty names
    if (!name.trim()) continue;
    
    // Parse quantity (default to 0 if empty)
    const quantity = quantityStr ? parseInt(quantityStr) || 0 : 0;
    
    // Parse weight (remove KG suffix and convert to number)
    let weight: number | undefined;
    if (weightStr && weightStr.includes('KG')) {
      const weightNum = parseFloat(weightStr.replace('KG', '').trim());
      if (!isNaN(weightNum)) weight = weightNum;
    }
    
    // Parse price (remove € and comma, convert to number)
    let unitPrice = 0;
    if (priceStr && priceStr.includes('€')) {
      const priceNum = parseFloat(priceStr.replace('€', '').replace(',', '').trim());
      if (!isNaN(priceNum)) unitPrice = priceNum;
    }
    
    inventoryItems.push({
      name: name.trim(),
      part_number: partNumber?.trim() || undefined,
      production_status: productionStatus?.trim() || undefined,
      quantity,
      weight,
      unit_price: unitPrice,
      currency: 'EUR',
      category: 'Parts', // Default category
      customer_id: customerId
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
    total: inventoryItems.length,
    success: successCount,
    errors: errorCount
  };
}