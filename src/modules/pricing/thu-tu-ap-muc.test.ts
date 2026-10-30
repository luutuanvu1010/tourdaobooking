// Thứ tự áp mức (đặc tả hoa-hong-cap-dai-ly §5.3, tiêu chí 2): ba ca dựng bằng chonMuc thật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chonMuc } from "./rules.ts";
import type { DongMuc } from "./rules.ts";

const NGAY = "2026-11-01";
const X = "P-X";
const dongTa = (id: string, o: Partial<DongMuc>): DongMuc => ({
  id, targetPartyId: null, targetRoleCode: null, targetTierCode: null, scope: "ALL", catalogCode: null, groupCode: null,
  kind: "RATE", rateBp: 500, perPaxAmount: null, validFrom: "2026-01-01", validTo: null, ...o,
});

test("(a) cấp riêng có dòng ALL thắng dòng riêng của loại: bậc 12", () => {
  const ra = chonMuc({
    nguoiHuong: { loai: "HUONG", partyId: X, vai: ["L"] }, catalogCode: "A", groupCode: "G1", ngay: NGAY,
    dong: [dongTa("d-rieng", { targetTierCode: "TR", rateBp: 900 }), dongTa("d-loai", { targetRoleCode: "L", rateBp: 300 })],
    gan: [], ganRieng: [{ partyId: X, tierCode: "TR", validFrom: "2026-01-01", validTo: null }],
  });
  assert.equal(ra.trangThai, "SET");
  if (ra.trangThai === "SET") { assert.equal(ra.bac, 12); assert.equal(ra.dong.id, "d-rieng"); }
});

test("(b) có cấp riêng mà không có dòng khớp: không xét cấp của loại, ra NO_RULE", () => {
  const ra = chonMuc({
    nguoiHuong: { loai: "HUONG", partyId: X, vai: ["L"] }, catalogCode: "B", groupCode: "G1", ngay: NGAY,
    dong: [dongTa("d-rieng", { targetTierCode: "TR", scope: "SERVICE", catalogCode: "A" }), dongTa("d-cap-loai", { targetTierCode: "TL" })],
    gan: [{ roleTypeCode: "L", tierCode: "TL", validFrom: "2026-01-01", validTo: null }],
    ganRieng: [{ partyId: X, tierCode: "TR", validFrom: "2026-01-01", validTo: null }],
  });
  assert.deepEqual(ra, { trangThai: "MISSING", lyDo: "NO_RULE" });
});

test("(c) hai loại, hai dòng riêng ALL khác số: RULE_CONFLICT", () => {
  const ra = chonMuc({
    nguoiHuong: { loai: "HUONG", partyId: X, vai: ["L", "M"] }, catalogCode: "A", groupCode: "G1", ngay: NGAY,
    dong: [dongTa("d-l", { targetRoleCode: "L", rateBp: 300 }), dongTa("d-m", { targetRoleCode: "M", rateBp: 400 })],
    gan: [], ganRieng: [],
  });
  assert.deepEqual(ra, { trangThai: "MISSING", lyDo: "RULE_CONFLICT" });
});
