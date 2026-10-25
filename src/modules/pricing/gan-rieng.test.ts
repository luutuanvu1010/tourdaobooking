// ADR-0138 (chủ duyệt 2026-10-24) — luật THUẦN: mức TA gắn riêng cho từng đại lý. Thứ tự: dòng riêng đối tác (1–3) → mức TA gắn riêng (10–12) → dòng riêng của
// loại (4–6) → mức TA của loại (7–9, BỎ QUA hẳn khi hồ sơ có gắn riêng). Số của ví dụ chủ (10% / 7% và 12% / 9%) — số của người soạn, chưa Kế toán ký.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chonMuc, tomTatHoaHongHoSo, type DongMuc, type GanLoaiMuc, type GanRieng, type NguoiHuong } from "./rules.ts";

const NGAY = "2026-10-24";
const A: NguoiHuong = { loai: "HUONG", partyId: "pty-a", vai: ["LU_HANH"] };
const B: NguoiHuong = { loai: "HUONG", partyId: "pty-b", vai: ["LU_HANH"] };
let so = 0;
const dong = (o: Partial<DongMuc>): DongMuc => ({
  id: `d${String(++so).padStart(3, "0")}`, targetPartyId: null, targetRoleCode: null, targetTierCode: null, scope: "ALL", catalogCode: null, groupCode: null,
  kind: "RATE", rateBp: 1000, perPaxAmount: null, theoLoai: null, validFrom: "2026-01-01", validTo: null, ...o,
});
const gan: GanLoaiMuc[] = [{ roleTypeCode: "LU_HANH", tierCode: "TA1", validFrom: "2026-01-01", validTo: null }];
const rieng = (partyId: string, tierCode: string, validFrom = "2026-01-01", validTo: string | null = null): GanRieng => ({ partyId, tierCode, validFrom, validTo });
// TA1: Tour đảo (nhóm TD) 10%, Vinwonders (nhóm VW) 7%. TA2: 12%, 9%.
const MUC = [
  dong({ targetTierCode: "TA1", scope: "GROUP", groupCode: "TD", rateBp: 1000 }),
  dong({ targetTierCode: "TA1", scope: "GROUP", groupCode: "VW", rateBp: 700 }),
  dong({ targetTierCode: "TA2", scope: "GROUP", groupCode: "TD", rateBp: 1200 }),
  dong({ targetTierCode: "TA2", scope: "GROUP", groupCode: "VW", rateBp: 900 }),
];
const tyLe = (nh: NguoiHuong, groupCode: string, muc: readonly DongMuc[] = MUC, ganRieng: readonly GanRieng[] = [rieng("pty-a", "TA2")]) => {
  const k = chonMuc({ nguoiHuong: nh, catalogCode: "X1", groupCode, ngay: NGAY, dong: muc, gan, ganRieng });
  return k.trangThai === "SET" ? { bp: k.dong.rateBp, bac: k.bac } : k;
};

test("TC1 ví dụ chủ: đại lý A gắn riêng TA2 ⇒ 12% / 9% (bậc 11); đại lý B cùng loại vẫn TA1 ⇒ 10% / 7% (bậc 8)", () => {
  assert.deepEqual(tyLe(A, "TD"), { bp: 1200, bac: 11 });
  assert.deepEqual(tyLe(A, "VW"), { bp: 900, bac: 11 });
  assert.deepEqual(tyLe(B, "TD"), { bp: 1000, bac: 8 });
  assert.deepEqual(tyLe(B, "VW"), { bp: 700, bac: 8 });
});

test("TC3 thứ tự: dòng riêng đối tác (1–3) thắng mức riêng; mức riêng thắng dòng riêng của loại (4–6)", () => {
  const coRiengDoiTac = [...MUC, dong({ targetPartyId: "pty-a", scope: "ALL", rateBp: 1500 })];
  assert.deepEqual(tyLe(A, "TD", coRiengDoiTac), { bp: 1500, bac: 3 });
  const coRiengLoai = [...MUC, dong({ targetRoleCode: "LU_HANH", scope: "GROUP", groupCode: "VW", rateBp: 900 + 1 })];
  assert.deepEqual(tyLe(A, "VW", coRiengLoai), { bp: 900, bac: 11 }, "ĐỔI NGHĨA ADR-0117 điều 6: mức gắn riêng thắng dòng riêng của loại");
  assert.deepEqual(tyLe(B, "VW", coRiengLoai), { bp: 901, bac: 5 }, "đại lý không gắn riêng: dòng riêng của loại vẫn thắng mức TA của loại");
});

