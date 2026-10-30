// Đối chiếu luật phủ mức thuần (src/shared/hoa-hong-phu-muc.ts) với chonMuc thật (đặc tả hoa-hong-cap-dai-ly §4.4).
// Bộ mẫu CHÉP từ src/shared/hoa-hong-phu-muc.test.ts, không nhập từ tệp *.test.ts khác (node:test sẽ đăng ký lại bài).
import { test } from "node:test";
import assert from "node:assert/strict";
import { phuMucLoai } from "../../shared/hoa-hong-phu-muc.ts";
import type { CapPhu, DichVuPhu } from "../../shared/hoa-hong-phu-muc.ts";
import { chonMuc, nguoiHuongCua } from "./rules.ts";
import type { DongMuc, GanLoaiMuc } from "./rules.ts";

const D = "2026-11-01";
const X = "P-X";
const S: DichVuPhu[] = [
  { code: "A", groupCode: "G1", ten: "A" },
  { code: "B", groupCode: "G1", ten: "B" },
  { code: "C", groupCode: "G2", ten: "C" },
  { code: "D'", groupCode: null, ten: "D'" },
];

type Dong = CapPhu["dong"][number];
type Gan = CapPhu["gan"][number];
type Td = Dong["doiTuong"];
const dong = (doiTuong: Td, phamVi: Dong["phamVi"], o: Partial<Dong> = {}): Dong => ({ doiTuong, phamVi, catalogCode: null, groupCode: null, tuNgay: "2026-01-01", denNgay: null, daHuy: false, ...o });
const vai = (code: string): Td => ({ loai: "VAI", code, ten: code });
const muc = (code: string): Td => ({ loai: "MUC", code, ten: code });
const gan = (loai: string, o: Partial<Gan> = {}): Gan => ({ loai: { code: loai, ten: loai }, tuNgay: "2026-01-01", denNgay: null, daHuy: false, ...o });
const cap = (code: string, dongCap: Dong[], ganCap: Gan[] = [], dangBat = true): CapPhu => ({ code, dangBat, dong: dongCap, gan: ganCap });

const T1 = cap("T1", [dong(muc("T1"), "ALL")]);
const T2 = cap("T2", []);
const T3 = cap("T3", [dong(muc("T3"), "ALL", { tuNgay: "2026-11-02" })]);
const T4 = cap("T4", [dong(muc("T4"), "GROUP", { groupCode: "G1" }), dong(muc("T4"), "SERVICE", { catalogCode: "C" })]);
const T5 = cap("T5", [dong(muc("T5"), "ALL")], [], false);
const T6 = cap("T6", [dong(muc("T6"), "ALL", { denNgay: "2026-10-31" })]);
const capCoGan = (c: CapPhu, ...g: Gan[]): CapPhu => ({ ...c, gan: g });

interface Loai { code: string; dangBat: boolean; dong: Dong[]; muc: CapPhu[] }
const L = (code: string, dongRieng: Dong[], mucCap: CapPhu[], dangBat = true): Loai => ({ code, dangBat, dong: dongRieng, muc: mucCap });
const loaiMau: Loai[] = [
  L("L1", [dong(vai("L1"), "ALL")], [], false),
  L("L2", [dong(vai("L2"), "ALL")], []),
  L("L3", [], [capCoGan(T1, gan("L3"))]),
  L("L4", [], [capCoGan(T2, gan("L4"))]),
  L("L5", [], [capCoGan(T3, gan("L5"))]),
  L("L6", [], [capCoGan(T1, gan("L6", { tuNgay: "2026-11-02" }))]),
  L("L7", [dong(vai("L7"), "SERVICE", { catalogCode: "A" })], []),
  L("L8", [dong(vai("L8"), "GROUP", { groupCode: "G1" })], []),
  L("L9", [dong(vai("L9"), "SERVICE", { catalogCode: "A" })], [capCoGan(T1, gan("L9"))]),
  L("L10", [], [capCoGan(T4, gan("L10"))]),
  L("L11", [], [capCoGan(T5, gan("L11"))]),
  L("L12", [], [capCoGan(T6, gan("L12"))]),
  L("L13", [dong(vai("L13"), "ALL", { denNgay: "2026-11-01" })], []),
  L("L14", [], [capCoGan(T1, gan("L14", { daHuy: true }))]),
];

