// Bài kiểm hàm tính phí một lượt đón (ADR-0218 Đ1.1, kế hoạch Task 7): chạy HẾT ca `da_xac_nhan` của sổ vàng `golden/phi-dua-don-gia-goc.json` (đúng từng đồng),
// rồi phủ từng nhóm trong `khoang_trong_chua_co_ca` bằng bài dẫn điều ADR. Dữ liệu tự tạo, không tên thật. Không sửa sổ vàng cho khớp mã.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tinhPhiLuotDon, soLuongLuot, type BoiCanh, type DauVaoLuotDon, type KetQuaLuot } from "./phi-don-gia-goc-rules.ts";
import type { ChuongTrinh } from "./chuong-trinh-phi-don-rules.ts";
import { payingGuests } from "../../shared/order-lines.ts";

const g = JSON.parse(readFileSync(new URL("../../../golden/phi-dua-don-gia-goc.json", import.meta.url), "utf8"));
type CT = { ten: string; pham_vi: "TAT_CA" | "DICH_VU" | "DOI_TAC"; danh_sach: string[]; tu: string; den: string; gom_xe_rieng: boolean };
const ct = (ma: string, c: CT, i: number): ChuongTrinh => ({
  id: ma, name: c.ten, scope: c.pham_vi === "TAT_CA" ? "ALL" : c.pham_vi === "DICH_VU" ? "SERVICES" : "PARTNERS", tripFrom: c.tu, tripTo: c.den, includePrivate: c.gom_xe_rieng,
  createdAt: `2026-11-01T00:00:${String(i).padStart(2, "0")}.000Z`, services: c.pham_vi === "DICH_VU" ? c.danh_sach : [], parties: c.pham_vi === "DOI_TAC" ? c.danh_sach : [],
});
const giaGoc = new Map<string, { moiKhach: number | null; xeRieng: number | null }>(Object.entries(g.gia_goc as Record<string, any>).map(([k, v]) => [k, { moiKhach: v.moi_khach, xeRieng: v.xe_rieng }]));
function boiCanh(benDat: string, chuongTrinh: readonly ChuongTrinh[]): BoiCanh {
  const b = g.ben_dat[benDat];
  const cap = b.cap === null || b.loai === "KHACH_LE" ? { loai: "KHONG_CAP" as const } : b.cap === "HAI_CAP" ? { loai: "HAI_CAP" as const } : { loai: "CO_CAP" as const, tierCode: b.cap as string };
  return { bookerPartyId: benDat, cap, mucGiam: cap.loai === "CO_CAP" ? (g.muc_giam_theo_cap[cap.tierCode] ?? null) : null, giaGoc, chuongTrinh };
}
const luotCua = (l: any, i: number): DauVaoLuotDon => ({
  luotKey: String(i), catalogCode: l.dich_vu, direction: l.chieu, xeRieng: l.xe_rieng, pickupDate: l.ngay_don,
  soKhachTinhTien: payingGuests({ adult: l.khach.nguoi_lon, child: l.khach.tre_em, senior: l.khach.cao_tuoi }), paxOverride: l.so_nguoi_rieng ?? null,
  doiTay: l.doi_tay ? { donGia: l.doi_tay.don_gia, lyDo: l.doi_tay.ly_do, nguoi: "nv1" } : null,
});

