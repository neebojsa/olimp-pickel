/**
 * Simple Express server for generating PDFs using wkhtmltopdf
 * 
 * To use this:
 * 1. Install dependencies: npm install express cors
 * 2. Run: npm run pdf-server
 * 3. The server will run on http://localhost:3001
 * 
 * Then call from your React app:
 * POST http://localhost:3001/generate-pdf
 * Body: { html: "<html>...</html>" }
 */

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configure wkhtmltopdf path (Windows default)
const WKHTMLTOPDF_PATH = process.env.WKHTMLTOPDF_PATH || 'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe';

app.post('/generate-pdf', async (req, res) => {
  try {
    const { html } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    // Create temporary HTML file
    const tempHtmlPath = path.join(__dirname, 'temp', `invoice-${Date.now()}.html`);
    const tempPdfPath = path.join(__dirname, 'temp', `invoice-${Date.now()}.pdf`);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write HTML to file
    fs.writeFileSync(tempHtmlPath, html, 'utf8');

    // Generate PDF using wkhtmltopdf
    const command = `"${WKHTMLTOPDF_PATH}" --page-size A4 --margin-top 0mm --margin-bottom 0mm --margin-left 0mm --margin-right 0mm --enable-local-file-access "${tempHtmlPath}" "${tempPdfPath}"`;
    
    await execAsync(command);

    // Read PDF file
    const pdfBuffer = fs.readFileSync(tempPdfPath);

    // Clean up temporary files
    fs.unlinkSync(tempHtmlPath);
    fs.unlinkSync(tempPdfPath);

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="invoice.pdf"');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', wkhtmltopdf: WKHTMLTOPDF_PATH });
});

app.listen(PORT, () => {
  console.log(`PDF Generator server running on http://localhost:${PORT}`);
  console.log(`Using wkhtmltopdf at: ${WKHTMLTOPDF_PATH}`);
});

export default app;

