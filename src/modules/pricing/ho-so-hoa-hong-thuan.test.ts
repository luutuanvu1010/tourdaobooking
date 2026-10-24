// YC-0020 — luật thuần của khối «Hoa hồng hiện hành» (`tomTatHoaHongHoSo`): bốn ca người kiểm độc lập (24/10) phá thử mà bài chạy thật không bắt được.
// Mỗi ca khoá MỘT điều kiện; xoá điều kiện đó khỏi hàm thì đúng bài đó đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tomTatHoaHongHoSo, type DongMuc, type GanLoaiMuc } from "./rules.ts";

const NGAY = "2026-10-24";
const P = "pty-a";
const gan = (roleTypeCode: string, tierCode: string, validFrom = "2026-01-01", validTo: string | null = null): GanLoaiMuc => ({ roleTypeCode, tierCode, validFrom, validTo });
const dong = (o: Partial<DongMuc>): DongMuc => ({
  id: "d1", targetPartyId: null, targetRoleCode: null, targetTierCode: null, scope: "ALL", catalogCode: null, groupCode: null, kind: "RATE", rateBp: 1000, perPaxAmount: null, theoLoai: null,
  validFrom: "2026-01-01", validTo: null, ...o,
});
const goi = (o: { vaiMo?: string[]; duocHuong?: string[]; gan?: GanLoaiMuc[]; muc?: DongMuc[] }) =>
  tomTatHoaHongHoSo({ partyId: P, vaiMo: o.vaiMo ?? ["L1"], vaiDuocHuong: new Set(o.duocHuong ?? ["L1", "L2"]), gan: o.gan ?? [], muc: o.muc ?? [], ngay: NGAY });

test("gắn mức đã hết hạn hoặc chưa tới ngày KHÔNG tính (như chonMuc)", () => {
  assert.equal(goi({ gan: [gan("L1", "T1", "2026-01-01", "2026-10-01")] }).vai[0].mucCode, null, "hết hạn");
  assert.equal(goi({ gan: [gan("L1", "T1", "2026-12-01")] }).vai[0].mucCode, null, "chưa tới ngày");
  assert.equal(goi({ gan: [gan("L1", "T1", "2026-01-01", "2026-10-24")] }).vai[0].mucCode, "T1", "hạn là hôm nay thì còn hiệu lực");
});

test("dòng riêng đã hết hạn KHÔNG được đếm", () => {
  const r = goi({ muc: [dong({ id: "a", targetRoleCode: "L1", validTo: "2026-09-30" }), dong({ id: "b", targetPartyId: P, validTo: "2026-09-30" })] });
  assert.equal(r.dongRiengLoai, 0);
  assert.equal(r.dongRiengDoiTac, 0);
});

test("dòng riêng của ĐỐI TÁC KHÁC không được đếm cho hồ sơ này", () => {
  assert.equal(goi({ muc: [dong({ targetPartyId: "pty-khac" })] }).dongRiengDoiTac, 0);
  assert.equal(goi({ muc: [dong({ targetPartyId: P })] }).dongRiengDoiTac, 1);
});

test("loại bị tắt khỏi danh sách được hưởng thì không hiện, dù hồ sơ còn mang vai đó", () => {
  const r = goi({ vaiMo: ["L1", "L3"], duocHuong: ["L1"], gan: [gan("L3", "T9")], muc: [dong({ targetRoleCode: "L3" })] });
  assert.deepEqual(r.vai.map((v) => v.loaiCode), ["L1"]);
  assert.equal(r.dongRiengLoai, 0, "dòng riêng của loại không được hưởng không đếm");
  assert.equal(goi({ vaiMo: ["L3"], duocHuong: ["L1"] }).laNguoiHuong, false);
});

test("xungDot: hai loại hai mức khác mã ⇒ true; cùng mã ⇒ false; một loại chưa gắn không gây xung đột", () => {
  assert.equal(goi({ vaiMo: ["L1", "L2"], gan: [gan("L1", "T1"), gan("L2", "T2")] }).xungDot, true);
  assert.equal(goi({ vaiMo: ["L1", "L2"], gan: [gan("L1", "T1"), gan("L2", "T1")] }).xungDot, false);
  assert.equal(goi({ vaiMo: ["L1", "L2"], gan: [gan("L1", "T1")] }).xungDot, false);
});
