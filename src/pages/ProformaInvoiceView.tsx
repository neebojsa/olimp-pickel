import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InvoicePrintDocument } from "@/components/InvoicePrintDocument";

export default function ProformaInvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [invoiceSettings, setInvoiceSettings] = useState({
    primaryColor: '#000000',
    domesticFooter: ['', '', ''],
    foreignFooter: ['', '', ''],
    foreignNote: '',
    signatory: ''
  });
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchInvoiceData();
    }
  }, [id]);

  const fetchInvoiceData = async () => {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers!inner(id, name, country, address, city, phone, dap_address, fco_address, vat_rate),
          invoice_items!fk_invoice_items_invoice(*)
        `)
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .eq('category', 'Parts');
      if (inventoryData) setInventoryItems(inventoryData);

      const { data: companyData } = await supabase
        .from('company_info')
        .select('*')
        .limit(1)
        .single();
      if (companyData) setCompanyInfo(companyData);

      const { data: settingsData } = await (supabase as any)
        .from('invoice_settings')
        .select('*')
        .maybeSingle();
      if (settingsData) {
        setInvoiceSettings({
          primaryColor: settingsData.primary_color || '#000000',
          domesticFooter: [
            settingsData.domestic_footer_column1 || '',
            settingsData.domestic_footer_column2 || '',
            settingsData.domestic_footer_column3 || ''
          ],
          foreignFooter: [
            settingsData.foreign_footer_column1 || '',
            settingsData.foreign_footer_column2 || '',
            settingsData.foreign_footer_column3 || ''
          ],
          foreignNote: settingsData.foreign_note || '',
          signatory: settingsData.signatory || ''
        });
      }
    } catch (error) {
      console.error('Error fetching proforma invoice data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!invoice || !id) {
      toast({
        title: "Error",
        description: "Proforma invoice not found. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setDownloadingPDF(true);
    try {
      const API_URL = import.meta.env.VITE_PDF_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/invoice/${id}/pdf`, {
        method: 'GET',
        headers: { 'Accept': 'application/pdf' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proforma-invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      toast({
        title: "Success",
        description: "Proforma invoice PDF downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading proforma invoice as PDF:', error);
      const API_URL = import.meta.env.VITE_PDF_SERVER_URL || 'http://localhost:3001';
      const errorMessage = error instanceof Error && error.message.includes('fetch')
        ? `Cannot connect to PDF server at ${API_URL}. Make sure the server is running (npm run pdf-server).`
        : error instanceof Error ? error.message : "Failed to download proforma invoice. Make sure the PDF server is running.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const printProformaInvoice = () => {
    if (!id) return;
    const printUrl = `/proforma-invoices/${id}/print`;
    window.open(printUrl, '_blank')?.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading proforma invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Proforma invoice not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:p-0 print:bg-white">
      <InvoicePrintDocument
        invoice={invoice}
        inventoryItems={inventoryItems}
        companyInfo={companyInfo}
        invoiceSettings={invoiceSettings}
        isProforma={true}
      />
      <div className="flex gap-2 pt-4 pb-4 print:hidden justify-between w-full items-center">
        <Button variant="outline" onClick={() => navigate('/other-docs?tab=Proforma%20Invoice')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Other Documents
        </Button>
        <div className="flex gap-2">
          <Button onClick={downloadPDF} disabled={downloadingPDF}>
            <Download className="w-4 h-4 mr-2" />
            {downloadingPDF ? 'Downloading PDF...' : 'Download PDF'}
          </Button>
          <Button onClick={printProformaInvoice} variant="secondary">
            Print Proforma Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}
