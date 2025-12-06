# wkhtmltopdf Installation Guide for Windows

## Step 1: Download the Installer

1. Visit: https://wkhtmltopdf.org/downloads.html
2. Download the **Windows (64-bit)** installer (.msi file)
   - Recommended: Latest stable version (0.12.6 or newer)
   - Direct download link (if available): https://github.com/wkhtmltopdf/wkhtmltopdf/releases

## Step 2: Install wkhtmltopdf

1. Double-click the downloaded `.msi` file
2. Follow the installation wizard:
   - Click **Next**
   - Accept the license agreement
   - Choose installation location (default: `C:\Program Files\wkhtmltopdf\`)
   - Click **Install**
   - Click **Finish**

## Step 3: Add to System PATH (Important!)

After installation, you need to add wkhtmltopdf to your system PATH so it can be found by Node.js:

### Option A: Automatic (via PowerShell - Run as Administrator)
```powershell
$wkhtmlPath = "C:\Program Files\wkhtmltopdf\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$wkhtmlPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$wkhtmlPath", "Machine")
    Write-Host "Added wkhtmltopdf to PATH. Please restart your terminal/IDE."
}
```

### Option B: Manual
1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to **Advanced** tab → Click **Environment Variables**
3. Under **System Variables**, select **Path** → Click **Edit**
4. Click **New** and add: `C:\Program Files\wkhtmltopdf\bin`
5. Click **OK** on all dialogs
6. **Restart your terminal/IDE** for changes to take effect

## Step 4: Verify Installation

Open a new PowerShell/Command Prompt and run:
```powershell
wkhtmltopdf --version
```

You should see output like:
```
wkhtmltopdf 0.12.6 (with patched qt)
```

## Step 5: Test in Your Application

The Node.js wrapper package (`wkhtmltopdf`) is already installed. You can now use it in your code:

```javascript
import wkhtmltopdf from 'wkhtmltopdf';

// Example usage
wkhtmltopdf('<html><body><h1>Test</h1></body></html>', {
  output: 'output.pdf',
  pageSize: 'A4'
}, (err, stream) => {
  if (err) console.error(err);
  else console.log('PDF generated successfully!');
});
```

## Troubleshooting

### If `wkhtmltopdf` command is not found:
- Make sure you added it to PATH (Step 3)
- Restart your terminal/IDE
- Verify the installation path: `C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe`

### If you get permission errors:
- Run PowerShell/Command Prompt as Administrator
- Check that the installation directory has proper permissions

### Alternative: Use full path
If PATH doesn't work, you can specify the full path in your code:
```javascript
import wkhtmltopdf from 'wkhtmltopdf';
wkhtmltopdf.command = 'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe';
```

## Notes

- The wkhtmltopdf repository is archived (as of Jan 2023), but binaries are still available
- For production use, consider alternative PDF generation libraries like:
  - Puppeteer (Chrome headless)
  - Playwright
  - jsPDF (already in your project)
  - PDFKit


