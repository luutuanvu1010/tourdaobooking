// ADR-0161 Đ3 (Task 1) — LUẬT THUẦN «giới hạn nhập mức hoa hồng»: trần phần trăm, bước số tiền. Một tệp dùng ở máy chủ (route ghi mức của `pricing`) và giao diện (hộp nhập, trang giới hạn).
// Không I/O, không import module. Task 2 thêm `mucVuotGiaBan` (hoa hồng không vượt thành tiền lúc nhập). Số 0 luôn được nhận (trẻ em không hưởng thì gõ 0). Chỉ áp cho SỐ MỚI nhập: dòng đã có và đơn đã chụp không bị áp lại.
// Câu từ chối đúng từng chữ theo kế hoạch (số định dạng bằng `nhanTyLeBp`, `nhanDong` của sổ đại lý).
import { parseUnit, type Prices } from "./order-lines.ts";
import { nhanDong, nhanTyLeBp } from "./so-dai-ly-nhan.ts";

/** Giới hạn đang hiệu lực: trần phần trăm (phần vạn, 5000 = 50%) và bước số tiền (đồng). */
export interface GioiHanNhap { tranTyLeBp: number; buocTien: number }

/**
 * Số mới nhập của MỘT mức: `tyLeBp` (kiểu phần trăm, null khi không phải) và `soTien` (các số đồng của kiểu số tiền — người lớn, trẻ em, người cao tuổi; chỉ các số có khai).
 * Trả câu tiếng Việt khi vi phạm (phần trăm trước, rồi số tiền theo thứ tự), null khi hợp lệ. `0` luôn hợp lệ.
 */
export function viPhamGioiHanNhap(m: { tyLeBp: number | null; soTien: readonly number[] }, gh: GioiHanNhap): string | null {
  if (m.tyLeBp !== null && m.tyLeBp > gh.tranTyLeBp) return `Phần trăm không quá ${nhanTyLeBp(gh.tranTyLeBp)}.`;
  if (m.soTien.some((x) => x % gh.buocTien !== 0)) return `Số tiền phải chia hết cho ${nhanDong(gh.buocTien)}đ (không trả thì gõ 0).`;
  return null;
}

/** Mức đang nhập ở hộp, dạng thân gửi máy chủ (người lớn LUÔN ở `moiKhach`; `theoLoai` chỉ có khi «Riêng từng loại khách»). */
export type MucNhap = { kieu: "RATE"; tyLeBp: number } | { kieu: "PER_PAX"; moiKhach: number; theoLoai?: { treEm: number; nguoiCaoTuoi: number } | null };
/** Mức của một dòng đã có, khuôn DTO `CommissionRuleDto` (số người lớn ở `moiKhach`; `theoLoai` có thêm `nguoiLon` thì dư, không dùng). */
export interface MucDongCu { kieu: "RATE" | "PER_PAX"; tyLeBp: number | null; moiKhach: number | null; theoLoai?: { treEm: number; nguoiCaoTuoi: number } | null }

/** Số mới của MỘT mức theo khuôn `viPhamGioiHanNhap`: phần trăm (kiểu phần trăm), các số đồng (người lớn, rồi trẻ em và người cao tuổi nếu có). Khớp cách máy chủ gom ở `kiemSoMucMoi`. */
export const soCuaMucNhap = (m: MucNhap): { tyLeBp: number | null; soTien: number[] } =>
  m.kieu === "RATE" ? { tyLeBp: m.tyLeBp, soTien: [] } : { tyLeBp: null, soTien: [m.moiKhach, ...(m.theoLoai ? [m.theoLoai.treEm, m.theoLoai.nguoiCaoTuoi] : [])] };

/** Số của mức mới khác số của dòng cũ? (kiểu, phần trăm, số người lớn, số theo loại — KHÔNG so ngày, ghi chú). Một bản cho trình duyệt của `cungMuc` ở máy chủ, chỉ để báo sớm. */
export function mucKhacDongCu(cu: MucDongCu, moi: MucNhap): boolean {
  if (cu.kieu !== moi.kieu) return true;
  if (moi.kieu === "RATE") return cu.tyLeBp !== moi.tyLeBp;
  if (cu.moiKhach !== moi.moiKhach) return true;
  const a = cu.theoLoai ?? null, b = moi.theoLoai ?? null;
  if (!a || !b) return Boolean(a) !== Boolean(b);
  return a.treEm !== b.treEm || a.nguoiCaoTuoi !== b.nguoiCaoTuoi;
}

/**
 * Báo SỚM ở hộp nhập (máy chủ vẫn quyết và đọc giới hạn mới nhất): `gh` null (chưa đọc được) ⇒ null. Có `cu` (hộp Sửa) mà số không đổi ⇒ null, để dòng cũ vượt giới hạn mới vẫn sửa được ngày
 * (đúng route Sửa: chỉ kiểm khi `!cungMuc`). Thêm và Đổi không truyền `cu`: luôn kiểm số mới.
 */
