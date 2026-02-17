import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseOrderPrintDocument } from "@/components/PurchaseOrderPrintDocument";

export default function PurchaseOrderPrint() {
  const { id } = useParams<{ id: string }>();
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [documentSettings, setDocumentSettings] = useState({
    primaryColor: '#000000',
    domesticFooter: ['', '', ''],
    foreignFooter: ['', '', ''],
    foreignNote: '',
    signatory: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          customers(id, name, country, address, city, phone, photo_url),
          purchase_order_items(*)
        `)
        .eq("id", id)
        .single();

      if (orderError) throw orderError;
      setPurchaseOrder(orderData);

      const { data: invData } = await supabase.from("inventory").select("*").eq("category", "Parts");
      if (invData) setInventoryItems(invData);

      const { data: companyData } = await supabase.from("company_info").select("*").limit(1).single();
      if (companyData) setCompanyInfo(companyData);

      const { data: settingsData } = await (supabase as any).from("invoice_settings").select("*").maybeSingle();
      if (settingsData) {
        setDocumentSettings({
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
      console.error("Error fetching purchase order:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading purchase order...</div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Purchase order not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:p-0 print:bg-white">
      <PurchaseOrderPrintDocument
        purchaseOrder={purchaseOrder}
        inventoryItems={inventoryItems}
        companyInfo={companyInfo}
        documentSettings={documentSettings}
      />
    </div>
  );
}
