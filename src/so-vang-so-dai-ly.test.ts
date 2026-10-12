// SỔ VÀNG SỔ CÔNG NỢ LƯỢT 2 — hoa hồng đại lý và giá vốn nhà cung cấp (Hiến chương 5.17; ADR-0077 ví dụ A-1…A-5, ADR-0078 ví dụ B-3; sổ đại lý đợt 1, Task 14). Tệp riêng vì src/so-vang.test.ts chỉ hiểu
// khuôn chuỗi sự kiện của sổ công nợ lượt 1; khuôn hai lớp theo src/so-vang-chi-phi-xe.test.ts và golden/README.md:
//   LỚP 1 (mọi ca, chạy ngay): ca TỰ CÂN — số nguyên đồng không âm; giá đại lý = thành tiền − hoa hồng; PER_PAX = mỗi khách × khách tính; RATE sai khác tròn số không quá nửa đồng; tổng = cộng các dòng; ca đã xác nhận
//     có người + ngày. Bắt CA VIẾT SAI, không kiểm mã (và không chọn hộ cách làm tròn — việc đó của lớp 2).
//   LỚP 2 (CHỈ ca "da_xac_nhan"): chạy CHÍNH `hoaHongDong` / `giaVonDong` (src/shared/hoa-hong-dong.ts — nơi `pricing` và `orders` cùng dùng) và so đáp án từng đồng. Hôm nay chưa ca nào được xác nhận ⇒ mỗi ca
//     là một `test.todo` có tên ca; ca chờ chỉ in chẩn đoán «khớp / lệch mã», KHÔNG khẳng định (AI không tự nghiệm thu đáp án — Hiến pháp N8).
// AI KHÔNG tự đổi ca sang "da_xac_nhan" — chỉ chủ dự án / Kế toán (golden/README.md "Thêm / sửa ca").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { giaVonDong, hoaHongDong, type KieuMuc } from "./shared/hoa-hong-dong.ts";

interface DauVao { thanh_tien: number | null; khach_tinh: number | null; kieu: KieuMuc | null; ty_le_bp: number | null; moi_khach: number | null; ty_le_mua_bp: number | null }
interface DapAn { trang_thai?: string; hoa_hong: number | null; gia_dai_ly: number | null; gia_von: number | null; ty_le_bp_ap_dung?: number }
interface Dong { nhan: string; dau_vao: DauVao; dap_an: DapAn; bo_sung?: { giam_gia: number; khach_tra: number; cong_ty_giu: number } }
interface Ca {
  ma: string; mo_ta: string; nguon: string;
  xac_nhan: { trang_thai: "cho_xac_nhan" | "da_xac_nhan"; nguoi: string | null; ngay: string | null };
  dong: Dong[];
  tong?: { thanh_tien: number; hoa_hong: number; gia_dai_ly: number };
}
const TEP = JSON.parse(readFileSync(new URL("../golden/so-cong-no-luot-2.json", import.meta.url), "utf8")) as { cac_ca: Ca[] };
const DA_XAC_NHAN = TEP.cac_ca.filter((c) => c.xac_nhan.trang_thai === "da_xac_nhan");
const CHO = TEP.cac_ca.filter((c) => c.xac_nhan.trang_thai !== "da_xac_nhan");
const MA_BAT_BUOC = ["A-1", "A-2", "A-3", "A-4", "A-5", "B-3"];

const laTienNguyen = (n: unknown): boolean => n === null || (typeof n === "number" && Number.isSafeInteger(n) && n >= 0);
const so = (...x: (number | null)[]): x is number[] => x.every((v) => v !== null);

