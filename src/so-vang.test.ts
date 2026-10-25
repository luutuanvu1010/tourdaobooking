// Sổ vàng (Hiến chương kiến trúc lõi điều 5.17, chủ dự án duyệt 2026-09-26): kiểm NHẤT QUÁN NỘI TẠI của từng ca tiền mẫu trong `golden/*.json` —
// mỗi ca phải tự cân đến từng đồng trước khi dùng để chấm mã thật. Test này bắt CA MẪU VIẾT SAI, không kiểm mã tính tiền (sổ công nợ chưa có —
// khi thi công ADR-0026, thêm lớp chạy chính các ca này qua hàm sinh dòng sổ thật, chỉ tính ca "da_xac_nhan"). Ca chỉ được đổi sang "da_xac_nhan"
// khi chủ dự án hoặc Kế toán đã xem con số (Hiến pháp N8: AI không tự xác nhận) — test đòi ghi người + ngày.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isISODate } from "./shared/vn-date.ts";
import {
  canDoiChieu, conLai, khoanMoiDoiChieu, lyDoChuaGiaoDuoc, sinhDongDao, sinhDongHoanKhach, sinhDongLanThu, sinhDongQuyetToan, sinhDongXacNhanCongTy, sinhPhieuDaGiao, soDuTheoBen, type CollectorRole,
  type DoiChieuRow, type LineRow, type ReceiptRow,
} from "./modules/billing/rules.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FILES = ["golden/hoan-tat-cong-no.json"];
const VAI = new Set(["hdv_noi_bo", "nguoi_huong", "nha_cung_cap"]);
const TRANG_THAI = new Set(["cho_xac_nhan", "da_xac_nhan"]);

type Ben = { ben: string; vai: string; da_thu: number; duoc_huong: number };
type Ca = {
  ma: string;
  xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null };
  /** `gia_ban` = Σ giá lẻ TRƯỚC giảm. Giảm giá cấp đơn (tuỳ chọn, mặc định 0 — sổ đại lý đợt 2, ADR-0079 điều 2, 9): `giam_gia_ben_dat` do người hưởng chịu (dòng
   * GIAM_GIA_BEN_DAT), `giam_gia_tour_dao` do Tour Đảo chịu (đơn khách lẻ). */
  dau_vao: { gia_ban: number; gia_von: number; hoa_hong: number; cong_ty_thu: number; cac_ben: Ben[]; giam_gia_ben_dat?: number; giam_gia_tour_dao?: number };
  dap_an: { no_tour_dao: Record<string, number>; tour_dao_giu: number };
};

const dong = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function loadCases(file: string): Ca[] {
  const raw = JSON.parse(readFileSync(join(ROOT, file), "utf8")) as { cac_ca?: unknown };
  assert.ok(Array.isArray(raw.cac_ca) && raw.cac_ca.length > 0, `${file} phải có mảng "cac_ca" không rỗng`);
  return raw.cac_ca as Ca[];
}

