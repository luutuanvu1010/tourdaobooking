import { test } from "node:test";
import assert from "node:assert/strict";
import { conApNgay, demDai, khopDichVu, phuMucCap, phuMucLoai, xepTheoPhu } from "./hoa-hong-phu-muc.ts";
import type { CapPhu, DichVuPhu, KetQuaPhu } from "./hoa-hong-phu-muc.ts";

// Bộ mẫu đặc tả §4.4. D = 2026-11-01.
const D = "2026-11-01";
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
// Lần xếp nằm ở cấp (gan.loai = loại được xếp vào cấp).
const capCoGan = (c: CapPhu, ...g: Gan[]): CapPhu => ({ ...c, gan: g });

interface Loai { code: string; dangBat: boolean; dong: Dong[]; muc: CapPhu[] }
const L = (code: string, dongRieng: Dong[], muc: CapPhu[], dangBat = true): Loai => ({ code, dangBat, dong: dongRieng, muc });
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
const chay = (l: Loai, dichVu: readonly DichVuPhu[] | null = S) => phuMucLoai({ loai: { code: l.code, dangBat: l.dangBat }, dong: l.dong, muc: l.muc, dichVu, homNay: D });
const rut = (k: KetQuaPhu) => ({ kieu: k.kieu, thieu: "thieu" in k ? k.thieu.map((s) => s.code) : [] });

test("§4.4: L1–L14 ra đúng kết quả và dịch vụ thiếu", () => {
  const tatCa = ["A", "B", "C", "D'"];
  const mong: Record<string, { kieu: string; thieu: string[] }> = {
    L1: { kieu: "TAT", thieu: [] },
    L2: { kieu: "DU", thieu: [] },
    L3: { kieu: "DU", thieu: [] },
    L4: { kieu: "KHONG_CO", thieu: tatCa },
    L5: { kieu: "KHONG_CO", thieu: tatCa },
    L6: { kieu: "KHONG_CO", thieu: tatCa },
    L7: { kieu: "THIEU", thieu: ["B", "C", "D'"] },
    L8: { kieu: "THIEU", thieu: ["C", "D'"] },
    L9: { kieu: "DU", thieu: [] },
    L10: { kieu: "THIEU", thieu: ["D'"] },
    L11: { kieu: "DU", thieu: [] },
    L12: { kieu: "KHONG_CO", thieu: tatCa },
    L13: { kieu: "DU", thieu: [] },
    L14: { kieu: "KHONG_CO", thieu: tatCa },
  };
  for (const l of loaiMau) assert.deepEqual(rut(chay(l).ketQua), mong[l.code], l.code);
});

test("§4.4: phụ chú sắp áp", () => {
  assert.equal(chay(loaiMau[5]!).sapApTu, "2026-11-02"); // L6
  assert.equal(chay(loaiMau[4]!).sapApTu, null); // L5: dòng sắp áp là của cấp
});

test("§4.4: câu nhắc cấp", () => {
  const c = (x: CapPhu) => phuMucCap({ cap: x, dichVu: S, homNay: D });
  assert.deepEqual(c(T1), { kieu: "DU" });
  assert.deepEqual(c(T5), { kieu: "DU" });
  assert.deepEqual(c(T2), { kieu: "RONG" });
  assert.deepEqual(c(T3), { kieu: "CHUA_AP", sapApTu: "2026-11-02" });
  const t4 = c(T4);
  assert.equal(t4.kieu, "THIEU");
  assert.deepEqual(t4.kieu === "THIEU" ? t4.thieu.map((s) => s.code) : [], ["D'"]);
  assert.deepEqual(c(T6), { kieu: "CHUA_AP", sapApTu: null });
});

test("§4.4: đếm dải 8 thiếu (5 KHONG_CO, 3 THIEU), 1 tắt", () => {
  const d = demDai(loaiMau.map((l) => chay(l).ketQua));
  assert.deepEqual(d, { thieu: 8, khongCo: 5, thieuMot: 3, tat: 1, chuaKiem: false });
});

test("CHUA_KIEM khi danh mục lỗi hoặc rỗng", () => {
  for (const dv of [null, []] as const) {
    const kq = loaiMau.map((l) => chay(l, dv).ketQua);
    for (const [i, k] of kq.entries()) assert.equal(k.kieu, i === 0 ? "TAT" : "CHUA_KIEM");
    const d = demDai(kq);
    assert.equal(d.chuaKiem, true);
    assert.equal(d.thieu, 0);
  }
});

test("xếp: KHONG_CO, THIEU, DU, CHUA_KIEM, TAT rồi theo tên", () => {
  const x = (ten: string, ketQua: KetQuaPhu) => ({ ten, ketQua });
  const ra = xepTheoPhu([
    x("Z tắt", { kieu: "TAT" }), x("B đủ", { kieu: "DU" }), x("Đ chưa kiểm", { kieu: "CHUA_KIEM" }),
    x("M thiếu", { kieu: "THIEU", thieu: [] }), x("Ê không", { kieu: "KHONG_CO", thieu: [] }),
    x("A đủ", { kieu: "DU" }), x("E không", { kieu: "KHONG_CO", thieu: [] }), x("A tắt", { kieu: "TAT" }),
  ]);
  assert.deepEqual(ra.map((r) => r.ten), ["E không", "Ê không", "M thiếu", "A đủ", "B đủ", "Đ chưa kiểm", "A tắt", "Z tắt"]);
});

test("conApNgay và khopDichVu: biên", () => {
  assert.equal(conApNgay({ tuNgay: D, denNgay: D, daHuy: false }, D), true);
  assert.equal(conApNgay({ tuNgay: "2026-11-02", denNgay: null, daHuy: false }, D), false);
  assert.equal(conApNgay({ tuNgay: "2026-01-01", denNgay: "2026-10-31", daHuy: false }, D), false);
  assert.equal(conApNgay({ tuNgay: "2026-01-01", denNgay: null, daHuy: true }, D), false);
  assert.equal(khopDichVu({ phamVi: "GROUP", catalogCode: null, groupCode: "G1" }, S[3]!), false);
  assert.equal(khopDichVu({ phamVi: "GROUP", catalogCode: null, groupCode: null }, S[3]!), false);
  assert.equal(khopDichVu({ phamVi: "ALL", catalogCode: null, groupCode: null }, S[3]!), true);
});

test("loại chỉ có dòng riêng SERVICE A từ 2026-11-02 (sắp áp): KHONG_CO và sapApTu", () => {
  const r = phuMucLoai({ loai: { code: "Lx", dangBat: true }, dong: [dong(vai("Lx"), "SERVICE", { catalogCode: "A", tuNgay: "2026-11-02" })], muc: [], dichVu: S, homNay: D });
  assert.equal(r.ketQua.kieu, "KHONG_CO");
  assert.equal(r.sapApTu, "2026-11-02");
});

test("dòng nhiễu (đích MUC, hoặc đích loại khác) không đổi kết quả của loại", () => {
  const goc = [dong(vai("L7"), "SERVICE", { catalogCode: "A" })];
  const nhieu = [...goc, dong(muc("L7"), "ALL"), dong(vai("L8"), "ALL"), dong(vai("L8"), "ALL", { tuNgay: "2026-11-05" })];
  const chayVoi = (ds: typeof goc) => phuMucLoai({ loai: { code: "L7", dangBat: true }, dong: ds, muc: [], dichVu: S, homNay: D });
  assert.deepEqual(chayVoi(nhieu), chayVoi(goc));
  assert.equal(chayVoi(nhieu).ketQua.kieu, "THIEU");
  assert.equal(chayVoi(nhieu).sapApTu, null);
});
