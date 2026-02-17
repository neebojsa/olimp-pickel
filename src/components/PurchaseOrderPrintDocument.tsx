import { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currencyUtils";
import { formatDate } from "@/lib/dateUtils";
import { getPurchaseOrderTranslations } from "@/lib/translationUtils";

const ITEM_IMAGE_SIZE = 60;
const ITEM_HEIGHT_PX = 70;
const MAX_ITEMS_PER_PAGE = 10;
const MAX_ITEMS_LAST_PAGE = 7;
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

const paginatePurchaseOrderItems = (items: any[], notes?: string | null) => {
  if (!items || items.length === 0) return [[]];

  const noteLines = calculateNoteLines(notes);
  let maxItemsPerLastPage = MAX_ITEMS_LAST_PAGE;
  if (noteLines > 0) {
    const notesHeight = NOTES_TITLE_HEIGHT_PX + noteLines * NOTES_LINE_HEIGHT_PX;
    const availableForItems = AVAILABLE_SPACE_PX - notesHeight;
    maxItemsPerLastPage = Math.min(MAX_ITEMS_LAST_PAGE, Math.max(1, Math.floor(availableForItems / ITEM_HEIGHT_PX)));
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

interface PurchaseOrderPrintDocumentProps {
  purchaseOrder: any;
  inventoryItems: any[];
  companyInfo: any;
  documentSettings: {
    primaryColor: string;
    domesticFooter: string[];
    foreignFooter: string[];
    foreignNote: string;
    signatory: string;
  };
}

export function PurchaseOrderPrintDocument({
  purchaseOrder,
  inventoryItems,
  companyInfo,
  documentSettings
}: PurchaseOrderPrintDocumentProps) {
  const items = purchaseOrder.purchase_order_items || [];
  const paginatedItems = paginatePurchaseOrderItems(items, purchaseOrder.notes);
  const totalPages = paginatedItems.length;
  const pagesToRender = paginatedItems.length > 0 ? paginatedItems : [[]];
  const translations = useMemo(
    () => getPurchaseOrderTranslations(purchaseOrder.customers?.country),
    [purchaseOrder]
  );

  const inventoryMap = useMemo(() => {
    const map: Record<string, any> = {};
    (inventoryItems || []).forEach((inv) => {
      map[inv.id] = inv;
    });
    return map;
  }, [inventoryItems]);

  const isForeign = purchaseOrder.customers?.country !== "Bosnia and Herzegovina";
  const footerColumns = isForeign ? documentSettings.foreignFooter : documentSettings.domesticFooter;
  const currency = purchaseOrder.currency || "EUR";
  const totalAmount =
    typeof purchaseOrder.amount === "number"
      ? purchaseOrder.amount
      : items.reduce((sum: number, item: any) => sum + Number(item.total || 0), 0);

  return (
    <>
      <style>{`
        @media screen {
          .po-order-confirmation-container {
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
          .po-print-order-confirmation-page {
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
          .po-print-order-confirmation-page:last-of-type { margin-bottom: 0 !important; }
          .po-print-order-confirmation { width: 100% !important; min-height: 100% !important; height: 100% !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important; }
          .po-order-confirmation-preview-scale .text-xs, .po-order-confirmation-preview-scale .print-text-xs { font-size: 0.642rem !important; }
          .po-order-confirmation-preview-scale .text-sm, .po-order-confirmation-preview-scale .print-text-sm { font-size: 0.749rem !important; }
          .po-order-confirmation-preview-scale .text-base, .po-order-confirmation-preview-scale .print-text-base { font-size: 0.856rem !important; }
          .po-order-confirmation-preview-scale .text-lg, .po-order-confirmation-preview-scale .print-text-lg { font-size: 0.963rem !important; }
          .po-order-confirmation-preview-scale .invoice-logo { height: calc(2.75rem * 0.8) !important; }
          .po-invoice-footer-columns { width: 100% !important; display: flex !important; flex-direction: row !important; justify-content: space-between !important; gap: 24px !important; }
          .po-invoice-footer-columns > div { flex: 1 1 0 !important; }
          .po-order-confirmation-items-table { width: 100% !important; border-collapse: collapse !important; border-spacing: 0 !important; table-layout: fixed !important; }
          .po-order-confirmation-items-table th, .po-order-confirmation-items-table td { word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; padding: 0.3rem !important; }
          .po-order-confirmation-items-table th { vertical-align: middle !important; }
          .po-order-confirmation-items-table tbody tr td { vertical-align: middle !important; border-top: 0.25mm solid rgb(212, 212, 212) !important; border-bottom: none !important; }
          .po-order-confirmation-items-table tbody tr:first-child td { border-top: 0.25mm solid rgb(212, 212, 212) !important; }
          .po-order-confirmation-items-table tbody tr:last-child td { border-bottom: 0.25mm solid rgb(212, 212, 212) !important; }
          .po-order-confirmation-items-table td:first-child img { display: block; margin: 0 auto; }
          .po-order-confirmation-items-table th:nth-child(1), .po-order-confirmation-items-table td:nth-child(1) { width: 12.3% !important; max-width: 12.3% !important; text-align: center !important; }
          .po-order-confirmation-items-table th:nth-child(2), .po-order-confirmation-items-table td:nth-child(2) { width: 24.7% !important; max-width: 24.7% !important; }
          .po-order-confirmation-items-table th:nth-child(3), .po-order-confirmation-items-table td:nth-child(3) { width: 15% !important; max-width: 15% !important; }
          .po-order-confirmation-items-table th:nth-child(4), .po-order-confirmation-items-table td:nth-child(4) { width: 10% !important; max-width: 10% !important; text-align: center !important; }
          .po-order-confirmation-items-table th:nth-child(5), .po-order-confirmation-items-table td:nth-child(5) { width: 10% !important; max-width: 10% !important; text-align: right !important; }
          .po-order-confirmation-items-table th:nth-child(6), .po-order-confirmation-items-table td:nth-child(6) { width: 13% !important; max-width: 13% !important; text-align: right !important; }
          .po-order-confirmation-items-table th:nth-child(7), .po-order-confirmation-items-table td:nth-child(7) { width: 15% !important; max-width: 15% !important; text-align: right !important; }
        }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; height: 297mm !important; background: white !important; overflow: visible !important; }
          .po-order-confirmation-container { margin: 0 !important; padding: 0 !important; background: transparent !important; max-width: none !important; width: 210mm !important; height: 297mm !important; box-shadow: none !important; }
          @page { margin: 0 !important; size: A4; }
          .po-print-order-confirmation-page { position: relative !important; top: 0 !important; left: 0 !important; width: 210mm !important; min-width: 210mm !important; max-width: 210mm !important; height: 297mm !important; min-height: 297mm !important; max-height: 297mm !important; margin: 0 !important; padding: 15mm 15mm 10mm 15mm !important; box-sizing: border-box !important; display: flex !important; flex-direction: column !important; background: white !important; box-shadow: none !important; overflow: visible !important; }
          .po-print-order-confirmation-page.page-break { page-break-before: always !important; }
          .po-print-order-confirmation-page:last-child { page-break-after: auto !important; }
          .po-print-order-confirmation-page:not(:last-child) { page-break-after: always !important; }
          .po-print-order-confirmation { width: 100% !important; height: 100% !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .po-order-confirmation-preview-scale .text-xs, .po-order-confirmation-preview-scale .print-text-xs { font-size: 0.642rem !important; }
          .po-order-confirmation-preview-scale .text-sm, .po-order-confirmation-preview-scale .print-text-sm { font-size: 0.749rem !important; }
          .po-order-confirmation-preview-scale .text-base, .po-order-confirmation-preview-scale .print-text-base { font-size: 0.856rem !important; }
          .po-order-confirmation-preview-scale .text-lg, .po-order-confirmation-preview-scale .print-text-lg { font-size: 0.963rem !important; }
          .po-order-confirmation-preview-scale .invoice-logo { height: calc(2.75rem * 0.8) !important; }
          .po-invoice-footer-columns { width: 100% !important; display: flex !important; flex-direction: row !important; justify-content: space-between !important; gap: 24px !important; flex-wrap: nowrap !important; }
          .po-invoice-footer-columns > div { flex: 1 1 0 !important; }
          .po-invoice-footer-wrapper { margin-top: auto !important; }
          .po-order-confirmation-items-table { width: 100% !important; border-collapse: collapse !important; border-spacing: 0 !important; margin: 5mm 0 !important; table-layout: fixed !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .po-order-confirmation-items-table th, .po-order-confirmation-items-table td { border-left: none !important; border-right: none !important; padding: 0.3rem !important; text-align: left !important; word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .po-order-confirmation-items-table th { vertical-align: middle !important; background-color: #f5f5f5 !important; font-weight: bold !important; border-top: 0.25mm solid #000 !important; border-bottom: 0.25mm solid #000 !important; }
          .po-order-confirmation-items-table thead { background-color: transparent !important; }
          .po-order-confirmation-items-table tbody tr td { vertical-align: middle !important; border-top: 0.25mm solid #6b7280 !important; border-bottom: none !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .po-order-confirmation-items-table tbody tr:first-child td { border-top: 0.25mm solid #6b7280 !important; }
          .po-order-confirmation-items-table tbody tr:last-child td { border-bottom: 0.25mm solid #6b7280 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .po-order-confirmation-items-table td:first-child img { display: block; margin: 0 auto; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .po-order-confirmation-items-table td:first-child { text-align: center !important; }
          .po-order-confirmation-items-table th:nth-child(1), .po-order-confirmation-items-table td:nth-child(1) { width: 12.3% !important; max-width: 12.3% !important; text-align: center !important; }
          .po-order-confirmation-items-table th:nth-child(2), .po-order-confirmation-items-table td:nth-child(2) { width: 24.7% !important; max-width: 24.7% !important; }
          .po-order-confirmation-items-table th:nth-child(3), .po-order-confirmation-items-table td:nth-child(3) { width: 15% !important; max-width: 15% !important; }
          .po-order-confirmation-items-table th:nth-child(4), .po-order-confirmation-items-table td:nth-child(4) { width: 10% !important; max-width: 10% !important; text-align: center !important; }
          .po-order-confirmation-items-table th:nth-child(5), .po-order-confirmation-items-table td:nth-child(5) { width: 10% !important; max-width: 10% !important; text-align: right !important; }
          .po-order-confirmation-items-table th:nth-child(6), .po-order-confirmation-items-table td:nth-child(6) { width: 13% !important; max-width: 13% !important; text-align: right !important; }
          .po-order-confirmation-items-table th:nth-child(7), .po-order-confirmation-items-table td:nth-child(7) { width: 15% !important; max-width: 15% !important; text-align: right !important; }
          .po-print-order-confirmation-page, .po-print-order-confirmation-page * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .page-break { page-break-before: always !important; }
          .no-page-break { page-break-inside: avoid !important; }
          .po-total-amount-bg { position: absolute !important; width: 76mm !important; padding-left: 6mm !important; right: 2mm !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="po-order-confirmation-container">
        {pagesToRender.map((pageItems, pageIndex) => {
          const isLastPage = pageIndex === totalPages - 1;

          return (
            <div
              key={pageIndex}
              className={`po-print-order-confirmation-page po-print-order-confirmation po-print-page print:text-black print:bg-white print:min-h-[calc(100vh-1in)] print:flex print:flex-col po-order-confirmation-preview-scale ${
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
                      backgroundColor: documentSettings.primaryColor,
                      position: "absolute",
                      width: "286px",
                      paddingLeft: "23px",
                      right: "7px",
                      justifyContent: "left",
                    }}
                  >
                    <span className="text-lg print-text-lg font-medium text-black">{translations.documentTitle}</span>
                    {totalPages > 1 && (
                      <span className="text-sm print-text-sm ml-2">(Page {pageIndex + 1} of {totalPages})</span>
                    )}
                  </div>
                </div>
              )}

              <div className="invoice-header grid grid-cols-2 gap-6">
                <div>
                  <h3 className="mb-2 print-text-sm text-sm font-normal">{translations.billTo}</h3>
                  <p className="font-bold print-text-base print:font-bold">{purchaseOrder.customers?.name}</p>
                  {purchaseOrder.customers?.address && <p className="text-sm whitespace-pre-line print-text-sm">{purchaseOrder.customers.address}</p>}
                  {purchaseOrder.customers?.city && <p className="text-sm print-text-sm">{purchaseOrder.customers.city}</p>}
                  {purchaseOrder.customers?.country && <p className="text-sm print-text-sm">{purchaseOrder.customers.country}</p>}
                  {purchaseOrder.customers?.phone && <p className="text-sm print-text-sm">{purchaseOrder.customers.phone}</p>}
                </div>
                <div className="text-right">
                  <div className="space-y-1 print:space-y-2">
                    <p className="print-text-sm">
                      <span className="font-medium">{translations.salesOrderNumber}</span> {purchaseOrder.purchase_order_number}
                    </p>
                    {purchaseOrder.po_date && (
                      <p className="print-text-sm">
                        <span className="font-medium">{translations.poDate}</span> {formatDate(purchaseOrder.po_date)}
                      </p>
                    )}
                    <p className="print-text-sm">
                      <span className="font-medium">{translations.issueDate}</span> {formatDate(purchaseOrder.issue_date)}
                    </p>
                    {purchaseOrder.requested_delivery_date && (
                      <p className="print-text-sm">
                        <span className="font-medium">{translations.requestedDeliveryDate}</span> {formatDate(purchaseOrder.requested_delivery_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="no-page-break">
                <table className="po-order-confirmation-items-table w-full border-collapse print:border-black">
                  <thead>
                    <tr>
                      <th className="text-center text-sm"></th>
                      <th className="text-left text-sm">{translations.partName}</th>
                      <th className="text-left text-sm">{translations.partNumber}</th>
                      <th className="text-center text-sm">{translations.quantity}</th>
                      <th className="text-right text-sm">{translations.subtotalWeight}</th>
                      <th className="text-right text-sm">{translations.price}</th>
                      <th className="text-right text-sm">{translations.amount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item: any, itemIndex: number) => {
                      const inventoryItem = inventoryMap[item.inventory_id];
                      const unit = inventoryItem?.unit || translations.piece;
                      const unitPrice = Number(item.unit_price || 0);
                      const lineTotal = Number(item.total || 0);
                      const itemWeight = (inventoryItem?.weight || 0) * (item.quantity || 0);
                      const isLastRow = itemIndex === pageItems.length - 1;
                      const photoUrl = inventoryItem?.photo_url;
                      const isDomestic = purchaseOrder.customers?.country === "Bosnia and Herzegovina";
                      const displayUnit = (isDomestic && (unit === "piece" || unit === "pieces" || !unit)) ? "kom." : unit;

                      return (
                        <tr
                          key={itemIndex}
                          style={{
                            height: `${ITEM_HEIGHT_PX}px`,
                            borderBottom: isLastRow ? "0.25mm solid rgb(212, 212, 212)" : "none"
                          }}
                        >
                          <td className="text-center" style={{ verticalAlign: "middle", padding: "0.3rem" }}>
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={item.description}
                                style={{
                                  height: `${ITEM_IMAGE_SIZE}px`,
                                  width: "auto",
                                  objectFit: "contain",
                                  maxWidth: "105%",
                                  margin: "0 auto",
                                  display: "block",
                                  borderRadius: "8px",
                                }}
                                onError={(e) => {
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
                            {item.part_number || inventoryItem?.part_number || "-"}
                          </td>
                          <td className="text-center text-sm" style={{ verticalAlign: "middle" }}>
                            {item.quantity} {displayUnit}
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

              {isLastPage && (
                <>
                  <div className="grid grid-cols-2 gap-6 no-page-break print:mt-8">
                    <div style={{ width: "111mm" }}>
                      <h3 className="font-semibold mb-2 print-text-base">{translations.summary}</h3>
                      <div className="space-y-1 text-sm print:space-y-2 print-text-sm">
                        <p>
                          <span className="font-medium">{translations.totalQuantity}</span> {purchaseOrder.total_quantity ?? 0} {translations.pieces}
                        </p>
                        <p>
                          <span className="font-medium">{translations.netWeight}</span> {(purchaseOrder.net_weight ?? 0).toFixed(2)} kg
                        </p>
                        {(purchaseOrder.packing ?? 0) > 0 && (
                          <p>
                            <span className="font-medium">{translations.packing}</span> {purchaseOrder.packing} {purchaseOrder.packing === 1 ? translations.package : translations.packages}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right w-3/5 ml-auto">
                      <div className="space-y-2 print:space-y-3">
                        {(() => {
                          const vatRate = isForeign ? 0 : (purchaseOrder.vat_rate ?? purchaseOrder.customers?.vat_rate ?? 17);
                          const subtotal = totalAmount || 0;
                          const subtotalExclVat = vatRate === 0 ? subtotal : subtotal / (1 + (vatRate / 100));
                          const vatAmount = subtotal - subtotalExclVat;
                          return (
                            <>
                              <div className="flex justify-between print-text-sm">
                                <span>{translations.subtotal}</span>
                                <span>{formatCurrency(subtotalExclVat, currency)}</span>
                              </div>
                              <div className="flex justify-between print-text-sm">
                                <span>{translations.vat} ({vatRate}%):</span>
                                <span>{formatCurrency(vatAmount, currency)}</span>
                              </div>
                            </>
                          );
                        })()}
                        <div
                          style={{
                            backgroundColor: documentSettings.primaryColor,
                            position: "absolute",
                            width: "76mm",
                            paddingLeft: "13mm",
                            paddingRight: "13mm",
                            height: "2rem",
                            right: "2mm"
                          }}
                          className="flex justify-between font-bold text-lg print-invoice-bg h-[2.2rem] items-center print-text-base po-total-amount-bg"
                        >
                          <span>{translations.total}</span>
                          <span>{formatCurrency(totalAmount, currency)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {purchaseOrder.notes && (
                    <div className="no-page-break print:mt-6">
                      <h3 className="font-semibold mb-2 print-text-base">{translations.notes}</h3>
                      <p className="text-sm whitespace-pre-line print-text-sm">{purchaseOrder.notes}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex-1" style={{ minHeight: 0 }}></div>

              {(documentSettings.foreignFooter.some((col: string) => col.trim()) ||
                documentSettings.domesticFooter.some((col: string) => col.trim())) && (
                <div className="po-invoice-footer-wrapper mt-auto">
                  <Separator className="print:border-black print:border-t print:mt-4 print:mb-2 border-t border-gray-600 mt-4 mb-2" />
                  <div className="text-xs print-text-xs flex justify-between gap-6 po-invoice-footer-columns" style={{ color: "#000000" }}>
                    <div className="whitespace-pre-line text-left flex-1 min-w-0">{footerColumns[0]}</div>
                    <div className="whitespace-pre-line text-center flex-1 min-w-0">{footerColumns[1]}</div>
                    <div className="whitespace-pre-line text-right flex-1 min-w-0">{footerColumns[2]}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