for (const file of FILES) {
  test(`sổ vàng ${file}: mỗi ca đủ trường, tiền là số nguyên đồng không âm, mã không trùng, xác nhận có người + ngày`, () => {
    const seen = new Set<string>();
    for (const c of loadCases(file)) {
      assert.ok(typeof c.ma === "string" && c.ma !== "" && !seen.has(c.ma), `mã ca trống hoặc trùng: ${String(c.ma)}`);
      seen.add(c.ma);
      assert.ok(TRANG_THAI.has(c.xac_nhan?.trang_thai), `${c.ma}: xac_nhan.trang_thai phải là cho_xac_nhan | da_xac_nhan`);
      if (c.xac_nhan.trang_thai === "da_xac_nhan") {
        assert.ok(typeof c.xac_nhan.nguoi === "string" && c.xac_nhan.nguoi.trim() !== "", `${c.ma}: ca đã xác nhận phải ghi người xác nhận (chủ dự án / Kế toán)`);
        assert.ok(typeof c.xac_nhan.ngay === "string" && isISODate(c.xac_nhan.ngay), `${c.ma}: ca đã xác nhận phải ghi ngày YYYY-MM-DD`);
      }
      const v = c.dau_vao;
      for (const k of ["gia_ban", "gia_von", "hoa_hong", "cong_ty_thu"] as const) assert.ok(dong(v[k]), `${c.ma}: dau_vao.${k} phải là số nguyên đồng ≥ 0`);
      assert.ok(Array.isArray(v.cac_ben) && v.cac_ben.length > 0, `${c.ma}: cần ít nhất một bên`);
      for (const b of v.cac_ben) {
        assert.ok(VAI.has(b.vai), `${c.ma}/${b.ben}: vai "${b.vai}" không hợp lệ`);
        assert.ok(dong(b.da_thu) && dong(b.duoc_huong), `${c.ma}/${b.ben}: da_thu, duoc_huong phải là số nguyên đồng ≥ 0`);
        if (b.vai === "hdv_noi_bo") assert.equal(b.duoc_huong, 0, `${c.ma}/${b.ben}: HDV nội bộ không hưởng hoa hồng/giá vốn`);
      }
      assert.ok(Number.isInteger(c.dap_an?.tour_dao_giu), `${c.ma}: dap_an.tour_dao_giu phải là số nguyên đồng`);
    }
  });

  // Sổ đại lý đợt 2 (ADR-0079 «Sổ vàng / bài kiểm», đặc tả P9): luật lớp 1 «tổng thu = giá bán» lệch khi có giảm giá do bên đặt chịu (tổng thu < giá lẻ) — đổi sang công
  // thức của R-BIL-2: tổng thu = giá lẻ trước giảm − mọi giảm giá; phần Tour Đảo giữ = giá lẻ trước giảm − giảm giá Tour Đảo chịu − giá vốn − hoa hồng; người hưởng nợ
  // Tour Đảo = đã thu − được hưởng + giảm giá mình chịu. Ca không giảm giá (mọi ca hôm nay) cho đúng số cũ.
  test(`sổ vàng ${file}: mỗi ca tự cân đến từng đồng (công thức R-BIL-2)`, () => {
    for (const c of loadCases(file)) {
      const v = c.dau_vao;
      const ben = v.cac_ben;
      const giamBenDat = v.giam_gia_ben_dat ?? 0;
      const giamTourDao = v.giam_gia_tour_dao ?? 0;
      assert.ok(dong(giamBenDat) && dong(giamTourDao), `${c.ma}: giảm giá là số nguyên đồng ≥ 0`);
      assert.ok(giamBenDat === 0 || ben.some((b) => b.vai === "nguoi_huong"), `${c.ma}: giảm giá bên đặt chịu chỉ có khi đơn có người hưởng`);
      assert.equal(v.cong_ty_thu + sum(ben.map((b) => b.da_thu)), v.gia_ban - giamBenDat - giamTourDao, `${c.ma}: tổng tiền đã thu (công ty + các bên) phải bằng giá lẻ trước giảm − giảm giá`);
      assert.equal(sum(ben.filter((b) => b.vai === "nguoi_huong").map((b) => b.duoc_huong)), v.hoa_hong, `${c.ma}: tổng phần người hưởng được hưởng phải bằng hoa_hong`);
      assert.equal(sum(ben.filter((b) => b.vai === "nha_cung_cap").map((b) => b.duoc_huong)), v.gia_von, `${c.ma}: tổng phần nhà cung cấp được hưởng phải bằng gia_von`);
      assert.deepEqual(Object.keys(c.dap_an.no_tour_dao).sort(), ben.map((b) => b.ben).sort(), `${c.ma}: dap_an.no_tour_dao phải có đúng các bên của đầu vào`);
      for (const b of ben) {
        const chiu = b.vai === "nguoi_huong" ? giamBenDat : 0;
        assert.equal(c.dap_an.no_tour_dao[b.ben], b.da_thu - b.duoc_huong + chiu, `${c.ma}/${b.ben}: nợ Tour Đảo phải = đã thu − được hưởng + giảm giá mình chịu (${b.da_thu} − ${b.duoc_huong} + ${chiu})`);
      }
      const giu = v.cong_ty_thu + sum(Object.values(c.dap_an.no_tour_dao));
      assert.equal(c.dap_an.tour_dao_giu, giu, `${c.ma}: phần Tour Đảo giữ phải = công ty tự thu + tổng nợ các bên (${giu})`);
      assert.equal(c.dap_an.tour_dao_giu, v.gia_ban - giamTourDao - v.gia_von - v.hoa_hong, `${c.ma}: phần Tour Đảo giữ phải = giá lẻ trước giảm − giảm giá Tour Đảo chịu − giá vốn − hoa hồng (R-BIL-2)`);
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// LỚP 2 — CHẠY TRÊN MÃ THẬT (sổ tiền lượt 1, kế hoạch Task 5; NT-S7): ca tiền mẫu đi qua CHÍNH luật sinh dòng của `src/modules/billing/rules.ts`.
// CHỈ ca `da_xac_nhan` được tính "đạt"; ca `cho_xac_nhan` in "chưa áp dụng" và KHÔNG được đếm (R11 — không "xanh vì rỗng": đòi ≥ 2 ca đã xác nhận chạy).
// ---------------------------------------------------------------------------------------------------------------------
const CONG_TY = "Tour Đảo";
type SuKien =
  | { loai: "thu"; vai_nguoi_thu: "nhan_vien" | "cong_ty" | "chua_ro"; nguoi_thu: string | null; nguoi_ghi: string; nguoi_ghi_la_ke_toan: boolean; so: number }
  | { loai: "xac_nhan_cong_ty"; thu_so: number }
  | { loai: "nop"; ben: string; so: number }
  | { loai: "hoan"; nguoi_tra: string; so: number }
  | { loai: "dao_thu"; thu_so: number };
type CaSoCongNo = {
  ma: string;
  xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null };
  dau_vao: {
    phai_thu: number;
    su_kien: SuKien[];
    /** ADR-0061 điều 7 (tuỳ chọn): dòng tiền của đơn — danh mục (có mã) hoặc NHẬP TAY (mã null). */
    dong_don?: { loai: "danh_muc" | "nhap_tay"; ma: string | null; so_luong: number; don_gia: number }[];
    giam_gia?: number;
  };
  dap_an: { da_thu: number; con_lai: number; du: number; chua_ro: number; no_tour_dao: Record<string, number>; giao_duoc: boolean };
};

/** Chạy chuỗi sự kiện qua luật thật → đã thu / còn lại / dư / chưa rõ / số dư từng bên / đủ điều kiện tiền để Đã giao. */
function chayTrenMa(phaiThu: number, suKien: readonly SuKien[]) {
  const receipts: ReceiptRow[] = [];
  const lines: LineRow[] = [];
  const thu: { receipt: ReceiptRow; dong: LineRow[] }[] = [];
  // ADR-0120 Điều 1: khoản "Công ty thu" do người không phải Kế toán khai ⇒ dấu DECLARED (không dòng giữ hộ); "Công ty đã nhận" ⇒ CONFIRMED.
  const doiChieu: DoiChieuRow[] = [];
  let k = 0;
  const ghiDong = (ds: { debtorPartyId: string; creditorPartyId: string; amount: number; kind: LineRow["kind"]; reversesLineId: string | null }[], receiptId: string | null = null) => {
    const moi = ds.map((d) => ({ ...d, id: `l${++k}`, orderId: "o", receiptId }));
    lines.push(...moi);
    return moi;
  };
  const VAI: Record<string, CollectorRole> = { nhan_vien: "STAFF", cong_ty: "COMPANY", chua_ro: "UNKNOWN" };
  for (const e of suKien) {
    if (e.loai === "thu") {
      const role = VAI[e.vai_nguoi_thu]!;
      const r: ReceiptRow = { id: `r${++k}`, kind: "CUSTOMER_PAYMENT", amount: e.so, collectorRole: role, collectorPartyId: role === "UNKNOWN" ? null : role === "COMPANY" ? CONG_TY : e.nguoi_thu, reversesId: null };
      receipts.push(r);
      const dongMoi = ghiDong(sinhDongLanThu({ kind: r.kind, amount: r.amount, collectorRole: role, collectorPartyId: r.collectorPartyId, method: "BANK_TRANSFER", nguoiGhiPartyId: e.nguoi_ghi, nguoiGhiLaKeToan: e.nguoi_ghi_la_ke_toan, congTyId: CONG_TY }), r.id);
      if (canDoiChieu({ kind: r.kind, collectorRole: role, method: "BANK_TRANSFER", nguoiGhiPartyId: e.nguoi_ghi, nguoiGhiLaKeToan: e.nguoi_ghi_la_ke_toan, congTyId: CONG_TY })) doiChieu.push({ receiptId: r.id, kind: "DECLARED" });
      thu.push({ receipt: r, dong: dongMoi });
    } else if (e.loai === "xac_nhan_cong_ty") {
      const t = thu[e.thu_so - 1]!;
      if (t.dong.length === 0) doiChieu.push({ receiptId: t.receipt.id, kind: "CONFIRMED" }); // khoản mới: không dòng nợ nào
      for (const d of t.dong) ghiDong([sinhDongXacNhanCongTy(d)]); // khoản cũ: đảo dòng giữ hộ
    } else if (e.loai === "nop") {
      ghiDong(sinhDongQuyetToan({ nguoiNopPartyId: e.ben, congTyId: CONG_TY, phanBo: [{ orderId: "o", amount: e.so }] }));
    } else if (e.loai === "hoan") {
      receipts.push({ id: `r${++k}`, kind: "CUSTOMER_REFUND", amount: e.so, collectorRole: e.nguoi_tra === CONG_TY ? "COMPANY" : "STAFF", collectorPartyId: e.nguoi_tra, reversesId: null });
      ghiDong(sinhDongHoanKhach({ nguoiTraPartyId: e.nguoi_tra, congTyId: CONG_TY, so: e.so }));
    } else {
      const goc = thu[e.thu_so - 1]!;
      receipts.push({ ...goc.receipt, id: `r${++k}`, reversesId: goc.receipt.id });
      for (const d of goc.dong) ghiDong([sinhDongDao(d)]);
    }
  }
  const so = conLai(receipts, phaiThu, "confirmed");
  const ly = lyDoChuaGiaoDuoc({ status: "confirmed", deliveredAt: null, homNay: "2026-10-10", ngayDi: ["2026-10-10"], dichVuThieuNgay: [], thuongMai: { trangThai: "KHONG_NGUOI_HUONG" }, soKhoanDoiChieu: khoanMoiDoiChieu(receipts, doiChieu).size, so });
  return { so, soDu: soDuTheoBen(lines, CONG_TY), giaoDuoc: ly === null };
}

/**
 * Ca SV-HT-* qua luật sinh dòng THẬT (sổ đại lý đợt 2 Task 11): mỗi bên đã thu → một lần thu do chính người thu tự ghi (HDV nội bộ → STAFF, người hưởng → BOOKER) hoặc
 * Kế toán ghi (quầy nhà cung cấp → SUPPLIER, công ty thu → COMPANY) qua `sinhDongLanThu`; rồi phiếu «Đã giao» `sinhPhieuDaGiao` với MỘT dòng dịch vụ mang hoa hồng /
 * giá vốn của ca; số dư `soDuTheoBen`. Đủ tiền ⇔ `conLai` không còn thiếu / dư / chưa rõ.
 */
function chayCaHoanTat(c: Ca) {
  const v = c.dau_vao;
  const lines: { debtorPartyId: string; creditorPartyId: string; amount: number }[] = [];
  const receipts: ReceiptRow[] = [];
  const thu = (role: CollectorRole, nguoiThu: string, so: number, keToanGhi: boolean) => {
    if (so <= 0) return;
    receipts.push({ id: `r${receipts.length + 1}`, kind: "CUSTOMER_PAYMENT", amount: so, collectorRole: role, collectorPartyId: nguoiThu, reversesId: null });
    lines.push(...sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: so, collectorRole: role, collectorPartyId: nguoiThu, method: "CASH", nguoiGhiPartyId: keToanGhi ? "Kế toán" : nguoiThu, nguoiGhiLaKeToan: keToanGhi, congTyId: CONG_TY }));
  };
  const ROLE: Record<string, [CollectorRole, boolean]> = { hdv_noi_bo: ["STAFF", false], nguoi_huong: ["BOOKER", false], nha_cung_cap: ["SUPPLIER", true] };
  thu("COMPANY", CONG_TY, v.cong_ty_thu, true);
  for (const b of v.cac_ben) thu(ROLE[b.vai]![0], b.ben, b.da_thu, ROLE[b.vai]![1]);
  const nguoiHuong = v.cac_ben.find((b) => b.vai === "nguoi_huong")?.ben ?? null;
  const ncc = v.cac_ben.find((b) => b.vai === "nha_cung_cap")?.ben ?? null;
  lines.push(...sinhPhieuDaGiao({
    congTyId: CONG_TY, nguoiHuongPartyId: nguoiHuong, giamGiaBenDat: v.giam_gia_ben_dat ?? 0,
    dong: [{ orderServiceId: "dv", tenDichVu: c.ma, thanhTien: v.gia_ban, hoaHong: nguoiHuong === null ? null : v.hoa_hong, giaVon: v.gia_von > 0 ? v.gia_von : null, nhaCungCapPartyId: ncc }],
  }));
  const so = conLai(receipts, v.gia_ban - (v.giam_gia_ben_dat ?? 0) - (v.giam_gia_tour_dao ?? 0), "confirmed");
  return { soDu: soDuTheoBen(lines, CONG_TY), daThu: so.daThu, giaoDuoc: so.conLai === 0 && so.du === 0 && so.chuaRo === 0 };
}

const loadSoCongNo = (): CaSoCongNo[] => (JSON.parse(readFileSync(join(ROOT, "golden/so-cong-no-luot-1.json"), "utf8")) as { cac_ca: CaSoCongNo[] }).cac_ca;

test("sổ vàng golden/so-cong-no-luot-1.json: đủ trường, số nguyên đồng, mã không trùng, xác nhận có người + ngày; mỗi ca tự cân (còn lại / dư / Đã giao được)", () => {
  const seen = new Set<string>();
  const cases = loadSoCongNo();
  assert.ok(cases.length >= 4, "chống rỗng: ≥ 4 ca lượt 1");
  assert.ok(cases.some((c) => c.dau_vao.dong_don?.some((l) => l.loai === "nhap_tay")), "ADR-0061 điều 7: có ít nhất một ca có dòng nhập tay");
  for (const c of cases) {
    assert.ok(!seen.has(c.ma), `mã trùng: ${c.ma}`);
    seen.add(c.ma);
    assert.ok(TRANG_THAI.has(c.xac_nhan.trang_thai), c.ma);
    if (c.xac_nhan.trang_thai === "da_xac_nhan") assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay && isISODate(c.xac_nhan.ngay), `${c.ma}: ca đã xác nhận phải ghi người + ngày`);
    assert.ok(dong(c.dau_vao.phai_thu), c.ma);
    for (const e of c.dau_vao.su_kien) if ("so" in e) assert.ok(dong(e.so) && e.so > 0, `${c.ma}: số tiền sự kiện`);
    // ADR-0061 điều 7: ca có dòng đơn — phải thu = Σ số lượng × đơn giá − giảm giá (dòng nhập tay tính như mọi dòng); dòng nhập tay không có mã danh mục.
    if (c.dau_vao.dong_don) {
      const dd = c.dau_vao.dong_don;
      for (const l of dd) {
        assert.ok(dong(l.don_gia) && Number.isInteger(l.so_luong) && l.so_luong > 0, `${c.ma}: dòng đơn số nguyên đồng`);
        assert.equal(l.loai === "nhap_tay", l.ma === null, `${c.ma}: dòng nhập tay ⇔ không mã danh mục`);
      }
      const giam = c.dau_vao.giam_gia ?? 0;
      assert.ok(dong(giam), `${c.ma}: giảm giá`);
      assert.equal(c.dau_vao.phai_thu, dd.reduce((t, l) => t + l.so_luong * l.don_gia, 0) - giam, `${c.ma}: phải thu = Σ dòng − giảm giá`);
    }
    const a = c.dap_an;
    assert.equal(a.con_lai, Math.max(0, c.dau_vao.phai_thu - a.da_thu), `${c.ma}: còn lại = max(0, phải thu − đã thu)`);
    assert.equal(a.du, Math.max(0, a.da_thu - c.dau_vao.phai_thu), `${c.ma}: dư = max(0, đã thu − phải thu)`);
    assert.equal(a.giao_duoc, a.con_lai === 0 && a.du === 0 && a.chua_ro === 0, `${c.ma}: Đã giao được ⇔ không thiếu, không dư, không chưa rõ`);
  }
});

