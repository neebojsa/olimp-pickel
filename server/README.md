# PDF Generation Server

Server-side PDF generation for invoices using Playwright (vector-quality output).

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browser:**
   ```bash
   npm run install-playwright
   ```
   Or manually:
   ```bash
   npx playwright install chromium
   ```

3. **Set environment variables:**
   Create a `.env` file in the project root (or set environment variables):
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   PORT=3001
   ```
   
   **Important:** You need the Supabase Service Role Key (not the anon key) to fetch invoice data server-side.
   - Find it in: Supabase Dashboard → Settings → API → Service Role Key

4. **Start the server:**
   ```bash
   npm run pdf-server
   ```

   The server will run on `http://localhost:3001` by default.

## API Endpoints

### `GET /api/invoice/:id/pdf`
Generate PDF for an invoice by ID.

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="invoice-{invoice_number}.pdf"`

**Example:**
```bash
curl http://localhost:3001/api/invoice/123e4567-e89b-12d3-a456-426614174000/pdf -o invoice.pdf
```

### `POST /generate-pdf` (Legacy)
Generate PDF from HTML content (for backward compatibility).

**Request Body:**
```json
{
  "html": "<html>...</html>"
}
```

### `GET /health`
Health check endpoint.

## How It Works

1. Frontend calls `/api/invoice/:id/pdf` with invoice ID
2. Server fetches invoice data from Supabase (using service role)
3. Server generates HTML using the same template/styling as frontend print view
4. Playwright renders HTML with `@media print` styles applied
5. Playwright exports to PDF (vector-quality, same as browser print-to-PDF)
6. PDF is returned to frontend and automatically downloaded

## Features

- ✅ Vector-quality PDF output (selectable text, small file size)
- ✅ Uses same print CSS as frontend (`@media print`)
- ✅ No browser print dialog required
- ✅ One-click download
- ✅ Supports multi-page invoices
- ✅ Handles fonts, images, and complex layouts

## Troubleshooting

**Error: "Invoice not found"**
- Check that SUPABASE_SERVICE_ROLE_KEY is set correctly
- Verify the invoice ID exists in your database

**Error: "Failed to generate PDF"**
- Ensure Playwright browser is installed: `npx playwright install chromium`
- Check server logs for detailed error messages

**PDF looks different from print preview**
- The server uses the same HTML template and CSS as the frontend
- If there are differences, check that `server/invoiceHtmlTemplate.js` matches the frontend rendering logic

## Production Deployment

For production, you'll need to:
1. Set environment variables on your hosting platform
2. Ensure Playwright browser is installed in your deployment environment
3. Consider using a process manager like PM2 for the server
4. Set up proper CORS if frontend and server are on different domains
