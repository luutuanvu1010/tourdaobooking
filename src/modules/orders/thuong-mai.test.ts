import { test } from "node:test";
import assert from "node:assert/strict";
import { banChupTuDb, dongGhiTuChup, moTaChup } from "./thuong-mai.ts";

const set = { serviceId: "s1", beneficiaryPartyId: "dla", hoaHong: { status: "SET" as const, kind: "RATE" as const, rateBp: 1000, perPax: null, ruleId: "m1" },
  cungUng: { status: "SET" as const, termId: "d1", sellerPartyId: "ct", supplierPartyId: null, costRateBp: null } };
const thieu = { serviceId: "s2", beneficiaryPartyId: "dla", hoaHong: { status: "MISSING" as const, reason: "MANUAL_LINE" as const }, cungUng: { status: "MISSING" as const } };

test("dongGhiTuChup ↔ banChupTuDb: đi rồi về giữ nguyên bản chụp", () => {
  const v = { id: "t1", orderId: "o1", ngay: "2026-10-10", at: "2026-10-10T01:00:00.000Z", by: "kt", source: "AUTO" as const, reason: null, supersedesId: null };
  for (const c of [set, thieu]) {
    const d = dongGhiTuChup(c, v);
    const db = { id: d.id, order_service_id: d.serviceId, beneficiary_party_id: d.beneficiaryPartyId, commission_status: d.commissionStatus, missing_reason: d.missingReason,
      commission_kind: d.commissionKind, commission_rate_bp: d.rateBp, commission_per_pax: d.perPax, commission_rule_id: d.ruleId, supply_status: d.supplyStatus,
      seller_party_id: d.sellerPartyId, supplier_party_id: d.supplierPartyId, cost_rate_bp: d.costRateBp, supply_term_id: d.termId, source: d.source, captured_date: d.capturedDate };
    assert.deepEqual(banChupTuDb(db), c);
  }
});

test("moTaChup: đếm dòng, không tỷ lệ, không tiền", () => {
  assert.equal(moTaChup([set, thieu]), "2 dòng: 1 có mức, 1 thiếu mức");
  assert.equal(moTaChup([{ ...set, hoaHong: { status: "NONE" as const } }]), "không người hưởng");
  assert.doesNotMatch(moTaChup([set, thieu]), /%|đ/);
});