test("sổ vàng LỚP 2 (mã thật, src/modules/billing/rules.ts): ca ĐÃ XÁC NHẬN khớp đến từng đồng; ca chờ xác nhận 'chưa áp dụng' (không tính đạt)", (t) => {
  let daChay = 0;
  const choXacNhan: string[] = [];
  // (a) Ca của hoan-tat-cong-no.json (SV-HT-*) — sổ đại lý đợt 2 (Task 11): bỏ bộ lọc «chỉ lượt 1»; mọi ca chạy qua luật sinh dòng thật — giữ hộ (`sinhDongLanThu`)
  // rồi dòng thương mại của phiếu «Đã giao» (`sinhPhieuDaGiao`) — và số dư `soDuTheoBen`. Ca chờ xác nhận chỉ ghi chẩn đoán (bài todo riêng bên dưới).
  for (const c of loadCases("golden/hoan-tat-cong-no.json")) {
    if (c.xac_nhan.trang_thai !== "da_xac_nhan") {
      choXacNhan.push(c.ma);
      continue;
    }
    const kq = chayCaHoanTat(c);
    for (const b of c.dau_vao.cac_ben) assert.equal(kq.soDu.get(b.ben) ?? 0, c.dap_an.no_tour_dao[b.ben], `${c.ma}/${b.ben}: nợ Tour Đảo (mã thật)`);
    assert.equal(kq.daThu, c.dau_vao.gia_ban - (c.dau_vao.giam_gia_ben_dat ?? 0) - (c.dau_vao.giam_gia_tour_dao ?? 0), `${c.ma}: đã thu = phải thu`);
    assert.equal(c.dau_vao.cong_ty_thu + [...kq.soDu.values()].reduce((s, x) => s + x, 0), c.dap_an.tour_dao_giu, `${c.ma}: phần Tour Đảo giữ (mã thật)`);
    assert.ok(kq.giaoDuoc, `${c.ma}: đủ tiền để Đã giao`);
    daChay++;
  }
  // (b) Ca chuỗi sự kiện lượt 1.
  for (const c of loadSoCongNo()) {
    if (c.xac_nhan.trang_thai !== "da_xac_nhan") {
      choXacNhan.push(c.ma);
      continue;
    }
    const kq = chayTrenMa(c.dau_vao.phai_thu, c.dau_vao.su_kien);
    assert.deepEqual([kq.so.daThu, kq.so.conLai, kq.so.du, kq.so.chuaRo], [c.dap_an.da_thu, c.dap_an.con_lai, c.dap_an.du, c.dap_an.chua_ro], `${c.ma}: số tiền đơn (mã thật)`);
    for (const [ben, so] of Object.entries(c.dap_an.no_tour_dao)) assert.equal(kq.soDu.get(ben) ?? 0, so, `${c.ma}/${ben}: số dư (mã thật)`);
    assert.equal(kq.giaoDuoc, c.dap_an.giao_duoc, `${c.ma}: Đã giao được (mã thật)`);
    daChay++;
  }
  t.diagnostic(`đã chạy trên mã thật: ${daChay} ca đã xác nhận; chưa áp dụng: ${choXacNhan.length} ca chờ xác nhận (${choXacNhan.join(", ")})`);
  console.log(`sổ vàng lớp 2: đã chạy ${daChay} ca đã xác nhận; chưa áp dụng ${choXacNhan.length} ca chờ xác nhận (${choXacNhan.join(", ")})`);
  // Siết 2026-10-25 (chủ dự án xác nhận SV-HT-02, SV-HT-03): đủ bảy ca SV-HT và sáu ca SV-SC — ca nào bị lặng lẽ đổi về «chờ» thì bài đỏ.
  assert.ok(daChay >= 13, "chống 'xanh vì rỗng': phải có ≥ 13 ca đã xác nhận chạy trên mã thật (SV-HT-01…07 của hoan-tat-cong-no.json, SV-SC-01…06 của so-cong-no-luot-1.json)");
});

