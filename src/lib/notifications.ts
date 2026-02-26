import { supabase } from "@/integrations/supabase/client";

/**
 * Notify admins (staff with purchase-orders permission) when a new PO is created.
 * Excludes the creator if they are staff.
 */
export async function notifyAdminsOfNewPO(
  purchaseOrderId: string,
  purchaseOrderNumber: string,
  customerName: string,
  creatorStaffId?: string | null
): Promise<void> {
  try {
    const { data: staffList } = await supabase
      .from("staff")
      .select("id, page_permissions")
      .eq("is_active", true);

    if (!staffList || staffList.length === 0) return;

    const perms = (p: unknown): string[] => {
      if (Array.isArray(p)) return p.map(String);
      if (typeof p === "string") try { return JSON.parse(p) || []; } catch { return []; }
      return [];
    };
    const hasPoAccess = (s: { page_permissions?: unknown }) => {
      const p = perms(s.page_permissions);
      return p.includes("purchase-orders") || p.includes("all");
    };

    const adminIds = staffList
      .filter(hasPoAccess)
      .map((s) => s.id)
      .filter((id) => id !== creatorStaffId);

    if (adminIds.length === 0) return;

    const notifications = adminIds.map((staffId) => ({
      recipient_staff_id: staffId,
      type: "po_created",
      title: "New Purchase Order",
      message: `${purchaseOrderNumber} from ${customerName}`,
      data: {
        purchase_order_id: purchaseOrderId,
        purchase_order_number: purchaseOrderNumber,
        customer_name: customerName,
      },
    }));

    await supabase.from("notifications" as any).insert(notifications);
  } catch (e) {
    console.error("Failed to create PO notifications:", e);
  }
}
