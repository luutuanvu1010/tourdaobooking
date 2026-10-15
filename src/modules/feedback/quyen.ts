// Luật quyền của Vé hỗ trợ (ADR-0119): MỘT hàm thuần quyết định mọi quyền đọc/xử lý/chuyển nhóm của một phiếu. Không I/O.
// Ô `feedback.triage` của MATRIX vẫn CHỈ Toàn quyền; tư cách thành viên nhóm là dữ liệu `fbk_team_member` do route nạp rồi truyền vào đây.
// Hàm này nằm trong GUARDS của src/route-write-guard.test.ts: mọi route ghi mới phải gọi nó (hoặc `can`) và DÙNG kết quả.
import { can, isExternalPermission, type PermissionHolder } from "../../shared/permissions.ts";
import { NHOM_KY_THUAT_ID, type TeamRole } from "../../shared/ve-ho-tro.ts";

export interface Membership {
  teamId: string;
  role: TeamRole;
}
export interface QuyenPhieu {
  doc: boolean;
  xuLy: boolean;
  giaoViecChoNguoiKhac: boolean;
  chuyenNhom: boolean;
  noiBo: "none" | "team" | "all";
}

export function quyenPhieu(a: { who: PermissionHolder; submitterId: string; ticketTeamId: string; memberships: readonly Membership[] }): QuyenPhieu {
  const sieu = can(a.who, "feedback.triage");
  const laNguoiGui = a.who.id === a.submitterId;
  const tv = a.memberships.find((m) => m.teamId === a.ticketTeamId) ?? null;
  // Người gửi chỉ có tư cách người gửi với phiếu của chính mình (R2), trừ Toàn quyền.
  const xuLy = sieu || (tv !== null && !laNguoiGui);
  const truongNhom = tv !== null && tv.role === "LEAD" && !laNguoiGui;
  return {
    doc: xuLy || can(a.who, "feedback.view", { ownerId: a.submitterId }),
    xuLy,
    giaoViecChoNguoiKhac: sieu || truongNhom,
    chuyenNhom: sieu || truongNhom,
    noiBo: sieu ? "all" : xuLy ? "team" : "none",
  };
}

/** Tài khoản có mã quyền bên ngoài (kể cả tài khoản lai) chỉ gửi được tới nhóm Kỹ thuật (ADR-0119 điều 6). Nhóm có thật và đang dùng do route kiểm. */
export function choPhepNhomGui(who: PermissionHolder, teamId: string): boolean {
  return who.permissions.some(isExternalPermission) ? teamId === NHOM_KY_THUAT_ID : true;
}
