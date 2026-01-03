import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileDown } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { formatCurrency } from "@/lib/currencyUtils";

const ITEM_IMAGE_SIZE = 60; // px - same as Delivery Notes
const ITEM_HEIGHT_PX = 70; // px
const MAX_ITEMS_PER_PAGE = 10;
const AVAILABLE_SPACE_PX = 710;
const NOTES_TITLE_HEIGHT_PX = 28;
const NOTES_LINE_HEIGHT_PX = 20;

const calculateNoteLines = (notes: string | null | undefined): number => {
  if (!notes || !notes.trim()) return 0;
  const lines = notes.split("\n");
  let totalLines = 0;
  const charsPerLine = 80;
  lines.forEach((line) => {
    if (line.trim()) {
      totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
    } else {
      totalLines += 1;
    }
  });
  return totalLines;
};

const paginateOrderConfirmationItems = (items: any[], notes?: string | null) => {
  if (!items || items.length === 0) return [];

  const noteLines = calculateNoteLines(notes);
  let maxItemsPerLastPage = MAX_ITEMS_PER_PAGE;
  if (noteLines > 0) {
    const notesHeight = NOTES_TITLE_HEIGHT_PX + noteLines * NOTES_LINE_HEIGHT_PX;
    const availableForItems = AVAILABLE_SPACE_PX - notesHeight;
    maxItemsPerLastPage = Math.max(1, Math.floor(availableForItems / ITEM_HEIGHT_PX));
  }

  const pages: any[][] = [];
  let currentPageItems: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const remainingItems = items.length - i;
    const isLastPage = remainingItems <= maxItemsPerLastPage;
    const maxItemsForCurrentPage = isLastPage ? maxItemsPerLastPage : MAX_ITEMS_PER_PAGE;

    if (currentPageItems.length < maxItemsForCurrentPage) {
      currentPageItems.push(items[i]);
    } else {
      pages.push(currentPageItems);
      currentPageItems = [items[i]];
    }
  }

  if (currentPageItems.length > 0) {
    pages.push(currentPageItems);
  }

  return pages.length > 0 ? pages : [items];
};