test("sổ vàng: mọi ca da_xac_nhan có đáp án lượt — nguồn, đơn giá, số lượng, tiền, lý do, giá gốc, cấp, mức giảm, chương trình khớp ĐÚNG TỪNG ĐỒNG", () => {
  let soCa = 0, soLuot = 0;
  for (const ca of g.cac_ca) {
    assert.equal(ca.xac_nhan.trang_thai, "da_xac_nhan", `${ca.ma} chưa được xác nhận`);
    const dapAn = ca.dap_an?.luot ?? [];
    const dauVao = ca.dau_vao?.luot;
    if (!dauVao || dapAn.length === 0 || ca.dap_an.ap_dung === false) continue; // GG-16 (Task 8), GG-19 (Task 8)
    const tatCa: Record<string, CT> = { ...g.chuong_trinh, ...(ca.dau_vao.chuong_trinh_them ?? {}) };
    const ds = (ca.dau_vao.chuong_trinh_bat as string[]).map((m, i) => ct(m, tatCa[m]!, i));
    const b = boiCanh(ca.dau_vao.ben_dat, ds);
    assert.equal(dapAn.length, dauVao.length, ca.ma);
    let tong = 0;
    dauVao.forEach((l: any, i: number) => {
      const kq = tinhPhiLuotDon(luotCua(l, i), b) as KetQuaLuot | null;
      const e = dapAn[i];
      assert.ok(kq, `${ca.ma}[${i}] không ra kết quả`);
      if (e.ket_qua === "THIEU") { assert.deepEqual(kq, { ketQua: "THIEU", lyDo: e.ly_do }, `${ca.ma}[${i}]`); return; }
      assert.equal(kq.ketQua, "CO_PHI", `${ca.ma}[${i}]`);
      if (kq.ketQua !== "CO_PHI") return;
      assert.equal(kq.nguon, e.nguon, `${ca.ma}[${i}] nguồn`);
      assert.equal(kq.donGia, e.don_gia, `${ca.ma}[${i}] đơn giá`);
      assert.equal(kq.soLuong, e.so_luong, `${ca.ma}[${i}] số lượng`);
      assert.equal(kq.tien, e.tien, `${ca.ma}[${i}] tiền`);
      if (e.ly_do !== undefined) assert.equal(kq.lyDo, e.ly_do, `${ca.ma}[${i}] lý do`);
      if (e.nguon === "GIA_GOC") {
        assert.equal(kq.giaGoc, e.gia_goc, `${ca.ma}[${i}] giá gốc`);
        assert.equal(kq.tierCode, e.cap, `${ca.ma}[${i}] cấp`);
        assert.equal(kq.mucGiam, e.muc_giam, `${ca.ma}[${i}] mức giảm`);
      }
      if (e.nguon === "CHUONG_TRINH") assert.equal(kq.chuongTrinh?.id, e.chuong_trinh, `${ca.ma}[${i}] chương trình`);
      tong += kq.tien; soLuot++;
    });
    if (ca.dap_an.tong !== null) assert.equal(tong, ca.dap_an.tong, `${ca.ma} tổng`);
    soCa++;
  }
  assert.ok(soCa === 19 && soLuot >= 15, `chỉ chạy ${soCa} ca, ${soLuot} lượt`);
});

const KHACH_LE = boiCanh("KHACH_LE", []);
const goc = (over: Partial<DauVaoLuotDon> = {}): DauVaoLuotDon => ({ luotKey: "0", catalogCode: "TOUR_A", direction: "OUT", xeRieng: false, pickupDate: "2026-12-12", soKhachTinhTien: 2, paxOverride: null, doiTay: null, ...over });
const ctA = (over: Partial<ChuongTrinh> = {}): ChuongTrinh => ({ id: "P1", name: "Miễn phí", scope: "SERVICES", tripFrom: "2026-12-01", tripTo: "2026-12-31", includePrivate: false, createdAt: "2026-11-01T00:00:00.000Z", services: ["TOUR_A"], parties: [], ...over });
const coPhi = (k: KetQuaLuot | null) => { assert.ok(k && k.ketQua === "CO_PHI", JSON.stringify(k)); return k as Extract<KetQuaLuot, { ketQua: "CO_PHI" }>; };

test("Đ1.1: đổi tay thắng chương trình; HAI_CAP + chương trình khớp ⇒ 0 (không giữ); HAI_CAP + đổi tay ⇒ số đổi", () => {
  const b = { ...boiCanh("DT_HAI_CAP", [ctA()]) };
  const k = coPhi(tinhPhiLuotDon(goc({ doiTay: { donGia: 80000, lyDo: "x", nguoi: "n" } }), b));
  assert.equal(k.nguon, "DOI_TAY"); assert.equal(k.tien, 160000);
  assert.equal(coPhi(tinhPhiLuotDon(goc(), b)).nguon, "CHUONG_TRINH");
  assert.deepEqual(tinhPhiLuotDon(goc(), boiCanh("DT_HAI_CAP", [])), { ketQua: "THIEU", lyDo: "HAI_CAP" });
});

