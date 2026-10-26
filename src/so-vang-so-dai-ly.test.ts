// SỔ VÀNG SỔ CÔNG NỢ LƯỢT 2 — hoa hồng đại lý và giá vốn nhà cung cấp (Hiến chương 5.17; ADR-0077 ví dụ A-1…A-5, ADR-0078 ví dụ B-3; sổ đại lý đợt 1, Task 14). Tệp riêng vì src/so-vang.test.ts chỉ hiểu
// khuôn chuỗi sự kiện của sổ công nợ lượt 1; khuôn hai lớp theo src/so-vang-chi-phi-xe.test.ts và golden/README.md:
//   LỚP 1 (mọi ca, chạy ngay): ca TỰ CÂN — số nguyên đồng không âm; giá đại lý = thành tiền − hoa hồng; PER_PAX = mỗi khách × khách tính; RATE sai khác tròn số không quá nửa đồng; tổng = cộng các dòng; ca đã xác nhận
//     có người + ngày. Bắt CA VIẾT SAI, không kiểm mã (và không chọn hộ cách làm tròn — việc đó của lớp 2).
//   LỚP 2 (CHỈ ca "da_xac_nhan"): chạy CHÍNH `hoaHongDong` / `giaVonDong` (src/shared/hoa-hong-dong.ts — nơi `pricing` và `orders` cùng dùng) và so đáp án từng đồng. Ca chưa xác nhận ⇒ mỗi ca
//     là một `test.todo` có tên ca; ca chờ chỉ in chẩn đoán «khớp / lệch mã», KHÔNG khẳng định (AI không tự nghiệm thu đáp án — Hiến pháp N8).
// AI KHÔNG tự đổi ca sang "da_xac_nhan" — chỉ chủ dự án / Kế toán (golden/README.md "Thêm / sửa ca").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { giaVonDong, hoaHongDong, type KieuMuc } from "./shared/hoa-hong-dong.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { lyDoChuaHoanThanh, sinhDongLanThu, sinhPhieuDaGiao, soDuTheoBen, type CollectorRole, type LineDraft } from "./modules/billing/rules.ts";
import { tranGiamGiaDon, viPhamTranGiamGia } from "./modules/orders/price-guards.ts";
import type { PermissionCode } from "./shared/permissions.ts";

interface DauVao { thanh_tien: number | null; khach_tinh: number | null; kieu: KieuMuc | null; ty_le_bp: number | null; moi_khach: number | null; ty_le_mua_bp: number | null }
interface DapAn { trang_thai?: string; hoa_hong: number | null; gia_dai_ly: number | null; gia_von: number | null; ty_le_bp_ap_dung?: number }
interface Dong { nhan: string; dau_vao: DauVao; dap_an: DapAn; bo_sung?: { giam_gia: number; khach_tra: number; cong_ty_giu: number } }
interface SoCai {
  khach_tra?: number; giam_gia_ben_dat?: number;
  giu_ho?: { loai: "HELD"; ben: string; nguoi_thu: "BOOKER" | "HDV" | "SUPPLIER"; so_tien: number }[];
  dong_da_giao?: { loai: "HOA_HONG" | "GIAM_GIA_BEN_DAT" | "GIA_VON"; tu: string; den: string; so_tien: number }[];
  so_du?: { ben: string; chieu: "no_cong_ty" | "cong_ty_no"; so_tien: number }[];
  // Số kết luận của ca (không phải dòng sổ): Tour Đảo thu về / giữ, có chặn «Hoàn thành», trần giảm giá và từng lần nhập giảm giá.
  cong_ty_thu_ve?: number; cong_ty_giu?: number; chan_hoan_thanh?: boolean; tran_giam_gia?: number;
  thu_nhap_giam_gia?: { giam_gia: number; ket_qua: "tu_choi" | "duoc"; thong_bao: string | null }[];
}
interface Ca {
  ma: string; mo_ta: string; nguon: string; so_cai?: SoCai;
  xac_nhan: { trang_thai: "cho_xac_nhan" | "da_xac_nhan"; nguoi: string | null; ngay: string | null };
  dong: Dong[];
  tong?: { thanh_tien: number; hoa_hong: number; gia_dai_ly: number };
}
const TEP = JSON.parse(readFileSync(new URL("../golden/so-cong-no-luot-2.json", import.meta.url), "utf8")) as { cac_ca: Ca[] };
const DA_XAC_NHAN = TEP.cac_ca.filter((c) => c.xac_nhan.trang_thai === "da_xac_nhan");
const CHO = TEP.cac_ca.filter((c) => c.xac_nhan.trang_thai !== "da_xac_nhan");
// SV-TA-*: ca vàng mức TA (ADR-0117 lần 2, N-18) — bảy dòng, 04 tách a / b; thêm 2026-10-15 ở trạng thái chờ xác nhận, không được lặng lẽ rơi khỏi sổ.
// C-1…C-5: ca sổ cái của ADR-0079 (sổ đại lý đợt 2, Task 0) — thêm 2026-10-19 (Task 11) để một ca C bị xoá khỏi JSON làm bài đỏ.
const MA_BAT_BUOC = ["A-1", "A-2", "A-3", "A-4", "A-5", "B-3", "SV-TA-01", "SV-TA-02", "SV-TA-03", "SV-TA-04a", "SV-TA-04b", "SV-TA-05", "SV-TA-06", "SV-TA-07", "SV-TA-08", "C-1", "C-2", "C-3", "C-4", "C-5"];

