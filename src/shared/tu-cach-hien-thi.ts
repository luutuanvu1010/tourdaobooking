// Ô «Tư cách» ở màn Tạo đơn (ADR-0213 Đ3.1, mốc B1 Task 14): luật thuần chọn cách hiện, dùng ở giao diện (`web/order-form.ts`) và bài kiểm. Danh sách tư cách do máy chủ trả
// (`GET /api/to-chuc/cua-toi`); giao diện không tự suy tư cách từ vai trò.

/** `loai` (Task 17): loại liên kết do máy chủ trả — «MEMBER» = thành viên (không «Gửi đơn», ADR-0213 Đ8.1). Vắng = máy chủ cũ. */
export interface TuCachHienThi { partyId: string; ten: string; laToChuc: boolean; loai?: "CA_NHAN" | "MANAGER" | "MEMBER" }

/** Thành viên tổ chức không bao giờ gửi thẳng lên Tour Đảo (Đ8.1): form lập đơn mới chỉ «Lưu đơn», rồi gửi người quản lý ở trang đơn. */
export const laTuCachThanhVien = (t: TuCachHienThi | null): boolean => t?.loai === "MEMBER";

/**
 * - `khong`: không có gì để chọn (chưa có tư cách nào, hoặc chỉ tư cách cá nhân) — form như hôm nay;
 * - `chi-doc`: chỉ làm cho một tổ chức — chỉ thấy tên tổ chức, không ô chọn (gửi tư cách ngầm vì máy chủ đòi: «Hãy chọn tư cách»);
 * - `chon`: từ hai tư cách trở lên — ô chọn «Tư cách».
 */
export type CheDoTuCach = "khong" | "chi-doc" | "chon";

export function cheDoTuCach(ds: readonly TuCachHienThi[]): CheDoTuCach {
  if (ds.length === 0) return "khong";
  if (ds.length === 1) return ds[0]!.laToChuc ? "chi-doc" : "khong";
  return "chon";
}

/** Tư cách chọn sẵn: lựa chọn lần cuối nếu còn trong danh sách; không thì tư cách cá nhân (đường hôm nay), không có thì mục đầu. */
export function tuCachBanDau(ds: readonly TuCachHienThi[], lanCuoi: string | null): TuCachHienThi | null {
  return ds.find((t) => t.partyId === lanCuoi) ?? ds.find((t) => !t.laToChuc) ?? ds[0] ?? null;
}

/** Nhãn một mục của ô chọn: tổ chức ghi tên tổ chức; cá nhân ghi «<tên> (cá nhân)». */
export const nhanMucTuCach = (t: TuCachHienThi): string => (t.laToChuc ? t.ten : `${t.ten} (cá nhân)`);
