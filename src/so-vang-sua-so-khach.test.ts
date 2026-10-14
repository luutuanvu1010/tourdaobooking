// Sổ vàng golden/sua-so-khach-van-phong.json (Hiến chương 5.17; ADR-0063 D1 — gói A2; ADR-0114 thêm hai khoá đáp án, ca bị từ chối và ca SV-SK-12). Khuôn src/so-vang-don-huy.test.ts:
//  LỚP 1 tự cân MỌI ca bằng số học viết tay (bắt CA MẪU viết sai — không gọi mã).
//  LỚP 2 chạy từng ca qua CHÍNH luật thật: bộ đọc thân văn phòng `docThanSuaSoKhach` (mã lý do → nhãn), `planMoneyEdit` (luật tiền chung HDV + văn phòng; kể cả luật người lớn D3),
//  `effectiveSubtotal` / `effectiveMoney` (phải thu), `billing/rules.ts:conLai` (còn lại, dư chờ hoàn), `canhBaoGiamGiaVuot`, `doanSoKhach` + `ghepLyDo` (dòng nhật ký —
//  cùng cách `orders/index.ts:soanSuaSoKhach` ghép), `canhBaoKhuyenMai` + `soKhachTraTien` (D1) và `dungLichSuSoKhach` (D2) — hai hàm cuối dựng đầu vào đúng như
//  `nhacKhuyenMaiCuaDon` / `lichSuSoKhachCuaDon` của src/modules/orders/index.ts. CHỈ ca "da_xac_nhan" được tính đạt phần tiền (chưa có ⇒ `todo`, không "xanh vì rỗng"); ca chờ
//  xác nhận in chẩn đoán "khớp / lệch mã" và từ ADR-0109 lệch là ĐỎ (siết). Hoa hồng PER_PAX (ADR-0077) CHỈ TRÊN GIẤY: mã `hoaHongDong` chưa thi công ⇒ lớp 2 bỏ qua phần đó, in "chưa chạy trên mã".
// Hành vi QUA ROUTE THẬT (cùng các con số SV-SK-02, 03, 04) đã khoá ở src/modules/orders/so-khach-van-phong-route.test.ts (TC4, TC8).
// ADR-0109 (phải thu không âm): phải thu = max(0, tạm tính − giảm giá); cảnh báo ⇔ giảm giá > tạm tính SAU. Khoá tuỳ chọn `dau_vao.buoc_sau` / `dap_an.buoc_sau`
// (chỉ thêm) mô tả MỘT bước sau lần sửa: hoàn rồi Đã giao, Đã giao ngay, hay huỷ — lớp 2 chạy `conLai` + `lyDoChuaGiaoDuoc` (hàm thuần của billing) với ngữ cảnh
// cố định (đã xác nhận, hôm nay = ngày đi, không người hưởng, không lần thu "chưa rõ"); hành vi route của cùng các ca ở TC8–TC8d và
// src/modules/billing/phai-thu-khong-am.test.ts. Lớp 2 SIẾT: mọi ca, kể cả chờ xác nhận, phải "khớp mã" (chẩn đoán lệch → đỏ).
// ADR-0114 (chủ duyệt 2026-10-13, điều kiện: Kế toán xem lại hai khoá mới): mọi `dap_an` có thêm `canh_bao_khuyen_mai` (D1) và `lich_su_so_khach` (D2); mỗi ca có `xac_nhan_khoa_moi`
// (cho_xac_nhan cho tới khi Kế toán ghi người + ngày — AI không tự xác nhận, Hiến pháp N8); ca bị D3 từ chối mang `dap_an.tu_choi` thay phần tiền. Giới hạn đã biết của sổ vàng: dịch vụ
// nhập tay KHÔNG mang số khách trong `dau_vao` (coi 0), nên D3 và D1 ở đây chỉ đếm dịch vụ danh mục; nhập tay / theo nhóm đã khoá ở nguoi-lon-route.test.ts, rules.test.ts, money-edit-plan.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isISODate } from "./shared/vn-date.ts";
import { PAX_ORDER, type PaxCode, type PaxCounts } from "./shared/order-lines.ts";
import { MA_LY_DO_SUA_SO_KHACH, LY_DO_SUA_SO_KHACH, canhBaoGiamGiaVuot, canhBaoKhuyenMai, docThanSuaSoKhach, soKhachTraTien, type MaLyDoSuaSoKhach } from "./shared/so-khach-van-phong.ts";
import { dungLichSuSoKhach } from "./shared/lich-su-so-khach.ts";
import { doanSoKhach, ghepLyDo } from "./shared/tin-doi-don.ts";
import { effectiveMoney, effectiveSubtotal, planMoneyEdit, type SubtotalServiceInput } from "./modules/orders/money-adjustment.ts";
import { conLai, lyDoChuaGiaoDuoc, type ReceiptRow } from "./modules/billing/rules.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