test("sổ vàng sổ đại lý — LỚP 1: đủ ca A-1…A-5, B-3; mã không trùng; số nguyên đồng không âm; mỗi dòng tự cân; tổng = cộng dòng; xác nhận có người + ngày", () => {
  const ma = new Set<string>();
  for (const c of TEP.cac_ca) {
    assert.ok(!ma.has(c.ma), `${c.ma}: trùng mã`);
    ma.add(c.ma);
    assert.ok(["cho_xac_nhan", "da_xac_nhan"].includes(c.xac_nhan.trang_thai), `${c.ma}: trạng thái xác nhận lạ`);
    if (c.xac_nhan.trang_thai === "da_xac_nhan") assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay, `${c.ma}: đã xác nhận phải có người + ngày`);
    else assert.deepEqual([c.xac_nhan.nguoi, c.xac_nhan.ngay], [null, null], `${c.ma}: ca chờ xác nhận không được mang người / ngày`);
    assert.ok(c.nguon.length > 0 && c.mo_ta.length > 0, `${c.ma}: có mô tả và nguồn`);
    assert.ok(c.dong.length > 0, `${c.ma}: có ít nhất một dòng`);
    for (const d of c.dong) {
      const { dau_vao: v, dap_an: a } = d;
      for (const [ten, x] of Object.entries({ ...v, ...a, ...(d.bo_sung ?? {}) })) {
        if (ten === "kieu" || ten === "trang_thai") continue;
        assert.ok(laTienNguyen(x), `${c.ma} / ${d.nhan}: ${ten} phải là số nguyên không âm hoặc null (thấy ${String(x)})`);
      }
      if (v.ty_le_bp !== null) assert.ok(v.ty_le_bp <= 10_000, `${c.ma} / ${d.nhan}: tỷ lệ ≤ 100%`);
      if (v.ty_le_mua_bp !== null) assert.ok(v.ty_le_mua_bp <= 10_000, `${c.ma} / ${d.nhan}: tỷ lệ mua lại ≤ 100%`);
      if (a.ty_le_bp_ap_dung !== undefined) assert.ok(a.ty_le_bp_ap_dung <= 10_000, `${c.ma} / ${d.nhan}: tỷ lệ áp dụng ≤ 100%`);
      // giá đại lý = thành tiền − hoa hồng (chỉ khi ADR nêu đủ cả ba số)
      if (so(v.thanh_tien, a.hoa_hong, a.gia_dai_ly)) assert.equal(a.gia_dai_ly, v.thanh_tien - a.hoa_hong, `${c.ma} / ${d.nhan}: giá đại lý ≠ thành tiền − hoa hồng`);
      if (so(a.hoa_hong, v.thanh_tien)) assert.ok(a.hoa_hong <= v.thanh_tien, `${c.ma} / ${d.nhan}: hoa hồng vượt thành tiền`);
      // mức theo số khách: hoa hồng = mỗi khách × khách tính (phép nhân, không làm tròn)
      if (v.kieu === "PER_PAX" && so(v.moi_khach, v.khach_tinh, a.hoa_hong)) assert.equal(a.hoa_hong, v.moi_khach * v.khach_tinh, `${c.ma} / ${d.nhan}: PER_PAX ≠ mỗi khách × khách tính`);
      // mức theo tỷ lệ: đáp án chỉ lệch kết quả chính xác ≤ nửa đồng (tức 5.000 trên thang ×10.000) — bắt gõ sai số; chọn cách làm tròn là việc của lớp 2
      if (v.kieu === "RATE" && so(v.thanh_tien, v.ty_le_bp, a.hoa_hong)) assert.ok(Math.abs(a.hoa_hong * 10_000 - v.thanh_tien * v.ty_le_bp) <= 5_000, `${c.ma} / ${d.nhan}: hoa hồng lệch kết quả chính xác quá nửa đồng`);
      if (so(v.thanh_tien, v.ty_le_mua_bp, a.gia_von)) assert.ok(Math.abs(a.gia_von * 10_000 - v.thanh_tien * v.ty_le_mua_bp) <= 5_000, `${c.ma} / ${d.nhan}: giá vốn lệch kết quả chính xác quá nửa đồng`);
      if (d.bo_sung) {
        assert.ok(so(v.thanh_tien, a.gia_von), `${c.ma} / ${d.nhan}: bo_sung cần thành tiền và giá vốn`);
        if (so(v.thanh_tien, a.gia_von)) {
          assert.equal(d.bo_sung.khach_tra, v.thanh_tien - d.bo_sung.giam_gia, `${c.ma} / ${d.nhan}: khách trả ≠ thành tiền − giảm giá`);
          assert.equal(d.bo_sung.cong_ty_giu, d.bo_sung.khach_tra - a.gia_von, `${c.ma} / ${d.nhan}: công ty giữ ≠ khách trả − giá vốn (giá vốn tính trên thành tiền TRƯỚC giảm — H8 = A)`);
        }
      }
    }
    if (c.tong) {
      const cong = (k: "thanh_tien" | "hoa_hong" | "gia_dai_ly"): number => c.dong.reduce((s, d) => s + ((k === "thanh_tien" ? d.dau_vao.thanh_tien : d.dap_an[k]) ?? NaN), 0);
      assert.equal(c.tong.thanh_tien, cong("thanh_tien"), `${c.ma}: tổng thành tiền ≠ cộng các dòng`);
      assert.equal(c.tong.hoa_hong, cong("hoa_hong"), `${c.ma}: tổng hoa hồng ≠ cộng các dòng`);
      assert.equal(c.tong.gia_dai_ly, cong("gia_dai_ly"), `${c.ma}: tổng giá đại lý ≠ cộng các dòng`);
      assert.equal(c.tong.gia_dai_ly, c.tong.thanh_tien - c.tong.hoa_hong, `${c.ma}: tổng giá đại lý ≠ tổng thành tiền − tổng hoa hồng`);
    }
  }
  for (const m of MA_BAT_BUOC) assert.ok(ma.has(m), `thiếu ca ${m}`);
});

