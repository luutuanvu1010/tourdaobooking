// GIÁ MÙA VỤ — luật thuần (ADR-0229, chủ duyệt 2026-11-22). MỘT nơi tính cho máy chủ và form xem trước; không I/O, không import `src/modules/`.
// Sổ vàng: `gia-mua-vu.so-vang.json` (Kế toán xác nhận — Hiến chương 5.17), bài `gia-mua-vu.test.ts`.
// Ngày là ngày dân sự Việt Nam dạng YYYY-MM-DD (so chuỗi được). Không nhân/chia 10000 ở tệp này (hàng rào src/hoa-hong-mot-nguon.test.ts).

export type PhamViMuaVu = "SERVICE" | "GROUP";

/** Một quy tắc giá mùa vụ như đọc từ bảng `ctl_seasonal_price` (Đ1). */
export interface QuyTacMuaVu {
  id: string;
  phamVi: PhamViMuaVu;
  /** Mã dịch vụ (SERVICE) hoặc mã nhóm (GROUP). */
  ma: string;
  tu: string;
  den: string;
  phanTram: number;
  soTien: number;
  daDuyet: boolean;
  daKetThuc: boolean;
}

const dangAp = (q: QuyTacMuaVu): boolean => q.daDuyet && !q.daKetThuc;
const trongKhoang = (q: { tu: string; den: string }, ngay: string): boolean => q.tu <= ngay && ngay <= q.den;

/**
 * Đ2 — quy tắc áp cho một dịch vụ ở một ngày đi: chỉ quy tắc ĐÃ DUYỆT, CHƯA KẾT THÚC, có khoảng chứa ngày; quy tắc theo mã dịch vụ thắng quy tắc theo nhóm
 * hiện hành; không cộng dồn. Không có ngày đi ⇒ null. Cùng mức chồng ngày đã bị chặn lúc nhập (Đ3) nên mỗi mức có tối đa một quy tắc; vẫn lấy quy tắc đầu tiên cho chắc.
 */
export function chonQuyTac(v: { maDichVu: string; maNhom: string | null; ngayDi: string | null; quyTac: readonly QuyTacMuaVu[] }): QuyTacMuaVu | null {
  if (!v.ngayDi) return null;
  const ngay = v.ngayDi;
  const ung = v.quyTac.filter((q) => dangAp(q) && trongKhoang(q, ngay));
  return ung.find((q) => q.phamVi === "SERVICE" && q.ma === v.maDichVu)
    ?? (v.maNhom === null ? undefined : ung.find((q) => q.phamVi === "GROUP" && q.ma === v.maNhom))
    ?? null;
}

/** Đ4 — công thức [10b]: làm tròn LÊN tới 1.000 đ của (gốc × (100 + %) / 100 + tiền), tính bằng số nguyên. */
export function apQuyTac(giaGoc: number, q: { phanTram: number; soTien: number }): number {
  return Math.ceil((giaGoc * (100 + q.phanTram) + q.soTien * 100) / 100_000) * 1000;
}

/**
 * Đ4 — giá sau mùa vụ của MỘT đơn giá. `giaGoc` = giá sau ghi đè Quản trị. Ngoại lệ đứng trước công thức: không quy tắc ⇒ giữ nguyên; giá 0 đ (miễn phí) ⇒ giữ 0 đ,
 * coi như không quy tắc; chưa có giá ⇒ giữ chưa có giá.
 */
export function tinhGiaMuaVu(v: { giaGoc: number | null; maDichVu: string; maNhom: string | null; ngayDi: string | null; quyTac: readonly QuyTacMuaVu[] }): {
  gia: number | null;
  quyTacId: string | null;
  soTang: number;
} {
  if (v.giaGoc === null || v.giaGoc === 0) return { gia: v.giaGoc, quyTacId: null, soTang: 0 };
  const q = chonQuyTac(v);
  if (!q) return { gia: v.giaGoc, quyTacId: null, soTang: 0 };
  const gia = apQuyTac(v.giaGoc, q);
  return { gia, quyTacId: q.id, soTang: gia - v.giaGoc };
}

