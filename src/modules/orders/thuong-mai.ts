// Ánh xạ bản chụp thương mại ↔ dòng bảng ord_service_terms (đặc tả §5). Thuần — câu SQL ở thuong-mai-repo.ts.
import type { BanChup, LyDoThieu } from "../pricing";

export interface DongGhiChup {
  id: string; orderId: string; serviceId: string; beneficiaryPartyId: string | null;
  commissionStatus: "NONE" | "SET" | "MISSING"; missingReason: LyDoThieu | null; commissionKind: "RATE" | "PER_PAX" | null; rateBp: number | null; perPax: number | null; ruleId: string | null;
  supplyStatus: "SET" | "MISSING"; sellerPartyId: string | null; supplierPartyId: string | null; costRateBp: number | null; termId: string | null;
  source: "AUTO" | "MANUAL"; reason: string | null; supersedesId: string | null; capturedDate: string; at: string; by: string;
}
export function dongGhiTuChup(c: BanChup, v: { id: string; orderId: string; ngay: string; at: string; by: string; source: "AUTO" | "MANUAL"; reason: string | null; supersedesId: string | null }): DongGhiChup {
  const h = c.hoaHong;
  const cu = c.cungUng;
  return {
    id: v.id, orderId: v.orderId, serviceId: c.serviceId, beneficiaryPartyId: c.beneficiaryPartyId,
    commissionStatus: h.status, missingReason: h.status === "MISSING" ? h.reason : null,
    commissionKind: h.status === "SET" ? h.kind : null, rateBp: h.status === "SET" ? h.rateBp : null, perPax: h.status === "SET" ? h.perPax : null, ruleId: h.status === "SET" ? h.ruleId : null,
    supplyStatus: cu.status, sellerPartyId: cu.status === "SET" ? cu.sellerPartyId : null, supplierPartyId: cu.status === "SET" ? cu.supplierPartyId : null,
    costRateBp: cu.status === "SET" ? cu.costRateBp : null, termId: cu.status === "SET" ? cu.termId : null,
    source: v.source, reason: v.reason, supersedesId: v.supersedesId, capturedDate: v.ngay, at: v.at, by: v.by,
  };
}
export interface TermRowDb {
  id: string; order_service_id: string; beneficiary_party_id: string | null; commission_status: "NONE" | "SET" | "MISSING"; missing_reason: LyDoThieu | null;
  commission_kind: "RATE" | "PER_PAX" | null; commission_rate_bp: number | null; commission_per_pax: number | null; commission_rule_id: string | null;
  supply_status: "SET" | "MISSING"; seller_party_id: string | null; supplier_party_id: string | null; cost_rate_bp: number | null; supply_term_id: string | null;
  source: "AUTO" | "MANUAL"; captured_date: string;
}
export function banChupTuDb(r: TermRowDb): BanChup {
  return {
    serviceId: r.order_service_id, beneficiaryPartyId: r.beneficiary_party_id,
    hoaHong: r.commission_status === "NONE" ? { status: "NONE" } : r.commission_status === "MISSING" ? { status: "MISSING", reason: r.missing_reason! }
      : { status: "SET", kind: r.commission_kind!, rateBp: r.commission_rate_bp, perPax: r.commission_per_pax, ruleId: r.commission_rule_id },
    cungUng: r.supply_status === "SET" ? { status: "SET", termId: r.supply_term_id, sellerPartyId: r.seller_party_id!, supplierPartyId: r.supplier_party_id, costRateBp: r.cost_rate_bp } : { status: "MISSING" },
  };
}
/** Mô tả bản chụp cho nhật ký: chỉ đếm dòng — không tỷ lệ, không tiền (nhật ký đơn đọc được ở nhiều nơi). */
export function moTaChup(chup: readonly BanChup[]): string {
  if (chup.every((c) => c.hoaHong.status === "NONE")) return "không người hưởng";
  const co = chup.filter((c) => c.hoaHong.status === "SET").length;
  return `${chup.length} dòng: ${co} có mức, ${chup.length - co} thiếu mức`;
}
