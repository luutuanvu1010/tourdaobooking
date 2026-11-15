// Sổ vàng golden/phi-dua-don.json (Hiến chương 5.17; ADR-0147, ADR-0203). CHƯA có mã phí đón, nên hôm nay chỉ có LỚP 1: mỗi ca tự cân (bắt CA MẪU viết sai) —
// khuôn, trạng thái xác nhận, dòng mức có thật và còn hiệu lực ngày xác nhận, tiền = đơn giá × số lượng, tổng = tổng các chặng, 0 đồng ⇔ nhãn «Miễn phí».
// LỚP 2 (từ Đợt B, Task 6): chạy ca đã xác nhận qua luật thuần `src/modules/pricing/phi-don-rules.ts`; chỉ ca "da_xac_nhan" được đếm, ca còn chờ là test.todo, và danh sách MA_BAT_BUOC canh để ca không lặng lẽ rơi — không «xanh vì rỗng».
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isISODate } from "./shared/vn-date.ts";
import { capCuaHoSoNgay, chonMucPhiDon, tinhPhiChang, type ChangTinhPhi, type DieuKienPhiDon, type MucPhiDon } from "./modules/pricing/phi-don-rules.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
type Muc = { id: string; kieu: "PER_PAX" | "PER_TRIP"; vung: string; cap: string | null; dich_vu: string | null; nhom: string | null; chieu: string | null; xe_rieng: boolean; tien: number; tu: string; den: string | null };
type Chang = { vung: string; dich_vu: string; chieu: "OUT" | "RETURN"; xe_rieng: boolean; so_nguoi_rieng?: number; khach: Record<string, number> };
type KetQua = { ket_qua: "CO_MUC" | "THIEU_MUC"; ly_do?: string; quy_tac?: string; kieu?: string; don_gia?: number; so_luong?: number; tien?: number; cap_da_chup?: string | null; nhan_bien_nhan?: string | null };
type Ca = {
  ma: string; mo_ta: string; nguon: string; xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null };
  dau_vao: { ngay_xac_nhan: string; ben_dat: { loai: string; cap: string | null }; chang: Chang[] };
  dap_an: { ap_dung: boolean; chang: KetQua[]; tong_phi_don: number | null; xac_nhan_duoc: boolean };
};
const so = JSON.parse(readFileSync(join(ROOT, "golden/phi-dua-don.json"), "utf8")) as {
  luat: string; ngay_bat_dau_ap: string; vung: Record<string, string>; cap: Record<string, string>; dich_vu: Record<string, { ten: string; nhom: string }>; bang_phi: Muc[]; cac_ca: Ca[];
};
const nguyenKhongAm = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 0;

test("sổ vàng phí đón — bảng phí mẫu đúng khuôn", () => {
  assert.equal(so.luat, "phi-dua-don");
  assert.ok(isISODate(so.ngay_bat_dau_ap));
  assert.equal(new Set(so.bang_phi.map((m) => m.id)).size, so.bang_phi.length, "mã dòng mức không trùng");
  for (const m of so.bang_phi) {
    assert.ok(m.vung in so.vung, `${m.id}: vùng bắt buộc và phải có trong danh sách`);
    assert.ok(nguyenKhongAm(m.tien), `${m.id}: tiền là số nguyên đồng ≥ 0`);
    assert.ok(isISODate(m.tu) && (m.den === null || (isISODate(m.den) && m.den >= m.tu)), `${m.id}: khoảng ngày`);
    assert.equal(m.xe_rieng, m.kieu === "PER_TRIP", `${m.id}: theo chuyến ⇔ xe riêng (ADR-0203 ĐB1)`);
    assert.ok(!(m.dich_vu && m.nhom), `${m.id}: không vừa dịch vụ vừa nhóm (ADR-0203 ĐB1)`);
    if (m.cap) assert.ok(m.cap in so.cap, `${m.id}: cấp`);
    if (m.dich_vu) assert.ok(m.dich_vu in so.dich_vu, `${m.id}: dịch vụ`);
  }
  // Đủ mức trước khi bật (ADR-0203 ĐB1): mỗi vùng có một dòng chung đi chung còn hiệu lực ngày bắt đầu áp.
  for (const v of Object.keys(so.vung)) {
    assert.ok(so.bang_phi.some((m) => m.vung === v && m.kieu === "PER_PAX" && !m.cap && !m.dich_vu && !m.nhom && !m.chieu && m.tu <= so.ngay_bat_dau_ap), `vùng ${v} thiếu dòng chung`);
  }
});

