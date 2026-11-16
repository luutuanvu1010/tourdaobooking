// Sổ vàng golden/phi-dua-don-chon.json (ADR-0214: phí đưa đón do nhân viên văn phòng chọn; Hiến chương 5.17). Lớp 1:
// mỗi ca tự cân (bắt CA MẪU viết sai) — mức thuộc danh sách hoặc «Số khác» trong trần, số lượng đúng quy ước, tiền = đơn giá × số lượng, tổng = tổng các lượt, 0 đồng ⇔ «Miễn phí»,
// chưa chọn hoặc bị từ chối ⇒ không xác nhận được và tổng null (không bao giờ 0). Lớp 2: chạy từng ca qua luật thuần src/shared/phi-don-chon.ts; chỉ ca `da_xac_nhan` được tính là chuẩn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isISODate } from "./shared/vn-date.ts";
import { kiemMucChon, tinhPhiChon } from "./shared/phi-don-chon.ts";
import { payingGuests, type PaxCode } from "./shared/order-lines.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
type Chon = { loai: "DANH_SACH" | "SO_KHAC"; so_tien: number } | null;
type Chang = { chieu: "OUT" | "RETURN"; xe_rieng: boolean; khach: Record<string, number>; chon: Chon; so_nguoi_rieng?: number };
type KetQua = { ket_qua: "CO_PHI" | "TU_CHOI" | "CHUA_CHON"; ly_do?: string; don_gia?: number; so_luong?: number; tien?: number; nhan_bien_nhan?: string | null };
type Ca = {
  ma: string; mo_ta: string; xac_nhan: { trang_thai: string };
  dau_vao: { ngay_xac_nhan: string; ben_dat: string; chang: Chang[]; giam_gia?: number };
  dap_an: { ap_dung: boolean; chang: KetQua[]; tong_phi_don: number | null; xac_nhan_duoc: boolean; [k: string]: unknown };
};
const so = JSON.parse(readFileSync(join(ROOT, "golden/phi-dua-don-chon.json"), "utf8")) as { luat: string; danh_sach_muc: number[]; tran: number; ngay_bat_dau_ap: string; cac_ca: Ca[] };

test("sổ vàng phí đón chọn — khuôn chung", () => {
  assert.equal(so.luat, "phi-dua-don-chon");
  assert.deepEqual(so.danh_sach_muc, [0, 5000, 10000, 15000, 20000, 30000, 50000, 100000], "danh sách đúng lời chủ 16/11 (thêm «Miễn phí» theo đặc tả đã duyệt)");
  assert.equal(so.tran, 5_000_000);
  assert.ok(isISODate(so.ngay_bat_dau_ap));
  const ma = so.cac_ca.map((c) => c.ma);
  assert.equal(new Set(ma).size, ma.length, "mã ca không trùng");
  assert.ok(ma.length >= 15);
});

test("sổ vàng phí đón chọn — mỗi ca tự cân (lớp 1)", () => {
  for (const ca of so.cac_ca) {
    const { dau_vao: v, dap_an: d } = ca;
    assert.ok(["cho_xac_nhan", "da_xac_nhan"].includes(ca.xac_nhan.trang_thai), ca.ma);
    assert.equal(d.ap_dung, v.ngay_xac_nhan >= so.ngay_bat_dau_ap, `${ca.ma}: áp dụng theo ngày xác nhận`);
    if (!d.ap_dung) {
      assert.deepEqual(d.chang, [], `${ca.ma}: chưa áp thì không có dòng phí`);
      assert.equal(d.tong_phi_don, 0);
      assert.equal(d.xac_nhan_duoc, true);
      continue;
    }
    assert.equal(d.chang.length, v.chang.length, ca.ma);
    v.chang.forEach((c, i) => {
      const k = d.chang[i]!;
      const tinhTien = (c.khach.nguoi_lon ?? 0) + (c.khach.tre_em ?? 0) + (c.khach.cao_tuoi ?? 0);
      if (c.chon === null) return assert.equal(k.ket_qua, "CHUA_CHON", `${ca.ma}#${i}`);
      const hopLe = c.chon.loai === "DANH_SACH" ? so.danh_sach_muc.includes(c.chon.so_tien) : Number.isInteger(c.chon.so_tien) && c.chon.so_tien >= 1 && c.chon.so_tien <= so.tran;
      if (!hopLe) return assert.equal(k.ket_qua, "TU_CHOI", `${ca.ma}#${i}`);
      const soLuong = c.xe_rieng ? 1 : c.chieu === "RETURN" && c.so_nguoi_rieng !== undefined ? Math.min(c.so_nguoi_rieng, tinhTien) : tinhTien;
      assert.equal(k.ket_qua, "CO_PHI", `${ca.ma}#${i}`);
      assert.equal(k.don_gia, c.chon.so_tien, `${ca.ma}#${i}: đơn giá = mức đã chọn`);
      assert.equal(k.so_luong, soLuong, `${ca.ma}#${i}: số lượng`);
      assert.equal(k.tien, k.don_gia! * k.so_luong!, `${ca.ma}#${i}: tiền`);
      assert.equal(k.nhan_bien_nhan === "Miễn phí", k.don_gia === 0, `${ca.ma}#${i}: 0 đồng ⇔ «Miễn phí»`);
    });
    const du = d.chang.every((k) => k.ket_qua === "CO_PHI");
    assert.equal(d.xac_nhan_duoc, du, `${ca.ma}: xác nhận được ⇔ mọi lượt đã chọn hợp lệ`);
    assert.equal(d.tong_phi_don, du ? d.chang.reduce((s, k) => s + k.tien!, 0) : null, `${ca.ma}: tổng (thiếu ⇒ null, không bao giờ 0)`);
  }
});