type DichVu =
  | { id: string; ten: string; nguon: "danh_muc"; don_gia: Partial<Record<PaxCode, number>>; khach_truoc: PaxCounts }
  | { id: string; ten: string; nguon: "nhap_tay"; thanh_tien: number };
type DanhMuc = Extract<DichVu, { nguon: "danh_muc" }>;
type Tien = { tam_tinh: number; phai_thu: number; con_lai: number; du: number };
type BuocSau = { loai: "hoan_roi_giao"; hoan: number } | { loai: "giao" } | { loai: "huy" };
type DapAnBuocSau = { da_thu: number; con_lai: number; du: number; giao_duoc: boolean; due_snapshot: number | null } | { tong_cong: number; con_lai: number; du: number };
/** Một dòng "Lịch sử số khách" — ĐÚNG khoá của `DongLichSuSoKhachDto` (src/shared/contracts.ts) để lớp 2 so thẳng với kết quả `dungLichSuSoKhach`. */
type DongLichSu = { buoc: "khoi_tao" | "dieu_chinh" | "hien_hanh"; lanSua: number | null; soKhach: { tenDichVu: string; pax: PaxCounts }[]; tamTinh: number };
/** Hai khoá đáp án mới của ADR-0114 — có ở MỌI ca (kể cả ca bị từ chối: mô tả đơn SAU lần bấm bị từ chối = không đổi). */
type KhoaMoi = { canh_bao_khuyen_mai: boolean; lich_su_so_khach: DongLichSu[] };
type DapAnTien = KhoaMoi & {
  ghi_dong_dieu_chinh: boolean; truoc: Tien; sau: Tien; canh_bao_tong_am: boolean; nhat_ky: string | null;
  hoa_hong?: { truoc: number; sau: number; chay_tren_ma: boolean };
  buoc_sau?: DapAnBuocSau;
};
/** Ca bị D3 từ chối (409 `thieu_nguoi_lon`): KHÔNG có phần tiền, nhật ký, bước sau. */
type DapAnTuChoi = KhoaMoi & { tu_choi: { ma: string; nhan: string } };
type DapAn = DapAnTien | DapAnTuChoi;
type XacNhan = { trang_thai: string; nguoi: string | null; ngay: string | null };
type Ca = {
  ma: string;
  xac_nhan: XacNhan;
  xac_nhan_khoa_moi: XacNhan;
  dau_vao: {
    dich_vu: DichVu[]; lan_sua_truoc: Record<string, PaxCounts> | null; giam_gia: number; da_thu: number;
    hoa_hong_chup?: { kieu: "PER_PAX"; muc: number };
    sua: { ly_do: MaLyDoSuaSoKhach; khach_sau: Record<string, PaxCounts> };
    buoc_sau?: BuocSau;
  };
  dap_an: DapAn;
};
const load = (): Ca[] => (JSON.parse(readFileSync(join(ROOT, "golden/sua-so-khach-van-phong.json"), "utf8")) as { cac_ca: Ca[] }).cac_ca;
const dong = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
const laPax = (p: unknown): p is PaxCounts => !!p && typeof p === "object" && PAX_ORDER.every((c) => dong((p as Record<string, unknown>)[c]));
const nhanKhach = (c: PaxCode) => ({ adult: "người lớn", child: "trẻ em", senior: "người cao tuổi", infant: "em bé" })[c];
const KHONG_KHACH: PaxCounts = { adult: 0, child: 0, senior: 0, infant: 0 };
const NHAN_NHAP_TAY = "dịch vụ nhập tay";
const laTuChoi = (a: DapAn): a is DapAnTuChoi => "tu_choi" in a;

/** Trường xác nhận (`xac_nhan` và `xac_nhan_khoa_moi` cùng khuôn): đã xác nhận ⇒ người + ngày ISO; chờ ⇒ cả hai null (không nửa vời). */
function kiemXacNhan(ma: string, ten: string, x: XacNhan | undefined): void {
  assert.ok(x, `${ma}: thiếu ${ten}`);
  assert.ok(["cho_xac_nhan", "da_xac_nhan"].includes(x.trang_thai), `${ma}: ${ten}.trang_thai`);
  if (x.trang_thai === "da_xac_nhan") assert.ok(x.nguoi && x.ngay && isISODate(x.ngay), `${ma}: ${ten} đã xác nhận phải ghi người + ngày`);
  else assert.ok(x.nguoi === null && x.ngay === null, `${ma}: ${ten} chờ xác nhận thì người + ngày để null`);
}