// ---- khoảng trống 1: xe riêng ----
test("khoảng trống · xe riêng (Đ1.1.3): ô giá xe riêng trống ⇒ O_TRONG; đối tác hai cấp đi xe riêng ⇒ không giữ; xe riêng đổi tay được; xe riêng luôn số lượng 1", () => {
  assert.deepEqual(tinhPhiLuotDon(goc({ catalogCode: "TOUR_B", xeRieng: true }), KHACH_LE), { ketQua: "THIEU", lyDo: "O_TRONG" });
  const k = coPhi(tinhPhiLuotDon(goc({ xeRieng: true, soKhachTinhTien: 4 }), boiCanh("DT_HAI_CAP", [])));
  assert.equal(k.donGia, 300000); assert.equal(k.soLuong, 1); assert.equal(k.kind, "PER_TRIP"); assert.equal(k.tierCode, null);
  const d = coPhi(tinhPhiLuotDon(goc({ xeRieng: true, doiTay: { donGia: 250000, lyDo: "x", nguoi: "n" } }), KHACH_LE));
  assert.equal(d.nguon, "DOI_TAY"); assert.equal(d.tien, 250000);
  // xe riêng không dùng mức giảm của cấp dù có
  const c1 = coPhi(tinhPhiLuotDon(goc({ xeRieng: true }), boiCanh("DT_C1", [])));
  assert.equal(c1.donGia, 300000); assert.equal(c1.mucGiam, 0);
});

// ---- khoảng trống 2: trần ----
test("khoảng trống · trần (Đ1.5): trần áp lên ĐƠN GIÁ — thành tiền đi chung đông khách vượt 5.000.000 vẫn hợp lệ", () => {
  const b: BoiCanh = { ...KHACH_LE, giaGoc: new Map([["TOUR_A", { moiKhach: 500000, xeRieng: 5000000 }]]) };
  const k = coPhi(tinhPhiLuotDon(goc({ soKhachTinhTien: 50 }), b));
  assert.equal(k.donGia, 500000); assert.equal(k.tien, 25000000);
  assert.equal(coPhi(tinhPhiLuotDon(goc({ xeRieng: true }), b)).tien, 5000000);
  const d = coPhi(tinhPhiLuotDon(goc({ soKhachTinhTien: 50, doiTay: { donGia: 5000000, lyDo: "x", nguoi: "n" } }), b));
  assert.equal(d.tien, 250000000);
});
test("khoảng trống · trần: kiemDoiPhi nhận 5.000.000 và 0; từ chối 5.000.001, số âm, số lẻ, chuỗi, lý do rỗng, lý do quá 300", async () => {
  const { kiemDoiPhi } = await import("../../shared/phi-don-gia-goc.ts");
  assert.equal(kiemDoiPhi({ donGia: 5000000, lyDo: "x" }).ok, true);
  assert.equal(kiemDoiPhi({ donGia: 0, lyDo: "x" }).ok, true);
  for (const v of [{ donGia: 5000001, lyDo: "x" }, { donGia: -1, lyDo: "x" }, { donGia: 1.5, lyDo: "x" }, { donGia: "1000", lyDo: "x" }, { donGia: 1000, lyDo: "  " }, { donGia: 1000, lyDo: "x".repeat(301) }, null, []])
    assert.equal(kiemDoiPhi(v).ok, false, JSON.stringify(v));
  assert.equal(kiemDoiPhi({ donGia: 1000, lyDo: "x".repeat(300) }).ok, true);
});

