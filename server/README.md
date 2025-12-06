# PDF Generator Server (wkhtmltopdf)

This server provides an API endpoint to generate PDFs using wkhtmltopdf.

## Setup

1. **Install dependencies:**
   ```bash
   npm install express cors
   ```

2. **Start the server:**
   ```bash
   node server/pdf-generator.js
   ```

   The server will run on `http://localhost:3001`

3. **Optional: Set custom wkhtmltopdf path:**
   ```bash
   set WKHTMLTOPDF_PATH=C:\Custom\Path\to\wkhtmltopdf.exe
   node server/pdf-generator.js
   ```

## API Endpoints

### POST /generate-pdf

Generates a PDF from HTML content.

**Request:**
```json
{
  "html": "<html><body><h1>Invoice</h1></body></html>"
}
```

**Response:**
- Content-Type: `application/pdf`
- Returns PDF file as binary data

### GET /health

Check server status and wkhtmltopdf path.

**Response:**
```json
{
  "status": "ok",
  "wkhtmltopdf": "C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe"
}
```

## Usage in React

```typescript
const generatePDF = async (htmlContent: string) => {
  try {
    const response = await fetch('http://localhost:3001/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html: htmlContent }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Notes

- The server creates temporary files in `server/temp/` directory
- Temporary files are automatically cleaned up after PDF generation
- For production, consider adding authentication and rate limiting