test("sổ vàng phí đón — mỗi ca tự cân (lớp 1)", () => {
  assert.ok(so.cac_ca.length >= 20, "phải có ít nhất 20 ca (ADR-0147: khoảng 12; ADR-0203: thêm ít nhất 9)");
  assert.equal(new Set(so.cac_ca.map((c) => c.ma)).size, so.cac_ca.length, "mã ca không trùng");
  for (const c of so.cac_ca) {
    assert.match(c.ma, /^SV-PD-\d{2}$/);
    assert.ok(c.mo_ta.length > 20 && c.nguon.length > 3, c.ma);
    assert.ok(["cho_xac_nhan", "da_xac_nhan"].includes(c.xac_nhan.trang_thai), c.ma);
    if (c.xac_nhan.trang_thai === "da_xac_nhan") assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay && isISODate(c.xac_nhan.ngay), `${c.ma}: ca đã xác nhận phải ghi người + ngày`);
    const ngay = c.dau_vao.ngay_xac_nhan;
    assert.ok(isISODate(ngay), c.ma);
    if (!c.dap_an.ap_dung) {
      assert.ok(ngay < so.ngay_bat_dau_ap, `${c.ma}: chưa áp chỉ khi xác nhận trước ngày bắt đầu áp`);
      assert.deepEqual([c.dap_an.chang.length, c.dap_an.tong_phi_don, c.dap_an.xac_nhan_duoc], [0, 0, true], c.ma);
      continue;
    }
    assert.ok(ngay >= so.ngay_bat_dau_ap, c.ma);
    assert.equal(c.dap_an.chang.length, c.dau_vao.chang.length, `${c.ma}: mỗi chặng một kết quả`);
    let tong = 0;
    let thieu = false;
    c.dau_vao.chang.forEach((ch, i) => {
      const k = c.dap_an.chang[i]!;
      assert.ok(ch.vung in so.vung && ch.dich_vu in so.dich_vu, `${c.ma} chặng ${i + 1}`);
      if (k.ket_qua === "THIEU_MUC") {
        assert.ok(k.ly_do === "KHONG_CO_MUC" || k.ly_do === "DAI_LY_HAI_CAP", `${c.ma}: lý do thiếu mức`);
        thieu = true;
        return;
      }
      const m = so.bang_phi.find((x) => x.id === k.quy_tac);
      assert.ok(m, `${c.ma}: dòng mức ${k.quy_tac} phải có trong bảng`);
      assert.ok(m.tu <= ngay && (m.den === null || ngay <= m.den), `${c.ma}: ${m.id} phải còn hiệu lực ngày ${ngay}`);
      assert.equal(m.vung, ch.vung, `${c.ma}: đúng vùng`);
      assert.equal(m.xe_rieng, ch.xe_rieng, `${c.ma}: xe riêng chỉ khớp dòng theo chuyến`);
      if (m.cap) assert.equal(m.cap, c.dau_vao.ben_dat.cap, `${c.ma}: đúng cấp`);
      if (m.dich_vu) assert.equal(m.dich_vu, ch.dich_vu, `${c.ma}: đúng dịch vụ`);
      if (m.nhom) assert.equal(m.nhom, so.dich_vu[ch.dich_vu]!.nhom, `${c.ma}: đúng nhóm`);
      if (m.chieu) assert.equal(m.chieu, ch.chieu, `${c.ma}: đúng chiều`);
      const khach = (ch.khach.nguoi_lon ?? 0) + (ch.khach.tre_em ?? 0) + (ch.khach.cao_tuoi ?? 0);
      const soLuong = m.kieu === "PER_TRIP" ? 1 : ch.chieu === "RETURN" && ch.so_nguoi_rieng != null ? Math.min(ch.so_nguoi_rieng, khach) : khach;
      assert.deepEqual([k.kieu, k.don_gia, k.so_luong, k.tien], [m.kieu, m.tien, soLuong, m.tien * soLuong], `${c.ma} chặng ${i + 1}: tiền = đơn giá × số lượng`);
      assert.equal(k.cap_da_chup, c.dau_vao.ben_dat.cap, `${c.ma}: chụp đúng cấp của bên đặt`);
      assert.equal(k.nhan_bien_nhan, k.tien === 0 ? "Miễn phí" : null, `${c.ma}: 0 đồng ⇔ «Miễn phí»`);
      tong += k.tien!;
    });
    assert.equal(c.dap_an.xac_nhan_duoc, !thieu, `${c.ma}: thiếu mức thì không xác nhận được`);
    assert.equal(c.dap_an.tong_phi_don, thieu ? null : tong, `${c.ma}: tổng = tổng các chặng; thiếu mức thì không có tổng (không lấy 0)`);
  }
});

