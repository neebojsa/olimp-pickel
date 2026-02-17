import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseOrderPrintDocument } from "@/components/PurchaseOrderPrintDocument";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Layout } from "@/components/Layout";

export default function PurchaseOrderView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
      toast({ title: "Error", description: "Failed to load purchase order.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const printPurchaseOrder = () => {
    if (!id) return;
    const printUrl = `/purchase-orders/${id}/print`;
    window.open(printUrl, '_blank')?.print();
  };

  const downloadPDF = async () => {
    if (!purchaseOrder || !containerRef.current) {
      toast({ title: "Error", description: "Purchase order not found.", variant: "destructive" });
      return;
    }
    setDownloadingPDF(true);
    try {
      const container = containerRef.current;
      const pages = container.querySelectorAll(".po-print-page");
      if (!pages.length) {
        toast({ title: "Error", description: "No content to export.", variant: "destructive" });
        return;
      }
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const mmToPx = (mm: number) => (mm * 96) / 25.4;
      const baseW = mmToPx(210);
      const baseH = mmToPx(297);
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const temp = document.createElement("div");
        temp.style.cssText = "position:absolute;left:-9999px;width:210mm;background:white;font-size:16px;";
        temp.appendChild(page.cloneNode(true));
        document.body.appendChild(temp);
        const canvas = await html2canvas(temp, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: baseW,
          height: baseH,
          windowWidth: baseW,
          windowHeight: baseH,
          allowTaint: false,
          removeContainer: false
        });
        document.body.removeChild(temp);
        const imgData = canvas.toDataURL("image/png", 0.98);
        if (i > 0) pdf.addPage();
        const imgW = 210;
        const imgH = Math.min((canvas.height * imgW) / canvas.width, 297);
        pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH, undefined, "FAST");
      }
      pdf.save(`PurchaseOrder_${purchaseOrder.purchase_order_number}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "Success", description: "PDF downloaded successfully." });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div>Loading purchase order...</div>
        </div>
      </Layout>
    );
  }

  if (!purchaseOrder) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div>Purchase order not found</div>
          <Button variant="outline" onClick={() => navigate("/purchase-orders")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6 print:p-0 print:bg-white">
        <div className="flex flex-wrap gap-2 pb-4 print:hidden justify-between items-center">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/purchase-orders")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadPDF} disabled={downloadingPDF}>
              <Download className="w-4 h-4 mr-2" />
              {downloadingPDF ? "Downloading..." : "Download PDF"}
            </Button>
            <Button onClick={printPurchaseOrder} variant="secondary">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
        <div ref={containerRef}>
          <PurchaseOrderPrintDocument
            purchaseOrder={purchaseOrder}
            inventoryItems={inventoryItems}
            companyInfo={companyInfo}
            documentSettings={documentSettings}
          />
        </div>
      </div>
    </Layout>
  );
}
