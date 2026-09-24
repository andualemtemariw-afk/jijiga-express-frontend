import { createSupabaseBrowserClient } from "./supabase-browser";

export type Role = "customer" | "rider" | "mamila" | "dispatcher" | "owner_admin";

const supabase = createSupabaseBrowserClient();

async function rpc<T>(fn: string, args: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export const api = {
  supabase,
  async currentRole(): Promise<{ role: Role; userId: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Authentication required");
    const { data, error } = await supabase.functions.invoke("clever-api", {
      body: { action: "health" },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error || !data?.role) throw new Error(error?.message || "Unable to load role");
    return { role: data.role as Role, userId: data.user_id as string };
  },
  customerDashboard: () => rpc<Record<string, unknown>>("customer_dashboard"),
  mamilaDashboard: () => rpc<Record<string, unknown>>("mamila_dashboard"),
  riderDashboard: () => rpc<Record<string, unknown>>("rider_dashboard"),
  operationsDashboard: () => rpc<Record<string, unknown>>("operations_dashboard"),
  operationsRiders: () => rpc<any[]>("operations_riders"),
  approvedEEUVendors: () => rpc<any[]>("approved_eeu_vendors"),
  onboardCustomer: (p: { p_full_name: string; p_phone: string; p_default_address: string; p_notes: string }) => rpc<string>("onboard_customer", p),
  createOrder: (type: "KHAT" | "EEU") => rpc<string>("create_order", { p_order_type: type }),
  createKhatOrder: (p: Record<string, unknown>) => rpc<string>("create_khat_order", p),
  createEEUOrder: (p: Record<string, unknown>) => rpc<string>("create_eeu_order", p),
  updateCustomerProfile: (p: Record<string, unknown>) => rpc<string>("update_customer_profile", p),
  updateMamilaProfile: (p: Record<string, unknown>) => rpc<string>("update_mamila_profile", p),
  createBatch: (p: Record<string, unknown>) => rpc<string>("create_batch", p),
  closeBatch: (id: string) => rpc<string>("close_batch", { p_batch_id: id }),
  confirmKhatOrder: (id: string) => rpc<string>("confirm_khat_order", { p_order_id: id }),
  updateRiderProfile: (p: Record<string, unknown>) => rpc<string>("update_rider_profile", p),
  assignRider: (orderId: string, riderId: string) => rpc<string>("assign_rider", { p_order_id: orderId, p_rider_id: riderId }),
  assignEEUVendor: (orderId: string, vendorId: string) => rpc<string>("assign_eeu_vendor", { p_order_id: orderId, p_eeu_vendor_id: vendorId }),
  advanceKhatOrder: (orderId: string, status: string) => rpc<string>("advance_khat_order", { p_order_id: orderId, p_next_status: status }),
  advanceEEUOrder: (orderId: string, status: string) => rpc<string>("advance_eeu_order", { p_order_id: orderId, p_next_status: status }),
  verifyDeliveryOtp: (orderId: string, code: string) => rpc<boolean>("verify_delivery_otp", { p_order_id: orderId, p_code: code }),
  issueDeliveryOtp: async (orderId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Authentication required");
    const { data, error } = await supabase.functions.invoke("clever-api", {
      body: { action: "issue_delivery_otp", order_id: orderId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error || !data?.code) throw new Error(error?.message || "OTP was not returned");
    return data.code as string;
  },
  openDispute: (p: Record<string, unknown>) => rpc<string>("open_dispute", p),
  resolveDispute: (p: Record<string, unknown>) => rpc<string>("resolve_dispute", p),
  settleRiderCash: (p: Record<string, unknown>) => rpc<string>("settle_rider_cash", p),
};