const laTienNguyen = (n: unknown): boolean => n === null || (typeof n === "number" && Number.isSafeInteger(n) && n >= 0);
const so = (...x: (number | null)[]): x is number[] => x.every((v) => v !== null);

test("sổ vàng sổ đại lý — LỚP 1: đủ ca A-1…A-5, B-3, SV-TA-01…06; mã không trùng; số nguyên đồng không âm; mỗi dòng tự cân; tổng = cộng dòng; xác nhận có người + ngày", () => {
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

// ---- Sổ cái C-1…C-5 và B-5 trên MÃ SỔ THẬT (sổ đại lý đợt 2, Task 11) ------------------------------------------------------------------------------
// Ca C-1…C-5 (khối `so_cai`) và ADR-0078 ví dụ B-5 chạy qua CHÍNH luật sinh dòng của `src/modules/billing/rules.ts`: giữ hộ (`sinhDongLanThu`, người thu tự ghi; quầy
// nhà cung cấp do Kế toán ghi), phiếu «Đã giao» (`sinhPhieuDaGiao`, hoa hồng / giá vốn do `hoaHongDong` / `giaVonDong` tính từ đầu vào của dòng — không lấy đáp án),
// rồi số dư `soDuTheoBen`. Ruling R-106 (sửa theo người kiểm Task 10+11): số của các ca này lấy từ ADR-0078 / ADR-0079 ĐÃ DUYỆT (và `phieu-ke-toan.md` chép lại); bài
// chạy và đỏ khi mã lệch số ADR. Chủ dự án xác nhận C-1…C-5 ngày 2026-10-25 (cùng SV-HT-02, SV-HT-03 bên src/so-vang.test.ts; C-3 trùng SV-HT-02) ⇒ từ đó là
// ca vàng đạt (ADR-0079 mục «Sổ vàng / bài kiểm»). Mã sổ cho số sai ⇒ DỪNG ca đó, báo chủ (không đổi luật tiền, không sửa đáp án đã xác nhận).
const CONG_TY = "cong_ty";
interface DongSo { dv: string; hoaHong: number | null; giaVon: number | null; ncc: string | null; thanhTien: number }
interface DauVaoSo { thu: { role: CollectorRole; ben: string; so: number }[]; nguoiHuong: string | null; giamGiaBenDat: number; dong: DongSo[] }

/** Chạy một đơn qua mã sổ thật ⇒ dòng phiếu «Đã giao» + số dư từng bên (dương = bên đó nợ công ty; âm = công ty nợ bên đó). */
function chaySo(v: DauVaoSo): { phieu: LineDraft[]; soDu: Map<string, number> } {
  const dong: LineDraft[] = [];
  for (const t of v.thu) {
    // Người thu tự ghi chính mình; quầy nhà cung cấp do Kế toán ghi (đường «Bên kia đã nhận» cho cùng một dòng giữ hộ — ADR-0132 điều 1, 3).
    const keToan = t.role === "SUPPLIER" || t.role === "COMPANY";
    dong.push(...sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: t.so, collectorRole: t.role, collectorPartyId: t.role === "COMPANY" ? CONG_TY : t.ben, method: "CASH", nguoiGhiPartyId: keToan ? "ke_toan" : t.ben, nguoiGhiLaKeToan: keToan, congTyId: CONG_TY }));
  }
  const phieu = sinhPhieuDaGiao({
    congTyId: CONG_TY, nguoiHuongPartyId: v.nguoiHuong, giamGiaBenDat: v.giamGiaBenDat,
    dong: v.dong.map((d) => ({ orderServiceId: d.dv, tenDichVu: d.dv, thanhTien: d.thanhTien, hoaHong: d.hoaHong, giaVon: d.giaVon, nhaCungCapPartyId: d.ncc })),
  });
  return { phieu, soDu: soDuTheoBen([...dong, ...phieu], CONG_TY) };
}
const ROLE_GIU_HO: Record<string, CollectorRole> = { BOOKER: "BOOKER", HDV: "STAFF", SUPPLIER: "SUPPLIER" };
// So theo TỔNG mỗi (loại, từ, đến): mã ghi MỘT dòng HOA_HONG / GIA_VON mỗi dịch vụ (R-BIL-2), còn sổ có ca gộp ba dịch vụ thành một dòng (C-5: 790.000 = 240.000 + 450.000 +
// 100.000) và có ca tách từng dịch vụ (C-4) — cách viết của sổ, không phải số tiền. Số dòng mỗi dịch vụ do R-BIL-2 của kiểm định kỳ canh.
const chuoiDong = (ds: readonly { loai: string; tu: string; den: string; so_tien: number }[]) => {
  const m = new Map<string, number>();
  for (const d of ds) m.set(`${d.loai} ${d.tu}→${d.den}`, (m.get(`${d.loai} ${d.tu}→${d.den}`) ?? 0) + d.so_tien);
  return [...m].map(([k, v]) => `${k} ${v}`).sort();
};

