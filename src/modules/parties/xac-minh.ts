// Luật thuần XÁC MINH phiếu tự khai (ADR-0125 đ3, đ5, đ6; lát H-4 Gói 2) — module parties. Không I/O. Cùng kết luận với lính gác TRONG câu ghi
// (repository decide_self_submission) — bài xac-minh-lenh.test.ts "cùng bảng ca" đối chiếu. Luật này chỉ để trả lời đẹp; câu ghi mới là hàng rào.
import { canManageAccount } from "../../shared/roles.ts";
import type { PermissionCode } from "../../shared/permissions.ts";
import { laMaLyDoTuChoi, type MaLyDoTuChoi } from "../../shared/xac-minh-hien-thi.ts";
import type { Result } from "./rules.ts";

// Khai LẠI kiểu tầng tại chỗ (parties chỉ được import audit qua index.ts, mà index.ts của audit kéo router — tệp thuần chạy bằng node --test không nạp được).
// Ba giá trị khớp cột `loai` của view v_aud_cham_tai_khoan; bài migration (b) ghim ba chữ này.
export type LoaiCham = "TAO" | "VINH_VIEN" | "CUA_SO_30";
export interface ChamTaiKhoan { actorId: string; accountId: string; loai: LoaiCham; at: string }
export interface TaiKhoanTom { id: string; permissions: readonly PermissionCode[]; active: boolean; partyId: string | null }
export interface PhieuXet { id: string; partyId: string; createdBy: string; createdAt: string }
export type LyDoChan = "nguoi_khai" | "khong_tai_khoan" | "cap_bac" | "da_cham";
export interface KetLuanXet { duoc: boolean; lyDo: LyDoChan | null; coCham: boolean }

const NGAY_MS = 86_400_000;
export const moc30Ngay = (createdAtIso: string): string => new Date(Date.parse(createdAtIso) - 30 * NGAY_MS).toISOString();

export function coChamTaiKhoan(cham: readonly ChamTaiKhoan[], actorId: string, phieu: PhieuXet): boolean {
  const moc = moc30Ngay(phieu.createdAt);
  return cham.some((c) => c.actorId === actorId && c.accountId === phieu.createdBy && (c.loai !== "CUA_SO_30" || c.at >= moc));
}

export function xetNguoiXacMinh(v: { nguoi: TaiKhoanTom; phieu: PhieuXet; chuPhieu: TaiKhoanTom | null; cham: readonly ChamTaiKhoan[] }): KetLuanXet {
  if (v.nguoi.id === v.phieu.createdBy) return { duoc: false, lyDo: "nguoi_khai", coCham: false };
  const laToanQuyen = v.nguoi.permissions.includes("SUPER_ADMIN");
  const gan = v.chuPhieu !== null && v.chuPhieu.partyId === v.phieu.partyId;
  if (!gan && !laToanQuyen) return { duoc: false, lyDo: "khong_tai_khoan", coCham: false };
  if (gan && !canManageAccount(v.nguoi.permissions, v.chuPhieu!.permissions)) return { duoc: false, lyDo: "cap_bac", coCham: false };
  const coCham = coChamTaiKhoan(v.cham, v.nguoi.id, v.phieu);
  if (coCham && !laToanQuyen) return { duoc: false, lyDo: "da_cham", coCham };
  return { duoc: true, lyDo: null, coCham };
}

export function chuyenToanQuyen(phieu: PhieuXet, chuPhieu: TaiKhoanTom | null, ds: readonly TaiKhoanTom[], cham: readonly ChamTaiKhoan[]): boolean {
  return !ds.some((t) => t.active && !t.permissions.includes("SUPER_ADMIN") && (t.permissions.includes("ADMIN") || t.permissions.includes("HR"))
    && xetNguoiXacMinh({ nguoi: t, phieu, chuPhieu, cham }).duoc);
}

export function kiemTuChoi(body: Record<string, unknown> | null): Result<{ lyDo: MaLyDoTuChoi }> {
  if (!body || Object.keys(body).some((k) => k !== "lyDo") || !laMaLyDoTuChoi(body.lyDo)) return { ok: false, message: "Hãy chọn một lý do từ chối trong danh sách." };
  return { ok: true, value: { lyDo: body.lyDo } };
}

export const CHAP_NHAN_GIAY_TO_KHI_CHUA_CO_ANH = false; // ruling R18 / Q1
export function lyDoKhongChapNhan(v: { loai: string; daGop: boolean; coAnh: boolean }): { code: string; message: string } | null {
  if (v.daGop) return { code: "ho_so_da_gop", message: "Hồ sơ này đã gộp vào hồ sơ khác — chỉ từ chối được (lý do «Hồ sơ đã gộp vào hồ sơ khác»)." };
  if (v.loai === "GIAY_TO" && !v.coAnh && !CHAP_NHAN_GIAY_TO_KHI_CHUA_CO_ANH) {
    return { code: "can_anh_giay_to", message: "Phiếu giấy tờ chưa có ảnh để đối chiếu — chưa chấp nhận được. Có thể từ chối với lý do phù hợp." };
  }
  return null;
}

export function loiLoChapNhan(e: unknown): { status: 409; code: string; message: string } | null {
  const m = e instanceof Error ? e.message : "";
  if (m.includes("person_document_cccd_other_person")) return { status: 409, code: "document_number_taken", message: "Số giấy tờ này đã thuộc một hồ sơ khác — không chấp nhận được. Hãy từ chối với lý do «Số giấy tờ đã thuộc hồ sơ khác» hoặc báo Toàn quyền." };
  if (m.includes("self_submission_decider_is_author")) return { status: 409, code: "verify_self", message: "Không xác minh phiếu của chính mình." };
  // Cùng một người bấm ở hai thẻ trong cùng mili-giây: lô sau thấy mình "thắng" (cùng decided_by, decided_at) và đụng dòng xác minh cùng mã ⇒ 409, không 500.
  if (m.includes("verification_no_replace")) return { status: 409, code: "submission_not_pending", message: "Phiếu đã được xử lý hoặc đã rút." };
  return null;
}
