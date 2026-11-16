// Luật quyền «vai trên đối tượng» của tổ chức (ADR-0213 Đ6; chủ duyệt 16/11 «Duyệt cả hai» — phương án (b), tiền lệ `quyenPhieu` của ADR-0119). MỘT hàm thuần, không I/O.
// Việc của người quản lý (gửi yêu cầu chuyển quyền, gỡ thành viên) và của thành viên (tự rời) đi theo vai của NGƯỜI GỌI trên CHÍNH tổ chức, KHÔNG qua hàng quyền nào của MATRIX
// (Đ6: «Việc của người quản lý đi theo vai trên đối tượng, không qua hàng này») — nên hàm KHÔNG hỏi bảng (khai `hoiBang: false` trong GUARDS, như luật cấp bậc `mayManage`).
// Dữ kiện do route nạp rồi truyền vào: người quản lý có hiệu lực (ctx.nguoiQuanLyCoHieuLuc, Đ2.8) và liên kết đang mở của chính người gọi tới tổ chức.
// Hàm này nằm trong GUARDS của src/route-write-guard.test.ts: route /api/to-chuc/:id/* phải gọi nó ở chỗ khai route và DÙNG kết quả.
import type { NguoiQuanLyHieuLuc } from "../../shared/router.ts";

export interface VaiToChuc {
  /** Người quản lý có hiệu lực của tổ chức (null = tổ chức chưa có, hoặc người quản lý không có hiệu lực). */
  hl: NguoiQuanLyHieuLuc | null;
  /** Liên kết ĐANG MỞ của chính người gọi tới tổ chức này (null = không gắn). */
  lienKetCuaToi: "MANAGER" | "MEMBER" | null;
}
export interface QuyenToChuc {
  /** Người gọi là người quản lý CÓ HIỆU LỰC: gửi yêu cầu chuyển quyền, gỡ thành viên. */
  quanLy: boolean;
  /** Người gọi là thành viên đang mở: tự rời được. */
  thanhVien: boolean;
  /** Người gọi đang giữ liên kết người quản lý (có hiệu lực hay không) — không tự rời được (Đ2.4, Đ6). */
  laQuanLyMo: boolean;
}

export function quyenToChuc(who: { id: string; partyId: string | null }, v: VaiToChuc): QuyenToChuc {
  if (who.partyId === null) return { quanLy: false, thanhVien: false, laQuanLyMo: false };
  const laQuanLyMo = v.lienKetCuaToi === "MANAGER";
  return {
    quanLy: laQuanLyMo && v.hl !== null && v.hl.staffId === who.id && v.hl.personPartyId === who.partyId,
    thanhVien: v.lienKetCuaToi === "MEMBER",
    laQuanLyMo,
  };
}