/** Dựng đầu vào mã sổ từ một ca C: hoa hồng / giá vốn TÍNH bằng hàm thật từ `dau_vao` (đáp án chỉ để so); người hưởng = bên nhận dòng HOA_HONG; nhà cung cấp = người thu SUPPLIER. */
function dauVaoTuCa(c: Ca): DauVaoSo {
  const sc = c.so_cai!;
  const nguoiHuong = sc.dong_da_giao?.find((d) => d.loai === "HOA_HONG")?.den ?? null;
  const ncc = sc.dong_da_giao?.find((d) => d.loai === "GIA_VON")?.den ?? null;
  return {
    thu: (sc.giu_ho ?? []).map((g) => ({ role: ROLE_GIU_HO[g.nguoi_thu]!, ben: g.ben, so: g.so_tien })),
    nguoiHuong,
    giamGiaBenDat: sc.giam_gia_ben_dat ?? 0,
    dong: c.dong.map((d, i) => {
      const v = d.dau_vao;
      const hoaHong = v.kieu === null ? 0 : hoaHongDong({ kind: v.kieu, rateBp: v.ty_le_bp, perPaxAmount: v.moi_khach, thanhTien: v.thanh_tien ?? 0, soKhachTinh: v.khach_tinh ?? 0 });
      const giaVon = v.ty_le_mua_bp === null ? null : giaVonDong({ costRateBp: v.ty_le_mua_bp, thanhTien: v.thanh_tien! });
      return { dv: `dv${i + 1}`, thanhTien: v.thanh_tien!, hoaHong, giaVon, ncc: giaVon === null ? null : ncc };
    }),
  };
}