// ---- khoảng trống 3: đếm khách ----
test("khoảng trống · đếm khách (ADR-0203 ĐB2): trẻ em và cao tuổi được tính, em bé không; so_nguoi_rieng lớn hơn số khách lấy số khách; số khách 0 ⇒ không dòng", () => {
  assert.equal(payingGuests({ adult: 1, child: 1, senior: 1, infant: 5 } as any), 3);
  assert.equal(coPhi(tinhPhiLuotDon(goc({ soKhachTinhTien: 3 }), KHACH_LE)).soLuong, 3);
  assert.equal(coPhi(tinhPhiLuotDon(goc({ direction: "RETURN", soKhachTinhTien: 2, paxOverride: 5 }), KHACH_LE)).soLuong, 2);
  assert.equal(coPhi(tinhPhiLuotDon(goc({ direction: "RETURN", soKhachTinhTien: 3, paxOverride: 1 }), KHACH_LE)).soLuong, 1);
  assert.equal(soLuongLuot(goc({ direction: "OUT", soKhachTinhTien: 3, paxOverride: 1 })), 3); // số người riêng chỉ cho chiều về
  assert.equal(tinhPhiLuotDon(goc({ soKhachTinhTien: 0 }), KHACH_LE), null);
  assert.equal(tinhPhiLuotDon(goc({ soKhachTinhTien: 0, doiTay: { donGia: 1000, lyDo: "x", nguoi: "n" } }), KHACH_LE), null);
  assert.equal(tinhPhiLuotDon(goc({ direction: "RETURN", soKhachTinhTien: 2, paxOverride: 0 }), KHACH_LE), null);
});

// ---- khoảng trống 4: thời gian ----
test("khoảng trống · thời gian (Đ2.2): khớp đúng ngày đầu và ngày cuối, ngoài khoảng một ngày thì không; nháp chưa có ngày đón không khớp", () => {
  const b = (c: ChuongTrinh): BoiCanh => ({ ...KHACH_LE, chuongTrinh: [c] });
  const c = ctA({ tripFrom: "2026-12-05", tripTo: "2026-12-10" });
  assert.equal(coPhi(tinhPhiLuotDon(goc({ pickupDate: "2026-12-05" }), b(c))).nguon, "CHUONG_TRINH");
  assert.equal(coPhi(tinhPhiLuotDon(goc({ pickupDate: "2026-12-10" }), b(c))).nguon, "CHUONG_TRINH");
  assert.equal(coPhi(tinhPhiLuotDon(goc({ pickupDate: "2026-12-04" }), b(c))).nguon, "GIA_GOC");
  assert.equal(coPhi(tinhPhiLuotDon(goc({ pickupDate: "2026-12-11" }), b(c))).nguon, "GIA_GOC");
  assert.equal(coPhi(tinhPhiLuotDon(goc({ pickupDate: null }), b(c))).nguon, "GIA_GOC");
});
test("khoảng trống · thời gian: hai chương trình cùng khớp ⇒ chụp chương trình tạo sớm nhất; cấp chưa có dòng giảm ⇒ giảm 0", () => {
  const sau = ctA({ id: "P-SAU", createdAt: "2026-11-05T00:00:00.000Z" }), som = ctA({ id: "P-SOM", createdAt: "2026-11-02T00:00:00.000Z" });
  assert.equal(coPhi(tinhPhiLuotDon(goc(), { ...KHACH_LE, chuongTrinh: [sau, som] })).chuongTrinh?.id, "P-SOM");
  const b: BoiCanh = { ...KHACH_LE, cap: { loai: "CO_CAP", tierCode: "C9" }, mucGiam: null };
  const k = coPhi(tinhPhiLuotDon(goc(), b));
  assert.equal(k.mucGiam, 0); assert.equal(k.donGia, 50000); assert.equal(k.tierCode, "C9");
});
test("khoảng trống · thời gian: chương trình ĐÃ kết thúc không có trong danh sách hiệu lực ⇒ tính tiền; chương trình tạo sau xác nhận không ảnh hưởng đơn đã chụp (chụp ở dòng phí — kiểm ở bài route, Task 8)", () => {
  assert.equal(coPhi(tinhPhiLuotDon(goc(), { ...KHACH_LE, chuongTrinh: [] })).nguon, "GIA_GOC");
});