// ---- Lớp 2: chạy hàm tính tiền thật ----------------------------------------------------------------------------------------------------------------
/** So MỘT dòng với `hoaHongDong` / `giaVonDong`: chỉ phần có đủ đầu vào VÀ có đáp án trong sổ; trả chỗ lệch (rỗng = khớp) và số phép so đã chạy (0 = dòng không đủ số để chạy mã — không được coi là khớp). */
function soDong(d: Dong): { lech: string[]; phep: number } {
  const { dau_vao: v, dap_an: a } = d;
  const lech: string[] = [];
  let phep = 0;
  if (v.kieu !== null && a.hoa_hong !== null) {
    const dauVaoDu = v.kieu === "RATE" ? so(v.thanh_tien, v.ty_le_bp) : so(v.moi_khach, v.khach_tinh);
    if (dauVaoDu) {
      const tinh = hoaHongDong({ kind: v.kieu, rateBp: v.ty_le_bp, perPaxAmount: v.moi_khach, thanhTien: v.thanh_tien ?? 0, soKhachTinh: v.khach_tinh ?? 0 });
      phep++;
      if (tinh !== a.hoa_hong) lech.push(`hoa hồng: mã ra ${tinh}, đáp án ${a.hoa_hong}`);
    }
  }
  if (a.gia_von !== null && so(v.thanh_tien, v.ty_le_mua_bp)) {
    const tinh = giaVonDong({ costRateBp: v.ty_le_mua_bp!, thanhTien: v.thanh_tien! });
    phep++;
    if (tinh !== a.gia_von) lech.push(`giá vốn: mã ra ${tinh}, đáp án ${a.gia_von}`);
  }
  return { lech, phep };
}
const soCa = (c: Ca): { lech: string[]; phep: number } => {
  const kq = c.dong.map((d) => ({ nhan: d.nhan, ...soDong(d) }));
  return { lech: kq.flatMap((k) => k.lech.map((l) => `${k.nhan}: ${l}`)), phep: kq.reduce((s, k) => s + k.phep, 0) };
};