const CA_SO_CAI = TEP.cac_ca.filter((c) => c.so_cai?.dong_da_giao);
test("sổ vàng sổ đại lý — LỚP 1 sổ cái C-1…C-5: khối so_cai tự cân (khách trả = Σ thành tiền − giảm giá bên đặt; dòng «Đã giao» = Σ hoa hồng / giá vốn của dòng + giảm giá; số dư = giữ hộ + dòng)", () => {
  assert.deepEqual(CA_SO_CAI.map((c) => c.ma), ["C-1", "C-2", "C-3", "C-4", "C-5"], "đủ năm ca có sổ cái");
  for (const c of CA_SO_CAI) {
    const sc = c.so_cai!;
    const tong = c.dong.reduce((s, d) => s + d.dau_vao.thanh_tien!, 0);
    assert.equal(sc.khach_tra, tong - (sc.giam_gia_ben_dat ?? 0), `${c.ma}: khách trả = Σ thành tiền − giảm giá bên đặt`);
    const cong = (loai: string) => sc.dong_da_giao!.filter((d) => d.loai === loai).reduce((s, d) => s + d.so_tien, 0);
    assert.equal(cong("HOA_HONG"), c.dong.reduce((s, d) => s + (d.dap_an.hoa_hong ?? 0), 0), `${c.ma}: Σ HOA_HONG = Σ hoa hồng của dòng`);
    assert.equal(cong("GIA_VON"), c.dong.reduce((s, d) => s + (d.dap_an.gia_von ?? 0), 0), `${c.ma}: Σ GIA_VON = Σ giá vốn của dòng`);
    assert.equal(cong("GIAM_GIA_BEN_DAT"), sc.giam_gia_ben_dat ?? 0, `${c.ma}: GIAM_GIA_BEN_DAT = giảm giá bên đặt`);
    const du = new Map<string, number>();
    const them = (b: string, x: number) => b !== CONG_TY && du.set(b, (du.get(b) ?? 0) + x);
    for (const g of sc.giu_ho ?? []) them(g.ben, g.so_tien);
    for (const d of sc.dong_da_giao!) { them(d.tu, d.so_tien); them(d.den, -d.so_tien); }
    for (const s of sc.so_du ?? []) assert.equal(du.get(s.ben) ?? 0, s.chieu === "no_cong_ty" ? s.so_tien : -s.so_tien, `${c.ma}/${s.ben}: số dư = giữ hộ + dòng`);
  }
});

for (const c of CA_SO_CAI) {
  const trangThai = c.xac_nhan.trang_thai === "da_xac_nhan" ? `ca vàng đã xác nhận ${c.xac_nhan.ngay}` : "ca CHỜ xác nhận — chưa tính là ca vàng đạt";
  test(`sổ vàng sổ đại lý — sổ cái ${c.ma} tính bằng mã sổ thật, so với số của ADR-0079 / phieu-ke-toan.md (${trangThai})`, () => {
    const sc = c.so_cai!;
    const kq = chaySo(dauVaoTuCa(c));
    const ten = (id: string) => (id === CONG_TY ? "cong_ty" : id);
    assert.deepEqual(chuoiDong(kq.phieu.map((l) => ({ loai: l.kind, tu: ten(l.debtorPartyId), den: ten(l.creditorPartyId), so_tien: l.amount }))), chuoiDong(sc.dong_da_giao!), `${c.ma}: dòng phiếu «Đã giao»`);
    for (const s of sc.so_du ?? []) assert.equal(kq.soDu.get(s.ben) ?? 0, s.chieu === "no_cong_ty" ? s.so_tien : -s.so_tien, `${c.ma}/${s.ben}: số dư (mã thật)`);
  });
}