test("bậc 10 / 12: mức riêng có dòng dịch vụ ⇒ bậc 10; chỉ dòng mọi dịch vụ ⇒ bậc 12", () => {
  const m = [dong({ targetTierCode: "TA3", scope: "SERVICE", catalogCode: "X1", rateBp: 1300 }), dong({ targetTierCode: "TA4", scope: "ALL", rateBp: 400 })];
  assert.deepEqual(tyLe(A, "TD", m, [rieng("pty-a", "TA3")]), { bp: 1300, bac: 10 });
  assert.deepEqual(tyLe(A, "TD", m, [rieng("pty-a", "TA4")]), { bp: 400, bac: 12 });
});

test("D1 «bỏ qua hoàn toàn»: mức riêng KHÔNG có dòng cho dịch vụ này ⇒ không rơi về mức TA của loại — thiếu mức NO_RULE (đơn bị giữ)", () => {
  const chiTD = MUC.filter((d) => !(d.targetTierCode === "TA2" && d.groupCode === "VW"));
  assert.deepEqual(tyLe(A, "VW", chiTD), { trangThai: "MISSING", lyDo: "NO_RULE" });
  // nhưng dòng riêng của loại vẫn áp (đứng trước mức của loại)
  assert.deepEqual(tyLe(A, "VW", [...chiTD, dong({ targetRoleCode: "LU_HANH", scope: "ALL", rateBp: 600 })]), { bp: 600, bac: 6 });
});

test("TC4 hiệu lực: gắn riêng đã đóng / chưa tới ngày / của hồ sơ khác ⇒ như không gắn (về mức của loại)", () => {
  assert.deepEqual(tyLe(A, "TD", MUC, [rieng("pty-a", "TA2", "2026-01-01", "2026-10-23")]), { bp: 1000, bac: 8 });
  assert.deepEqual(tyLe(A, "TD", MUC, [rieng("pty-a", "TA2", "2026-10-25")]), { bp: 1000, bac: 8 });
  assert.deepEqual(tyLe(A, "TD", MUC, [rieng("pty-b", "TA2")]), { bp: 1000, bac: 8 });
  assert.deepEqual(tyLe(A, "TD", MUC, [rieng("pty-a", "TA2", "2026-01-01", NGAY)]), { bp: 1200, bac: 11 }, "hạn là hôm nay thì còn hiệu lực");
});

test("TC2: hồ sơ mang hai loại gắn hai mức khác số ⇒ hôm nay RULE_CONFLICT; có mức riêng ⇒ hết xung đột", () => {
  const AB: NguoiHuong = { loai: "HUONG", partyId: "pty-a", vai: ["LU_HANH", "KHACH_SAN"] };
  const hai: GanLoaiMuc[] = [...gan, { roleTypeCode: "KHACH_SAN", tierCode: "TA2", validFrom: "2026-01-01", validTo: null }];
  const k = (ganRieng: GanRieng[]) => chonMuc({ nguoiHuong: AB, catalogCode: "X1", groupCode: "TD", ngay: NGAY, dong: MUC, gan: hai, ganRieng });
  assert.deepEqual(k([]), { trangThai: "MISSING", lyDo: "RULE_CONFLICT" });
  const co = k([rieng("pty-a", "TA1")]);
  assert.equal(co.trangThai, "SET");
  assert.deepEqual(co.trangThai === "SET" ? [co.dong.rateBp, co.bac] : null, [1000, 11]);
});

test("khối hồ sơ (tomTatHoaHongHoSo): hiện mức riêng đang hiệu lực; có mức riêng thì không báo xung đột hai loại", () => {
  const hai: GanLoaiMuc[] = [...gan, { roleTypeCode: "KHACH_SAN", tierCode: "TA2", validFrom: "2026-01-01", validTo: null }];
  const goi = (ganRieng: GanRieng[]) =>
    tomTatHoaHongHoSo({ partyId: "pty-a", vaiMo: ["LU_HANH", "KHACH_SAN"], vaiDuocHuong: new Set(["LU_HANH", "KHACH_SAN"]), gan: hai, ganRieng, muc: [], ngay: NGAY });
  assert.equal(goi([]).xungDot, true);
  assert.equal(goi([]).mucRieng, null);
  const r = goi([rieng("pty-a", "TA2", "2026-03-01"), rieng("pty-a", "TA9", "2025-01-01", "2025-12-31")]);
  assert.deepEqual(r.mucRieng, { mucCode: "TA2", tuNgay: "2026-03-01" });
  assert.equal(r.xungDot, false);
});