export function baoSomGioiHan(gh: GioiHanNhap | null, moi: MucNhap, cu?: MucDongCu): string | null {
  if (gh === null) return null;
  if (cu !== undefined && !mucKhacDongCu(cu, moi)) return null;
  const { tyLeBp, soTien } = soCuaMucNhap(moi);
  return viPhamGioiHanNhap({ tyLeBp, soTien }, { tranTyLeBp: gh.tranTyLeBp, buocTien: gh.buocTien });
}

type Ket<T> = { ok: true; value: T } | { ok: false; message: string };
const laSoNguyenTrong = (v: unknown, tu: number, den: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= tu && v <= den;

/**
 * Thân `POST /api/pricing/gioi-han-nhap`: { tranTyLeBp (1…10000), buocTien (1…1.000.000), tuLuc }. `tuLuc` = mốc hiệu lực của dòng giới hạn mà hộp đã đọc (khoá lạc quan: người khác vừa đổi ⇒ 409).
 */
export function kiemThanGioiHan(raw: unknown): Ket<GioiHanNhap & { tuLuc: string }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Thiếu thông tin giới hạn nhập." };
  const b = raw as Record<string, unknown>;
  if (!laSoNguyenTrong(b.tranTyLeBp, 1, 10_000)) return { ok: false, message: "Trần phần trăm phải là số nguyên phần vạn từ 1 tới 10.000 (100%)." };
  if (!laSoNguyenTrong(b.buocTien, 1, 1_000_000)) return { ok: false, message: "Bước số tiền phải là số nguyên đồng từ 1 tới 1.000.000." };
  if (typeof b.tuLuc !== "string" || b.tuLuc.length === 0 || b.tuLuc.length > 40) return { ok: false, message: "Thiếu mốc của giới hạn đang hiệu lực — tải lại trang rồi gửi lại." };
  return { ok: true, value: { tranTyLeBp: b.tranTyLeBp, buocTien: b.buocTien, tuLuc: b.tuLuc } };
}

/** Giá bán lẻ hiệu lực của dịch vụ, ba loại có số tiền hoa hồng (em bé không có ô). `null` = loại đó chưa có giá. */
export type GiaBanLe = Pick<Prices, "adult" | "child" | "senior">;

/**
 * ADR-0161 Đ4 — hoa hồng KHÔNG vượt thành tiền, kiểm lúc NHẬP cho dòng phạm vi MỘT dịch vụ tính bằng số tiền. Trả câu tiếng Việt khi vượt, null khi nhận được. Mọi so sánh là «lớn hơn» (bằng giá thì nhận).
 * - Dịch vụ tính theo nhóm / lượt (`per5Pax`…): chỉ so `moiKhach` (số mỗi lượt) với giá mỗi lượt (`gia.adult`); số theo loại bị bỏ qua (đúng `hoaHongTheoLuot`: mỗi lượt lấy số người lớn).
 * - Theo người, «Mọi khách như nhau» (`theoLoai` null): so với giá CAO NHẤT trong các loại có giá — chỉ chặn lỗi gõ rõ ràng, không cản dịch vụ trẻ em miễn phí (người soạn chọn, đặc tả 3.C).
 * - Theo người, «Riêng từng loại khách»: mỗi số so với giá của đúng loại đó; 0 đ là có giá, loại chưa có giá (null) thì bỏ qua; báo loại đầu tiên vượt (người lớn, trẻ em, người cao tuổi).
 * - Đơn vị chưa hỗ trợ hoặc dịch vụ chưa có giá nào: bỏ qua (nhập được).
 */
export function mucVuotGiaBan(v: { unit: string; gia: GiaBanLe; moiKhach: number; theoLoai: { treEm: number; nguoiCaoTuoi: number } | null; ten: string }): string | null {
  const dv = parseUnit(v.unit);
  if (dv.kind === "unknown") return null;
  const cau = (a: number, loai: string, gia: number) => `Hoa hồng ${nhanDong(a)}đ của ${loai} lớn hơn giá bán ${nhanDong(gia)}đ của «${v.ten}».`;
  if (dv.kind === "group") return v.gia.adult !== null && v.moiKhach > v.gia.adult ? cau(v.moiKhach, "mỗi lượt", v.gia.adult) : null;
  if (v.theoLoai === null) {
    const coGia = [v.gia.adult, v.gia.child, v.gia.senior].filter((x): x is number => x !== null);
    if (coGia.length === 0) return null;
    const cao = Math.max(...coGia);
    return v.moiKhach > cao ? `Hoa hồng ${nhanDong(v.moiKhach)}đ lớn hơn giá bán cao nhất ${nhanDong(cao)}đ của «${v.ten}».` : null;
  }
  const theoLoai: readonly (readonly [number, string, number | null])[] = [
    [v.moiKhach, "người lớn", v.gia.adult], [v.theoLoai.treEm, "trẻ em", v.gia.child], [v.theoLoai.nguoiCaoTuoi, "người cao tuổi", v.gia.senior],
  ];
  for (const [so, loai, gia] of theoLoai) if (gia !== null && so > gia) return cau(so, loai, gia);
  return null;
}