// Số KẾT LUẬN của ca C (không phải dòng sổ) — chủ dự án xác nhận 2026-10-25. Trước đó chỉ nằm trong JSON, không bài nào đọc (người kiểm độc lập 25/10 chỉ ra);
// nay chạy qua mã thật để sửa JSON hay sửa mã đều đỏ. Mỗi bài liệt kê đúng các ca mang trường đó: ca mới thêm trường mà không được kiểm ⇒ đỏ.
test("sổ vàng sổ đại lý — C-1, C-3, C-4: «Tour Đảo thu về / giữ» = tổng số dư các bên tính bằng mã sổ thật", () => {
  const ca = CA_SO_CAI.filter((c) => c.so_cai!.cong_ty_thu_ve !== undefined || c.so_cai!.cong_ty_giu !== undefined);
  assert.deepEqual(ca.map((c) => c.ma), ["C-1", "C-3", "C-4"]);
  for (const c of ca) {
    const kq = chaySo(dauVaoTuCa(c));
    assert.equal([...kq.soDu.values()].reduce((s, x) => s + x, 0), c.so_cai!.cong_ty_thu_ve ?? c.so_cai!.cong_ty_giu, `${c.ma}: phần Tour Đảo giữ (mã thật)`);
  }
});

test("sổ vàng sổ đại lý — C-2: khoản công ty còn phải trả CTV không chặn «Hoàn thành» (lyDoChuaHoanThanh thật)", () => {
  const ca = CA_SO_CAI.filter((c) => c.so_cai!.chan_hoan_thanh !== undefined);
  assert.deepEqual(ca.map((c) => c.ma), ["C-2"]);
  for (const c of ca) {
    const kq = chaySo(dauVaoTuCa(c));
    const khachTra = c.so_cai!.khach_tra!;
    const lyDo = lyDoChuaHoanThanh({ deliveredAt: "2026-10-01T00:00:00.000Z", completedAt: null, soDu: kq.soDu, tenBen: (b) => b, daThu: khachTra, phaiThuLucGiao: khachTra });
    assert.equal(lyDo !== null, c.so_cai!.chan_hoan_thanh, `${c.ma}: ${lyDo?.cau ?? "không chặn"}`);
  }
});

// «Ai nhập cũng vậy, kể cả nhân viên Bán hàng» (C-5): Bán hàng, Quản trị và chính đại lý hưởng. Câu trong JSON thiếu dấu chấm cuối so với mã — cách chép, không phải số.
const taiKhoan = (permissions: PermissionCode[], partyId: string | null = null) => ({ id: "u", permissions, partyId });
test("sổ vàng sổ đại lý — C-5: trần giảm giá = tổng hoa hồng tính bằng hoaHongDong; từng lần nhập giảm giá ra đúng kết quả và câu báo (viPhamTranGiamGia thật)", () => {
  const ca = TEP.cac_ca.filter((c) => c.so_cai?.tran_giam_gia !== undefined);
  assert.deepEqual(ca.map((c) => c.ma), ["C-5"]);
  for (const c of ca) {
    const sc = c.so_cai!;
    const nguoiHuong = dauVaoTuCa(c).nguoiHuong!;
    const tongHoaHong = dauVaoTuCa(c).dong.reduce((s, d) => s + (d.hoaHong ?? 0), 0);
    assert.equal(tranGiamGiaDon({ coNguoiHuong: true, tongHoaHong, laDoiTac: false, laThucTap: false, nguoiHuongLaMinh: false }), sc.tran_giam_gia, `${c.ma}: trần giảm giá`);
    const don = { coNguoiHuong: true, tongHoaHong, beneficiaryPartyId: nguoiHuong, benDatKhongHuong: false };
    assert.ok((sc.thu_nhap_giam_gia ?? []).length > 0, `${c.ma}: có lần nhập giảm giá`);
    for (const tk of [taiKhoan(["SALES"]), taiKhoan(["ADMIN"]), taiKhoan(["PARTNER"], nguoiHuong)]) {
      for (const n of sc.thu_nhap_giam_gia!) {
        const vp = viPhamTranGiamGia(tk, n.giam_gia, don);
        const ten = `${c.ma} / ${tk.permissions.join("+")} / giảm ${n.giam_gia}`;
        assert.equal(vp === null ? "duoc" : "tu_choi", n.ket_qua, ten);
        assert.equal(vp?.cau.replace(/\.$/, "") ?? null, n.thong_bao, `${ten}: câu báo`);
      }
    }
  }
});