test("sổ vàng golden/sua-so-khach-van-phong.json LỚP 1: đủ ca bắt buộc, mã không trùng, số nguyên đồng, mỗi ca tự cân (tạm tính, phải thu, còn lại, dư, cảnh báo, nhật ký, hoa hồng, nhắc khuyến mại, lịch sử số khách, ca bị từ chối)", () => {
  const cases = load();
  assert.ok(cases.length >= 12, "chống rỗng: ≥ 12 ca (SV-SK-01…12)");
  const seen = new Set<string>();
  // Bộ ca bắt buộc của gói A2: giảm sau đã thu (dư), tăng khách, có nhập tay, giảm giá vượt tạm tính có cảnh báo, hoa hồng PER_PAX, y nguyên, sửa lần hai;
  // thêm của ADR-0109 (phiếu kiểm 5b): chưa trả đồng nào, huỷ, hoàn rồi Đã giao.
  // ADR-0114 "Câu bị thay" (chủ duyệt cùng ADR): cờ `tamTinh0` ("phải có ca tạm tính về 0", phiếu kiểm 5b của ADR-0109) ĐỔI thành `tuChoiKhongNguoiLon` — ca đó (SV-SK-10) nay bị D3
  // cấm nên sổ vàng phải có ca BỊ TỪ CHỐI vì không còn người lớn. Không bỏ cờ lặng lẽ: tạm tính về 0 chỉ còn khi giá người lớn bằng 0, không còn là bộ ca bắt buộc.
  // Thêm của ADR-0114: `nhacKhuyenMai` (ca của chủ: nhắc đỏ mà KHÔNG có cảnh báo giảm giá vượt — SV-SK-12) và `lichSuNhieuDong` (≥ 3 dòng lịch sử — SV-SK-07).
  const co = {
    du: false, tang: false, nhapTay: false, am: false, hoaHong: false, yNguyen: false, lanHai: false, chuaTra: false, tuChoiKhongNguoiLon: false, huy: false, giaoSauHoan: false,
    nhacKhuyenMai: false, lichSuNhieuDong: false,
  };
  for (const c of cases) {
    assert.ok(!seen.has(c.ma), `mã trùng: ${c.ma}`);
    seen.add(c.ma);
    kiemXacNhan(c.ma, "xac_nhan", c.xac_nhan);
    kiemXacNhan(c.ma, "xac_nhan_khoa_moi", c.xac_nhan_khoa_moi);
    const v = c.dau_vao, a = c.dap_an;
    assert.ok(MA_LY_DO_SUA_SO_KHACH.includes(v.sua.ly_do), `${c.ma}: mã lý do ngoài danh sách đóng`);
    assert.ok(dong(v.giam_gia) && dong(v.da_thu), `${c.ma}: giảm giá, đã thu`);
    const danhMuc = v.dich_vu.filter((d): d is DanhMuc => d.nguon === "danh_muc");
    const nhapTay = v.dich_vu.filter((d): d is Extract<DichVu, { nguon: "nhap_tay" }> => d.nguon === "nhap_tay");
    assert.ok(danhMuc.length >= 1, `${c.ma}: có ít nhất một dịch vụ danh mục`);
    for (const d of danhMuc) {
      assert.ok(laPax(d.khach_truoc), `${c.ma}: khach_truoc`);
      for (const k of PAX_ORDER) {
        const gia = d.don_gia[k];
        if (gia === undefined) assert.equal(d.khach_truoc[k], 0, `${c.ma}: loại khách không có giá thì số lưu = 0`);
        // N5 (ADR-0109): giá 0 có thật (em bé miễn phí) — `gia ≥ 0`.
        else assert.ok(dong(gia) && gia >= 0 && d.khach_truoc[k] > 0, `${c.ma}: loại khách có giá đã lưu ⇒ lúc xác nhận có khách (dòng giá tồn tại)`);
      }
      assert.ok(laPax(v.sua.khach_sau[d.id]), `${c.ma}: thân gửi đủ mọi dịch vụ danh mục`);
      for (const k of PAX_ORDER) if (d.don_gia[k] === undefined) assert.equal(v.sua.khach_sau[d.id]![k], 0, `${c.ma}: không thêm loại khách chưa có giá`);
    }
    for (const d of nhapTay) {
      assert.ok(dong(d.thanh_tien), `${c.ma}: thành tiền nhập tay`);
      assert.equal(v.sua.khach_sau[d.id], undefined, `${c.ma}: thân KHÔNG gửi dịch vụ nhập tay`);
    }
    const hienHanh = (id: string, goc: PaxCounts) => v.lan_sua_truoc?.[id] ?? goc;
    const tamTinh = (khach: (d: DanhMuc) => PaxCounts) =>
      danhMuc.reduce((s, d) => s + PAX_ORDER.reduce((n, k) => n + (d.don_gia[k] ?? 0) * khach(d)[k], 0), 0) + nhapTay.reduce((s, d) => s + d.thanh_tien, 0);
    const tongKhach = (khach: (d: DanhMuc) => PaxCounts, dem: (p: PaxCounts) => number) => danhMuc.reduce((s, d) => s + dem(khach(d)), 0);
    const khachLuu = (d: DanhMuc) => d.khach_truoc;
    const khachTruoc = (d: DanhMuc) => hienHanh(d.id, d.khach_truoc);
    const khachSauSua = (d: DanhMuc) => v.sua.khach_sau[d.id]!;
    const ghi = danhMuc.some((d) => PAX_ORDER.some((k) => khachTruoc(d)[k] !== khachSauSua(d)[k]));

    // ---- D3 (ADR-0114), HAI CHIỀU: ca bị từ chối ⇔ trước lần sửa tổng người đi kèm (người lớn + người cao tuổi) ≥ 1 và sau = 0. Một chiều thôi thì ca đáng bị chặn có thể mang đáp án tiền mà không ai thấy.
    const diKem = (p: PaxCounts) => p.adult + p.senior;
    const biTuChoi = tongKhach(khachTruoc, diKem) >= 1 && tongKhach(khachSauSua, diKem) < 1;
    assert.equal(laTuChoi(a), biTuChoi, `${c.ma}: có 'tu_choi' ⇔ người đi kèm của cả đơn đi từ ≥ 1 xuống 0 (ADR-0114 D3)`);
    const ghiThat = ghi && !biTuChoi; // có ghi dòng điều chỉnh thật

    // ---- Hai khoá mới (ADR-0114) — số học VIẾT TAY, không gọi mã.
    assert.equal(typeof a.canh_bao_khuyen_mai, "boolean", `${c.ma}: canh_bao_khuyen_mai là boolean`);
    const traTien = (p: PaxCounts) => p.adult + p.child + p.senior;
    const khachSauHienHanh = (d: DanhMuc) => (ghiThat ? khachSauSua(d) : khachTruoc(d)); // bị từ chối / y nguyên ⇒ đơn không đổi
    const nhac = v.giam_gia > 0 && tongKhach(khachSauHienHanh, traTien) < tongKhach(khachLuu, traTien); // so với số ĐÃ LƯU lúc xác nhận, không với lần sửa trước
    assert.equal(a.canh_bao_khuyen_mai, nhac, `${c.ma}: nhắc khuyến mại ⇔ giảm giá > 0 và số khách trả tiền (NL + TE + NCT) sau < số lúc xác nhận`);

    const nhanDv = (d: DichVu) => (d.nguon === "danh_muc" ? d.ten : NHAN_NHAP_TAY); // tên dịch vụ nhập tay là chữ gõ tay: không vào lịch sử
    const trangThai = (khach: (d: DanhMuc) => PaxCounts, tt: number) => ({
      soKhach: v.dich_vu.map((d) => ({ tenDichVu: nhanDv(d), pax: d.nguon === "danh_muc" ? khach(d) : KHONG_KHACH })),
      tamTinh: tt,
    });
    const lan: { seq: number; soKhach: DongLichSu["soKhach"]; tamTinh: number }[] = [];
    if (v.lan_sua_truoc) lan.push({ seq: 1, ...trangThai(khachTruoc, tamTinh(khachTruoc)) }); // lan_sua_truoc = đúng MỘT lần sửa trước (seq 1)
    if (ghiThat) lan.push({ seq: lan.length + 1, ...trangThai(khachSauSua, tamTinh(khachSauSua)) });
    const lichSu: DongLichSu[] = [{ buoc: "khoi_tao", lanSua: null, ...trangThai(khachLuu, tamTinh(khachLuu)) }];
    if (lan.length === 0) lichSu.push({ buoc: "hien_hanh", lanSua: null, ...trangThai(khachLuu, tamTinh(khachLuu)) }); // chưa sửa lần nào: hai dòng trùng số
    else lan.forEach((l, i) => lichSu.push({ buoc: i === lan.length - 1 ? "hien_hanh" : "dieu_chinh", lanSua: l.seq, soKhach: l.soKhach, tamTinh: l.tamTinh }));
    assert.deepEqual(a.lich_su_so_khach, lichSu, `${c.ma}: lịch sử số khách (khởi tạo → các lần sửa → hiện hành)`);
    if (lichSu.length >= 3) co.lichSuNhieuDong = true;
    if (nhac && !(v.giam_gia > tamTinh(khachSauHienHanh))) co.nhacKhuyenMai = true;

    if (biTuChoi) {
      // Ca bị từ chối: KHÔNG có phần tiền (không truoc / sau / canh_bao_tong_am / nhat_ky / hoa_hong / buoc_sau), không bước sau; chỉ mã + câu + hai khoá mới.
      const da = a as DapAnTuChoi;
      assert.deepEqual(Object.keys(da).sort(), ["canh_bao_khuyen_mai", "lich_su_so_khach", "tu_choi"], `${c.ma}: ca bị từ chối chỉ có tu_choi + hai khoá mới (không có phần tiền)`);
      assert.equal(da.tu_choi.ma, "thieu_nguoi_lon", `${c.ma}: mã từ chối`);
      assert.ok(typeof da.tu_choi.nhan === "string" && da.tu_choi.nhan.length > 0 && !/\d/.test(da.tu_choi.nhan), `${c.ma}: câu từ chối có chữ và không có chữ số`);
      assert.equal(v.buoc_sau, undefined, `${c.ma}: ca bị từ chối không có bước sau`);
      assert.equal(v.hoa_hong_chup, undefined, `${c.ma}: ca bị từ chối không có hoa hồng`);
      assert.equal(lichSu.length, 2, `${c.ma}: bị từ chối ⇒ không ghi gì ⇒ lịch sử chỉ khởi tạo + hiện hành`);
      co.tuChoiKhongNguoiLon = true;
      continue;
    }

    const dt = a as DapAnTien;
    const tien = (tt: number): Tien => {
      const phaiThu = Math.max(0, tt - v.giam_gia); // ADR-0109: không bao giờ âm
      return { tam_tinh: tt, phai_thu: phaiThu, con_lai: Math.max(0, phaiThu - v.da_thu), du: Math.max(0, v.da_thu - phaiThu) };
    };
    assert.equal(dt.ghi_dong_dieu_chinh, ghi, `${c.ma}: ghi dòng điều chỉnh ⇔ có số khách đổi so với HIỆN HÀNH`);
    assert.deepEqual(dt.truoc, tien(tamTinh(khachTruoc)), `${c.ma}: tiền TRƯỚC`);
    assert.deepEqual(dt.sau, ghi ? tien(tamTinh(khachSauSua)) : dt.truoc, `${c.ma}: tiền SAU`);
    assert.equal(dt.canh_bao_tong_am, v.giam_gia > dt.sau.tam_tinh, `${c.ma}: cảnh báo ⇔ giảm giá > tạm tính SAU (ADR-0109)`);
    assert.ok(dt.truoc.phai_thu >= 0 && dt.sau.phai_thu >= 0, `${c.ma}: phải thu không âm`);
    // Lịch sử khớp phần tiền: dòng cuối là hiện hành = tạm tính SAU; có lần sửa trước thì dòng điều chỉnh = tạm tính TRƯỚC; dòng đầu = tạm tính đã lưu lúc xác nhận.
    assert.equal(dt.lich_su_so_khach.at(-1)!.buoc, "hien_hanh", `${c.ma}: dòng cuối là hiện hành`);
    assert.equal(dt.lich_su_so_khach.at(-1)!.tamTinh, dt.sau.tam_tinh, `${c.ma}: tạm tính của dòng hiện hành = tạm tính SAU`);
    assert.equal(dt.lich_su_so_khach[0]!.tamTinh, tamTinh(khachLuu), `${c.ma}: tạm tính của dòng khởi tạo = tạm tính đã lưu`);
    if (v.lan_sua_truoc && ghi) assert.equal(dt.lich_su_so_khach[1]!.tamTinh, dt.truoc.tam_tinh, `${c.ma}: dòng điều chỉnh (lần sửa trước) = tạm tính TRƯỚC`);
    assert.equal(v.buoc_sau === undefined, dt.buoc_sau === undefined, `${c.ma}: có bước sau ⇔ có đáp án bước sau`);
    if (v.buoc_sau && dt.buoc_sau) {
      const pt = dt.sau.phai_thu;
      if (v.buoc_sau.loai === "huy") {
        assert.deepEqual(dt.buoc_sau, { tong_cong: pt, con_lai: 0, du: 0 }, `${c.ma}: đơn huỷ — tổng cộng = phải thu đã kẹp, còn lại / dư 0`);
        co.huy = true;
      } else {
        const hoan = v.buoc_sau.loai === "hoan_roi_giao" ? v.buoc_sau.hoan : 0;
        assert.ok(dong(hoan) && hoan <= v.da_thu, `${c.ma}: không hoàn quá số khách đã trả`);
        const daThu = v.da_thu - hoan;
        const conL = Math.max(0, pt - daThu), duL = Math.max(0, daThu - pt);
        const giaoDuoc = conL === 0 && duL === 0;
        assert.deepEqual(dt.buoc_sau, { da_thu: daThu, con_lai: conL, du: duL, giao_duoc: giaoDuoc, due_snapshot: giaoDuoc ? pt : null }, `${c.ma}: bước sau`);
        if (hoan > 0 && giaoDuoc) co.giaoSauHoan = true;
      }
    }
    if (!ghi) assert.equal(dt.nhat_ky, null, `${c.ma}: không ghi thì không nhật ký`);
    else {
      const doan = danhMuc.flatMap((d) => {
        const t = khachTruoc(d), s = khachSauSua(d);
        const doi = PAX_ORDER.filter((k) => t[k] !== s[k]).map((k) => `${nhanKhach(k)} ${t[k]} → ${s[k]}`);
        return doi.length ? [`${d.ten}: ${doi.join(", ")}`] : [];
      });
      assert.equal(dt.nhat_ky, `số khách: ${doan.join(" | ")} · lý do: ${LY_DO_SUA_SO_KHACH[v.sua.ly_do]}`, `${c.ma}: dòng nhật ký`);
      for (const d of nhapTay) assert.ok(!dt.nhat_ky!.includes(d.ten), `${c.ma}: tên dịch vụ nhập tay không vào nhật ký`);
      assert.doesNotMatch(dt.nhat_ky!, /\d{6,}/, `${c.ma}: nhật ký không chứa số tiền / dãy số dài`);
    }
    if (v.hoa_hong_chup) {
      assert.ok(dt.hoa_hong && dong(v.hoa_hong_chup.muc), `${c.ma}: có mức chụp thì có đáp án hoa hồng`);
      const tinh = (p: PaxCounts) => v.hoa_hong_chup!.muc * (p.adult + p.child + p.senior);
      const d0 = danhMuc[0]!;
      assert.equal(dt.hoa_hong!.truoc, tinh(khachTruoc(d0)), `${c.ma}: hoa hồng trước = mức × (NL + TE + NCT), không đếm em bé`);
      assert.equal(dt.hoa_hong!.sau, tinh(khachSauSua(d0)), `${c.ma}: hoa hồng sau theo số khách MỚI, mức đã chụp`);
      co.hoaHong = true;
    }
    if (ghi && dt.sau.du > 0 && v.da_thu > 0 && !dt.canh_bao_tong_am) co.du = true;
    if (ghi && dt.sau.tam_tinh > dt.truoc.tam_tinh) co.tang = true;
    if (nhapTay.length) co.nhapTay = true;
    if (dt.canh_bao_tong_am) co.am = true;
    if (dt.canh_bao_tong_am && v.da_thu === 0) co.chuaTra = true;
    if (!ghi) co.yNguyen = true;
    if (v.lan_sua_truoc) co.lanHai = true;
  }
  assert.deepEqual(
    co,
    {
      du: true, tang: true, nhapTay: true, am: true, hoaHong: true, yNguyen: true, lanHai: true, chuaTra: true, tuChoiKhongNguoiLon: true, huy: true, giaoSauHoan: true,
      nhacKhuyenMai: true, lichSuNhieuDong: true,
    },
    "đủ bộ ca bắt buộc của gói A2 + ADR-0109 + ADR-0114 (ca bị từ chối vì không còn người lớn thay ca tạm tính về 0)",
  );
});

