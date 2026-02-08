import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { InvoicePrintDocument } from "@/components/InvoicePrintDocument";

export default function InvoicePrint() {
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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoiceData();
    }
  }, [id]);

  const fetchInvoiceData = async () => {
    try {
      // Fetch invoice with customer and items
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

      // Fetch inventory items
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .eq('category', 'Parts');
      if (inventoryData) setInventoryItems(inventoryData);

      // Fetch company info
      const { data: companyData } = await supabase
        .from('company_info')
        .select('*')
        .limit(1)
        .single();
      if (companyData) setCompanyInfo(companyData);

      // Fetch invoice settings
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
      console.error('Error fetching invoice data:', error);
      // Set ready flag even on error so Playwright doesn't hang
      // The error state will be shown in the UI
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Set ready flag when all data is loaded and rendered
  useEffect(() => {
    if (!loading) {
      // Set ready flag even if invoice is missing (so Playwright doesn't hang)
      // Use requestAnimationFrame to ensure DOM has updated, then setTimeout for React to finish
      requestAnimationFrame(() => {
        setTimeout(() => {
          (window as any).__INVOICE_PRINT_READY__ = true;
          setIsReady(true);
          console.log('Invoice print ready flag set. Invoice:', !!invoice, 'CompanyInfo:', !!companyInfo);
        }, 500); // Increased delay to ensure rendering
      });
    } else {
      (window as any).__INVOICE_PRINT_READY__ = false;
      setIsReady(false);
    }
    
    // Cleanup: reset flag on unmount
    return () => {
      (window as any).__INVOICE_PRINT_READY__ = false;
    };
  }, [loading, invoice, companyInfo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Invoice not found</div>
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
      />
    </div>
  );
}