// ADR-0078 ví dụ B-5 (chủ hỏi 2026-10-01, «Phải thành test khi thi công»): 2 vé i-resort 600.000, i-resort bán, a = 80% ⇒ giá vốn 480.000 (trước giảm, H8 = A); lễ tân Hương
// hưởng 100.000 (trước giảm); Hương tự giảm 20.000 ⇒ khách trả 580.000.
const B5 = (thu: DauVaoSo["thu"]): DauVaoSo => ({
  thu, nguoiHuong: "huong", giamGiaBenDat: 20_000,
  dong: [{ dv: "ve_i_resort", thanhTien: 600_000, hoaHong: hoaHongDong({ kind: "PER_PAX", rateBp: null, perPaxAmount: 50_000, thanhTien: 600_000, soKhachTinh: 2 }), giaVon: giaVonDong({ costRateBp: 8000, thanhTien: 600_000 }), ncc: "i_resort" }],
});
test("sổ vàng — ADR-0078 B-5 (a): khách trả đủ 580.000 TẠI QUẦY i-resort ⇒ i-resort nợ Tour Đảo 100.000; Tour Đảo nợ Hương 80.000; Tour Đảo giữ 20.000", () => {
  const kq = chaySo(B5([{ role: "SUPPLIER", ben: "i_resort", so: 580_000 }]));
  assert.deepEqual([kq.soDu.get("i_resort"), kq.soDu.get("huong")], [100_000, -80_000]);
  assert.equal([...kq.soDu.values()].reduce((s, x) => s + x, 0), 20_000, "Tour Đảo giữ = tổng số dư các bên");
});
test("sổ vàng — ADR-0078 B-5 (b): Hương thu trước 200.000, quầy thu 380.000 ⇒ Hương nợ Tour Đảo 120.000; Tour Đảo nợ i-resort 100.000; Tour Đảo giữ 20.000", () => {
  const kq = chaySo(B5([{ role: "BOOKER", ben: "huong", so: 200_000 }, { role: "SUPPLIER", ben: "i_resort", so: 380_000 }]));
  assert.deepEqual([kq.soDu.get("huong"), kq.soDu.get("i_resort")], [120_000, -100_000]);
  assert.equal([...kq.soDu.values()].reduce((s, x) => s + x, 0), 20_000, "Tour Đảo giữ = tổng số dư các bên");
});

// ---- SV-SK-04 bản đại lý trên CẢ ứng dụng (khung thử tests/audit/harness.mjs; kế hoạch Task 11 Step 2) ------------------------------------------------------------
// Số theo golden/sua-so-khach-van-phong.json SV-SK-04: 4 người lớn × 500.000 = 2.000.000, khuyến mại giảm 1.000.000; khách bớt còn 1 người lớn ⇒ tạm tính 500.000, phải thu 0
// (ADR-0109: giảm giá chỉ dùng tới tiền dịch vụ còn lại). Bản đại lý: bên đặt là đại lý mức 50% ⇒ hoa hồng lúc Xác nhận 1.000.000 = giảm giá (qua trần, ADR-0079 điều 8).
// Lúc «Đã giao»: GIAM_GIA_BEN_DAT = trước giảm 500.000 − phải thu 0 = 500.000 (KHÔNG phải 1.000.000 ghi trên đơn); hoa hồng 50% × 500.000 = 250.000 (bản chụp đóng
// băng mức, tiền dòng sau sửa). Đại lý nợ Tour Đảo 500.000 − 250.000 = 250.000. Tiền khách đã trả / hoàn (SV-SK-08) không đổi hai dòng này nên bài bỏ qua phần thu.
// Rồi kiểm định kỳ R-BIL-2, R-BIL-16, R-ORD-DC1 trên chính dữ liệu đó phải 0 (Review Focus 4: bớt khách làm hoa hồng < giảm giá không phải vi phạm).
interface KiemDK { code: string; sql: string }
const AC = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: KiemDK[]; demViPham: (c: KiemDK, rows: unknown[]) => number };