/** Mã lỗi khi nhập quy tắc mới (Đ1), theo ĐÚNG thứ tự kiểm của ADR. */
export type LoiQuyTacMuaVu = "phan_tram" | "so_tien" | "khong_tang" | "vuot_tran" | "khoang_ngay" | "qua_khu";
const LA_NGAY = /^\d{4}-\d{2}-\d{2}$/;

/** Đ1 — kiểm một quy tắc mới (không gồm chồng ngày — `kiemChongNgay`). null = hợp lệ. Ngày sai dạng tính là `khoang_ngay`. */
export function kiemQuyTacMoi(
  v: { phanTram: unknown; soTien: unknown; tu: unknown; den: unknown },
  ctx: { tranPhanTram: number; homNay: string },
): LoiQuyTacMuaVu | null {
  if (typeof v.phanTram !== "number" || !Number.isInteger(v.phanTram) || v.phanTram < 0) return "phan_tram";
  if (typeof v.soTien !== "number" || !Number.isInteger(v.soTien) || v.soTien < 0) return "so_tien";
  if (v.phanTram === 0 && v.soTien === 0) return "khong_tang";
  if (v.phanTram > ctx.tranPhanTram) return "vuot_tran";
  if (typeof v.tu !== "string" || typeof v.den !== "string" || !LA_NGAY.test(v.tu) || !LA_NGAY.test(v.den) || v.den < v.tu) return "khoang_ngay";
  if (v.den < ctx.homNay) return "qua_khu";
  return null;
}

/** Đ3 — quy tắc cùng phạm vi, cùng mã, CHƯA KẾT THÚC (kể cả chờ duyệt) có khoảng chồng khoảng mới ⇒ id quy tắc trùng; không ⇒ null. */
export function kiemChongNgay(moi: { phamVi: PhamViMuaVu; ma: string; tu: string; den: string }, coSan: readonly QuyTacMuaVu[]): string | null {
  const trung = coSan.find((q) => !q.daKetThuc && q.phamVi === moi.phamVi && q.ma === moi.ma && q.tu <= moi.den && moi.tu <= q.den);
  return trung ? trung.id : null;
}

/**
 * Đ10 [10a] — cơ sở hoa hồng theo % của MỘT dịch vụ: Σ max(0, đơn giá thoả thuận − số tăng mùa vụ mỗi đơn vị) × số lượng HIỆN HÀNH. Số tăng trống (dòng trước
 * ADR-0229, dòng nhập tay) tính 0 ⇒ bằng thành tiền như cũ.
 */
export function coSoHoaHong(dong: readonly { donGia: number; soTang: number | null; soLuong: number }[]): number {
  return dong.reduce((t, d) => t + Math.max(0, d.donGia - (d.soTang ?? 0)) * d.soLuong, 0);
}

/**
 * Đ6 — đổi ngày đơn đã chụp: «cùng mùa» theo bản chụp. (a) chụp quy tắc Q ⇒ ngày mới trong khoảng của CHÍNH Q (dù Q đã kết thúc) và không quy tắc đang áp nào
 * khác thắng Q ở ngày mới; (b) chụp «không quy tắc» ⇒ ngày mới không có quy tắc đang áp. `quyTac` phải gồm cả Q (kể cả đã kết thúc); thiếu Q ⇒ không cùng mùa.
 */
export function cungMua(v: { quyTacDaChup: string | null; maDichVu: string; maNhom: string | null; ngayMoi: string | null; quyTac: readonly QuyTacMuaVu[] }): boolean {
  const apMoi = chonQuyTac({ maDichVu: v.maDichVu, maNhom: v.maNhom, ngayDi: v.ngayMoi, quyTac: v.quyTac });
  if (v.quyTacDaChup === null) return apMoi === null;
  const q = v.quyTac.find((x) => x.id === v.quyTacDaChup);
  if (!q || !v.ngayMoi || !trongKhoang(q, v.ngayMoi)) return false;
  return apMoi === null || apMoi.id === q.id;
}