test("sổ vàng sổ đại lý — LỚP 2 có răng: bộ so dòng bắt được đáp án sai (ca tổng hợp, không phải ca của sổ)", () => {
  const dung: Dong = { nhan: "x", dau_vao: { thanh_tien: 999_999, khach_tinh: null, kieu: "RATE", ty_le_bp: 1250, moi_khach: null, ty_le_mua_bp: null }, dap_an: { hoa_hong: 125_000, gia_dai_ly: null, gia_von: null } };
  assert.deepEqual(soDong(dung), { lech: [], phep: 1 }, "đáp án đúng ⇒ khớp, đã chạy một phép");
  assert.equal(soDong({ ...dung, dap_an: { ...dung.dap_an, hoa_hong: 124_999 } }).lech.length, 1, "đáp án làm tròn xuống ⇒ lệch");
  assert.equal(soDong({ ...dung, dau_vao: { ...dung.dau_vao, ty_le_bp: null } }).phep, 0, "thiếu đầu vào ⇒ không chạy phép nào (không khớp giả)");
  const vonDung: Dong = { nhan: "y", dau_vao: { thanh_tien: 300_000, khach_tinh: null, kieu: null, ty_le_bp: null, moi_khach: null, ty_le_mua_bp: 8000 }, dap_an: { hoa_hong: null, gia_dai_ly: null, gia_von: 240_000 } };
  assert.deepEqual(soDong(vonDung), { lech: [], phep: 1 });
  assert.equal(soDong({ ...vonDung, dap_an: { ...vonDung.dap_an, gia_von: 239_999 } }).lech.length, 1, "giá vốn sai một đồng ⇒ lệch");
  const khach: Dong = { nhan: "z", dau_vao: { thanh_tien: null, khach_tinh: 4, kieu: "PER_PAX", ty_le_bp: null, moi_khach: 50_000, ty_le_mua_bp: null }, dap_an: { hoa_hong: 200_000, gia_dai_ly: null, gia_von: null } };
  assert.deepEqual(soDong(khach), { lech: [], phep: 1 });
  assert.equal(soDong({ ...khach, dap_an: { ...khach.dap_an, hoa_hong: 150_000 } }).lech.length, 1, "đếm sai số khách ⇒ lệch");
});

test("sổ vàng sổ đại lý — LỚP 2: ca ĐÃ XÁC NHẬN khớp từng đồng với hoaHongDong / giaVonDong", { todo: DA_XAC_NHAN.length === 0 ? "chưa ca nào được chủ / Kế toán xác nhận — lớp 2 chưa áp dụng" : false }, () => {
  assert.ok(DA_XAC_NHAN.length > 0, "không xanh vì rỗng");
  for (const c of DA_XAC_NHAN) {
    const kq = soCa(c);
    assert.deepEqual(kq.lech, [], c.ma);
    const coSoTien = c.dong.some((d) => d.dap_an.hoa_hong !== null || d.dap_an.gia_von !== null);
    assert.ok(kq.phep > 0 || !coSoTien, `${c.ma}: đã xác nhận mà không chạy được phép nào — thiếu đầu vào`);
  }
});
// Mỗi ca CHỜ xác nhận là một `todo` có tên — người xác nhận thấy ngay ca nào còn treo; khi ca đổi sang "da_xac_nhan" thì bài bên dưới tự chạy thật cho ca đó.
for (const c of CHO) test.todo(`sổ vàng sổ đại lý — LỚP 2 ${c.ma}: chờ chủ dự án / Kế toán xác nhận`);

// Chạy thử trên ca CHỜ xác nhận — chỉ báo chẩn đoán (t.diagnostic), KHÔNG khẳng định: AI không nghiệm thu đáp án (N8).
test("sổ vàng sổ đại lý — chạy thử ca chờ xác nhận (chẩn đoán, không nghiệm thu)", (t) => {
  for (const c of CHO) {
    const { lech, phep } = soCa(c);
    t.diagnostic(`${c.ma}: chưa áp dụng (chờ xác nhận) — ${phep === 0 ? "không đủ số để chạy mã (ADR không nêu thành tiền / mức)" : `mã hiện tại ${lech.length === 0 ? "KHỚP" : `LỆCH: ${lech.join("; ")}`} đáp án đề xuất (${phep} phép)`}`);
  }
});