test("sổ vàng phí đón — ca có tiền đơn tự cân (công nợ đại lý, chia phần)", () => {
  type Them = Ca["dap_an"] & { tien_don?: Record<string, number>; chia_phan?: Record<string, number> };
  const ca = (ma: string) => so.cac_ca.find((c) => c.ma === ma)!.dap_an as Them;
  const t = ca("SV-PD-25").tien_don!;
  assert.equal(t.gia_dai_ly, t.thanh_tien_dich_vu! - t.hoa_hong!);
  assert.equal(t.tong_don, t.thanh_tien_dich_vu! + ca("SV-PD-25").tong_phi_don!);
  assert.equal(t.tong_cong_no_dai_ly, t.gia_dai_ly! + ca("SV-PD-25").tong_phi_don!, "phí đón cộng đủ vào công nợ, không trừ hoa hồng (ADR-0203 ĐB3)");
  const p = ca("SV-PD-26").chia_phan!;
  assert.equal(p.tour_dao, ca("SV-PD-26").tong_phi_don, "phí đón thuộc phần của Tour Đảo");
  assert.equal(p.tong_don, p.nguoi_ban_dich_vu! + p.tour_dao!);
});

// ---- LỚP 2: luật thuần ra đúng đáp án (ADR-0203 ĐB1; Hiến chương 5.17) ----
const MA_BAT_BUOC = so.cac_ca.map((c) => c.ma).filter((ma) => !["SV-PD-22", "SV-PD-23", "SV-PD-24"].includes(ma));
const bangMuc = (): MucPhiDon[] => so.bang_phi.map((x) => {
  const dieuKien: DieuKienPhiDon = { ZONE: x.vung };
  if (x.cap) dieuKien.TIER = x.cap;
  if (x.dich_vu) dieuKien.SERVICE = x.dich_vu;
  if (x.nhom) dieuKien.SERVICE_GROUP = x.nhom;
  if (x.chieu) dieuKien.DIRECTION = x.chieu;
  if (x.xe_rieng) dieuKien.EXCLUSIVE = "1";
  return { id: x.id, kind: x.kieu, amount: x.tien, validFrom: x.tu, validTo: x.den, dieuKien };
});
/** Cấp của bên đặt đi qua ĐÚNG `capCuaHoSoNgay`: hai vai hai cấp dựng riêng cho ca `hai_cap`. */
function capCuaCa(ca: Ca): ReturnType<typeof capCuaHoSoNgay> {
  const bd = ca.dau_vao.ben_dat as Ca["dau_vao"]["ben_dat"] & { hai_cap?: string[] };
  const ngay = ca.dau_vao.ngay_xac_nhan;
  const gan = (roleTypeCode: string, tierCode: string) => ({ roleTypeCode, tierCode, validFrom: "2026-01-01", validTo: null });
  if (bd.loai !== "DOI_TAC") return capCuaHoSoNgay({ partyId: null, vai: [], ngay, gan: [], ganRieng: [] });
  if (bd.hai_cap) return capCuaHoSoNgay({ partyId: "p", vai: ["V1", "V2"], ngay, gan: [gan("V1", bd.hai_cap[0]!), gan("V2", bd.hai_cap[1]!)], ganRieng: [] });
  return capCuaHoSoNgay({ partyId: "p", vai: ["V1"], ngay, gan: bd.cap ? [gan("V1", bd.cap)] : [], ganRieng: [] });
}
for (const ca of so.cac_ca.filter((c) => c.xac_nhan.trang_thai !== "da_xac_nhan")) test.todo(`sổ vàng phí đón — lớp 2: ${ca.ma} chờ chủ xác nhận`);
test("sổ vàng phí đón — lớp 2: luật thuần ra đúng đáp án", () => {
  const bang = bangMuc();
  const chay = so.cac_ca.filter((c) => c.xac_nhan.trang_thai === "da_xac_nhan");
  assert.ok(chay.length >= 25, `chỉ ${chay.length} ca đã xác nhận chạy được`);
  for (const ma of MA_BAT_BUOC) assert.ok(chay.some((c) => c.ma === ma), `ca bắt buộc ${ma} không được rơi khỏi lớp 2`);
  let soChang = 0;
  for (const c of chay) {
    if (!c.dap_an.ap_dung) { assert.equal(c.dap_an.chang.length, 0, c.ma); continue; }
    const ngay = c.dau_vao.ngay_xac_nhan;
    const cap = capCuaCa(c);
    const haiCap = cap.loai === "HAI_CAP";
    let tong = 0;
    let thieu = false;
    c.dau_vao.chang.forEach((ch, i) => {
      const k = c.dap_an.chang[i]!;
      const nhom = so.dich_vu[ch.dich_vu]!.nhom;
      const cc: ChangTinhPhi = { zoneCode: ch.vung, direction: ch.chieu, exclusive: ch.xe_rieng, catalogCode: ch.dich_vu, groupCode: nhom, tierCode: cap.loai === "CO_CAP" ? cap.tierCode : null };
      const nhan = `${c.ma} chặng ${i + 1}`;
      soChang += 1;
      if (haiCap) { assert.deepEqual([k.ket_qua, k.ly_do], ["THIEU_MUC", "DAI_LY_HAI_CAP"], `${nhan}: hai cấp ⇒ thiếu mức`); thieu = true; return; }
      const r = chonMucPhiDon({ chang: cc, ngay, muc: bang });
      if (k.ket_qua === "THIEU_MUC") { assert.deepEqual([r.trangThai, r.trangThai === "THIEU_MUC" ? r.lyDo : null], ["THIEU_MUC", k.ly_do], nhan); thieu = true; return; }
      assert.equal(r.trangThai, "CO_MUC", nhan);
      if (r.trangThai !== "CO_MUC") return;
      assert.equal(r.muc.id, k.quy_tac, `${nhan}: dòng mức`);
      const khach = (ch.khach.nguoi_lon ?? 0) + (ch.khach.tre_em ?? 0) + (ch.khach.cao_tuoi ?? 0);
      const t = tinhPhiChang({ muc: r.muc, direction: ch.chieu, soKhachTinhTien: khach, paxOverride: ch.so_nguoi_rieng ?? null });
      assert.ok(t, `${nhan}: phải ra dòng`);
      assert.deepEqual([t!.donGia, t!.soLuong, t!.tien], [k.don_gia, k.so_luong, k.tien], `${nhan}: đơn giá, số lượng, tiền`);
      tong += t!.tien;
    });
    assert.equal(c.dap_an.tong_phi_don, thieu ? null : tong, `${c.ma}: tổng`);
  }
  assert.ok(soChang >= 25, `chỉ ${soChang} chặng được chạy`);
});