export default function OrderConfirmationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [orderConfirmation, setOrderConfirmation] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [inventoryMap, setInventoryMap] = useState<Record<string, any>>({});
  const [invoiceSettings, setInvoiceSettings] = useState({
    primaryColor: "#000000",
    domesticFooter: ["", "", ""],
    foreignFooter: ["", "", ""],
    foreignNote: "",
    signatory: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfSettings, setPdfSettings] = useState({
    scale: 4,
    quality: 0.98,
    dpi: 300,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
    const savedSettings = localStorage.getItem("pdfSettings");
    if (savedSettings) {
      try {
        setPdfSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Error loading PDF settings:", e);
      }
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setError(null);
      const { data: ocData, error: ocError } = await supabase
        .from("order_confirmations")
        .select("*")
        .eq("id", id)
        .single();

      if (ocError) {
        console.error("Error fetching order confirmation:", ocError);
        throw ocError;
      }

      let customer = null;
      if (ocData?.customer_id) {
        const { data: customerData } = await supabase
          .from("customers")
          .select("id, name, address, city, country, phone, vat_rate")
          .eq("id", ocData.customer_id)
          .single();
        customer = customerData;
      }

      const { data: itemsData } = await supabase
        .from("order_confirmation_items")
        .select("*")
        .eq("order_confirmation_id", id);

      const inventoryIds = itemsData?.map((item) => item.inventory_id).filter(Boolean) || [];
      let invMap: Record<string, any> = {};
      if (inventoryIds.length > 0) {
        const { data: inventoryData } = await supabase
          .from("inventory")
          .select("id, photo_url, unit, part_number, name, part_name, weight")
          .in("id", inventoryIds);
        if (inventoryData) {
          invMap = inventoryData.reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      setInventoryMap(invMap);

      const orderConfirmationData = {
        ...ocData,
        customer,
        items: itemsData || [],
      };
      
      console.log("Order confirmation data loaded:", orderConfirmationData);
      setOrderConfirmation(orderConfirmationData);

      const { data: companyData } = await supabase.from("company_info").select("*").limit(1).single();
      if (companyData) setCompanyInfo(companyData);

      const { data: settingsData } = await (supabase as any)
        .from("invoice_settings")
        .select("*")
        .maybeSingle();
      if (settingsData) {
        setInvoiceSettings({
          primaryColor: settingsData.primary_color || "#000000",
          domesticFooter: [
            settingsData.domestic_footer_column1 || "",
            settingsData.domestic_footer_column2 || "",
            settingsData.domestic_footer_column3 || "",
          ],
          foreignFooter: [
            settingsData.foreign_footer_column1 || "",
            settingsData.foreign_footer_column2 || "",
            settingsData.foreign_footer_column3 || "",
          ],
          foreignNote: settingsData.foreign_note || "",
          signatory: settingsData.signatory || "",
        });
      }
    } catch (error: any) {
      console.error("Error fetching order confirmation:", error);
      setError(error?.message || "Failed to load order confirmation");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!containerRef.current || !orderConfirmation) return;
    setGeneratingPDF(true);
    try {
      const pages = containerRef.current.querySelectorAll(".print-order-confirmation-page");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const tempContainer = document.createElement("div");
        tempContainer.style.position = "absolute";
        tempContainer.style.left = "-9999px";
        tempContainer.style.width = "210mm";
        tempContainer.style.backgroundColor = "white";
        tempContainer.style.fontSize = "16px";
        tempContainer.appendChild(page.cloneNode(true));
        document.body.appendChild(tempContainer);

        const mmToPixels = (mm: number) => (mm * 96) / 25.4;
        const baseWidthPx = mmToPixels(210);
        const baseHeightPx = mmToPixels(297);

        const canvas = await html2canvas(tempContainer, {
          scale: pdfSettings.scale,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: baseWidthPx,
          height: baseHeightPx,
          windowWidth: baseWidthPx,
          windowHeight: baseHeightPx,
          allowTaint: false,
          removeContainer: false,
          onclone: (clonedDoc) => {
            const clonedPage = clonedDoc.querySelector(".print-order-confirmation-page");
            if (clonedPage) {
              (clonedPage as HTMLElement).style.transform = "scale(1)";
            }

            const allImages = clonedDoc.querySelectorAll(".order-confirmation-items-table img");
            allImages.forEach((img: any) => {
              if (img.style) {
                img.style.display = "block";
                img.style.margin = "0 auto";
                img.style.verticalAlign = "middle";
              }
            });

            const allCells = clonedDoc.querySelectorAll(
              ".order-confirmation-items-table th, .order-confirmation-items-table td"
            );
            allCells.forEach((cell: any) => {
              if (cell.style) {
                cell.style.verticalAlign = "middle";
                cell.setAttribute("valign", "middle");
              }
            });

            const allRows = clonedDoc.querySelectorAll(".order-confirmation-items-table tr");
            allRows.forEach((row: any) => {
              if (row.style) {
                row.style.display = "table-row";
                row.style.height = `${ITEM_HEIGHT_PX}px`;
              }
            });

            const tables = clonedDoc.querySelectorAll(".order-confirmation-items-table");
            tables.forEach((table: any) => {
              if (table.style) {
                table.style.display = "table";
                table.style.borderCollapse = "collapse";
                table.style.borderSpacing = "0";
              }
            });
          },
        });

        const imgData = canvas.toDataURL("image/png", pdfSettings.quality);
        if (i > 0) pdf.addPage();

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const finalHeight = Math.min(imgHeight, 297);

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, finalHeight, undefined, "FAST");
        document.body.removeChild(tempContainer);
      }

      const fileName = `OrderConfirmation_${orderConfirmation.order_confirmation_number}_${new Date()
        .toISOString()
        .split("T")[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading order confirmation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading order confirmation</div>
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!orderConfirmation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Order confirmation not found</div>
      </div>
    );
  }

  const items = orderConfirmation.items || [];
  const paginatedItems = paginateOrderConfirmationItems(items, orderConfirmation.notes);
  // Ensure at least one page is rendered even if there are no items
  const pagesToRender = paginatedItems.length > 0 ? paginatedItems : [[]];
  const totalPages = pagesToRender.length;
  const customer = orderConfirmation.customer;
  const isForeign = customer?.country !== "Bosnia and Herzegovina";
  const footerColumns = isForeign ? invoiceSettings.foreignFooter : invoiceSettings.domesticFooter;
  const currency = orderConfirmation.currency || "EUR";
  const totalAmount =
    typeof orderConfirmation.amount === "number"
      ? orderConfirmation.amount
      : items.reduce((sum: number, item: any) => sum + Number(item.total || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:p-0 print:bg-white" ref={containerRef}>
      <style>{`
        @media screen {
          .order-confirmation-container {
            max-width: 240mm !important;
            width: auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: center !important;
            padding: 20px !important;
            overflow-y: auto !important;
            max-height: 90vh !important;
          }
          .print-order-confirmation-page {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            aspect-ratio: 210 / 297 !important;
            background: white !important;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
            margin: 0 auto 20px auto !important;
            padding: 15mm 15mm 10mm 15mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            overflow: visible !important;
            flex-shrink: 0 !important;
          }
          .print-order-confirmation-page:last-of-type { margin-bottom: 0 !important; }
          .print-order-confirmation { width: 100% !important; min-height: 100% !important; height: 100% !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important; }
          .order-confirmation-preview-scale .text-xs, .order-confirmation-preview-scale .print-text-xs { font-size: 0.642rem !important; }
          .order-confirmation-preview-scale .text-sm, .order-confirmation-preview-scale .print-text-sm { font-size: 0.749rem !important; }
          .order-confirmation-preview-scale .text-base, .order-confirmation-preview-scale .print-text-base { font-size: 0.856rem !important; }
          .order-confirmation-preview-scale .text-lg, .order-confirmation-preview-scale .print-text-lg { font-size: 0.963rem !important; }
          .order-confirmation-preview-scale .invoice-logo { height: calc(2.75rem * 0.8) !important; }
          .invoice-footer-columns { width: 100% !important; display: flex !important; flex-direction: row !important; justify-content: space-between !important; gap: 24px !important; }
          .invoice-footer-columns > div { flex: 1 1 0 !important; }
          .order-confirmation-items-table { width: 100% !important; border-collapse: collapse !important; border-spacing: 0 !important; table-layout: fixed !important; }
          .order-confirmation-items-table th, .order-confirmation-items-table td { word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; padding: 0.3rem !important; }
          .order-confirmation-items-table th { vertical-align: middle !important; }
          .order-confirmation-items-table tbody tr td { vertical-align: middle !important; border-top: 0.25mm solid rgb(212, 212, 212) !important; border-bottom: none !important; }
          .order-confirmation-items-table tbody tr:first-child td { border-top: 0.25mm solid rgb(212, 212, 212) !important; }
          .order-confirmation-items-table tbody tr:last-child td { border-bottom: 0.25mm solid rgb(212, 212, 212) !important; }
          .order-confirmation-items-table td:first-child img { display: block; margin: 0 auto; }
          /* Column 1: Picture */
          .order-confirmation-items-table th:nth-child(1), .order-confirmation-items-table td:nth-child(1) { width: 10% !important; max-width: 10% !important; text-align: center !important; }
          /* Column 2: Part name */
          .order-confirmation-items-table th:nth-child(2), .order-confirmation-items-table td:nth-child(2) { width: 25% !important; max-width: 25% !important; }
          /* Column 3: Part number */
          .order-confirmation-items-table th:nth-child(3), .order-confirmation-items-table td:nth-child(3) { width: 15% !important; max-width: 15% !important; }
          /* Column 4: Quantity */
          .order-confirmation-items-table th:nth-child(4), .order-confirmation-items-table td:nth-child(4) { width: 12% !important; max-width: 12% !important; text-align: center !important; }
          /* Column 5: Weight */
          .order-confirmation-items-table th:nth-child(5), .order-confirmation-items-table td:nth-child(5) { width: 10% !important; max-width: 10% !important; text-align: right !important; }
          /* Column 6: Unit price */
          .order-confirmation-items-table th:nth-child(6), .order-confirmation-items-table td:nth-child(6) { width: 13% !important; max-width: 13% !important; text-align: right !important; }
          /* Column 7: Amount */
          .order-confirmation-items-table th:nth-child(7), .order-confirmation-items-table td:nth-child(7) { width: 15% !important; max-width: 15% !important; text-align: right !important; }
        }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; height: 297mm !important; background: white !important; overflow: visible !important; }
          .order-confirmation-container { margin: 0 !important; padding: 0 !important; background: transparent !important; max-width: none !important; width: 210mm !important; height: 297mm !important; box-shadow: none !important; }
          @page { margin: 0 !important; size: A4; }
          .print-order-confirmation-page { position: relative !important; top: 0 !important; left: 0 !important; width: 210mm !important; min-width: 210mm !important; max-width: 210mm !important; height: 297mm !important; min-height: 297mm !important; max-height: 297mm !important; margin: 0 !important; padding: 15mm 15mm 10mm 15mm !important; box-sizing: border-box !important; display: flex !important; flex-direction: column !important; background: white !important; box-shadow: none !important; overflow: visible !important; }
          .print-order-confirmation-page.page-break { page-break-before: always !important; }
          .print-order-confirmation-page:last-child { page-break-after: auto !important; }
          .print-order-confirmation-page:not(:last-child) { page-break-after: always !important; }
          .print-order-confirmation { width: 100% !important; height: 100% !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .order-confirmation-preview-scale .text-xs, .order-confirmation-preview-scale .print-text-xs { font-size: 0.642rem !important; }
          .order-confirmation-preview-scale .text-sm, .order-confirmation-preview-scale .print-text-sm { font-size: 0.749rem !important; }
          .order-confirmation-preview-scale .text-base, .order-confirmation-preview-scale .print-text-base { font-size: 0.856rem !important; }
          .order-confirmation-preview-scale .text-lg, .order-confirmation-preview-scale .print-text-lg { font-size: 0.963rem !important; }
          .order-confirmation-preview-scale .invoice-logo { height: calc(2.75rem * 0.8) !important; }
          .invoice-footer-columns { width: 100% !important; display: flex !important; flex-direction: row !important; justify-content: space-between !important; gap: 24px !important; flex-wrap: nowrap !important; }
          .invoice-footer-columns > div { flex: 1 1 0 !important; }
          .invoice-footer-wrapper { margin-top: auto !important; }
          .order-confirmation-items-table { width: 100% !important; border-collapse: collapse !important; border-spacing: 0 !important; margin: 5mm 0 !important; table-layout: fixed !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .order-confirmation-items-table th, .order-confirmation-items-table td { border-left: none !important; border-right: none !important; padding: 0.3rem !important; text-align: left !important; word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .order-confirmation-items-table th { vertical-align: middle !important; background-color: #f5f5f5 !important; font-weight: bold !important; border-top: 0.25mm solid #000 !important; border-bottom: 0.25mm solid #000 !important; }
          .order-confirmation-items-table thead { background-color: transparent !important; }
          .order-confirmation-items-table tbody tr td { vertical-align: middle !important; border-top: 0.25mm solid #6b7280 !important; border-bottom: none !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .order-confirmation-items-table tbody tr:first-child td { border-top: 0.25mm solid #6b7280 !important; }
          .order-confirmation-items-table tbody tr:last-child td { border-bottom: 0.25mm solid #6b7280 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .order-confirmation-items-table td:first-child img { display: block; margin: 0 auto; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .order-confirmation-items-table td:first-child { text-align: center !important; }
          /* Column 1: Picture */
          .order-confirmation-items-table th:nth-child(1), .order-confirmation-items-table td:nth-child(1) { width: 10% !important; max-width: 10% !important; text-align: center !important; }
          /* Column 2: Part name */
          .order-confirmation-items-table th:nth-child(2), .order-confirmation-items-table td:nth-child(2) { width: 25% !important; max-width: 25% !important; }
          /* Column 3: Part number */
          .order-confirmation-items-table th:nth-child(3), .order-confirmation-items-table td:nth-child(3) { width: 15% !important; max-width: 15% !important; }
          /* Column 4: Quantity */
          .order-confirmation-items-table th:nth-child(4), .order-confirmation-items-table td:nth-child(4) { width: 12% !important; max-width: 12% !important; text-align: center !important; }
          /* Column 5: Weight */
          .order-confirmation-items-table th:nth-child(5), .order-confirmation-items-table td:nth-child(5) { width: 10% !important; max-width: 10% !important; text-align: right !important; }
          /* Column 6: Unit price */
          .order-confirmation-items-table th:nth-child(6), .order-confirmation-items-table td:nth-child(6) { width: 13% !important; max-width: 13% !important; text-align: right !important; }
          /* Column 7: Amount */
          .order-confirmation-items-table th:nth-child(7), .order-confirmation-items-table td:nth-child(7) { width: 15% !important; max-width: 15% !important; text-align: right !important; }
          .print-order-confirmation-page, .print-order-confirmation-page * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .page-break { page-break-before: always !important; }
          .no-page-break { page-break-inside: avoid !important; }
          .total-amount-bg {
            position: absolute !important;
            width: 76mm !important;
            padding-left: 6mm !important;
            right: 2mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="mb-4 flex gap-2 print:hidden">
        <Button variant="outline" onClick={() => navigate("/other-docs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={generatePDF} disabled={generatingPDF}>
          <FileDown className="w-4 h-4 mr-2" />
          {generatingPDF ? "Generating PDF..." : "Download PDF"}
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div className="order-confirmation-container">
        {pagesToRender.map((pageItems, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === totalPages - 1;

          return (
            <div
              key={pageIndex}
              className={`print-order-confirmation-page print-order-confirmation print:text-black print:bg-white print:min-h-[calc(100vh-1in)] print:flex print:flex-col order-confirmation-preview-scale ${
                pageIndex > 0 ? "page-break" : ""
              }`}
              style={{ gap: "12px" }}
            >
              {companyInfo && (
                <div className="company-header print:mb-6 flex justify-between items-end">
                  <div>
                    {companyInfo.logo_url && (
                      <div className="mb-1">
                        <img
                          src={companyInfo.logo_url}
                          alt="Company Logo"
                          className="h-11 print:h-14 object-contain invoice-logo"
                        />
                      </div>
                    )}
                    <div className="text-sm print-text-sm">
                      <div className="inline-block">
                        <p className="font-medium border-b border-gray-600 print:border-black pb-1 inline-block text-xs">
                          {companyInfo.legal_name || companyInfo.company_name} - {companyInfo.address} -{" "}
                          {companyInfo.postal_code} {companyInfo.city} - Bosnia and Herzegovina
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="print-invoice-bg h-[30px] flex items-center invoice-title-bg"
                    style={{
                      backgroundColor: invoiceSettings.primaryColor,
                      position: "absolute",
                      width: "286px",
                      paddingLeft: "23px",
                      right: "7px",
                      justifyContent: "left",
                    }}
                  >
                    <span className="text-lg print-text-lg font-medium text-black">Order Confirmation</span>
                    {totalPages > 1 && (
                      <span className="text-sm print-text-sm ml-2">(Page {pageIndex + 1} of {totalPages})</span>
                    )}
                  </div>
                </div>
              )}

              <div className="invoice-header grid grid-cols-2 gap-6">
                <div>
                  <h3 className="mb-2 print-text-sm text-sm font-normal">To:</h3>
                  <p className="font-bold print-text-base print:font-bold">{customer?.name}</p>
                  {customer?.address && <p className="text-sm whitespace-pre-line print-text-sm">{customer.address}</p>}
                  {customer?.city && <p className="text-sm print-text-sm">{customer.city}</p>}
                  {customer?.country && <p className="text-sm print-text-sm">{customer.country}</p>}
                  {customer?.phone && <p className="text-sm print-text-sm">{customer.phone}</p>}
                </div>
                <div className="text-right">
                  <div className="space-y-1 print:space-y-2">
                    <p className="print-text-sm">
                      <span className="font-medium">Order confirmation number:</span> {orderConfirmation.order_confirmation_number}
                    </p>
                    <p className="print-text-sm">
                      <span className="font-medium">Issue date:</span> {formatDate(orderConfirmation.issue_date)}
                    </p>
                    {orderConfirmation.shipping_date && (
                      <p className="print-text-sm">
                        <span className="font-medium">Shipping date:</span> {formatDate(orderConfirmation.shipping_date)}
                      </p>
                    )}
                    {orderConfirmation.order_number && (
                      <p className="print-text-sm">
                        <span className="font-medium">Purchase order:</span> {orderConfirmation.order_number}
                      </p>
                    )}
                    {orderConfirmation.shipping_address && (
                      <p className="print-text-sm">
                        <span className="font-medium">Shipping address:</span> {orderConfirmation.shipping_address}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="no-page-break">
                <table className="order-confirmation-items-table w-full border-collapse print:border-black">
                  <thead>
                    <tr>
                      <th className="text-center text-sm"></th>
                      <th className="text-left text-sm">Part name</th>
                      <th className="text-left text-sm">Part number</th>
                      <th className="text-center text-sm">Quantity</th>
                      <th className="text-right text-sm">Weight</th>
                      <th className="text-right text-sm">Unit price</th>
                      <th className="text-right text-sm">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item: any, itemIndex: number) => {
                      const inventoryItem = inventoryMap[item.inventory_id];
                      const unit = inventoryItem?.unit || "";
                      const unitPrice = Number(item.unit_price || 0);
                      const lineTotal = Number(item.total || 0);
                      const itemWeight = (inventoryItem?.weight || item.weight || 0) * (item.quantity || 0);
                      const isLastRow = itemIndex === pageItems.length - 1;
                      return (
                        <tr 
                          key={itemIndex} 
                          style={{ 
                            height: `${ITEM_HEIGHT_PX}px`,
                            borderBottom: isLastRow ? "0.25mm solid rgb(212, 212, 212)" : "none"
                          }}
                        >
                          <td className="text-center" style={{ verticalAlign: "middle", padding: "0.3rem" }}>
                            {inventoryItem?.photo_url ? (
                              <img
                                src={inventoryItem.photo_url}
                                alt={item.description}
                                style={{
                                  height: `${ITEM_IMAGE_SIZE}px`,
                                  width: "auto",
                                  objectFit: "contain",
                                  maxWidth: "100%",
                                  margin: "0 auto",
                                  display: "block",
                                }}
                                onError={(e) => {
                                  // Hide image if it fails to load
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  height: `${ITEM_IMAGE_SIZE}px`,
                                  width: `${ITEM_IMAGE_SIZE}px`,
                                  display: "block",
                                  margin: "0 auto",
                                }}
                              ></div>
                            )}
                          </td>
                          <td className="text-left text-sm" style={{ verticalAlign: "middle" }}>
                            {item.description}
                          </td>
                          <td className="text-left text-sm" style={{ verticalAlign: "middle" }}>
                            {inventoryItem?.part_number || item.part_number || "-"}
                          </td>
                          <td className="text-center text-sm" style={{ verticalAlign: "middle" }}>
                            {item.quantity} {unit}
                          </td>
                          <td className="text-right text-sm" style={{ verticalAlign: "middle" }}>
                            {itemWeight.toFixed(2)} kg
                          </td>
                          <td className="text-right text-sm" style={{ verticalAlign: "middle" }}>
                            {formatCurrency(unitPrice, currency)}
                          </td>
                          <td className="text-right text-sm" style={{ verticalAlign: "middle" }}>
                            {formatCurrency(lineTotal, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Order Confirmation Summary - Only on last page */}
              {isLastPage && (
                <>
                  <div className="grid grid-cols-2 gap-6 no-page-break print:mt-8">
                    <div style={{ width: '111mm' }}>
                      <h3 className="font-semibold mb-2 print-text-base">Summary</h3>
                      <div className="space-y-1 text-sm print:space-y-2 print-text-sm">
                        <p><span className="font-medium">Total quantity:</span> {orderConfirmation.total_quantity || 0} pieces</p>
                        <p><span className="font-medium">Net weight:</span> {(orderConfirmation.net_weight || 0).toFixed(2)} kg</p>
                        <p><span className="font-medium">Total weight:</span> {(orderConfirmation.total_weight || 0).toFixed(2)} kg</p>
                        <p><span className="font-medium">Packing:</span> {orderConfirmation.packing || 0} {orderConfirmation.packing === 1 ? 'package' : 'packages'}</p>
                      </div>
                    </div>
                    
                    <div className="text-right w-3/5 ml-auto">
                      <div className="space-y-2 print:space-y-3">
                        {(() => {
                          const vatRate = customer?.vat_rate || 17;
                          return (
                            <>
                              <div className="flex justify-between print-text-sm">
                                <span>Subtotal</span>
                                <span>{formatCurrency((totalAmount || 0) / (1 + (vatRate / 100)), currency)}</span>
                              </div>
                              <div className="flex justify-between print-text-sm">
                                <span>VAT ({vatRate}%):</span>
                                <span>{formatCurrency((totalAmount || 0) - (totalAmount || 0) / (1 + (vatRate / 100)), currency)}</span>
                              </div>
                            </>
                          );
                        })()}
                        <div 
                          style={{
                            backgroundColor: invoiceSettings.primaryColor,
                            position: 'absolute',
                            width: '76mm',
                            paddingLeft: '13mm',
                            paddingRight: '13mm',
                            height: '2rem',
                            right: '2mm'
                          }} 
                          className="flex justify-between font-bold text-lg print-invoice-bg h-[2.2rem] items-center print-text-base total-amount-bg"
                        >
                          <span>Total</span>
                          <span>{formatCurrency(totalAmount, currency)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {orderConfirmation.notes && (
                    <div className="no-page-break print:mt-6">
                      <h3 className="font-semibold mb-2 print-text-base">Notes</h3>
                      <p className="text-sm whitespace-pre-line print-text-sm">{orderConfirmation.notes}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex-1" style={{ minHeight: 0 }}></div>

              {(invoiceSettings.foreignFooter.some((col: string) => col.trim()) ||
                invoiceSettings.domesticFooter.some((col: string) => col.trim())) && (
                <div className="invoice-footer-wrapper mt-auto">
                  <Separator className="print:border-black print:border-t print:mt-4 print:mb-2 border-t border-gray-600 mt-4 mb-2" />
                  <div className="text-xs print-text-xs flex justify-between gap-6 invoice-footer-columns" style={{ color: "#000000" }}>
                    {isForeign ? (
                      <>
                        <div className="whitespace-pre-line text-left flex-1 min-w-0">{footerColumns[0]}</div>
                        <div className="whitespace-pre-line text-center flex-1 min-w-0">{footerColumns[1]}</div>
                        <div className="whitespace-pre-line text-right flex-1 min-w-0">{footerColumns[2]}</div>
                      </>
                    ) : (
                      <>
                        <div className="whitespace-pre-line text-left flex-1 min-w-0">{footerColumns[0]}</div>
                        <div className="whitespace-pre-line text-center flex-1 min-w-0">{footerColumns[1]}</div>
                        <div className="whitespace-pre-line text-right flex-1 min-w-0">{footerColumns[2]}</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