// Bộ mẫu → dữ liệu vào của chonMuc: dòng và lần xếp CHƯA HUỶ (kể cả sắp áp / hết hạn: chonMuc tự lọc theo ngày).
const khoaDong = (d: Dong): string => [d.doiTuong.loai, d.doiTuong.code, d.phamVi, d.catalogCode, d.groupCode, d.tuNgay, d.denNgay].join("|");
function doiSangDongMuc(ds: readonly Dong[]): DongMuc[] {
  const thay = new Map<string, DongMuc>();
  for (const d of ds) {
    if (d.daHuy) continue;
    const id = khoaDong(d);
    thay.set(id, {
      id, targetPartyId: null,
      targetRoleCode: d.doiTuong.loai === "VAI" ? d.doiTuong.code : null,
      targetTierCode: d.doiTuong.loai === "MUC" ? d.doiTuong.code : null,
      scope: d.phamVi, catalogCode: d.catalogCode, groupCode: d.groupCode,
      kind: "RATE", rateBp: 500, perPaxAmount: null, validFrom: d.tuNgay, validTo: d.denNgay,
    });
  }
  return [...thay.values()];
}
function doiSangGan(caps: readonly CapPhu[]): GanLoaiMuc[] {
  return caps.flatMap((c) => c.gan.filter((g) => !g.daHuy).map((g) => ({ roleTypeCode: g.loai.code, tierCode: c.code, validFrom: g.tuNgay, validTo: g.denNgay })));
}
const tatCaCap = [T1, T2, T3, T4, T5, T6];
const dongMau = doiSangDongMuc([...loaiMau.flatMap((l) => l.dong), ...tatCaCap.flatMap((c) => c.dong)]);
const ganMau = doiSangGan(loaiMau.flatMap((l) => l.muc));

test("phủ ⇔ chonMuc SET cho L2–L14 × mọi dịch vụ", () => {
  let soCa = 0;
  for (const l of loaiMau.slice(1)) {
    const kq = phuMucLoai({ loai: { code: l.code, dangBat: l.dangBat }, dong: l.dong, muc: l.muc, dichVu: S, homNay: D }).ketQua;
    const thieu = kq.kieu === "DU" ? [] : kq.kieu === "KHONG_CO" || kq.kieu === "THIEU" ? kq.thieu.map((s) => s.code) : null;
    assert.ok(thieu !== null, `${l.code}: kết quả phải là DU/THIEU/KHONG_CO`);
    for (const s of S) {
      const phu = !thieu.includes(s.code);
      const ra = chonMuc({ nguoiHuong: { loai: "HUONG", partyId: X, vai: [l.code] }, catalogCode: s.code, groupCode: s.groupCode, ngay: D, dong: dongMau, gan: ganMau, ganRieng: [] });
      assert.equal(ra.trangThai === "SET", phu, `${l.code} × ${s.code}: luật phủ ${phu}, chonMuc ${ra.trangThai}`);
      soCa++;
    }
  }
  assert.equal(soCa, 13 * 4);
});

test("L1 đã tắt: nguoiHuongCua KHONG_HUONG, chonMuc MISSING BOOKER_NOT_BENEFICIARY", () => {
  const nh = nguoiHuongCua({
    bookerPartyId: X,
    vaiMo: [{ roleTypeCode: "L1", roleGroup: "OTHER", nhanDoiTac: true }],
    vaiDuocHuong: new Set(loaiMau.slice(1).map((l) => l.code)),
    congTyChuId: "P-CTY",
  });
  assert.deepEqual(nh, { loai: "KHONG_HUONG", partyId: X });
  const ra = chonMuc({ nguoiHuong: nh, catalogCode: "A", groupCode: "G1", ngay: D, dong: dongMau, gan: ganMau, ganRieng: [] });
  assert.deepEqual(ra, { trangThai: "MISSING", lyDo: "BOOKER_NOT_BENEFICIARY" });
});

test("nhóm tắt: luật phủ nói thiếu E, chonMuc vẫn SET (lệch biết trước §4.1)", () => {
  const dongL15 = [dong(vai("L15"), "GROUP", { groupCode: "G3" })];
  const E: DichVuPhu = { code: "E", groupCode: null, ten: "E" }; // danh mục trả null cho nhóm đang tắt
  const kq = phuMucLoai({ loai: { code: "L15", dangBat: true }, dong: dongL15, muc: [], dichVu: [E], homNay: D }).ketQua;
  assert.equal(kq.kieu, "KHONG_CO");
  assert.deepEqual(kq.kieu === "KHONG_CO" ? kq.thieu.map((s) => s.code) : [], ["E"]);
  const ra = chonMuc({ nguoiHuong: { loai: "HUONG", partyId: X, vai: ["L15"] }, catalogCode: "E", groupCode: "G3", ngay: D, dong: doiSangDongMuc(dongL15), gan: [], ganRieng: [] });
  assert.equal(ra.trangThai, "SET");
});