/** Chạy một ca qua luật thật — đúng thứ tự route văn phòng: đọc thân (mã → nhãn) → planMoneyEdit → nhật ký; tiền đơn qua effectiveMoney + conLai. */
function chayTrenMa(c: Ca): DapAn | string {
  const v = c.dau_vao;
  const services: SubtotalServiceInput[] = v.dich_vu.map((d) =>
    d.nguon === "nhap_tay"
      ? { id: d.id, catalogCode: null, name: d.ten, unit: "manual", items: [{ paxCode: null, catalogPrice: null, unitPrice: d.thanh_tien, lineTotal: d.thanh_tien }] }
      : {
          id: d.id, catalogCode: "ZA1", name: d.ten, unit: "perPax",
          items: PAX_ORDER.filter((k) => d.don_gia[k] !== undefined).map((k) => ({ paxCode: k, catalogPrice: d.don_gia[k]!, unitPrice: d.don_gia[k]!, lineTotal: d.don_gia[k]! * d.khach_truoc[k] })),
        });
  const storedPax = new Map(v.dich_vu.map((d) => [d.id, d.nguon === "danh_muc" ? d.khach_truoc : KHONG_KHACH] as const));
  const latestAfter = v.lan_sua_truoc ? Object.entries(v.lan_sua_truoc).map(([serviceId, pax]) => ({ serviceId, pax })) : null;
  const than = docThanSuaSoKhach({ lyDo: v.sua.ly_do, services: Object.entries(v.sua.khach_sau).map(([id, pax]) => ({ id, pax })) });
  if (!than.ok) return `thân bị từ chối: ${than.message}`;
  const plan = planMoneyEdit({ services, storedPax, latestAfter, body: { reason: than.nhan, services: than.services } });
  // Hai khoá mới (ADR-0114) dựng bằng CHÍNH các hàm máy chủ dùng, cùng cách dựng đầu vào như `nhacKhuyenMaiCuaDon` / `lichSuSoKhachCuaDon` (orders/index.ts):
  //  D1: số khách trả tiền LÚC XÁC NHẬN = số ĐÃ LƯU của mọi dịch vụ; HIỆN HÀNH = đơn sau lần bấm này (bị từ chối / y nguyên ⇒ không đổi).
  //  D2: dòng đầu = số đã lưu + tạm tính gốc (`effectiveSubtotal(dịch vụ, [])`); mỗi lần sửa = số SAU lần đó + tạm tính tính lại bằng `effectiveSubtotal` (không đọc cột đã lưu); `seq` đánh từ 1.
  const sauLanNay: readonly { serviceId: string; pax: PaxCounts }[] | null = plan.ok && plan.write ? plan.after : latestAfter;
  const paxHienHanh = (id: string): PaxCounts => sauLanNay?.find((e) => e.serviceId === id)?.pax ?? storedPax.get(id)!;
  const lanSua: { seq: number; sau: readonly { serviceId: string; pax: PaxCounts }[]; tamTinhSau: number }[] = [];
  if (latestAfter) lanSua.push({ seq: 1, sau: latestAfter, tamTinhSau: effectiveSubtotal(services, latestAfter) });
  if (plan.ok && plan.write) lanSua.push({ seq: lanSua.length + 1, sau: plan.after, tamTinhSau: effectiveSubtotal(services, plan.after) });
  const khoaMoi: KhoaMoi = {
    canh_bao_khuyen_mai:
      // giảm giá HIỆU LỰC của đơn hiện hành sau lần bấm này (`effectiveMoney` trên tạm tính tính lại) — đúng thứ máy chủ đọc ở `OrderDto.giamGiaHieuLuc`
      canhBaoKhuyenMai({ giamGiaHieuLuc: effectiveMoney(effectiveSubtotal(services, sauLanNay ?? []), v.giam_gia).giamGiaHieuLuc }, soKhachTraTien(v.dich_vu.map((d) => ({ pax: storedPax.get(d.id)! }))), soKhachTraTien(v.dich_vu.map((d) => ({ pax: paxHienHanh(d.id) })))) !== null,
    lich_su_so_khach: dungLichSuSoKhach({
      dichVu: v.dich_vu.map((d) => ({ id: d.id, catalogCode: d.nguon === "danh_muc" ? "ZA1" : null, name: d.ten, pax: storedPax.get(d.id)! })),
      tamTinhKhoiTao: effectiveSubtotal(services, []),
      lanSua,
    }),
  };
  if (!plan.ok) {
    if (plan.code === "thieu_nguoi_lon") return { tu_choi: { ma: plan.code, nhan: plan.message }, ...khoaMoi };
    return `planMoneyEdit từ chối: ${plan.message}`; // mọi từ chối khác trong sổ vàng là lỗi dữ liệu mẫu ⇒ chuỗi ⇒ đỏ
  }
  const receipts: ReceiptRow[] = v.da_thu > 0 ? [{ id: "r1", kind: "CUSTOMER_PAYMENT", amount: v.da_thu, collectorRole: "COMPANY", collectorPartyId: "cong-ty", reversesId: null }] : [];
  const tien = (tt: number): Tien => {
    const phaiThu = effectiveMoney(tt, v.giam_gia).total;
    const s = conLai(receipts, phaiThu, "confirmed");
    return { tam_tinh: tt, phai_thu: phaiThu, con_lai: s.conLai, du: s.du };
  };
  const hienHanh = effectiveSubtotal(services, latestAfter ?? []);
  const truoc = tien(plan.write ? plan.subtotalBefore : hienHanh);
  const sau = plan.write ? tien(plan.subtotalAfter) : truoc;
  const dap: DapAnTien = {
    ghi_dong_dieu_chinh: plan.write,
    truoc,
    sau,
    canh_bao_tong_am: canhBaoGiamGiaVuot({ subtotal: sau.tam_tinh, discount: v.giam_gia }) !== null,
    nhat_ky: plan.write ? ghepLyDo(doanSoKhach(plan.before, plan.after, services), plan.reason) : null,
    ...khoaMoi,
  };
  if (plan.write && plan.subtotalBefore !== hienHanh) return `subtotalBefore ${plan.subtotalBefore} ≠ tạm tính hiện hành ${hienHanh}`;
  // Bước sau (ADR-0109): hàm thuần của billing với ngữ cảnh cố định — đã xác nhận, hôm nay = ngày đi, không người hưởng, không lần thu "chưa rõ".
  if (v.buoc_sau) {
    const pt = sau.phai_thu;
    if (v.buoc_sau.loai === "huy") {
      const s = conLai(receipts, pt, "cancelled");
      dap.buoc_sau = { tong_cong: pt, con_lai: s.conLai, du: s.du };
    } else {
      const hoan = v.buoc_sau.loai === "hoan_roi_giao" ? v.buoc_sau.hoan : 0;
      const sau2: ReceiptRow[] = hoan > 0 ? [...receipts, { id: "h1", kind: "CUSTOMER_REFUND", amount: hoan, collectorRole: "COMPANY", collectorPartyId: "cong-ty", reversesId: null }] : receipts;
      const s = conLai(sau2, pt, "confirmed");
      const ly = lyDoChuaGiaoDuoc({ status: "confirmed", deliveredAt: null, homNay: "2026-10-08", ngayDi: ["2026-10-08"], dichVuThieuNgay: [], coNguoiHuong: false, so: s });
      dap.buoc_sau = { da_thu: s.daThu, con_lai: s.conLai, du: s.du, giao_duoc: ly === null, due_snapshot: ly === null ? pt : null };
    }
  }
  // Hoa hồng (ADR-0077) chưa có mã — mang nguyên đáp án giấy sang để so phần TIỀN ĐƠN; lớp 2 không tính đạt phần này.
  const giay = c.dap_an as DapAnTien;
  if (giay.hoa_hong) dap.hoa_hong = giay.hoa_hong;
  return dap;
}