test("sổ vàng phí đón chọn — ca có tiền đơn tự cân", () => {
  const ca = (ma: string) => so.cac_ca.find((c) => c.ma === ma)!.dap_an as Ca["dap_an"] & Record<string, Record<string, number>>;
  const t = ca("SV-PC-12").tien_don!;
  assert.equal(t.gia_dai_ly, t.thanh_tien_dich_vu! - t.hoa_hong!);
  assert.equal(t.tong_don, t.thanh_tien_dich_vu! + ca("SV-PC-12").tong_phi_don!);
  assert.equal(t.tong_cong_no_dai_ly, t.gia_dai_ly! + ca("SV-PC-12").tong_phi_don!, "phí đón cộng đủ vào công nợ, không trừ hoa hồng");
  const g = ca("SV-PC-13").chia_phan!;
  assert.equal(g.tour_dao, ca("SV-PC-13").tong_phi_don, "giảm giá không trừ vào phí đón");
  assert.equal(g.nguoi_ban_dich_vu, g.nguoi_ban_dich_vu_truoc_giam! - g.giam_gia!);
  assert.equal(g.tong_don, g.nguoi_ban_dich_vu! + g.tour_dao!);
  assert.equal(g.giam_gia_toi_da, g.nguoi_ban_dich_vu_truoc_giam, "trần giảm giá không gồm phí đón");
  const s = ca("SV-PC-11").sau_khi_sua_so_khach!;
  assert.equal(s.tong_phi_don, s.don_gia_da_chon! * s.nguoi_lon!, "sửa số khách tính lại theo mức đã chọn");
  assert.equal(ca("SV-PC-15").sau_khi_them_chieu_ve!.tong_phi_don, ca("SV-PC-15").tong_phi_don, "thêm lượt đón sau xác nhận không đổi tiền");
});

const MA_BAT_BUOC = ["SV-PC-01", "SV-PC-02", "SV-PC-03", "SV-PC-04", "SV-PC-05", "SV-PC-06", "SV-PC-07", "SV-PC-08", "SV-PC-09", "SV-PC-10", "SV-PC-11", "SV-PC-12", "SV-PC-13", "SV-PC-14", "SV-PC-15"];
const MA_PAX: Record<string, PaxCode> = { nguoi_lon: "adult", tre_em: "child", cao_tuoi: "senior", em_be: "infant" };
const LY_DO_LOI: Record<string, string> = { VUOT_TRAN: "VUOT_TRAN", SO_KHAC_KHONG_HOP_LE: "KHONG_HOP_LE" };

test("sổ vàng phí đón chọn — lớp 2: chạy qua luật thuần của mã", () => {
  const daXacNhan = so.cac_ca.filter((c) => c.xac_nhan.trang_thai === "da_xac_nhan");
  for (const ma of MA_BAT_BUOC) assert.ok(daXacNhan.some((c) => c.ma === ma), `${ma}: ca bắt buộc phải có và đã xác nhận`);
  for (const ca of daXacNhan) {
    const { dau_vao: v, dap_an: d } = ca;
    if (!d.ap_dung) continue; // công tắc nằm ở máy chủ
    const tong: (number | null)[] = [];
    v.chang.forEach((c, i) => {
      const k = d.chang[i]!;
      if (c.chon === null) { assert.equal(k.ket_qua, "CHUA_CHON", `${ca.ma}#${i}`); tong.push(null); return; }
      const pax: Partial<Record<PaxCode, number>> = {};
      for (const [m, n] of Object.entries(c.khach)) pax[MA_PAX[m]!] = n;
      const kiem = kiemMucChon({ loai: c.chon.loai, soTien: c.chon.so_tien });
      if (!kiem.ok) {
        assert.equal(k.ket_qua, "TU_CHOI", `${ca.ma}#${i}`);
        if (k.ly_do) assert.equal(kiem.loi, LY_DO_LOI[k.ly_do], `${ca.ma}#${i}: lý do`);
        tong.push(null); return;
      }
      assert.equal(k.ket_qua, "CO_PHI", `${ca.ma}#${i}`);
      const t = tinhPhiChon({ muc: kiem.muc, xeRieng: c.xe_rieng, direction: c.chieu, soKhachTinhTien: payingGuests(pax), paxOverride: c.so_nguoi_rieng ?? null });
      assert.ok(t, `${ca.ma}#${i}: có dòng phí`);
      assert.equal(t.donGia, k.don_gia, `${ca.ma}#${i}: đơn giá`);
      assert.equal(t.soLuong, k.so_luong, `${ca.ma}#${i}: số lượng`);
      assert.equal(t.tien, k.tien, `${ca.ma}#${i}: tiền`);
      tong.push(t.tien);
    });
    const du = tong.every((t) => t !== null);
    assert.equal(du, d.xac_nhan_duoc, `${ca.ma}: xác nhận được`);
    assert.equal(du ? tong.reduce<number>((s, t) => s + t!, 0) : null, d.tong_phi_don, `${ca.ma}: tổng`);
  }
});
