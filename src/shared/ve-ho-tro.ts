// Hằng dùng chung máy chủ và giao diện cho Vé hỗ trợ (ADR-0119).
export const NHOM_KY_THUAT_ID = "fbk-team-ky-thuat";
export const TEAM_ROLES = ["LEAD", "MEMBER"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
export const TEAM_ROLE_NAME: Record<TeamRole, string> = { LEAD: "Trưởng nhóm", MEMBER: "Thành viên" };
export const isTeamRole = (v: unknown): v is TeamRole => typeof v === "string" && (TEAM_ROLES as readonly string[]).includes(v);
export const LOC_HANG_DOI = ["ALL", "MINE", "UNASSIGNED"] as const;
export type LocHangDoi = (typeof LOC_HANG_DOI)[number];
export const LOC_HANG_DOI_NAME: Record<LocHangDoi, string> = { ALL: "Tất cả", MINE: "Của tôi", UNASSIGNED: "Chưa ai nhận" };
export const isLocHangDoi = (v: unknown): v is LocHangDoi => typeof v === "string" && (LOC_HANG_DOI as readonly string[]).includes(v);
// Mức ưu tiên của phiếu (ADR-0127, đợt 2a). Cột fbk_ticket.priority KHÔNG có CHECK liệt kê: giá trị hợp lệ kiểm ở đây. Thứ tự mảng = thấp → cao;
// hàng đợi sắp bằng CASE (sắp theo chữ sẽ sai: HIGH < NORMAL < URGENT).
export const PRIORITIES = ["NORMAL", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_NAME: Record<Priority, string> = { NORMAL: "Thường", HIGH: "Cao", URGENT: "Khẩn" };
export const isPriority = (v: unknown): v is Priority => typeof v === "string" && (PRIORITIES as readonly string[]).includes(v);