test("sổ vàng — SV-SK-04 bản đại lý (mã thật): bớt khách sau Xác nhận ⇒ GIAM_GIA_BEN_DAT 500.000 (trước giảm − phải thu), hoa hồng 250.000; kiểm định kỳ R-BIL-2 / R-BIL-16 / R-ORD-DC1 = 0", async () => {
  const w = world();
  const SUPER = "33333333-3333-4333-8333-333333333333";
  const HDV = "22222222-2222-4222-8222-222222222222";
  const KT = "44444444-4444-4444-8444-444444444444";
  const DL = "66666666-6666-4666-8666-666666666666";
  const SALES = "11111111-1111-4111-8111-111111111111";
  const AT = "2026-10-01T00:00:00.000Z";
  for (const [id, phone, name, perms] of [[SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [DL, "0900000008", "Đại Lý A", ["PARTNER"]]] as const) {
    seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  }
  const dl = `pty-${DL}`;
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-sk04', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(dl, AT, AT);
  const muc = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 5000 } });
  assert.equal(muc.status, 201, muc.text);
  const id = "97979797-9797-4979-8979-5c5c5c5c5c04";
  const sv = `${id}-s0`;
  const homNay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, 'TD-SK04', ?, 'draft', 'Khách Giả', '0900000099', 2000000, 1000000, 1000000, 1000000, ?, ?, ?)`).run(id, SALES, dl, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'HONTAM', 'Tour đảo', 'perPax', 4, ?)").run(sv, id, homNay);
  w.sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 4, 500000, 500000, 2000000)").run(`${sv}-i`, id, sv);
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } }); // ADR-0135: nháp chỉ người lập xác nhận
  assert.equal(xn.status, 200, `hoa hồng 1.000.000 = giảm giá ⇒ qua trần lúc Xác nhận: ${xn.text}`);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('97979797-9797-4979-8979-5c5c5c5c5c05', ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(id, `pty-${HDV}`, AT, AT, AT);
  const sua = await w.call("POST", `/api/orders/${id}/handler-money-edit`, { as: HDV, body: { reason: "Khách bớt người", services: [{ id: sv, pax: { adult: 1, child: 0, senior: 0, infant: 0 } }] } });
  assert.equal(sua.status, 200, sua.text);
  const tien = await w.call("GET", `/api/orders/${id}/payments`, { as: KT });
  assert.equal(Number(tien.json.phaiThu), 0, "phải thu 0 (ADR-0109)");
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SUPER, body: {} });
  assert.equal(g.status, 200, g.text);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const p = w.q("SELECT gross_snapshot g, due_snapshot d FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id)[0];
  assert.deepEqual([Number(p.g), Number(p.d)], [500_000, 0], "phiếu «Đã giao»: trước giảm 500.000, phải thu 0");
  const dong = w.q("SELECT kind_code k, debtor_party_id no, creditor_party_id co, amount so FROM bil_debt_line WHERE order_id = ? AND kind_code IN ('HOA_HONG', 'GIAM_GIA_BEN_DAT', 'GIA_VON') ORDER BY kind_code", id)
    .map((r: Record<string, unknown>) => `${String(r.k)} ${r.no === ct ? "cong_ty" : r.no === dl ? "dai_ly" : String(r.no)}→${r.co === ct ? "cong_ty" : r.co === dl ? "dai_ly" : String(r.co)} ${Number(r.so)}`);
  assert.deepEqual(dong, ["GIAM_GIA_BEN_DAT dai_ly→cong_ty 500000", "HOA_HONG cong_ty→dai_ly 250000"]);
  const du = w.q("SELECT COALESCE(SUM(CASE WHEN debtor_party_id = ? THEN amount WHEN creditor_party_id = ? THEN -amount END), 0) s FROM bil_debt_line WHERE order_id = ?", dl, dl, id)[0];
  assert.equal(Number(du.s), 250_000, "đại lý nợ Tour Đảo 500.000 − 250.000");
  for (const code of ["R-BIL-2", "R-BIL-16", "R-ORD-DC1"]) {
    const c = AC.CHECKS.find((x) => x.code === code)!;
    assert.equal(AC.demViPham(c, w.sqlite.prepare(c.sql.replace(/\s+/g, " ").trim()).all()), 0, `${code} trên dữ liệu SV-SK-04 bản đại lý`);
  }
});