// Ca SV-HT-* CHỜ xác nhận (từ 2026-10-25 không còn ca nào; khuôn giữ cho ca mới): mỗi ca một `todo` có tên + chẩn đoán «mã khớp / lệch đáp án đề xuất» — KHÔNG khẳng định (AI không tự nghiệm thu
// đáp án — Hiến pháp N8). Ca đổi sang "da_xac_nhan" thì bài lớp 2 ở trên tự chạy thật cho ca đó.
for (const c of loadCases("golden/hoan-tat-cong-no.json").filter((x) => x.xac_nhan.trang_thai !== "da_xac_nhan")) {
  const kq = chayCaHoanTat(c);
  const lech = c.dau_vao.cac_ben.filter((b) => (kq.soDu.get(b.ben) ?? 0) !== c.dap_an.no_tour_dao[b.ben]).map((b) => `${b.ben}: mã ${kq.soDu.get(b.ben) ?? 0}, đáp án ${c.dap_an.no_tour_dao[b.ben]}`);
  test(`sổ vàng LỚP 2 ${c.ma}: chờ chủ dự án / Kế toán xác nhận — mã hiện tại ${lech.length === 0 ? "KHỚP" : `LỆCH (${lech.join("; ")})`} đáp án đề xuất`, { todo: "ca chờ xác nhận" }, () => {});
}