test("sổ vàng golden/sua-so-khach-van-phong.json LỚP 2 (mã thật): ca ĐÃ XÁC NHẬN khớp từng đồng; ca chờ xác nhận cũng phải khớp mã (siết ADR-0109); hai khoá mới + ca bị từ chối (ADR-0114) chạy trên mã thật; hoa hồng PER_PAX chưa chạy trên mã", (t) => {
  let daChay = 0;
  const cho: string[] = [];
  const chanDoan: string[] = [];
  const giay: string[] = [];
  for (const c of load()) {
    const dap = chayTrenMa(c);
    if ("hoa_hong" in c.dap_an && c.dap_an.hoa_hong && !c.dap_an.hoa_hong.chay_tren_ma) giay.push(c.ma);
    if (c.xac_nhan.trang_thai !== "da_xac_nhan") {
      cho.push(c.ma);
      if (typeof dap === "string") chanDoan.push(`${c.ma}: LỆCH mã (${dap})`);
      else {
        // Hợp của khoá hai phía: đáp án thiếu khoá mới (hoặc thừa khoá cũ) cũng là LỆCH.
        const tapKhoa = new Set([...Object.keys(c.dap_an), ...Object.keys(dap)]);
        const khac = [...tapKhoa].filter((k) => JSON.stringify((dap as Record<string, unknown>)[k]) !== JSON.stringify((c.dap_an as Record<string, unknown>)[k]));
        chanDoan.push(`${c.ma}: ${khac.length ? `LỆCH mã (${khac.join(", ")})` : "khớp mã"}`);
      }
      continue;
    }
    assert.equal(typeof dap, "object", `${c.ma}: ${String(dap)}`);
    assert.deepEqual(dap, c.dap_an, `${c.ma}: đáp án (mã thật)`);
    daChay++;
  }
  // Siết (ADR-0109 kế hoạch C6): ca CHỜ xác nhận cũng phải khớp mã — lệch là đỏ, không chỉ in chẩn đoán.
  assert.deepEqual(chanDoan.filter((x) => !x.endsWith(": khớp mã")), [], "mọi ca (kể cả chờ xác nhận) phải khớp mã thật");
  t.diagnostic(`sửa số khách — đã chạy trên mã thật: ${daChay} ca đã xác nhận; chờ xác nhận: ${cho.length} (${chanDoan.join(" | ")}); hoa hồng chỉ trên giấy: ${giay.join(", ") || "không"}`);
  console.log(`sổ vàng sửa số khách lớp 2: đã chạy ${daChay}; chờ xác nhận ${cho.length}: ${chanDoan.join(" | ")}; hoa hồng chỉ trên giấy: ${giay.join(", ") || "không"}`);
  if (daChay === 0) t.todo("chưa có ca sửa số khách nào được Kế toán / chủ dự án xác nhận — đường văn phòng sửa số khách CHƯA được phát hành theo sổ vàng (Hiến chương 5.17)");
});

test("sổ vàng golden/sua-so-khach-van-phong.json: hai khoá đáp án mới (canh_bao_khuyen_mai, lich_su_so_khach) — điều kiện của chủ (ADR-0114): Kế toán xem lại; AI không tự xác nhận", (t) => {
  const cases = load();
  const daXem = cases.filter((c) => c.xac_nhan_khoa_moi.trang_thai === "da_xac_nhan").map((c) => c.ma);
  const msg = `hai khoá mới đã được Kế toán xem lại: ${daXem.length}/${cases.length} ca${daXem.length ? ` (${daXem.join(", ")})` : ""}`;
  t.diagnostic(msg);
  console.log(`sổ vàng sửa số khách: ${msg}`);
  if (daXem.length === 0) t.todo("chưa có ca nào Kế toán xem lại hai khoá mới (canh_bao_khuyen_mai, lich_su_so_khach) — điều kiện của chủ ở ADR-0114; không chặn phát hành, chỉ ghi nhận");
});
